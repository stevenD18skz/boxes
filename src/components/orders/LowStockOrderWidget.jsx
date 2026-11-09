"use client";

import { AlertTriangle, Plus } from "lucide-react";
import { LOW_STOCK_THRESHOLD } from "@/components/products/productsUtils";

// Los 10 productos con menos stock, con un botón para sumarlos directo al
// pedido que está abierto ahora mismo (o al carrito nuevo, si no hay ninguno
// abierto) — un solo clic, sin tener que ir a buscarlos de nuevo en el
// buscador de arriba.
export default function LowStockOrderWidget({ products, onAdd }) {
  const items = [...products]
    .sort((a, b) => Number(a.stock) - Number(b.stock))
    .slice(0, 10);

  if (items.length === 0) return null;

  return (
    <div className="rounded-xl bg-white p-[18px] shadow-sm ring-1 ring-slate-100">
      <div className="mb-3 flex items-center gap-1.5 text-sm font-bold text-slate-600">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" aria-hidden />
        Top 10 con menos stock
      </div>
      <div className="flex flex-col gap-1">
        {items.map((p) => {
          const low = Number(p.stock) <= LOW_STOCK_THRESHOLD;
          return (
            <div
              key={p.id}
              className="flex items-center gap-2.5 rounded-lg px-1.5 py-2 hover:bg-slate-50"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-semibold text-slate-900">
                  {p.name}
                </div>
                <div className="mt-0.5 truncate text-xs text-slate-500">
                  SKU {p.sku}
                </div>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-bold tabular-nums ${
                  low
                    ? "bg-amber-100 text-amber-800"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {p.stock} un.
              </span>
              <button
                type="button"
                onClick={() => onAdd(p)}
                aria-label={`Agregar ${p.name} al pedido`}
                title="Agregar al pedido"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <Plus className="h-4 w-4" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
