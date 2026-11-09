// GET /api/fiados   el cuaderno de fiados: cuánto debe cada cliente, con sus
//                   ventas fiadas y sus abonos. Primero quien más debe.
//
// Se arma con todas las ventas fiadas sin anular y todos los abonos de la
// tienda (src/lib/fiados.ts). Son pocas filas comparadas con las ventas: una
// tienda de barrio fía a decenas de clientes, no a miles.

import type { NextRequest } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { handle, ok } from "@/lib/api/http";
import { fromPostgrest } from "@/lib/api/errors";
import { requireTiendaId } from "@/lib/api/auth";
import { buildFiadoLedger, totalOwed } from "@/lib/fiados";
import { toFiadoPayment } from "@/lib/api/mappers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ROWS = 5000;

export async function GET(request: NextRequest) {
  return handle(async () => {
    const tiendaId = requireTiendaId(request);
    const db = getSupabaseAdmin();

    const [salesRes, paymentsRes] = await Promise.all([
      db
        .from("sales")
        .select("id, sale_date, total_amount, payment_method, client_name, voided")
        .eq("tienda_id", tiendaId)
        .eq("payment_method", "fiado")
        .eq("voided", false)
        .order("sale_date", { ascending: false })
        .range(0, MAX_ROWS - 1),
      db
        .from("fiado_payments")
        .select("*")
        .eq("tienda_id", tiendaId)
        .order("paid_at", { ascending: false })
        .range(0, MAX_ROWS - 1),
    ]);
    if (salesRes.error) throw fromPostgrest(salesRes.error, "el cuaderno de fiados");
    if (paymentsRes.error) throw fromPostgrest(paymentsRes.error, "el cuaderno de fiados");

    const clients = buildFiadoLedger(
      (salesRes.data ?? []).map((s) => ({
        ...s,
        total_amount: Number(s.total_amount),
      })),
      (paymentsRes.data ?? []).map(toFiadoPayment),
    );

    return ok(clients, { total_owed: totalOwed(clients) });
  });
}
