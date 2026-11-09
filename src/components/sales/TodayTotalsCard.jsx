"use client";

import { currency } from "@/utils/converts";

// Lo vendido hoy, arriba de la columna derecha. Solo cuenta ventas no anuladas:
// una venta anulada no entró a la caja.
export default function TodayTotalsCard({ total, count }) {
  return (
    <div className="rounded-xl bg-white p-[18px] shadow-sm ring-1 ring-slate-100">
      <div className="mb-3 text-sm font-bold text-slate-600">
        Ventas de hoy
      </div>
      <div className="flex gap-4 justify-between">
        <div>
          <div className="text-2xl font-extrabold tabular-nums text-slate-900">
            {currency(total)}
          </div>
          <div className="mt-0.5 text-xs text-slate-500">Total vendido</div>
        </div>

        <div>
          <div className="text-2xl font-extrabold tabular-nums text-teal-600">
            {count}
          </div>
          <div className="mt-0.5 text-xs text-slate-500">Ventas</div>
        </div>
      </div>
    </div>
  );
}
