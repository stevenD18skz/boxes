"use client";

import { AlertTriangle } from "lucide-react";
import { LOW_STOCK_THRESHOLD } from "./productsUtils";

// Aviso al lado del nombre. No se muestra nada cuando hay stock de sobra: una
// etiqueta verde en cada fila sería ruido en una tabla de 435 productos.
export default function StockBadge({ stock }) {
  if (stock > LOW_STOCK_THRESHOLD) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">
      <AlertTriangle className="h-3 w-3" aria-hidden />
      {stock <= 0 ? "Se acabó" : "Quedan pocos"}
    </span>
  );
}
