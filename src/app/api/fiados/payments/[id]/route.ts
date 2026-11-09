// DELETE /api/fiados/payments/:id   borra un abono (para deshacer uno que se
// anotó por error). El saldo del cliente vuelve a subir solo.

import type { NextRequest } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { handle, ok } from "@/lib/api/http";
import { fromPostgrest, notFound } from "@/lib/api/errors";
import { requireTiendaId } from "@/lib/api/auth";
import { requireUuidParam } from "@/lib/api/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, context: Context) {
  return handle(async () => {
    const tiendaId = requireTiendaId(request);
    const { id } = await context.params;
    requireUuidParam(id, "El identificador del abono");

    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from("fiado_payments")
      .delete()
      .eq("id", id)
      .eq("tienda_id", tiendaId)
      .select("id")
      .maybeSingle();
    if (error) throw fromPostgrest(error, "el borrado del abono");
    if (!data) throw notFound("No existe un abono con ese identificador");

    return ok({ id, deleted: true });
  });
}
