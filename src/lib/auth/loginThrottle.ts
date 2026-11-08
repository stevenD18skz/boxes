// Freno a quien prueba contraseñas a ciegas en /api/auth/login.
//
// Cuenta los intentos fallidos de los últimos WINDOW_MINUTES en la tabla
// login_attempts (supabase/sql/01_schema.sql), por correo y por IP. Va en la
// base y no en memoria porque en Vercel cada request puede caer en una
// instancia distinta: un contador en memoria se reiniciaría solo.
//
// Por correo protege una tienda concreta; por IP frena a quien recorre muchos
// correos desde el mismo lugar. El límite de IP es más alto porque en un
// negocio varias personas pueden entrar desde la misma red.

import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "@/lib/api/errors";

const WINDOW_MINUTES = 15;
const MAX_PER_EMAIL = 5;
const MAX_PER_IP = 20;

export function clientIp(request: NextRequest): string {
  // Vercel pone la IP real del cliente al principio de x-forwarded-for.
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || request.headers.get("x-real-ip") || "desconocida";
}

function windowStart(): string {
  return new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();
}

async function countSince(
  db: SupabaseClient,
  column: "email" | "ip",
  value: string,
): Promise<number> {
  const { count, error } = await db
    .from("login_attempts")
    .select("id", { count: "exact", head: true })
    .eq(column, value)
    .gte("attempted_at", windowStart());
  // Si la tabla no existe todavía (esquema sin actualizar), el login sigue
  // funcionando: es preferible no frenar a nadie que dejar a todos afuera.
  if (error) return 0;
  return count ?? 0;
}

export async function assertNotThrottled(
  db: SupabaseClient,
  email: string,
  ip: string,
): Promise<void> {
  const [byEmail, byIp] = await Promise.all([
    countSince(db, "email", email),
    countSince(db, "ip", ip),
  ]);
  if (byEmail >= MAX_PER_EMAIL || byIp >= MAX_PER_IP) {
    throw new ApiError(
      429,
      `Demasiados intentos fallidos. Espera ${WINDOW_MINUTES} minutos y vuelve a intentarlo.`,
      "too_many_attempts",
    );
  }
}

export async function recordFailure(
  db: SupabaseClient,
  email: string,
  ip: string,
): Promise<void> {
  await db.from("login_attempts").insert({ email, ip });
  // Limpieza de paso: nada de más de un día sirve para el freno.
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await db.from("login_attempts").delete().lt("attempted_at", dayAgo);
}

export async function clearFailures(
  db: SupabaseClient,
  email: string,
): Promise<void> {
  await db.from("login_attempts").delete().eq("email", email);
}
