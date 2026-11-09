"use client";

import Link from "next/link";
import { AlertTriangle, FolderOpen } from "lucide-react";
import SortHeader from "@/components/ui/SortHeader";
import { currency } from "@/utils/converts";
import {
  STATUS_STYLE,
  formatDeliveryDate,
  isOverdue,
  itemStatusBreakdown,
} from "./ordersUtils";

// Tabla de escritorio del historial completo. En móvil se esconde y toma su
// lugar OrdersHistoryCardList (mismo patrón que ProductsTable/
// ProductsCardList en components/products).
export default function OrdersHistoryTable({ items, sortBy, sortDir, onSort }) {
  return (
    <div className="mt-4 hidden overflow-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-100 md:block">
      <table className="w-full table-fixed text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <SortHeader
              label="Fecha"
              sortKey="order_date"
              sortBy={sortBy}
              sortDir={sortDir}
              onClick={onSort}
              className="w-28"
            />
            <SortHeader
              label="Proveedor"
              sortKey="supplier"
              sortBy={sortBy}
              sortDir={sortDir}
              onClick={onSort}
            />
            <SortHeader
              label="Entrega esperada"
              sortKey="expected_delivery"
              sortBy={sortBy}
              sortDir={sortDir}
              onClick={onSort}
              className="w-40"
            />
            <th className="w-56 px-2 py-3 text-left text-sm font-bold text-slate-600">
              Productos
            </th>
            <th className="w-32 px-2 py-3 text-left text-sm font-bold text-slate-600">
              Estado
            </th>
            <SortHeader
              label="Total"
              sortKey="total_amount"
              sortBy={sortBy}
              sortDir={sortDir}
              onClick={onSort}
              align="right"
              className="w-28"
            />
            <th className="w-24 py-3 pl-2 pr-4 text-left text-sm font-bold text-slate-600">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((o) => {
            const st = STATUS_STYLE[o.status] || STATUS_STYLE.pendiente;
            const overdue = isOverdue(o);
            const breakdown =
              o.status === "pendiente" ? itemStatusBreakdown(o.products) : "";
            return (
              <tr
                key={o.id}
                className="border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50"
              >
                <td className="px-2 py-2.5 text-slate-600">
                  {formatDeliveryDate(o.order_date)}
                </td>
                <td className="px-2 py-2.5">
                  <div className="truncate font-bold text-slate-900">
                    {o.supplier}
                  </div>
                  {o.notes && (
                    <div className="truncate text-[12.5px] text-slate-500">
                      {o.notes}
                    </div>
                  )}
                </td>
                <td className="px-2 py-2.5">
                  {o.expected_delivery ? (
                    <div className="text-slate-600">
                      {formatDeliveryDate(o.expected_delivery)}
                    </div>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                  {overdue && (
                    <div className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      Atrasada
                    </div>
                  )}
                </td>
                <td className="px-2 py-2.5 text-[12.5px] text-slate-600">
                  <div>
                    {o.products.length}{" "}
                    {o.products.length === 1 ? "producto" : "productos"}
                  </div>
                  {breakdown && (
                    <div className="truncate text-slate-500">{breakdown}</div>
                  )}
                </td>
                <td className="px-2 py-2.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11.5px] font-bold ${st.chip}`}
                  >
                    {st.label}
                  </span>
                </td>
                <td className="px-2 py-2.5 text-right font-bold tabular-nums text-slate-900">
                  {currency(o.total_amount)}
                </td>
                <td className="py-2.5 pl-2 pr-4">
                  {o.status === "pendiente" ? (
                    <Link
                      href={`/orders?open=${o.id}`}
                      className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-[13px] font-semibold text-indigo-700 hover:bg-indigo-100"
                    >
                      <FolderOpen className="h-[15px] w-[15px]" /> Abrir
                    </Link>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
