"use client";

import { Ban, Loader2, PackageSearch, RotateCcw } from "lucide-react";
import { currency } from "@/utils/converts";

// Productos ya guardados de un pedido abierto (a diferencia de OrderLines, que
// es el carrito local de un pedido que todavía no existe en la base). Cada
// producto tiene su propia fase — por_pedir/en_espera, o cancelado si ya no
// hace falta — independiente del resto del pedido: no hace falta esperar a
// tener todo listo para dejar constancia de que ya se sabe que hay que
// pedirlo. "Recibido" no se elige acá: se pone junto para todos al recibir el
// pedido completo, porque el proveedor siempre entrega todo de una vez.
const PHASES = [
  { value: "por_pedir", label: "Por pedir" },
  { value: "en_espera", label: "En espera" },
];

function ItemStatusControl({ item, onChange }) {
  if (item.status === "cancelado") {
    return (
      <button
        type="button"
        onClick={() => onChange(item.id, "por_pedir")}
        className="flex h-9 items-center gap-1.5 rounded-full border border-slate-200 px-3 text-[12.5px] font-bold text-slate-500 hover:bg-slate-50"
      >
        <RotateCcw className="h-3.5 w-3.5" aria-hidden />
        Restaurar
      </button>
    );
  }
  if (item.status === "recibido") {
    return (
      <span className="inline-flex h-9 items-center rounded-full bg-emerald-100 px-3 text-[12.5px] font-bold text-emerald-800">
        Recibido
      </span>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex h-9 overflow-hidden rounded-full border border-slate-200">
        {PHASES.map((phase) => (
          <button
            key={phase.value}
            type="button"
            aria-pressed={item.status === phase.value}
            onClick={() => onChange(item.id, phase.value)}
            className={`px-3 text-[12.5px] font-bold transition-colors ${
              item.status === phase.value
                ? "bg-indigo-600 text-white"
                : "bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {phase.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange(item.id, "cancelado")}
        aria-label={`Ya no necesito ${item.product}`}
        title="Ya no lo necesito"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-red-50 hover:text-red-600"
      >
        <Ban className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}

export default function OrderItemsPanel({
  items,
  busyItemId,
  onChangeStatus,
  justAddedId,
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3.5 rounded-xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-100 sm:p-12">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 ring-1 ring-indigo-100">
          <PackageSearch className="h-8 w-8 text-indigo-600" aria-hidden />
        </div>
        <p className="text-lg font-bold text-slate-900">
          Este pedido todavía no tiene productos
        </p>
        <p className="max-w-sm text-sm leading-relaxed text-slate-500">
          Busca arriba lo que sabes que hay que pedirle a este proveedor. Cada
          producto queda guardado apenas lo agregas, sin esperar a cerrar el
          pedido.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-1.5 shadow-sm ring-1 ring-slate-100">
      {items.map((item) => {
        const cancelled = item.status === "cancelado";
        const busy = busyItemId === item.id;
        const justAdded = item.id === justAddedId;
        return (
          <div
            key={item.id}
            className={`flex flex-wrap items-center gap-2.5 border-b border-slate-100 p-3 transition-[opacity,background-color] duration-700 last:border-0 ${
              cancelled ? "opacity-50" : ""
            } ${justAdded ? "bg-indigo-50" : "bg-white"}`}
          >
            <div className="min-w-[140px] flex-1">
              <div
                className={`text-[15px] font-bold text-slate-900 ${cancelled ? "line-through" : ""}`}
              >
                {item.product}
              </div>
              <div className="mt-0.5 text-xs text-slate-500">
                {item.quantity} × {currency(item.unit_cost)}
              </div>
            </div>

            <div className="w-[100px] shrink-0 text-right text-[15px] font-bold tabular-nums text-slate-900">
              {currency(item.quantity * item.unit_cost)}
            </div>

            {busy ? (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center text-indigo-500">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              <ItemStatusControl item={item} onChange={onChangeStatus} />
            )}
          </div>
        );
      })}
    </div>
  );
}
