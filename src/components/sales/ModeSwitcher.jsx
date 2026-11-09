"use client";

import { CalendarDays, History, ShoppingCart } from "lucide-react";

// Modos de la página de Ventas:
//  - transaccion: cobrar venta por venta con carrito.
//  - cierre: anotar un único total al final del día (como venía el Excel).
//  - historial: consultar las ventas ya registradas.
export const SALE_MODES = [
  { key: "transaccion", label: "Vender", icon: ShoppingCart },
  { key: "cierre", label: "Cerrar el día", icon: CalendarDays },
  { key: "historial", label: "Ventas anteriores", icon: History },
];

export default function ModeSwitcher({ mode, onChange }) {
  return (
    <div className="mb-4 flex w-fit flex-wrap rounded-lg bg-white p-1 shadow-sm ring-1 ring-slate-100">
      {SALE_MODES.map((m) => (
        <button
          key={m.key}
          onClick={() => onChange(m.key)}
          aria-pressed={mode === m.key}
          className={`inline-flex min-h-[44px] items-center gap-2 rounded-md px-4 py-2 text-base font-bold transition-colors ${
            mode === m.key
              ? "bg-brand-600 text-white"
              : "text-slate-700 hover:bg-slate-50"
          }`}
        >
          <m.icon className="h-5 w-5" aria-hidden />
          {m.label}
        </button>
      ))}
    </div>
  );
}
