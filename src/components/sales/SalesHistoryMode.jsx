// SalesHistoryMode.jsx
"use client";

import { useMemo, useState } from "react";
import { currency } from "@/utils/converts";
import { localDateKey } from "@/utils/dates";
import {
  METHOD_LABELS,
  formatSaleDate,
  formatSaleTime,
  saleFolio,
  saleLineBase,
  saleLineTotal,
  saleUnitCount,
} from "./salesUtils";

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  History,
  Loader2,
  Search,
} from "lucide-react";
import { matchesText } from "@/lib/text";

/*
  SalesHistoryMode
  - Tercer modo de la página de Ventas: consultar lo ya registrado, no capturar.
    El sidebar del modo "venta por venta" sólo muestra las últimas 8; acá se
    puede buscar, filtrar por fecha y método, y abrir el detalle de líneas.
  - Las ventas anuladas se ocultan por defecto (no cuentan como venta), pero se
    pueden mostrar: quedan como registro de que existieron.
*/

const PAGE_SIZE = 15;

const METHOD_FILTERS = [
  { key: "todos", label: "Todos los métodos" },
  ...Object.entries(METHOD_LABELS).map(([key, label]) => ({ key, label })),
];

export default function SalesHistoryMode({ sales, loading, onVoid }) {
  const [query, setQuery] = useState("");
  const [method, setMethod] = useState("todos");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [showVoided, setShowVoided] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim();
    return sales
      .filter((s) => {
        if (s.voided && !showVoided) return false;
        if (method !== "todos" && s.payment_method !== method) return false;

        // El rango se compara en fecha local (ver localDateKey): usar el ISO
        // crudo correría el día en las ventas de la tarde/noche.
        const day = localDateKey(new Date(s.sale_date));
        if (from && day < from) return false;
        if (to && day > to) return false;

        if (!q) return true;
        return matchesText(
          q,
          saleFolio(s),
          s.client_name,
          ...(s.products || []).map((p) => p.product),
        );
      })
      .sort((a, b) => new Date(b.sale_date) - new Date(a.sale_date));
  }, [sales, query, method, from, to, showVoided]);

  // Los totales resumen lo filtrado, y nunca suman anuladas aunque se estén
  // mostrando: una venta anulada ya devolvió su stock y su plata.
  const totals = useMemo(() => {
    const validas = filtered.filter((s) => !s.voided);
    return {
      ventas: validas.length,
      vendido: validas.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0),
      ganancia: validas.reduce((sum, s) => sum + (Number(s.gain) || 0), 0),
      unidades: validas.reduce((sum, s) => sum + saleUnitCount(s), 0),
      anuladas: filtered.length - validas.length,
    };
  }, [filtered]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const resetPage = (fn) => (value) => {
    fn(value);
    setPage(1);
  };

  const toggleDetail = (id) => setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div className="space-y-4 min-h-screen">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Vendido" value={currency(totals.vendido)} tone="teal" />
        <Stat label="Ganancia" value={currency(totals.ganancia)} tone="emerald" />
        <Stat label="Ventas" value={totals.ventas} tone="slate" />
        <Stat label="Unidades" value={totals.unidades} tone="amber" />
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-100">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
          <div className="relative mr-auto min-w-[210px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => resetPage(setQuery)(e.target.value)}
              placeholder="Buscar por folio, cliente o producto"
              aria-label="Buscar venta"
              className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
          </div>

          <select
            value={method}
            onChange={(e) => resetPage(setMethod)(e.target.value)}
            aria-label="Filtrar por método de pago"
            className="h-9 rounded-lg border border-slate-200 px-2.5 text-sm text-slate-700 outline-none focus:border-teal-500"
          >
            {METHOD_FILTERS.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={from}
            onChange={(e) => resetPage(setFrom)(e.target.value)}
            aria-label="Desde"
            className="h-9 rounded-lg border border-slate-200 px-2.5 text-sm text-slate-700 outline-none focus:border-teal-500"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => resetPage(setTo)(e.target.value)}
            aria-label="Hasta"
            className="h-9 rounded-lg border border-slate-200 px-2.5 text-sm text-slate-700 outline-none focus:border-teal-500"
          />

          <label className="flex items-center gap-1.5 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={showVoided}
              onChange={(e) => resetPage(setShowVoided)(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            Ver anuladas
            {totals.anuladas > 0 && (
              <span className="tabular-nums text-slate-500">
                ({totals.anuladas})
              </span>
            )}
          </label>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando ventas…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <History className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-600">
              {sales.length === 0
                ? "Aún no hay ventas registradas"
                : "Ninguna venta coincide con el filtro"}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-sm text-slate-600">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Folio</th>
                    <th className="px-4 py-2.5 font-medium">Fecha</th>
                    <th className="px-4 py-2.5 font-medium">Pago</th>
                    <th className="px-4 py-2.5 text-right font-medium">Unid.</th>
                    <th className="px-4 py-2.5 text-right font-medium">Total</th>
                    <th className="px-4 py-2.5 text-right font-medium">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {visible.map((sale) => (
                    <SaleRows
                      key={sale.id}
                      sale={sale}
                      open={expandedId === sale.id}
                      onToggle={() => toggleDetail(sale.id)}
                      onVoid={onVoid}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-sm text-slate-500">
              <span>
                {(current - 1) * PAGE_SIZE + 1}–
                {Math.min(current * PAGE_SIZE, filtered.length)} de{" "}
                {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={current === 1}
                  className="rounded p-1.5 hover:bg-slate-100 disabled:opacity-40"
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-2 tabular-nums">
                  {current} / {pageCount}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={current === pageCount}
                  className="rounded p-1.5 hover:bg-slate-100 disabled:opacity-40"
                  aria-label="Página siguiente"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SaleRows({ sale, open, onToggle, onVoid }) {
  const lines = sale.products || [];

  return (
    <>
      <tr className={`hover:bg-slate-50 ${sale.voided ? "opacity-60" : ""}`}>
        <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[12.5px] text-slate-500">
          {saleFolio(sale)}
        </td>
        <td className="whitespace-nowrap px-4 py-2.5 text-slate-700">
          {formatSaleDate(sale.sale_date)}
          <span className="ml-1.5 text-xs text-slate-500">
            {formatSaleTime(sale.sale_date)}
          </span>
        </td>
        <td className="whitespace-nowrap px-4 py-2.5">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11.5px] font-bold text-slate-700">
            {METHOD_LABELS[sale.payment_method] || sale.payment_method}
          </span>
          {sale.client_name && (
            <span className="ml-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-[11.5px] font-bold text-amber-800">
              {sale.client_name}
            </span>
          )}
          {sale.voided && (
            <span className="ml-1.5 rounded-full bg-red-100 px-2 py-0.5 text-[11.5px] font-bold text-red-700">
              Anulada
            </span>
          )}
        </td>
        <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-slate-600">
          {saleUnitCount(sale)}
        </td>
        <td
          className={`whitespace-nowrap px-4 py-2.5 text-right font-medium tabular-nums text-slate-800 ${sale.voided ? "line-through" : ""}`}
        >
          {currency(sale.total_amount)}
        </td>
        <td className="whitespace-nowrap px-4 py-2.5 text-right">
          <div className="flex items-center justify-end gap-3">
            {!sale.voided && onVoid && (
              <button
                type="button"
                onClick={() => onVoid(sale.id)}
                className="text-[12.5px] font-bold text-red-700 underline hover:text-red-800"
              >
                Anular
              </button>
            )}
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={open}
              aria-label={`${open ? "Ocultar" : "Ver"} detalle de la venta ${saleFolio(sale)}`}
              className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-600"
            >
              <ChevronDown
                className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
              />
            </button>
          </div>
        </td>
      </tr>

      {open && (
        <tr className="bg-slate-50/60">
          <td colSpan={6} className="px-4 py-3">
            {lines.length === 0 ? (
              <p className="text-sm text-slate-500">
                Esta venta no guardó el detalle de sus líneas.
              </p>
            ) : (
              <table className="w-full text-left text-[13px]">
                <thead className="text-sm text-slate-600">
                  <tr>
                    <th className="py-1 font-medium">Producto</th>
                    <th className="py-1 text-right font-medium">Cant.</th>
                    <th className="py-1 text-right font-medium">Precio</th>
                    <th className="py-1 text-right font-medium">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, i) => {
                    const conDescuento =
                      !!line.discount_type && Number(line.discount_value) > 0;
                    return (
                      <tr key={`${sale.id}-${line.product_id}-${i}`}>
                        <td className="py-1 text-slate-700">
                          {line.product || `Producto #${line.product_id}`}
                          {conDescuento && (
                            <span className="ml-1.5 text-xs text-teal-700">
                              −
                              {line.discount_type === "pct"
                                ? `${line.discount_value}%`
                                : currency(line.discount_value)}
                            </span>
                          )}
                        </td>
                        <td className="py-1 text-right tabular-nums text-slate-600">
                          {line.quantity}
                        </td>
                        <td className="py-1 text-right tabular-nums text-slate-600">
                          {currency(line.sale_price)}
                        </td>
                        <td className="py-1 text-right tabular-nums text-slate-800">
                          {currency(saleLineTotal(line))}
                          {conDescuento && (
                            <span className="ml-1.5 text-xs text-slate-500 line-through">
                              {currency(saleLineBase(line))}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function Stat({ label, value, tone }) {
  const tones = {
    teal: "text-teal-700",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    slate: "text-slate-800",
  };
  return (
    <div className="rounded-xl bg-white p-3.5 shadow-sm ring-1 ring-slate-100">
      <div className="text-xs text-slate-500">{label}</div>
      <p className={`mt-1.5 text-lg font-semibold tabular-nums ${tones[tone]}`}>
        {value}
      </p>
    </div>
  );
}
