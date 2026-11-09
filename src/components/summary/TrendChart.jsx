"use client";

import { currency } from "@/utils/converts";
import { formatShort } from "./summaryUtils";

function EmptyRange() {
  return (
    <div className="py-14 text-center">
      <div className="text-[15px] font-bold text-slate-900">
        No hay datos en este período
      </div>
      <div className="mt-1 text-[13.5px] text-slate-500">
        Prueba con otro rango de fechas.
      </div>
    </div>
  );
}

// Gráfica de barras en CSS, sin librería: son alturas en píxeles calculadas
// contra el valor más alto del rango. El ancho mínimo de cada barra se achica
// cuando hay muchas para que el rango completo quepa sin scroll.
export default function TrendChart({
  buckets,
  metric,
  onMetricChange,
  selectedBarKey,
  onSelectBar,
}) {
  const maxBucket = Math.max(1, ...buckets.map((b) => b[metric]));
  const lastKey = buckets.length ? buckets[buckets.length - 1].key : null;
  const selBucket = buckets.find((b) => b.key === selectedBarKey) ?? null;
  const barMinWidth = buckets.length > 20 ? 22 : buckets.length > 10 ? 34 : 44;
  const barGap = buckets.length > 20 ? "gap-1" : "gap-2.5";

  return (
    <section className="rounded-xl border border-slate-100 bg-white p-[18px] shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-base font-bold text-slate-900">
            {metric === "ventas"
              ? "Cuánto vendiste cada día"
              : "Cuánto ganaste cada día"}
          </div>
          <div className="mt-0.5 text-[13px] text-slate-500">
            Toca una barra para ver el detalle de ese día
          </div>
        </div>
        <div className="flex overflow-hidden rounded-[10px] border border-slate-200">
          {[
            { key: "ventas", label: "Ventas" },
            { key: "ganancia", label: "Ganancia" },
          ].map((m) => (
            <button
              key={m.key}
              onClick={() => onMetricChange(m.key)}
              className={`h-10 px-4 text-[13.5px] font-bold transition-colors ${
                metric === m.key
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {buckets.length === 0 ? (
        <EmptyRange />
      ) : (
        <div
          className={`flex h-[170px] items-end overflow-x-auto pb-0.5 ${barGap}`}
        >
          {buckets.map((b) => {
            const selected = selectedBarKey === b.key;
            const isLast = b.key === lastKey;
            const heightPx = Math.max(
              6,
              Math.round((b[metric] / maxBucket) * 122),
            );
            return (
              <button
                key={b.key}
                onClick={() => onSelectBar(selected ? null : b.key)}
                aria-label={`${b.longLabel}: ${currency(b[metric])}`}
                style={{ flex: `1 0 ${barMinWidth}px` }}
                className="flex h-full flex-col items-center justify-end gap-1.5"
              >
                <div
                  className={`whitespace-nowrap text-[10.5px] tabular-nums ${
                    selected
                      ? "font-bold text-blue-700"
                      : "font-medium text-slate-500"
                  }`}
                >
                  {formatShort(b[metric])}
                </div>
                <div
                  style={{ height: `${heightPx}px` }}
                  className={`w-full max-w-[40px] rounded-b-sm rounded-t-[5px] ${
                    selected
                      ? "bg-blue-700"
                      : isLast
                        ? "bg-blue-600"
                        : "bg-blue-200"
                  }`}
                />
                <div
                  className={`whitespace-nowrap text-[11.5px] font-bold ${
                    selected || isLast ? "text-blue-700" : "text-slate-500"
                  }`}
                >
                  {b.label}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selBucket && (
        <div className="mt-4 flex flex-wrap items-center gap-3.5 rounded-[10px] bg-blue-50 p-3.5">
          <div className="min-w-[180px] flex-1">
            <div className="text-sm font-extrabold text-blue-700">
              {selBucket.longLabel}
            </div>
            <div className="mt-1 text-[13px] text-slate-700">
              {currency(selBucket.ventas)} vendidos ·{" "}
              {currency(selBucket.ganancia)} de ganancia ·{" "}
              {currency(selBucket.gasto)} de gasto · {currency(selBucket.compra)}{" "}
              en compras
            </div>
          </div>
          <button
            onClick={() => onSelectBar(null)}
            className="h-[38px] rounded-[9px] border border-blue-200 bg-white px-3.5 text-[13px] font-bold text-blue-700"
          >
            Cerrar
          </button>
        </div>
      )}
    </section>
  );
}
