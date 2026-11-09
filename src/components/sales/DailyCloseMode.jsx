// DailyCloseMode.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import useSWR, { mutate } from "swr";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Loader2,
  Lock,
  Pencil,
} from "lucide-react";

import MoneyInput from "@/components/ui/MoneyInput";
import { useIsClient } from "@/hooks/useIsClient";
import { useFiados } from "@/hooks/useFiados";
import {
  getDailyCloses,
  createDailyClose,
  updateDailyClose,
} from "@/services/dailyCloses.service";
import { getSales } from "@/services/sales.service";
import { getExpenses } from "@/services/expenses.service";
import { localDateKey } from "@/utils/dates";
import { pesos } from "@/utils/converts";
import { cashVerdict, summarizeDay } from "./dayCloseUtils";

/*
  DailyCloseMode: cerrar el día.
  - La app ya sabe lo que se vendió, lo que pagaron de fiados y los gastos:
    los muestra calculados y solo pide contar la plata del cajón. Así se ve
    al instante si cuadra, si sobra o si falta.
  - Para la tienda que no anota cada venta (como se hacía en el Excel), si
    ese día no hay ventas registradas se puede escribir el total a mano.
  - Si el día ya se cerró, se muestra el cierre y se puede corregir; nunca se
    guardan dos cierres del mismo día.
  - Al cerrar, una pantalla de resumen: es el final de la jornada y merece
    algo más que un aviso de cuatro segundos (regla de fin de pico).
*/

const PAGE_SIZE = 15;
// Solo para cierres escritos a mano: el Excel estimaba la ganancia como el 19%
// de la venta. Con ventas registradas se usa la ganancia real de cada una.
const GAIN_RATE = 0.19;

const swrOptions = { revalidateOnFocus: false, shouldRetryOnError: false };

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const formatDate = (iso) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};
const longDate = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

const METHOD_LABELS = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
  fiado: "Fiado",
};

export default function DailyCloseMode({ onNotify }) {
  const notify = onNotify ?? (() => {});
  const isClient = useIsClient();
  const closesSWR = useSWR(isClient ? "daily-closes" : null, getDailyCloses, swrOptions);
  const salesSWR = useSWR(isClient ? "sales" : null, getSales, swrOptions);
  const expensesSWR = useSWR(isClient ? "expenses" : null, getExpenses, swrOptions);
  const { clients: fiadoClients, owed } = useFiados();

  const closes = useMemo(() => closesSWR.data ?? [], [closesSWR.data]);
  const loading = !closesSWR.data && !closesSWR.error;

  const [date, setDate] = useState(() => localDateKey());
  const [counted, setCounted] = useState("");
  const [base, setBase] = useState("");
  const [manualTotal, setManualTotal] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [closedSummary, setClosedSummary] = useState(null);
  const countedRef = useRef(null);

  const day = useMemo(
    () =>
      summarizeDay({
        date,
        sales: salesSWR.data ?? [],
        expenses: expensesSWR.data ?? [],
        fiadoClients,
      }),
    [date, salesSWR.data, expensesSWR.data, fiadoClients],
  );

  const existing = closes.find((c) => c.date === date) ?? null;
  const hasRegisteredSales = day.count > 0;
  const salesTotal = hasRegisteredSales ? day.totalVendido : Number(manualTotal) || 0;
  const expectedCash = (Number(base) || 0) + (hasRegisteredSales ? day.efectivoEsperado : 0);
  const verdict =
    counted !== "" && hasRegisteredSales ? cashVerdict(Number(counted), expectedCash) : null;

  useEffect(() => {
    setCounted("");
    setManualTotal("");
    setEditing(false);
  }, [date]);

  const previous = closes.find((c) => c.date < date) ?? null;

  const submit = async (e) => {
    e.preventDefault();
    if (salesTotal <= 0) {
      notify(
        hasRegisteredSales
          ? "No hay ventas para cerrar ese día"
          : "Escribe cuánto vendiste ese día",
        "error",
      );
      return;
    }
    const payload = {
      date,
      sales_total: Math.round(salesTotal),
      gain: Math.round(hasRegisteredSales ? day.gain : salesTotal * GAIN_RATE),
      expenses_total: Math.round(day.gastos),
      purchases_total: 0,
      cash_in: day.entradas ? Math.round(day.entradas) : null,
      cash_out: day.salidas ? Math.round(day.salidas) : null,
      cash_counted: counted === "" ? null : Math.round(Number(counted)),
    };
    setSaving(true);
    try {
      if (existing) await updateDailyClose(existing.id, payload);
      else await createDailyClose(payload);
      await mutate("daily-closes");
      setClosedSummary({ ...payload, verdict, count: day.count, previous });
      setEditing(false);
    } catch (err) {
      notify(err.message || "No se pudo cerrar el día. Revisa la conexión e intenta otra vez.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {closedSummary ? (
        <DayClosed summary={closedSummary} owed={owed} onDone={() => setClosedSummary(null)} />
      ) : (
        <section className="mx-auto max-w-2xl rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Cerrar el día</h2>
              <p className="mt-0.5 text-base capitalize text-slate-600">{longDate(date)}</p>
            </div>
            <label className="text-sm text-slate-600">
              <span className="mb-1 block font-bold">Otro día</span>
              <input
                type="date"
                value={date}
                max={localDateKey()}
                onChange={(e) => e.target.value && setDate(e.target.value)}
                className="h-11 rounded-lg border border-slate-300 px-3 text-base text-slate-900 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              />
            </label>
          </div>

          {existing && !editing ? (
            <AlreadyClosed close={existing} onEdit={() => {
              setEditing(true);
              setCounted(existing.cash_counted == null ? "" : String(existing.cash_counted));
              requestAnimationFrame(() => countedRef.current?.focus());
            }} />
          ) : (
            <form onSubmit={submit} className="mt-5">
              {hasRegisteredSales ? (
                <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                  <Row
                    label={`Vendiste (${day.count} ${day.count === 1 ? "venta" : "ventas"})`}
                    value={pesos(day.totalVendido)}
                    strong
                  >
                    <span className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                      {Object.entries(day.ventas)
                        .filter(([, v]) => v > 0)
                        .map(([k, v]) => (
                          <span key={k}>
                            {METHOD_LABELS[k]} {pesos(v)}
                          </span>
                        ))}
                    </span>
                  </Row>
                  {day.abonosTotal > 0 && (
                    <Row label="Te pagaron de fiados" value={`+${pesos(day.abonosTotal)}`} />
                  )}
                  {day.entradas > 0 && (
                    <Row label="Metiste a la caja" value={`+${pesos(day.entradas)}`} />
                  )}
                  {day.gastos + day.salidas > 0 && (
                    <Row label="Gastos y plata que sacaste" value={`−${pesos(day.gastos + day.salidas)}`} />
                  )}
                </dl>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <label htmlFor="manual-total" className="block text-base font-bold text-slate-900">
                    ¿Cuánto vendiste ese día?
                  </label>
                  <p className="mt-0.5 text-sm text-slate-600">
                    No hay ventas anotadas en la app ese día. Escribe el total que llevaste en tu cuaderno.
                  </p>
                  <MoneyInput
                    id="manual-total"
                    value={manualTotal}
                    onChange={setManualTotal}
                    className="mt-2 h-12 w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 text-lg font-bold tabular-nums outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                  />
                </div>
              )}

              {hasRegisteredSales && (
                <div className="mt-5">
                  <label htmlFor="cash-counted" className="block text-lg font-bold text-slate-900">
                    ¿Cuánta plata hay en el cajón?
                  </label>
                  <p id="cash-counted-hint" className="mt-0.5 text-sm text-slate-600">
                    Cuenta los billetes y monedas. Si no quieres contar hoy, déjalo vacío.
                  </p>
                  <MoneyInput
                    id="cash-counted"
                    ref={countedRef}
                    value={counted}
                    onChange={setCounted}
                    aria-describedby="cash-counted-hint cash-verdict"
                    className="mt-2 h-14 w-full max-w-xs rounded-lg border border-slate-300 px-3 text-2xl font-bold tabular-nums outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                  />
                  <details className="mt-2 text-sm text-slate-600">
                    <summary className="cursor-pointer font-bold text-brand-700">
                      ¿Abriste el día con plata para dar vueltas?
                    </summary>
                    <label className="mt-2 block">
                      <span className="mb-1 block">Base con la que abriste el cajón</span>
                      <MoneyInput
                        value={base}
                        onChange={setBase}
                        className="h-11 w-full max-w-[200px] rounded-lg border border-slate-300 px-3 text-base tabular-nums outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                      />
                    </label>
                  </details>

                  <div id="cash-verdict" role="status" className="mt-4">
                    {verdict ? (
                      <Verdict verdict={verdict} expected={expectedCash} />
                    ) : (
                      <p className="text-base text-slate-600">
                        Debería haber <strong className="tabular-nums text-slate-900">{pesos(expectedCash)}</strong> en efectivo.
                      </p>
                    )}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 text-lg font-bold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Lock className="h-5 w-5" aria-hidden />}
                {saving ? "Cerrando…" : existing ? "Guardar la corrección" : "Cerrar el día"}
              </button>
              {existing && (
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="mt-3 min-h-[44px] w-full text-sm font-bold text-slate-600 hover:text-slate-900"
                >
                  No corregir
                </button>
              )}
            </form>
          )}
        </section>
      )}

      <ClosesHistory closes={closes} loading={loading} />
    </div>
  );
}

function Row({ label, value, strong = false, children }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <dt className="min-w-0">
        <span className={`block ${strong ? "text-base font-bold text-slate-900" : "text-base text-slate-700"}`}>
          {label}
        </span>
        {children}
      </dt>
      <dd className={`shrink-0 tabular-nums ${strong ? "text-xl font-bold text-slate-900" : "text-base font-bold text-slate-800"}`}>
        {value}
      </dd>
    </div>
  );
}

function Verdict({ verdict, expected }) {
  if (verdict.kind === "ok") {
    return (
      <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-lg font-bold text-emerald-900">
        <CheckCircle2 className="h-6 w-6 shrink-0" aria-hidden />
        La caja cuadra
      </p>
    );
  }
  const sobra = verdict.kind === "sobra";
  return (
    <div className={`rounded-lg px-4 py-3 ${sobra ? "bg-amber-50" : "bg-red-50"}`}>
      <p className={`text-lg font-bold ${sobra ? "text-amber-900" : "text-red-800"}`}>
        {sobra ? "Sobran" : "Faltan"} {pesos(verdict.diff)}
      </p>
      <p className={`mt-0.5 text-sm ${sobra ? "text-amber-900" : "text-red-800"}`}>
        Debería haber {pesos(expected)}.{" "}
        {sobra
          ? "¿Quizás una venta que no se anotó?"
          : "Revisa si se pagó algo con plata del cajón sin anotarlo en Gastos."}
      </p>
    </div>
  );
}

function AlreadyClosed({ close, onEdit }) {
  return (
    <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
      <p className="flex items-center gap-2 text-base font-bold text-emerald-900">
        <CheckCircle2 className="h-5 w-5" aria-hidden />
        Ya cerraste este día
      </p>
      <p className="mt-1 text-base text-emerald-900">
        Vendiste <strong className="tabular-nums">{pesos(close.sales_total)}</strong>
        {close.cash_counted != null && (
          <> y contaste <strong className="tabular-nums">{pesos(close.cash_counted)}</strong> en el cajón</>
        )}
        .
      </p>
      <button
        type="button"
        onClick={onEdit}
        className="mt-3 inline-flex h-11 items-center gap-2 rounded-lg bg-white px-4 text-sm font-bold text-emerald-900 ring-1 ring-emerald-200 transition-colors hover:bg-emerald-100"
      >
        <Pencil className="h-4 w-4" aria-hidden />
        Corregir el cierre
      </button>
    </div>
  );
}

// El final de la jornada: lo que pasó hoy en una mirada.
function DayClosed({ summary, owed, onDone }) {
  const prev = summary.previous;
  const vsPrev = prev ? summary.sales_total - prev.sales_total : null;
  return (
    <section
      className="mx-auto max-w-2xl animate-fade-slide-up rounded-xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200"
      aria-labelledby="day-closed-title"
    >
      <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" aria-hidden />
      <h2 id="day-closed-title" className="mt-3 text-2xl font-bold text-slate-900">
        Día cerrado
      </h2>
      <p className="mt-1 text-base capitalize text-slate-600">{longDate(summary.date)}</p>

      <p className="mt-6 text-base text-slate-700">Vendiste</p>
      <p className="text-4xl font-bold tabular-nums text-slate-900">{pesos(summary.sales_total)}</p>
      {vsPrev !== null && (
        <p className="mt-1 text-base text-slate-600">
          {vsPrev === 0
            ? "Lo mismo que el último día cerrado."
            : `${pesos(Math.abs(vsPrev))} ${vsPrev > 0 ? "más" : "menos"} que el ${formatDate(prev.date)}.`}
        </p>
      )}

      <dl className="mx-auto mt-6 grid max-w-md grid-cols-2 gap-3 text-left">
        <div className="rounded-lg bg-slate-50 px-4 py-3">
          <dt className="text-sm text-slate-600">Ganancia aproximada</dt>
          <dd className="text-lg font-bold tabular-nums text-slate-900">{pesos(summary.gain)}</dd>
        </div>
        <div className="rounded-lg bg-slate-50 px-4 py-3">
          <dt className="text-sm text-slate-600">Te deben en fiados</dt>
          <dd className="text-lg font-bold tabular-nums text-slate-900">{pesos(owed)}</dd>
        </div>
        {summary.verdict && (
          <div className="col-span-2 rounded-lg bg-slate-50 px-4 py-3">
            <dt className="text-sm text-slate-600">El cajón</dt>
            <dd className="text-lg font-bold text-slate-900">
              {summary.verdict.kind === "ok"
                ? "Cuadró"
                : `${summary.verdict.kind === "sobra" ? "Sobraron" : "Faltaron"} ${pesos(summary.verdict.diff)}`}
            </dd>
          </div>
        )}
      </dl>

      <button
        type="button"
        onClick={onDone}
        className="mt-6 h-12 rounded-lg bg-brand-600 px-8 text-base font-bold text-white transition-colors hover:bg-brand-700"
      >
        Listo
      </button>
    </section>
  );
}

function ClosesHistory({ closes, loading }) {
  const [yearFilter, setYearFilter] = useState("todos");
  const [monthFilter, setMonthFilter] = useState("todos");
  const [page, setPage] = useState(1);

  const years = useMemo(() => {
    const set = new Set(closes.map((c) => c.date.slice(0, 4)));
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [closes]);

  const filtered = useMemo(
    () =>
      closes.filter((c) => {
        if (yearFilter !== "todos" && c.date.slice(0, 4) !== yearFilter) return false;
        if (monthFilter !== "todos" && c.date.slice(5, 7) !== monthFilter) return false;
        return true;
      }),
    [closes, yearFilter, monthFilter],
  );

  useEffect(() => setPage(1), [yearFilter, monthFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const selectClass =
    "h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-brand-600";

  return (
    <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
        <h3 className="mr-auto text-base font-bold text-slate-900">
          Días cerrados
          <span className="ml-2 font-normal text-slate-600">{filtered.length}</span>
        </h3>
        <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className={selectClass} aria-label="Filtrar por año">
          <option value="todos">Todos los años</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className={selectClass} aria-label="Filtrar por mes">
          <option value="todos">Todos los meses</option>
          {MONTHS.map((m, i) => (
            <option key={m} value={String(i + 1).padStart(2, "0")}>{m}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-base text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          Cargando los días cerrados…
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-14 text-center">
          <CalendarDays className="mx-auto h-8 w-8 text-slate-400" aria-hidden />
          <p className="mt-3 text-base text-slate-700">
            {closes.length === 0 ? "Todavía no has cerrado ningún día." : "No hay días cerrados en ese periodo."}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-sm text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-bold">Día</th>
                  <th className="px-4 py-3 text-right font-bold">Vendiste</th>
                  <th className="px-4 py-3 text-right font-bold">Ganancia</th>
                  <th className="px-4 py-3 text-right font-bold">Gastos</th>
                  <th className="px-4 py-3 text-right font-bold">Cajón</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-800">
                      {formatDate(c.date)}
                      {c.source === "excel" && (
                        <FileSpreadsheet className="ml-1.5 inline h-3.5 w-3.5 text-slate-400" aria-label="Importado del Excel" />
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-bold tabular-nums text-slate-900">
                      {pesos(c.sales_total)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-emerald-800">
                      {pesos(c.gain)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-700">
                      {c.expenses_total ? pesos(c.expenses_total) : "Sin gastos"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-700">
                      {c.cash_counted != null ? pesos(c.cash_counted) : "Sin contar"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 text-sm text-slate-600">
            <span>
              {(current - 1) * PAGE_SIZE + 1}–{Math.min(current * PAGE_SIZE, filtered.length)} de {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={current === 1}
                className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-slate-100 disabled:opacity-40"
                aria-label="Página anterior"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="px-2 tabular-nums">
                {current} / {pageCount}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={current === pageCount}
                className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-slate-100 disabled:opacity-40"
                aria-label="Página siguiente"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
