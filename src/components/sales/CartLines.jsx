"use client";

import {
  Camera,
  DollarSign,
  Minus,
  Percent,
  Plus,
  ScanLine,
  Search,
  ShoppingCart,
  Smartphone,
  Trash2,
} from "lucide-react";
import { currency, formatMoney } from "@/utils/converts";
import Thumb from "@/components/products/Thumb";
import { lineBase, lineSubtotal } from "./salesUtils";

// Ancho fijo (no columnas de grid) a propósito: con flex-wrap + justify-center,
// una tarjeta suelta en la última fila queda centrada en vez de pegada a la
// izquierda, que es lo que se veía mal cuando el número de tarjetas era impar.
const METHOD_CARD_CLASS =
  "flex w-full min-h-[44px] items-start gap-2.5 rounded-lg border border-slate-200 p-3 text-left sm:w-[calc(50%-5px)]";
const METHOD_CARD_BUTTON_CLASS =
  `${METHOD_CARD_CLASS} group transition-colors hover:border-teal-300 hover:bg-teal-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500`;
const METHOD_ICON_CLASS =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 transition-colors group-hover:bg-white";

// Carrito vacío: además de decir que no hay nada, enseña las formas de
// llenarlo. El escaneo es el camino rápido para quien está de pie en el
// mostrador -por eso se explica primero, incluso antes de que exista una
// línea que lo demuestre-, y las tarjetas de cámara/celular sólo aparecen
// cuando ese aparato de verdad puede usarlas (mismos props que ya decidían
// esto en la barra de búsqueda, ver ProductSearchBar).
export function CartEmptyState({
  cameraAvailable = false,
  onOpenCamera,
  phoneAvailable = false,
  phoneConnected = false,
  onOpenPhoneModal,
}) {
  return (
    <div className="flex flex-col items-center gap-3.5 rounded-xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-100 sm:p-12">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 ring-1 ring-teal-100">
        <ShoppingCart className="h-8 w-8 text-teal-600" aria-hidden />
      </div>
      <p className="text-lg font-bold text-slate-900">
        Aún no agregas productos
      </p>
      <p className="max-w-sm text-sm leading-relaxed text-slate-500">
        Escribe arriba para buscar, o escanea el código de barras: el
        producto se agrega solo, con la cantidad y el precio correctos.
      </p>

      <div className="mt-2 flex w-full max-w-lg flex-col items-center gap-2.5">
        {/* Destacado, solo y centrado arriba: es el camino que de verdad
            ahorra tiempo en el mostrador, así que va antes que el resto. */}
        <div className={METHOD_CARD_CLASS}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50">
            <ScanLine className="h-[18px] w-[18px] text-teal-600" aria-hidden />
          </span>
          <span>
            <span className="block text-[13px] font-semibold text-slate-900">
              Lector o app de escaneo
            </span>
            <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
              Pasa el código y listo, sin tocar nada más.
            </span>
          </span>
        </div>

        {/* El resto se envuelve centrado: si son dos quedan una junto a la
            otra, y si sobra una sola en la última fila queda centrada en vez
            de pegada a la izquierda. */}
        <div className="flex w-full flex-wrap justify-center gap-2.5">
          <div className={METHOD_CARD_CLASS}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
              <Search className="h-[18px] w-[18px] text-slate-500" aria-hidden />
            </span>
            <span>
              <span className="block text-[13px] font-semibold text-slate-900">
                Buscar a mano
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                Por el nombre o pasando el código de barras.
              </span>
            </span>
          </div>

          {cameraAvailable && (
            <button
              type="button"
              onClick={onOpenCamera}
              className={METHOD_CARD_BUTTON_CLASS}
            >
              <span className={METHOD_ICON_CLASS}>
                <Camera className="h-[18px] w-[18px] text-teal-600" aria-hidden />
              </span>
              <span>
                <span className="block text-[13px] font-semibold text-slate-900">
                  Cámara de este aparato
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                  Toca para abrir el visor y escanear varios seguidos.
                </span>
              </span>
            </button>
          )}

          {phoneAvailable && (
            <button
              type="button"
              onClick={onOpenPhoneModal}
              className={METHOD_CARD_BUTTON_CLASS}
            >
              <span className={METHOD_ICON_CLASS}>
                <Smartphone className="h-[18px] w-[18px] text-teal-600" aria-hidden />
              </span>
              <span>
                <span className="block text-[13px] font-semibold text-slate-900">
                  {phoneConnected ? "Celular vinculado" : "Usar el celular como lector"}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                  {phoneConnected
                    ? "Ya está listo: escanea desde ahí."
                    : "Empareja tu celular y úsalo de lector remoto."}
                </span>
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Editor de descuento por línea. El botón que lo abre sigue desactivado (ver
// nota en CartLine), pero el editor se conserva funcionando para cuando se
// habilite.
function DiscountEditor({
  draftType,
  onDraftTypeChange,
  draftValue,
  onDraftValueChange,
  onCancel,
  onApply,
}) {
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-2.5">
      <div className="flex overflow-hidden rounded-md border border-slate-200">
        <button
          type="button"
          aria-label="Descuento en porcentaje"
          onClick={() => onDraftTypeChange("pct")}
          className={`flex h-[34px] items-center gap-1 px-3 text-[13px] font-bold ${draftType === "pct" ? "bg-teal-600 text-white" : "bg-white text-slate-700"}`}
        >
          <Percent className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label="Descuento en pesos"
          onClick={() => onDraftTypeChange("amount")}
          className={`flex h-[34px] items-center gap-1 px-3 text-[13px] font-bold ${draftType === "amount" ? "bg-teal-600 text-white" : "bg-white text-slate-700"}`}
        >
          <DollarSign className="h-3.5 w-3.5" />
        </button>
      </div>
      <input
        type="number"
        min="0"
        value={draftValue}
        onChange={(e) => onDraftValueChange(e.target.value)}
        placeholder="0"
        autoFocus
        className="h-[34px] w-24 rounded-md border border-slate-200 px-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
      />
      <button
        type="button"
        onClick={onCancel}
        className="h-[34px] rounded-md border border-slate-200 bg-white px-3 text-[13px] font-bold text-slate-700 hover:bg-slate-50"
      >
        Cancelar
      </button>
      <button
        type="button"
        onClick={onApply}
        className="h-[34px] rounded-md bg-teal-600 px-3.5 text-[13px] font-bold text-white hover:bg-teal-700"
      >
        Aplicar
      </button>
    </div>
  );
}

function CartLine({
  line,
  qtyRefs,
  onQtyChange,
  onQtyStep,
  onQtyKeyDown,
  onRemove,
  discount,
  justAdded,
}) {
  const hasDiscount = !!line.discountType && line.discountValue > 0;

  return (
    <div
      className={`border-b border-slate-100 p-3 transition-colors duration-700 last:border-0 ${
        justAdded ? "bg-teal-50" : "bg-white"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex min-w-[140px] flex-1 items-center gap-2.5">
          <Thumb photo={line.photo} size="h-11 w-11" />
          <div className="min-w-0">
            <div className="truncate text-[18px] font-bold text-slate-900">
              {line.name}
            </div>
            <div className="mt-0.5 text-xs text-slate-500">SKU {line.sku}</div>
          </div>
        </div>

        {/* Valor unitario: el subtotal de la derecha ya viene multiplicado, así
            que sin esto no hay forma de ver a cómo se está cobrando cada uno. */}
        <div className="shrink-0 whitespace-nowrap text-xs text-slate-500">
          V.U:{" "}
          <span className="text-[13px] font-semibold tabular-nums text-slate-600">
            {formatMoney(line.unitPrice) || "0"}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Restar"
            onClick={() => onQtyStep(line._key, -1)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <input
            ref={(el) => (qtyRefs.current[line._key] = el)}
            type="number"
            min="1"
            value={line.quantity}
            onChange={(e) => onQtyChange(line._key, e.target.value)}
            onKeyDown={onQtyKeyDown}
            aria-label={`Cantidad de ${line.name}`}
            className="no-spinner h-11 w-14 rounded-md border border-slate-200 text-center text-base font-bold tabular-nums text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />
          <button
            type="button"
            aria-label="Sumar"
            onClick={() => onQtyStep(line._key, 1)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="w-[110px] shrink-0 text-right">
          <div className="text-[15px] font-bold tabular-nums text-slate-900">
            {currency(lineSubtotal(line))}
          </div>
          {hasDiscount && (
            <div className="text-xs tabular-nums text-slate-500 line-through">
              {currency(lineBase(line))}
            </div>
          )}
        </div>

        <button
          type="button"
          aria-label={`Quitar ${line.name}`}
          onClick={() => onRemove(line._key)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-700 hover:bg-red-100"
        >
          <Trash2 className="h-[15px] w-[15px]" />
        </button>
      </div>

      {/* Botón para abrir/quitar el descuento por línea — desactivado
          intencionalmente, se conserva para reactivarlo cuando se decida:

      <div className="mt-2 pl-0.5">
        {hasDiscount ? (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
            Descuento {discountLabel}
            <button type="button" aria-label="Quitar descuento"
              onClick={() => discount.onRemove(line._key)}
              className="text-slate-500 hover:text-slate-700">
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => discount.onOpen(line._key)}
            className="text-[12.5px] font-bold text-teal-700 underline hover:text-teal-800">
            Agregar descuento
          </button>
        )}
      </div>
      */}

      {discount.editingKey === line._key && (
        <DiscountEditor
          draftType={discount.draftType}
          onDraftTypeChange={discount.onDraftTypeChange}
          draftValue={discount.draftValue}
          onDraftValueChange={discount.onDraftValueChange}
          onCancel={discount.onCancel}
          onApply={discount.onApply}
        />
      )}
    </div>
  );
}

export default function CartLines({
  lines,
  qtyRefs,
  onQtyChange,
  onQtyStep,
  onQtyKeyDown,
  onRemove,
  discount,
  justAddedKey,
  cameraAvailable,
  onOpenCamera,
  phoneAvailable,
  phoneConnected,
  onOpenPhoneModal,
}) {
  if (lines.length === 0)
    return (
      <CartEmptyState
        cameraAvailable={cameraAvailable}
        onOpenCamera={onOpenCamera}
        phoneAvailable={phoneAvailable}
        phoneConnected={phoneConnected}
        onOpenPhoneModal={onOpenPhoneModal}
      />
    );

  return (
    <div className="rounded-xl bg-white p-1.5 shadow-sm ring-1 ring-slate-100">
      {lines.map((line) => (
        <CartLine
          key={line._key}
          line={line}
          qtyRefs={qtyRefs}
          onQtyChange={onQtyChange}
          onQtyStep={onQtyStep}
          onQtyKeyDown={onQtyKeyDown}
          onRemove={onRemove}
          discount={discount}
          justAdded={line._key === justAddedKey}
        />
      ))}
    </div>
  );
}
