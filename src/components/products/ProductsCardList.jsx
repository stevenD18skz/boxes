"use client";

import { Edit3, Trash2 } from "lucide-react";
import Checkbox from "@/components/ui/Checkbox";
import { currency } from "@/utils/converts";
import StockBadge from "./StockBadge";
import StockStepper from "./StockStepper";
import Thumb from "./Thumb";
import { categoryOf, getMargin } from "./productsUtils";

// La misma información de la tabla, apilada para el teléfono: identificación
// arriba, la plata en una tira de tres, y stock y acciones al pie. El margen en
// porcentaje se deja por fuera a propósito: en pantalla chica pesa más ver el
// número en pesos.
export default function ProductsCardList({
  items,
  selected,
  onToggleSelect,
  onStockCommit,
  onEdit,
  onDelete,
  onZoomPhoto,
}) {
  return (
    <div className="mt-4 space-y-3 md:hidden">
      {items.map((p) => (
        <div
          key={p.id}
          className={`rounded-2xl bg-white p-3.5 shadow-sm ring-1 transition-colors ${
            selected.has(p.id)
              ? "bg-blue-50 ring-2 ring-blue-300"
              : "ring-slate-100"
          }`}
        >
          <div className="flex gap-3">
            <div className="pt-1">
              <Checkbox
                checked={selected.has(p.id)}
                onChange={() => onToggleSelect(p.id)}
                ariaLabel={`Seleccionar ${p.name}`}
              />
            </div>
            <Thumb
              photo={p.photo}
              size="h-14 w-14"
              label={p.name}
              onZoom={onZoomPhoto ? () => onZoomPhoto(p) : undefined}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[16px] font-bold text-slate-900">
                {p.name}
              </div>
              {p.sku ? (
                <div className="truncate text-[12.5px] text-slate-500">
                  SKU {p.sku}
                </div>
              ) : null}
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                  {categoryOf(p)}
                </span>
                {/* La marca solo aparece si la hay: en el teléfono el espacio
                    es el recurso escaso y un chip "Sin marca" no dice nada. */}
                {p.brand && (
                  <span className="inline-block rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                    {p.brand}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-2.5">
            <div>
              <div className="text-sm font-bold text-slate-600">
                Costo
              </div>
              <div className="mt-0.5 text-[14px] font-semibold tabular-nums text-slate-700">
                {currency(p.cost_price)}
              </div>
            </div>
            <div>
              <div className="text-sm font-bold text-slate-600">
                Precio
              </div>
              <div className="mt-0.5 text-[14px] font-bold tabular-nums text-slate-900">
                {currency(p.price)}
              </div>
            </div>
            <div>
              <div className="text-sm font-bold text-slate-600">
                Le ganas
              </div>
              <div
                className={`mt-0.5 text-[14px] font-bold tabular-nums ${
                  getMargin(p) >= 0 ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {getMargin(p) >= 0 ? "+" : ""}
                {currency(getMargin(p))}
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5 border-t border-slate-100 pt-3">
            <div>
              <StockStepper
                value={p.stock}
                onCommit={(val) => onStockCommit(p.id, val)}
              />
              <StockBadge stock={p.stock} />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(p)}
                aria-label={`Editar ${p.name}`}
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                <Edit3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => onDelete(p)}
                aria-label={`Eliminar ${p.name}`}
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-700 hover:bg-red-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
