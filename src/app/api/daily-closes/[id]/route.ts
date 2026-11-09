// GET    /api/daily-closes/:id
// PATCH  /api/daily-closes/:id
// DELETE /api/daily-closes/:id
//
// :id acepta el identificador o directamente la fecha:
//   /api/daily-closes/2025-12-31
// que es como se consulta el cierre de un día sin tener que buscarlo antes.

import type { NextRequest } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { handle, ok } from "@/lib/api/http";
import { fromPostgrest, notFound, badRequest } from "@/lib/api/errors";
import { requireTiendaId } from "@/lib/api/auth";
import {
  Fields,
  readJson,
  compact,
  isUuid,
  isDateOnly,
  requireNonEmpty,
} from "@/lib/api/validate";
import { toDailyClose } from "@/lib/api/mappers";
import type { DailyCloseRow } from "@/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SOURCES = ["excel", "app"] as const;

type Context = { params: Promise<{ id: string }> };

// Devuelve la columna por la que hay que buscar según lo que venga en la URL.
function resolveKey(id: string): { column: "id" | "date"; value: string } {
  if (isUuid(id)) return { column: "id", value: id };
  if (isDateOnly(id)) return { column: "date", value: id };
  throw badRequest(
    "La URL debe traer el identificador del cierre o una fecha AAAA-MM-DD",
  );
}

export async function GET(request: NextRequest, context: Context) {
  return handle(async () => {
    const tiendaId = requireTiendaId(request);
    const { id } = await context.params;
    const key = resolveKey(id);

    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from("daily_closes")
      .select("*")
      .eq(key.column, key.value)
      .eq("tienda_id", tiendaId)
      .maybeSingle();
    if (error) throw fromPostgrest(error, "la consulta del cierre diario");
    if (!data) throw notFound("No hay un cierre para ese día");

    return ok(toDailyClose(data as DailyCloseRow));
  });
}

export async function PATCH(request: NextRequest, context: Context) {
  return handle(async () => {
    const tiendaId = requireTiendaId(request);
    const { id } = await context.params;
    const key = resolveKey(id);

    const body = await readJson(request);
    const f = new Fields(body);

    const patch = compact({
      date: f.date("date"),
      sales_total: f.number("sales_total", { min: 0 }),
      gain: f.number("gain", { min: 0 }),
      expenses_total: f.number("expenses_total", { min: 0 }),
      purchases_total: f.number("purchases_total", { min: 0 }),
      cash_in: f.number("cash_in", { nullable: true, min: 0 }),
      cash_out: f.number("cash_out", { nullable: true, min: 0 }),
      cash_counted: f.number("cash_counted", { nullable: true, min: 0 }),
      source: f.oneOf("source", SOURCES),
    });
    f.check();
    requireNonEmpty(patch);

    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from("daily_closes")
      .update(patch)
      .eq(key.column, key.value)
      .eq("tienda_id", tiendaId)
      .select("*")
      .maybeSingle();
    if (error) throw fromPostgrest(error, "la actualización del cierre diario");
    if (!data) throw notFound("No hay un cierre para ese día");

    return ok(toDailyClose(data as DailyCloseRow));
  });
}

export async function DELETE(request: NextRequest, context: Context) {
  return handle(async () => {
    const tiendaId = requireTiendaId(request);
    const { id } = await context.params;
    const key = resolveKey(id);

    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from("daily_closes")
      .delete()
      .eq(key.column, key.value)
      .eq("tienda_id", tiendaId)
      .select("id")
      .maybeSingle();
    if (error) throw fromPostgrest(error, "el borrado del cierre diario");
    if (!data) throw notFound("No hay un cierre para ese día");

    return ok({ id: data.id, deleted: true });
  });
}
