"use client";

import { Search } from "lucide-react";
import { currency } from "@/utils/converts";

// Buscador que agrega productos al pedido. Muestra el costo, no el precio de
// venta: acá se está comprando. También el stock actual, que es lo que decide
// cuánto pedir.
export default function OrderProductSearch({
  inputRef,
  query,
  onQueryChange,
  onKeyDown,
  suggestions,
  suggestionIndex,
  onPick,
}) {
  return (
    <div className="relative rounded-xl bg-white p-3.5 shadow-sm ring-1 ring-slate-100">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-500" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Escribe el producto o escanea el código"
          aria-label="Buscar producto"
          role="combobox"
          aria-expanded={suggestions.length > 0}
          className="h-[46px] w-full rounded-lg border border-slate-200 pl-10 pr-3 text-[15px] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
        {suggestions.length > 0 && (
          <div
            role="listbox"
            className="absolute left-0 right-0 top-[52px] z-10 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl"
          >
            {suggestions.map((p, i) => {
              const active = i === (suggestionIndex >= 0 ? suggestionIndex : 0);
              return (
                <button
                  key={p.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onPick(p);
                  }}
                  className={`flex w-full items-center justify-between gap-2.5 border-b border-slate-100 px-3.5 py-2.5 text-left last:border-0 ${active ? "bg-indigo-50" : "bg-white hover:bg-slate-50"}`}
                >
                  <div className="min-w-0">
                    <div className="truncate text-[14.5px] font-bold text-slate-900">
                      {p.name}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      SKU {p.sku} · Stock actual: {p.stock}
                    </div>
                  </div>
                  <div className="shrink-0 whitespace-nowrap text-[14.5px] font-bold tabular-nums text-indigo-700">
                    {currency(p.cost_price)}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
