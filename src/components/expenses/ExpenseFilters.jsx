"use client";

import { Search } from "lucide-react";
import { KIND_META, MONTHS } from "./expensesUtils";

// Tipo, año, mes y búsqueda libre sobre el concepto y la nota.
export default function ExpenseFilters({
  kindFilter,
  onKindFilterChange,
  years,
  yearFilter,
  onYearFilterChange,
  monthFilter,
  onMonthFilterChange,
  query,
  onQueryChange,
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-md border border-slate-200 p-0.5">
          {["todos", "gasto", "entrada", "salida"].map((k) => (
            <button
              key={k}
              onClick={() => onKindFilterChange(k)}
              className={`rounded px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                kindFilter === k
                  ? "bg-blue-600 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {k === "todos" ? "Todos" : KIND_META[k].label}
            </button>
          ))}
        </div>

        <select
          value={yearFilter}
          onChange={(e) => onYearFilterChange(e.target.value)}
          className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
          aria-label="Filtrar por año"
        >
          <option value="todos">Todos los años</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        <select
          value={monthFilter}
          onChange={(e) => onMonthFilterChange(e.target.value)}
          className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
          aria-label="Filtrar por mes"
        >
          <option value="todos">Todos los meses</option>
          {MONTHS.map((m, i) => (
            <option key={m} value={String(i + 1).padStart(2, "0")}>
              {m}
            </option>
          ))}
        </select>

        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Buscar por concepto o nota…"
            className="w-full rounded-md border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
