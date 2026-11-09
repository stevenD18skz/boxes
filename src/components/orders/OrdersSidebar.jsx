"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ListPlus,
  History,
  XCircle,
} from "lucide-react";
import { currency } from "@/utils/converts";
import {
  STATUS_STYLE,
  formatDeliveryDate,
  isOverdue,
  itemStatusBreakdown,
} from "./ordersUtils";

// Columna derecha: cuánto se ha comprado en total y el historial reciente.
// Los pedidos cancelados no suman al histórico —no se compró nada— pero sí
// siguen apareciendo en la lista, para no perder de vista que existieron.
//
// Un pedido "pendiente" completo es clicable: lo abre en el panel principal
// para seguir agregándole productos o cambiarles la fase, sin un botón aparte
// -es la acción más común sobre un pedido pendiente, así que es la que menos
// clics debería pedir.
export default function OrdersSidebar({
  orders,
  loading,
  openOrderId,
  onOpen,
  onReceive,
  onCancel,
}) {
  const historicoTotal = orders
    .filter((o) => o.status !== "cancelado")
    .reduce((sum, o) => sum + o.total_amount, 0);
  const historicoCount = orders.filter((o) => o.status !== "cancelado").length;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl bg-white p-[18px] shadow-sm ring-1 ring-slate-100">
        <div className="mb-3 text-sm font-bold text-slate-600">
          Compras históricas
        </div>
        <div className="flex gap-4">
          <div>
            <div className="text-2xl font-extrabold tabular-nums text-slate-900">
              {currency(historicoTotal)}
            </div>
            <div className="mt-0.5 text-xs text-slate-500">Costo total</div>
          </div>
          <div>
            <div className="text-2xl font-extrabold tabular-nums text-slate-900">
              {historicoCount}
            </div>
            <div className="mt-0.5 text-xs text-slate-500">Órdenes</div>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white p-[18px] shadow-sm ring-1 ring-slate-100">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="text-sm font-bold text-slate-600">
            Historial de pedidos
          </div>
          <Link
            href="/orders/history"
            className="flex shrink-0 items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
          >
            <History className="h-3 w-3" />
            Ver todo
          </Link>
        </div>
        <div className="flex flex-col gap-2.5">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg bg-slate-50 p-3">
                <div className="h-3.5 w-2/3 animate-pulse rounded bg-slate-200 motion-reduce:animate-none" />
                <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-slate-200 motion-reduce:animate-none" />
              </div>
            ))
          ) : orders.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500">
              Aún no hay pedidos registrados.
            </p>
          ) : (
            orders.slice(0, 8).map((order) => {
              const st = STATUS_STYLE[order.status] || STATUS_STYLE.pendiente;
              const overdue = isOverdue(order);
              const pending = order.status === "pendiente";
              const open = order.id === openOrderId;
              const breakdown = pending
                ? itemStatusBreakdown(order.products)
                : "";
              return (
                <div
                  key={order.id}
                  role={pending ? "button" : undefined}
                  tabIndex={pending ? 0 : undefined}
                  onClick={pending ? () => onOpen(order) : undefined}
                  onKeyDown={
                    pending
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onOpen(order);
                          }
                        }
                      : undefined
                  }
                  className={`rounded-lg p-3 transition-colors ${
                    open
                      ? "bg-indigo-50 ring-1 ring-inset ring-indigo-300"
                      : "bg-slate-50"
                  } ${pending ? "cursor-pointer hover:bg-indigo-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" : ""}`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="truncate text-[14.5px] font-bold text-slate-900">
                      {order.supplier}
                    </div>
                    <div className="shrink-0 text-[14px] font-bold tabular-nums text-slate-900">
                      {currency(order.total_amount)}
                    </div>
                  </div>
                  {order.expected_delivery && (
                    <div className="mt-0.5 text-xs text-slate-500">
                      Entrega esperada:{" "}
                      {formatDeliveryDate(order.expected_delivery)}
                    </div>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11.5px] font-bold ${st.chip}`}
                    >
                      {st.label}
                    </span>
                    {open && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[11.5px] font-bold text-indigo-700">
                        <ListPlus className="h-2.5 w-2.5" />
                        Abierto
                      </span>
                    )}
                    {overdue && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11.5px] font-bold text-amber-800">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        Entrega atrasada
                      </span>
                    )}
                  </div>
                  {breakdown && (
                    <div className="mt-1.5 text-xs text-slate-500">
                      {breakdown}
                    </div>
                  )}
                  {pending && (
                    <div className="mt-2.5 flex gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onReceive(order.id);
                        }}
                        className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md bg-emerald-50 text-[12.5px] font-bold text-emerald-800 hover:bg-emerald-100"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Marcar recibido
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCancel(order.id);
                        }}
                        className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md bg-red-50 text-[12.5px] font-bold text-red-700 hover:bg-red-100"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        {!loading && orders.length > 8 && (
          <Link
            href="/orders/history"
            className="mt-3 block text-center text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            Ver historial completo ({orders.length} pedidos) →
          </Link>
        )}
      </div>
    </div>
  );
}
