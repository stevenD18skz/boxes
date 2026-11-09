"use client";

import Link from "next/link";
import { AlertTriangle, FolderOpen } from "lucide-react";
import { currency } from "@/utils/converts";
import {
  STATUS_STYLE,
  formatDeliveryDate,
  isOverdue,
  itemStatusBreakdown,
} from "./ordersUtils";

// La misma información de la tabla, apilada para el teléfono (mismo patrón
// que ProductsCardList en components/products).
export default function OrdersHistoryCardList({ items }) {
  return (
    <div className="mt-4 space-y-3 md:hidden">
      {items.map((o) => {
        const st = STATUS_STYLE[o.status] || STATUS_STYLE.pendiente;
        const overdue = isOverdue(o);
        const breakdown =
          o.status === "pendiente" ? itemStatusBreakdown(o.products) : "";
        return (
          <div
            key={o.id}
            className="rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-slate-100"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-[16px] font-bold text-slate-900">
                  {o.supplier}
                </div>
                <div className="text-[12.5px] text-slate-500">
                  {formatDeliveryDate(o.order_date)}
                </div>
              </div>
              <div className="shrink-0 text-right text-[16px] font-bold tabular-nums text-slate-900">
                {currency(o.total_amount)}
              </div>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <span
                className={`rounded-full px-2 py-0.5 text-[11.5px] font-bold ${st.chip}`}
              >
                {st.label}
              </span>
              {overdue && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11.5px] font-bold text-amber-800">
                  <AlertTriangle className="h-2.5 w-2.5" />
                  Entrega atrasada
                </span>
              )}
            </div>

            <div className="mt-2 text-[12.5px] text-slate-500">
              {o.products.length}{" "}
              {o.products.length === 1 ? "producto" : "productos"}
              {o.expected_delivery && (
                <> · Entrega esperada: {formatDeliveryDate(o.expected_delivery)}</>
              )}
            </div>
            {breakdown && (
              <div className="mt-0.5 text-[12.5px] text-slate-500">
                {breakdown}
              </div>
            )}
            {o.notes && (
              <div className="mt-1 truncate text-[12.5px] text-slate-500">
                {o.notes}
              </div>
            )}

            {o.status === "pendiente" && (
              <Link
                href={`/orders?open=${o.id}`}
                className="mt-3 flex h-11 items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-[13.5px] font-semibold text-indigo-700 hover:bg-indigo-100"
              >
                <FolderOpen className="h-4 w-4" /> Abrir en Pedidos
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
