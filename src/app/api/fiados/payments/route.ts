// POST /api/fiados/payments   { client_name, amount, payment_method? }
//
// Registra un abono a lo que debe un cliente. Puede ser parcial. No toca el
// inventario: la mercancía ya salió el día que se fió.

import type { NextRequest } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { handle, created } from "@/lib/api/http";
import { fromPostgrest } from "@/lib/api/errors";
import { requireTiendaId } from "@/lib/api/auth";
import { Fields, readJson } from "@/lib/api/validate";
import { toFiadoPayment } from "@/lib/api/mappers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const METHODS = ["efectivo", "transferencia", "tarjeta"] as const;

export async function POST(request: NextRequest) {
  return handle(async () => {
    const tiendaId = requireTiendaId(request);
    const body = await readJson(request);
    const f = new Fields(body);

    const clientName = f.string("client_name", { required: true, max: 160 });
    const amount = f.number("amount", { required: true, min: 1 });
    const method = f.oneOf("payment_method", METHODS);
    f.check();

    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from("fiado_payments")
      .insert({
        tienda_id: tiendaId,
        client_name: clientName,
        amount,
        payment_method: method ?? "efectivo",
      })
      .select("*")
      .single();
    if (error) throw fromPostgrest(error, "el registro del abono");

    return created(toFiadoPayment(data));
  });
}
