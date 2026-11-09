"use client";

import { Camera, ScanLine, Search } from "lucide-react";
import { currency } from "@/utils/converts";
import Thumb from "@/components/products/Thumb";

/*
  Buscador único que alimenta el carrito. El estado (texto, índice resaltado,
  teclado) vive en la página porque el lector de código de barras también lo
  toca; aquí sólo se dibuja.
*/
export default function ProductSearchBar({
  inputRef,
  query,
  onQueryChange,
  onKeyDown,
  suggestions,
  suggestionIndex,
  onPick,
  scanning,
  cameraAvailable = false,
  onOpenCamera,
}) {
  return (
    <div className="relative rounded-xl bg-white p-3.5 shadow-sm ring-1 ring-slate-100">
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
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
              className="h-12 w-full rounded-lg border border-slate-300 pl-10 pr-3 text-base outline-none placeholder:text-slate-500 focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />

            {scanning && (
              <span className="pointer-events-none absolute right-3.5 top-1/2 flex -translate-y-1/2 items-center gap-1.5 text-xs font-medium text-teal-600">
                <ScanLine className="h-4 w-4 animate-pulse" aria-hidden />
                Leyendo código…
              </span>
            )}
          </div>

          {/* Solo en el aparato que de verdad puede leer con la cámara (ver
              useCameraScanner). En el computador del mostrador no aparece y la
              barra queda igual que siempre. */}
          {cameraAvailable && (
            <button
              type="button"
              onClick={onOpenCamera}
              aria-label="Escanear con la cámara"
              title="Escanear con la cámara"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-teal-200 bg-teal-50 text-teal-700 transition-colors hover:bg-teal-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              <Camera className="h-[18px] w-[18px]" aria-hidden />
            </button>
          )}
        </div>

        {suggestions.length > 0 && (
          <div
            role="listbox"
            className="absolute left-0 right-0 top-[52px] z-10 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl"
          >
            {suggestions.map((p, i) => {
              const active = i === (suggestionIndex >= 0 ? suggestionIndex : 0);
              // Sin stock en el sistema no bloquea la venta: el inventario de
              // una tienda casi nunca cuadra exacto. Solo se avisa en ámbar.
              const outOfStock = !p.stock || p.stock <= 0;
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
                  className={`flex min-h-[56px] w-full items-center justify-between gap-2.5 border-b border-slate-100 px-3.5 py-2.5 text-left last:border-0 ${
                    active ? "bg-brand-50" : "bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Thumb photo={p.photo} size="h-10 w-10" />
                    <div className="min-w-0">
                      <div className="truncate text-[14.5px] font-bold text-slate-900">
                        {p.name}
                      </div>
                      <div className="truncate text-sm text-slate-600">
                        {outOfStock ? (
                          <span className="font-bold text-amber-800">
                            El inventario dice 0, igual se puede vender
                          </span>
                        ) : (
                          `Quedan ${p.stock}`
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 whitespace-nowrap text-[14.5px] font-bold tabular-nums text-teal-700">
                    {currency(p.price)}
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
