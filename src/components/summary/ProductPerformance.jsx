"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { matchesText } from "@/lib/text";
import { pesos } from "@/utils/converts";
import WaitingForData from "./WaitingForData";

const INITIAL_ROWS = 10;

// Lo que más se vendió en el período, sacado de las ventas registradas una
// por una (el Excel solo guardaba el total del día, sin decir qué). Es una
// tabla y no una gráfica: lo que se busca aquí es leer cifras exactas.
export default function ProductPerformance({ sales = [], search, onSearchChange }) {
  const [showAll, setShowAll] = useState(false);

  const rows = useMemo(() => {
    const byProduct = new Map();
    for (const sale of sales) {
      for (const line of sale.products ?? []) {
        const key = line.product_id ?? line.product;
        const qty = Number(line.quantity) || 0;
        let amount = qty * (Number(line.sale_price) || 0);
        if (line.discount_type === "pct") amount *= 1 - (Number(line.discount_value) || 0) / 100;
        else if (line.discount_type === "amount") amount -= Number(line.discount_value) || 0;
        const current = byProduct.get(key) ?? { name: line.product, units: 0, amount: 0 };
        current.units += qty;
        current.amount += Math.max(0, amount);
        byProduct.set(key, current);
      }
    }
    return [...byProduct.values()].sort((a, b) => b.amount - a.amount);
  }, [sales]);

  const filtered = rows.filter((r) => matchesText(search, r.name));
  const visible = showAll || search ? filtered : filtered.slice(0, INITIAL_ROWS);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">¿Qué se vendió más?</h2>
          <p className="mt-0.5 text-sm text-slate-600">
            Primero lo que más plata dejó en el período.
          </p>
        </div>
        {rows.length > 0 && (
          <div className="relative min-w-[220px]">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500"
              aria-hidden
            />
            <input
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar un producto"
              aria-label="Buscar un producto"
              className="h-11 w-full rounded-lg border border-slate-300 pl-10 pr-3 text-base outline-none placeholder:text-slate-500 focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <WaitingForData
          title="Todavía no hay ventas registradas en este período"
          detail="Cuando registres ventas en la app, aquí ves qué productos se vendieron y cuánto dejó cada uno."
          cta="Ir a vender"
          href="/sales"
        />
      ) : filtered.length === 0 ? (
        <p className="py-6 text-center text-base text-slate-600">
          Ningún producto vendido se llama «{search}».
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-slate-200 text-sm text-slate-600">
                <tr>
                  <th className="py-2.5 pr-3 font-bold">Producto</th>
                  <th className="px-3 py-2.5 text-right font-bold">Unidades</th>
                  <th className="py-2.5 pl-3 text-right font-bold">Vendiste</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-base">
                {visible.map((r) => (
                  <tr key={r.name}>
                    <td className="py-2.5 pr-3 text-slate-900">{r.name}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">
                      {r.units.toLocaleString("es-CO")}
                    </td>
                    <td className="py-2.5 pl-3 text-right font-bold tabular-nums text-slate-900">
                      {pesos(r.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!search && filtered.length > INITIAL_ROWS && (
            <button
              type="button"
              onClick={() => setShowAll((s) => !s)}
              className="mt-2 min-h-[44px] text-sm font-bold text-brand-700 hover:underline"
            >
              {showAll ? "Ver solo los 10 primeros" : `Ver los ${filtered.length} productos`}
            </button>
          )}
        </>
      )}
    </section>
  );
}
