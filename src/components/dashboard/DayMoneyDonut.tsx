import Link from "next/link";
import { Hourglass } from "lucide-react";
import { currency } from "@/utils/converts";
import type { DailyClose } from "@/types/dailyClose";
import { longDate, type DayBreakdown } from "./dashboardUtils";

const DONUT_SEGMENTS = [
  {
    key: "costo",
    label: "Costo de lo que vendiste",
    hint: "Lo que te costó la mercancía que salió",
    color: "#94a3b8",
    dot: "bg-slate-400",
    bar: "bg-slate-400",
  },
  {
    key: "gasto",
    label: "Gastos del día",
    hint: "Arriendo, servicios, transporte…",
    color: "#f43f5e",
    dot: "bg-rose-500",
    bar: "bg-rose-500",
  },
  {
    key: "neto",
    label: "Te quedó",
    hint: "Ganancia después de los gastos",
    color: "#10b981",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
  },
] as const;

const DonutCard = ({ children }: { children: React.ReactNode }) => (
  <div className="flex h-full flex-col rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-100 md:p-6">
    {children}
  </div>
);

/*
  DayMoneyDonut
  - Reemplaza la gráfica de "ventas de los últimos 7 días", que repetía lo que
    ya muestra la página de Reportes. En vez de la tendencia, responde qué pasó
    con la plata de hoy: la venta se reparte en costo de la mercancía, gastos y
    lo que realmente quedó.
  - Es una partición exacta: venta = costo + gasto + neto, porque la ganancia
    del negocio es el 19% de la venta y el costo el 81% restante.
  - Las compras a proveedores van aparte: son inversión en inventario, no un
    costo del día, así que descuadrarían la torta.
*/
export default function DayMoneyDonut({
  day,
  lastRecorded,
}: {
  day: DayBreakdown | null;
  lastRecorded: DailyClose | null;
}) {
  if (!day || day.ventas <= 0) {
    return (
      <DonutCard>
        <h3 className="text-base font-bold text-slate-900">
          ¿En qué se repartió la plata de hoy?
        </h3>
        <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-50">
            <Hourglass className="h-6 w-6 text-slate-300" aria-hidden />
          </span>
          <p className="mt-4 text-[15px] font-bold text-slate-700">
            Todavía no hay movimiento de hoy
          </p>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            Apenas registres la primera venta o cierres el día, aquí ves en qué
            se fue la plata.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link
              href="/sales"
              className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Registrar una venta
            </Link>
            <Link
              href="/summary"
              className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Ver reportes
            </Link>
          </div>
          {lastRecorded && (
            <p className="mt-5 text-xs text-slate-500">
              Último día registrado: {longDate(lastRecorded.date)} ·{" "}
              <span className="font-semibold tabular-nums text-slate-500">
                {currency(lastRecorded.sales_total)}
              </span>
            </p>
          )}
        </div>
      </DonutCard>
    );
  }

  // Cuando los gastos se comieron la ganancia no hay franja verde que dibujar:
  // la torta se reparte entre costo y gastos, y el centro lo dice en rojo.
  const ate = day.neto <= 0;
  const parts = ate
    ? [
        { ...DONUT_SEGMENTS[0], value: day.costo },
        { ...DONUT_SEGMENTS[1], value: day.ventas - day.costo },
      ]
    : DONUT_SEGMENTS.map((s) => ({
        ...s,
        value: day[s.key as "costo" | "gasto" | "neto"],
      }));

  const R = 68;
  const C = 2 * Math.PI * R;
  let offset = 0;

  return (
    <DonutCard>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-base font-bold text-slate-900">
          ¿En qué se repartió la plata de hoy?
        </h3>
        <span className="text-sm text-slate-500">
          Vendiste{" "}
          <span className="font-bold tabular-nums text-slate-900">
            {currency(day.ventas)}
          </span>
        </span>
      </div>

      <div className="mt-6 flex flex-col items-center gap-7 md:flex-row md:items-start md:gap-9">
        {/* Torta: cada segmento es un círculo con strokeDasharray, desplazado
            por lo que ya ocuparon los anteriores. */}
        <div className="relative shrink-0">
          <svg
            width="188"
            height="188"
            viewBox="0 0 188 188"
            role="img"
            aria-label="Reparto de la venta del día"
          >
            <g transform="rotate(-90 94 94)">
              <circle
                cx="94"
                cy="94"
                r={R}
                fill="none"
                stroke="#f1f5f9"
                strokeWidth="26"
              />
              {parts.map((p) => {
                const frac = day.ventas > 0 ? p.value / day.ventas : 0;
                const dash = frac * C;
                const el = (
                  <circle
                    key={p.key}
                    cx="94"
                    cy="94"
                    r={R}
                    fill="none"
                    stroke={p.color}
                    strokeWidth="26"
                    strokeDasharray={`${dash} ${C - dash}`}
                    strokeDashoffset={-offset}
                  />
                );
                offset += dash;
                return el;
              })}
            </g>
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-sm font-bold text-slate-600">
              Te quedó
            </span>
            <span
              className={`mt-0.5 text-xl font-extrabold tabular-nums ${
                ate ? "text-rose-600" : "text-emerald-600"
              }`}
            >
              {currency(Math.max(0, day.neto))}
            </span>
            <span className="text-xs font-semibold tabular-nums text-slate-500">
              {Math.round((Math.max(0, day.neto) / day.ventas) * 100)}% de la
              venta
            </span>
          </div>
        </div>

        {/* Desglose */}
        <div className="w-full min-w-0 flex-1 space-y-4">
          {parts.map((p) => {
            const pct = day.ventas > 0 ? (p.value / day.ventas) * 100 : 0;
            return (
              <div key={p.key}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${p.dot}`}
                    />
                    <span className="truncate text-sm font-semibold text-slate-700">
                      {p.label}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-baseline gap-2">
                    <span className="text-sm font-bold tabular-nums text-slate-900">
                      {currency(p.value)}
                    </span>
                    <span className="w-9 text-right text-xs font-semibold tabular-nums text-slate-500">
                      {Math.round(pct)}%
                    </span>
                  </span>
                </div>
                {/* El mínimo de 1.5% deja ver la barra aunque el valor sea casi cero. */}
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${p.bar}`}
                    style={{ width: `${Math.max(pct, 1.5)}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">{p.hint}</p>
              </div>
            );
          })}
        </div>
      </div>

      {ate && (
        <p className="mt-5 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
          Los gastos de hoy se comieron toda la ganancia.
        </p>
      )}

      <p className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-500">
        Además compraste{" "}
        <span className="font-bold tabular-nums text-slate-600">
          {currency(day.compra)}
        </span>{" "}
        en mercancía. Va aparte: es inversión en inventario, no un costo del día.
      </p>
    </DonutCard>
  );
}
