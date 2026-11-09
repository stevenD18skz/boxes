"use client";

import { Edit3, Trash2 } from "lucide-react";
import Checkbox from "@/components/ui/Checkbox";
import SortHeader from "@/components/ui/SortHeader";
import { currency } from "@/utils/converts";
import StockBadge from "./StockBadge";
import StockStepper from "./StockStepper";
import Thumb from "./Thumb";
import { categoryOf, getMargin, getMarginPct } from "./productsUtils";

// Tabla de escritorio. En móvil se esconde y toma su lugar ProductsCardList:
// diez columnas no caben en un teléfono ni con scroll horizontal.
export default function ProductsTable({
  items,
  perPage,
  selected,
  allPageSelected,
  somePageSelected,
  onToggleSelect,
  onToggleSelectAll,
  sortBy,
  sortDir,
  onSort,
  onStockCommit,
  onEdit,
  onDelete,
  onZoomPhoto,
}) {
  // Con poquitos productos en la página, la tabla se veía chiquita y suelta
  // en medio de la pantalla. Se rellena con filas vacías hasta el alto de una
  // página llena, para que el espacio se sienta igual de armonioso tenga 1
  // producto o el cupo completo.
  const fillerRows =
    perPage && items.length > 0 && items.length < perPage
      ? perPage - items.length
      : 0;

  return (
    <div className="mt-4 hidden overflow-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-100 md:block">
      <table className="w-full table-fixed text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="w-10 py-3 pl-4 pr-2">
              <Checkbox
                checked={allPageSelected}
                indeterminate={somePageSelected}
                onChange={onToggleSelectAll}
                ariaLabel="Seleccionar todos en esta página"
              />
            </th>
            <th className="w-14 px-2 py-3 text-left text-sm font-bold text-slate-600">
              Foto
            </th>
            <SortHeader
              label="Producto"
              sortKey="name"
              sortBy={sortBy}
              sortDir={sortDir}
              onClick={onSort}
            />
            <SortHeader
              label="Categoría"
              sortKey="category"
              sortBy={sortBy}
              sortDir={sortDir}
              onClick={onSort}
              className="w-28"
            />
            <SortHeader
              label="Marca"
              sortKey="brand"
              sortBy={sortBy}
              sortDir={sortDir}
              onClick={onSort}
              className="w-24"
            />
            <th className="w-32 px-2 py-3 text-left text-sm font-bold text-slate-600">
              Código de barras
            </th>
            <SortHeader
              label="Costo"
              sortKey="cost_price"
              sortBy={sortBy}
              sortDir={sortDir}
              onClick={onSort}
              align="right"
              className="w-24"
            />
            <SortHeader
              label="Precio"
              sortKey="price"
              sortBy={sortBy}
              sortDir={sortDir}
              onClick={onSort}
              align="right"
              className="w-24"
            />
            <SortHeader
              label="Le ganas"
              sortKey="margin"
              sortBy={sortBy}
              sortDir={sortDir}
              onClick={onSort}
              align="right"
              className="w-28"
            />
            <SortHeader
              label="Quedan"
              sortKey="stock"
              sortBy={sortBy}
              sortDir={sortDir}
              onClick={onSort}
              className="w-44"
            />
            <th className="w-52 py-3 pl-2 pr-4 text-left text-sm font-bold text-slate-600">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr
              key={p.id}
              className={`border-b border-slate-50 transition-colors last:border-0 ${
                selected.has(p.id) ? "bg-blue-50" : "hover:bg-slate-50"
              }`}
            >
              <td className="py-2.5 pl-4 pr-2">
                <Checkbox
                  checked={selected.has(p.id)}
                  onChange={() => onToggleSelect(p.id)}
                  ariaLabel={`Seleccionar ${p.name}`}
                />
              </td>
              <td className="px-2 py-2.5">
                <Thumb
                  photo={p.photo}
                  label={p.name}
                  onZoom={onZoomPhoto ? () => onZoomPhoto(p) : undefined}
                />
              </td>
              <td className="px-2 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="font-bold text-slate-900">{p.name}</div>
                  <StockBadge stock={p.stock} />
                </div>
                {/* Sin SKU no se deja la línea vacía ni un "SKU —": el nombre
                    sube y la fila se ve igual de completa. */}
                {p.sku ? (
                  <div className="text-[12.5px] text-slate-500">
                    SKU {p.sku}
                  </div>
                ) : null}
              </td>
              <td className="px-2 py-2.5">
                <span className="inline-block max-w-full truncate rounded-full bg-slate-100 px-2.5 py-1 align-bottom text-[12.5px] font-semibold text-slate-700">
                  {categoryOf(p)}
                </span>
              </td>
              {/* Sin marca queda la raya y no un chip vacío: el granel y lo
                  hecho en casa no tienen marca y no es un dato faltante. */}
              <td className="px-2 py-2.5 text-[12.5px] text-slate-600">
                {p.brand ? (
                  <span className="block truncate">{p.brand}</span>
                ) : (
                  <span className="text-slate-300">—</span>
                )}
              </td>
              <td className="px-2 py-2.5 font-mono text-[12.5px] text-slate-600">
                {p.barcode || <span className="text-slate-300">—</span>}
              </td>
              <td className="px-2 py-2.5 text-right tabular-nums text-slate-600">
                {currency(p.cost_price)}
              </td>
              <td className="px-2 py-2.5 text-right font-bold tabular-nums text-slate-900">
                {currency(p.price)}
              </td>
              <td className="px-2 py-2.5 text-right">
                <div
                  className={`font-bold tabular-nums ${
                    getMargin(p) >= 0 ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {getMargin(p) >= 0 ? "+" : ""}
                  {currency(getMargin(p))}
                </div>
                <div className="text-[11.5px] text-slate-500">
                  {getMarginPct(p) >= 0 ? "+" : ""}
                  {getMarginPct(p)}%
                </div>
              </td>
              <td className="px-2 py-2.5">
                <StockStepper
                  value={p.stock}
                  onCommit={(val) => onStockCommit(p.id, val)}
                />
              </td>
              <td className="py-2.5 pl-2 pr-4">
                <div className="flex gap-1.5">
                  <button
                    onClick={() => onEdit(p)}
                    aria-label={`Editar ${p.name}`}
                    className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 px-2.5 py-1.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Edit3 className="h-[15px] w-[15px]" /> Editar
                  </button>
                  <button
                    onClick={() => onDelete(p)}
                    aria-label={`Eliminar ${p.name}`}
                    className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-red-100 bg-red-50 px-2.5 py-1.5 text-[13px] font-semibold text-red-700 hover:bg-red-100"
                  >
                    <Trash2 className="h-[15px] w-[15px]" /> Eliminar
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {Array.from({ length: fillerRows }).map((_, i) => (
            <tr key={`filler-${i}`} aria-hidden className="h-[57px]">
              <td colSpan={11} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
