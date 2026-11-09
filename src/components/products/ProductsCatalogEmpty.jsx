"use client";

import Link from "next/link";
import {
  ArrowRight,
  FileSpreadsheet,
  PackagePlus,
  ScanLine,
} from "lucide-react";

// Catálogo realmente vacío: la tienda no tiene ni un producto todavía.
//
// Es un caso distinto de ProductsEmptyState, que aparece cuando sí hay
// catálogo pero la búsqueda o los filtros no devolvieron nada. Allá la salida
// es limpiar filtros; acá no hay nada que limpiar y la pantalla tiene un solo
// trabajo: que el primer producto entre.
//
// Se ofrecen los tres caminos que ya existen en la página, ordenados por lo
// que le sirve a quien recién abre la tienda: agregar uno a mano funciona
// siempre, así que va primero y es el único botón azul. El lector y el CSV
// quedan como atajos para quien ya tiene con qué.
const OPTION_CLASS =
  "group flex min-h-[44px] items-start gap-3.5 rounded-xl border border-slate-200 p-4 text-left transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500";

const OPTION_ICON_CLASS =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 transition-colors group-hover:bg-white";

export default function ProductsCatalogEmpty({
  onNew,
  onScan,
  onImport,
  onDownloadTemplate,
}) {
  return (
    <section
      aria-labelledby="catalogo-vacio-titulo"
      className="min-h-[740px] mt-4 rounded-xl bg-white items-center justify-center flex flex-col items-center p-8 shadow-sm ring-1 ring-slate-100 sm:p-12"
    >
      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 ring-1 ring-blue-100">
          <PackagePlus className="h-8 w-8 text-blue-600" aria-hidden />
        </div>

        <h3
          id="catalogo-vacio-titulo"
          className="mt-5 text-xl font-bold tracking-tight text-slate-900"
        >
          Todavía no tienes productos
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          El catálogo es la base de todo lo demás: sin productos no se puede
          cobrar una venta, pedirle a un proveedor ni sacar un reporte. Agrega
          el primero y el resto de la aplicación se enciende.
        </p>

        <button
          type="button"
          onClick={onNew}
          className="group mt-6 flex min-h-[44px] items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Agregar mi primer producto
          <ArrowRight
            className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
            aria-hidden
          />
        </button>
      </div>

      <div className="mx-auto mt-10 max-w-2xl">
        <h4 className="text-center text-sm font-bold text-slate-600">
          Otras formas de empezar
        </h4>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={onScan} className={OPTION_CLASS}>
            <span className={OPTION_ICON_CLASS}>
              <ScanLine className="h-5 w-5 text-teal-600" aria-hidden />
            </span>
            <span>
              <span className="block text-sm font-semibold text-slate-900">
                Escanear el código de barras
              </span>
              {/* El escaneo trae la ficha del producto, nunca la plata: el
                  costo y el precio de venta los pone la tienda. */}
              <span className="mt-1 block text-xs leading-relaxed text-slate-500">
                Pasa el lector y el nombre, la marca y la foto llegan solos. Los
                precios los defines tú.
              </span>
            </span>
          </button>

          <button type="button" onClick={onImport} className={OPTION_CLASS}>
            <span className={OPTION_ICON_CLASS}>
              <FileSpreadsheet className="h-5 w-5 text-blue-600" aria-hidden />
            </span>
            <span>
              <span className="block text-sm font-semibold text-slate-900">
                Importar desde un CSV
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-slate-500">
                Sube la lista completa de una vez. Se revisa fila por fila antes
                de guardar nada.
              </span>
            </span>
          </button>
        </div>

        {/* Fuera de las tarjetas a propósito: un botón dentro de otro botón no
            es HTML válido y el lector de pantalla lo lee mal. */}
        <p className="mt-5 text-center text-xs text-slate-500">
          ¿Primera vez?{" "}
          <Link
            href="/manual"
            className="rounded font-medium text-blue-600 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Mira el manual
          </Link>{" "}
          o{" "}
          <button
            type="button"
            onClick={onDownloadTemplate}
            className="rounded font-medium text-blue-600 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            descarga la plantilla del CSV
          </button>
          .
        </p>
      </div>
    </section>
  );
}
