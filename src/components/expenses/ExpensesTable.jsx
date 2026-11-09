"use client";

import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Trash2,
  Wallet,
} from "lucide-react";
import { currency } from "@/utils/converts";
import { KIND_META, PAGE_SIZE, formatDate } from "./expensesUtils";

// Tabla de movimientos con su paginación al pie. Los tres estados —cargando,
// vacío y con datos— viven acá porque comparten el mismo marco.
export default function ExpensesTable({
  loading,
  filtered,
  visible,
  page,
  pageCount,
  onPageChange,
  onEdit,
  onDelete,
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando registros…
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <Wallet className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-600">
            No hay registros con esos filtros
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Cambia el periodo o agrega un registro nuevo.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-sm text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Concepto</th>
                  <th className="px-4 py-3 text-right font-medium">Monto</th>
                  <th className="px-4 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((e) => {
                  const meta = KIND_META[e.kind];
                  const Icon = meta.icon;
                  return (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {formatDate(e.date)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${meta.badge}`}
                        >
                          <Icon className="h-3 w-3" />
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-700">
                          {e.concept}
                        </div>
                        {e.notes && (
                          <div className="mt-0.5 text-xs text-slate-500">
                            {e.notes}
                          </div>
                        )}
                      </td>
                      <td
                        className={`whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums ${meta.accent}`}
                      >
                        {currency(e.amount)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <button
                          onClick={() => onEdit(e)}
                          className="rounded p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-blue-600"
                          aria-label={`Editar ${e.concept}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDelete(e)}
                          className="rounded p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-rose-600"
                          aria-label={`Eliminar ${e.concept}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-500">
            <span>
              {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onPageChange(Math.max(1, page - 1))}
                disabled={page === 1}
                className="rounded p-1.5 hover:bg-slate-100 disabled:opacity-40"
                aria-label="Página anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 tabular-nums">
                {page} / {pageCount}
              </span>
              <button
                onClick={() => onPageChange(Math.min(pageCount, page + 1))}
                disabled={page === pageCount}
                className="rounded p-1.5 hover:bg-slate-100 disabled:opacity-40"
                aria-label="Página siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
