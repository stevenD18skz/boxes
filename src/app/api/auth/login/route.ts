// POST /api/auth/login   { email, password } -> cookie de sesión

import type { NextRequest } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { handle, ok } from "@/lib/api/http";
import { fromPostgrest, unauthorized } from "@/lib/api/errors";
import { Fields, readJson } from "@/lib/api/validate";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  assertNotThrottled,
  clearFailures,
  clientIp,
  recordFailure,
} from "@/lib/auth/loginThrottle";
import {
  createSessionToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Hash de una contraseña al azar, solo para gastar el mismo tiempo de scrypt
// cuando el correo no existe. Se calcula una vez por instancia.
const DUMMY_HASH = hashPassword(crypto.randomUUID());

// ILIKE sin comodines es un match exacto sin importar mayúsculas, pero % y _
// sí son comodines para ILIKE: si el correo los trae de verdad (no debería,
// pero por si acaso), hay que escaparlos para que no actúen como tal.
function ilikeExact(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export async function POST(request: NextRequest) {
  return handle(async () => {
    const body = await readJson(request);
    const f = new Fields(body);
    const email = f.string("email", { required: true, max: 200 });
    const password = f.string("password", { required: true, max: 200 });
    f.check();

    const db = getSupabaseAdmin();
    const normalizedEmail = email!.trim().toLowerCase();
    const ip = clientIp(request);
    await assertNotThrottled(db, normalizedEmail, ip);

    const { data: tienda, error } = await db
      .from("tiendas")
      .select("id, nombre, dueno, email, password_hash")
      .ilike("email", ilikeExact(normalizedEmail))
      .maybeSingle();
    if (error) throw fromPostgrest(error, "el inicio de sesión");

    // Mismo mensaje y mismo tiempo de respuesta exista o no el correo: si no,
    // el login serviría para averiguar qué correos tienen tienda. Cuando el
    // correo no existe se compara contra un hash de relleno para que scrypt
    // tarde lo mismo.
    const valid = verifyPassword(password!, tienda?.password_hash ?? DUMMY_HASH);
    if (!tienda || !valid) {
      await recordFailure(db, normalizedEmail, ip);
      throw unauthorized("El correo o la contraseña no son correctos", "invalid_credentials");
    }
    await clearFailures(db, normalizedEmail);

    const token = await createSessionToken({
      tiendaId: tienda.id,
      nombre: tienda.nombre,
      dueno: tienda.dueno,
      email: tienda.email,
    });

    const res = ok({
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
