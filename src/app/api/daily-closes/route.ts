// GET  /api/daily-closes   cierres diarios (el histórico del Excel de 2025)
// POST /api/daily-closes   cierra un día
//
// Cada fila es un día completo del negocio, sin detalle de transacciones: es
// el formato en que la contabilidad venía llevando 2025 y se conserva como
// modo de captura junto al registro venta por venta.
//
// source = "excel" fue importado del archivo de 2025
//          "app"   se cerró desde la aplicación

import type { NextRequest } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { handle, ok, created, listMeta } from "@/lib/api/http";
import { fromPostgrest } from "@/lib/api/errors";
import { requireTiendaId } from "@/lib/api/auth";
import { Fields, readJson } from "@/lib/api/validate";
import { parseListQuery, enumParam, todayInBogota } from "@/lib/api/query";
import { toDailyClose } from "@/lib/api/mappers";
import type { DailyCloseRow } from "@/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SORTABLE = [
  "date",
  "sales_total",
  "gain",
  "expenses_total",
  "purchases_total",
] as const;
const SOURCES = ["excel", "app"] as const;

// El mismo 19% que usa la contabilidad del negocio: la columna GANANCIA del
// Excel es siempre la venta del día por 0.19. Solo se aplica cuando quien
// llama no manda la ganancia; si la manda, se respeta tal cual.
const GAIN_RATE = 0.19;

export async function GET(request: NextRequest) {
  return handle(async () => {
    const tiendaId = requireTiendaId(request);
    const { sort, ascending, page, limit, offset, rangeEnd, from, to, params } =
      parseListQuery(request, {
        sortable: SORTABLE,
        defaultSort: "date",
        defaultOrder: "desc",
      });

    const db = getSupabaseAdmin();
    let query = db
      .from("daily_closes")
      .select("*", { count: "exact" })
      .eq("tienda_id", tiendaId);

    if (from) query = query.gte("date", from);
    if (to) query = query.lte("date", to);

    const source = enumParam(params.get("source"), SOURCES, "source");
    if (source) query = query.eq("source", source);

    const { data, error, count } = await query
      .order(sort, { ascending })
      .range(offset, rangeEnd);
    if (error) throw fromPostgrest(error, "el listado de cierres diarios");

    return ok(
      (data as DailyCloseRow[]).map(toDailyClose),
      listMeta(page, limit, count),
    );
  });
}

export async function POST(request: NextRequest) {
  return handle(async () => {
    const tiendaId = requireTiendaId(request);
    const body = await readJson(request);
    const f = new Fields(body);

    const date = f.date("date");
    const salesTotal = f.number("sales_total", { required: true, min: 0 });
    const gain = f.number("gain", { min: 0 });
    const expensesTotal = f.number("expenses_total", { min: 0 });
    const purchasesTotal = f.number("purchases_total", { min: 0 });
    const cashIn = f.number("cash_in", { nullable: true, min: 0 });
    const cashOut = f.number("cash_out", { nullable: true, min: 0 });
    const cashCounted = f.number("cash_counted", { nullable: true, min: 0 });
    const source = f.oneOf("source", SOURCES);
    f.check();

    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from("daily_closes")
      .insert({
        tienda_id: tiendaId,
        date: date ?? todayInBogota(),
        sales_total: salesTotal,
        gain: gain ?? Math.round((salesTotal ?? 0) * GAIN_RATE),
        expenses_total: expensesTotal ?? 0,
        purchases_total: purchasesTotal ?? 0,
        // null y 0 no significan lo mismo: null es "ese día no se anotó nada".
        cash_in: cashIn ?? null,
        cash_out: cashOut ?? null,
        cash_counted: cashCounted ?? null,
        source: source ?? "app",
      })
      .select("*")
      .single();

    // El 23505 (fecha repetida) sale como 409 "Ya existe un cierre para esa fecha".
    if (error) throw fromPostgrest(error, "el cierre del día");

    return created(toDailyClose(data as DailyCloseRow));
  });
}
