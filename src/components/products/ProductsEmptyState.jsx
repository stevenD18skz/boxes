"use client";

import { PackageSearch } from "lucide-react";

// Vacío por búsqueda o filtros. El botón de limpiar solo aparece cuando hay algo
// que limpiar: con el catálogo realmente vacío no tendría nada que hacer.
export default function ProductsEmptyState({ hasActiveSearch, onClearFilters }) {
  return (
    <div className="mt-4 flex flex-col items-center gap-3.5 rounded-xl bg-white p-16 text-center shadow-sm ring-1 ring-slate-100">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
        <PackageSearch className="h-8 w-8 text-slate-500" />
      </div>
      <p className="text-lg font-bold text-slate-900">
        No encontramos productos
      </p>
      <p className="max-w-sm text-sm text-slate-500">
        Prueba con otra palabra de búsqueda o quita algunos filtros para ver más
        resultados.
      </p>
      {hasActiveSearch && (
        <button
          onClick={onClearFilters}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
