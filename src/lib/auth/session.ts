// Sesión de tienda: una cookie firmada con HMAC-SHA256, sin base de datos de
// sesiones. Usa crypto.subtle (Web Crypto) en vez de node:crypto porque este
// archivo lo importan tanto rutas de /api (runtime nodejs) como middleware.ts
// (runtime edge por defecto), y subtle es lo único común a los dos.

export const SESSION_COOKIE = "erp_session";

const SESSION_DAYS = 30;
export const SESSION_MAX_AGE_SECONDS = SESSION_DAYS * 24 * 60 * 60;

export type SessionPayload = {
  tiendaId: string;
  nombre: string;
  dueno: string;
  email: string;
};

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "Falta SESSION_SECRET en .env.local (ver supabase/README.md).",
    );
  }
  return secret;
}

function bytesToBase64url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Tipado como Uint8Array<ArrayBuffer> (no ArrayBufferLike) porque es lo que
// pide crypto.subtle.verify desde TypeScript 5.7.
function base64urlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(value.length + ((4 - (value.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createSessionToken(
  payload: SessionPayload,
): Promise<string> {
  const exp = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const body = JSON.stringify({ ...payload, exp });
  const bodyB64 = bytesToBase64url(new TextEncoder().encode(body));

  const key = await hmacKey(getSecret());
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(bodyB64),
  );

  return `${bodyB64}.${bytesToBase64url(new Uint8Array(signature))}`;
}

export async function verifySessionToken(
  token: string | undefined | null,
): Promise<SessionPayload | null> {
  if (!token) return null;
  const [bodyB64, sigB64] = token.split(".");
  if (!bodyB64 || !sigB64) return null;

  try {
    const key = await hmacKey(getSecret());
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64urlToBytes(sigB64),
      new TextEncoder().encode(bodyB64),
    );
    if (!valid) return null;

    const payload = JSON.parse(
      new TextDecoder().decode(base64urlToBytes(bodyB64)),
    );
    if (typeof payload.exp !== "number" || Date.now() > payload.exp) {
      return null;
    }
    if (
      typeof payload.tiendaId !== "string" ||
      typeof payload.nombre !== "string" ||
      typeof payload.dueno !== "string" ||
      typeof payload.email !== "string"
    ) {
      return null;
    }
    return {
      tiendaId: payload.tiendaId,
      nombre: payload.nombre,
      dueno: payload.dueno,
      email: payload.email,
    };
  } catch {
    return null;
  }
}
