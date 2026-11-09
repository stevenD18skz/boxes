// RecentSales.jsx
"use client";

import { useState } from "react";
import { currency, formatMoney } from "@/utils/converts";
import {
  METHOD_LABELS,
  formatSaleTime,
  saleFolio,
  saleLineTotal,
  saleUnitCount,
} from "./salesUtils";

/*
  Panel "Historial reciente" del sidebar de Ventas.
  - Cada venta se dibuja como un recibo: dentado arriba y abajo (ver
    .receipt-edge en index.css) y cifras alineadas a la derecha.
  - Al hacer clic se despliega el detalle: producto, valor unitario, cantidad y
    total de la línea. Se abre una sola a la vez, que el sidebar es angosto.
*/

const LIMIT = 8;

// El papel de las cards es slate-50; el dentado tiene que ir del mismo color
// para que se lea como un borde rasgado y no como una figura aparte.
const PAPER = "[--receipt-paper:#f8fafc]";

// formatMoney devuelve "" en 0 y en valores no numéricos.
const money = (n) => formatMoney(Number(n) || 0) || "0";

export default function RecentSales({ sales, loading, onVoid, onSeeAll }) {
  const [expandedId, setExpandedId] = useState(null);

  const toggle = (id) => setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div className="rounded-xl bg-white p-[18px] shadow-sm ring-1 ring-slate-100">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <div className="text-sm font-bold text-slate-600">
          Historial reciente
        </div>
        {onSeeAll && (
          <button
            type="button"
            onClick={onSeeAll}
            className="text-[12.5px] font-bold text-teal-700 underline hover:text-teal-800"
          >
            Ver todo
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg bg-slate-50 p-3">
              <div className="h-3.5 w-2/3 animate-pulse rounded bg-slate-200 motion-reduce:animate-none" />
              <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-slate-200 motion-reduce:animate-none" />
            </div>
          ))
        ) : sales.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">
            Aún no hay ventas registradas.
          </p>
        ) : (
          sales
            .slice(0, LIMIT)
            .map((sale) => (
              <SaleReceipt
                key={sale.id}
                sale={sale}
                open={expandedId === sale.id}
                onToggle={() => toggle(sale.id)}
                onVoid={onVoid}
              />
            ))
        )}
      </div>
    </div>
  );
}

// Un recibo. El botón de anular vive dentro del detalle: además de ser una
// acción que conviene deliberada, un <button> no puede anidarse dentro de otro.
function SaleReceipt({ sale, open, onToggle, onVoid }) {
  const lines = sale.products || [];
  const unidades = saleUnitCount(sale);

  return (
    <div
      className={`${PAPER} [filter:drop-shadow(0_1px_1px_rgb(15_23_42/0.10))] ${sale.voided ? "opacity-60" : ""}`}
    >
      <div className="receipt-edge receipt-edge-top" aria-hidden="true" />

      <div className="bg-slate-50 px-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-label={`${open ? "Ocultar" : "Ver"} detalle de la venta ${saleFolio(sale)}`}
          className="w-full py-2 text-left"
        >
          <div className="flex items-baseline justify-between gap-2">
            <div
              className={`text-[14.5px] font-bold tabular-nums text-slate-900 ${sale.voided ? "line-through" : ""}`}
            >
              {currency(sale.total_amount)}
            </div>
            <div className="shrink-0 whitespace-nowrap text-xs text-slate-500">
              {formatSaleTime(sale.sale_date)}
            </div>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11.5px] font-bold text-slate-700">
              {METHOD_LABELS[sale.payment_method] || sale.payment_method}
            </span>

            {sale.client_name && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11.5px] font-bold text-amber-800">
                {sale.client_name}
              </span>
            )}

            {sale.voided && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11.5px] font-bold text-red-700">
                Anulada
              </span>
            )}

            <span className="ml-auto whitespace-nowrap font-mono text-[11px] text-slate-500">
              {saleFolio(sale)}
            </span>
          </div>
        </button>

        {open && (
          <div className="border-t border-dashed border-slate-300 pb-2 pt-2">
            {lines.length === 0 ? (
              <p className="text-xs text-slate-500">
                Esta venta no guardó el detalle de sus líneas.
              </p>
            ) : (
              lines.map((line, i) => (
                <DetailLine
                  key={`${sale.id}-${line.product_id}-${i}`}
                  line={line}
                />
              ))
            )}

            <div className="mt-1.5 flex items-baseline justify-between gap-2 border-t border-dashed border-slate-300 pt-1.5 text-[12.5px] font-bold text-slate-900">
              <span>
                Total
                <span className="ml-1.5 font-normal text-slate-500">
                  {unidades} {unidades === 1 ? "unidad" : "unidades"}
                </span>
              </span>
              <span className="tabular-nums">{currency(sale.total_amount)}</span>
            </div>

            {!sale.voided && onVoid && (
              <button
                type="button"
                onClick={() => onVoid(sale.id)}
                className="mt-2 text-[12px] font-bold text-red-700 underline hover:text-red-800"
              >
                Anular venta
              </button>
            )}
          </div>
        )}
      </div>

      <div className="receipt-edge receipt-edge-bottom" aria-hidden="true" />
    </div>
  );
}

// Producto · valor unitario · cantidad · total de la línea. En dos renglones
// porque el sidebar no da para ponerlo todo en uno sin recortar el nombre.
function DetailLine({ line }) {
  const conDescuento = !!line.discount_type && Number(line.discount_value) > 0;

  return (
    <div className="py-0.5">
      <div className="flex items-baseline justify-between gap-2 text-[12.5px]">
        <span className="min-w-0 flex-1 truncate text-slate-700">
          {line.product || `Producto #${line.product_id}`}
        </span>
        <span className="shrink-0 tabular-nums text-slate-800">
          {currency(saleLineTotal(line))}
        </span>
      </div>
      <div className="text-[11px] text-slate-500">
        V.U: <span className="tabular-nums">{money(line.sale_price)}</span>
        {" · "}
        <span className="tabular-nums">×{line.quantity}</span>
        {conDescuento && (
          <span className="ml-1 font-semibold text-teal-700">
            −
            {line.discount_type === "pct"
              ? `${line.discount_value}%`
              : money(line.discount_value)}
          </span>
        )}
      </div>
    </div>
  );
}
