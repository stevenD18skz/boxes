"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import Chip from "@/components/ui/Chip";

// Buscador + botón de filtros + resumen de lo que está filtrado ahora mismo.
// Mismo patrón que ProductsToolbar (ver components/products), con el acento
// índigo de Pedidos.
export default function OrdersHistoryToolbar({
  query,
  onQueryChange,
  filtersOpen,
  onToggleFilters,
  activeFilterCount,
  filterChips,
  onClearAll,
}) {
  return (
    <div className="rounded-xl bg-white p-3.5 shadow-sm ring-1 ring-slate-100">
      <div className="flex flex-wrap gap-2.5">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-500" />
          <input
            aria-label="Buscar pedidos"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Buscar por proveedor, nota o producto"
            className="h-11 w-full rounded-lg border border-slate-200 pl-10 pr-9 text-[15px] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
          {query && (
            <button
              onClick={() => onQueryChange("")}
              aria-label="Limpiar búsqueda"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <button
          onClick={onToggleFilters}
          aria-expanded={filtersOpen}
          className="relative flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <SlidersHorizontal className="h-[18px] w-[18px]" />
          Filtros
          {activeFilterCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {(() => {
        const hasActive = query.trim() || filterChips.length > 0;
        return (
          <div
            className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
              hasActive
                ? "grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="overflow-hidden">
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                <span className="text-xs font-medium text-slate-500">
                  Filtros activos:
                </span>
                {query.trim() && (
                  <Chip
                    label={`"${query.trim()}"`}
                    onRemove={() => onQueryChange("")}
                  />
                )}
                {filterChips.map((c) => (
                  <Chip key={c.key} label={c.label} onRemove={c.onRemove} />
                ))}
                <button
                  onClick={onClearAll}
                  className="text-xs font-semibold text-slate-500 underline hover:text-slate-700"
                >
                  Limpiar todo
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
