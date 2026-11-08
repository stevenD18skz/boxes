// POST /api/auth/register   { nombre, dueno, email, password } -> crea la
// tienda y deja la sesión iniciada. Es lo que permite "crear una tienda desde
// cero" para probar, sin tocar los datos de las demás.

import type { NextRequest } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { handle, created } from "@/lib/api/http";
import { fromPostgrest } from "@/lib/api/errors";
import { Fields, readJson } from "@/lib/api/validate";
import { hashPassword } from "@/lib/auth/password";
import {
  createSessionToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function POST(request: NextRequest) {
  return handle(async () => {
    const body = await readJson(request);
    const f = new Fields(body);
    const nombre = f.string("nombre", { required: true, max: 120 });
    const dueno = f.string("dueno", { required: true, max: 120 });
    const email = f.string("email", { required: true, max: 200 })?.toLowerCase();
    const password = f.string("password", { required: true, max: 200 });
    if (password && password.length < 8) {
      f.add("password", "Debe tener al menos 8 caracteres");
    }
    if (email && !EMAIL_RE.test(email)) {
      f.add("email", "No es un correo válido");
    }
    f.check();

    const db = getSupabaseAdmin();
    const { data: tienda, error } = await db
      .from("tiendas")
      .insert({
        nombre,
        dueno,
        email,
        password_hash: hashPassword(password!),
      })
      .select("id, nombre, dueno, email")
      .single();
    if (error) throw fromPostgrest(error, "la creación de la tienda");

    const token = await createSessionToken({
      tiendaId: tienda.id,
      nombre: tienda.nombre,
      dueno: tienda.dueno,
      email: tienda.email,
    });

    const res = created({
      nombre: tienda.nombre,
      dueno: tienda.dueno,
      email: tienda.email,
    });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return res;
  });
}
