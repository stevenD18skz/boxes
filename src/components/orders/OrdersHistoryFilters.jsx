"use client";

import { STATUS_STYLE } from "./ordersUtils";

// Panel de filtros avanzados del historial. Expandible y no un drawer, mismo
// motivo que en Productos: abrirlo no tapa la tabla. El truco de
// grid-rows-[0fr] a [1fr] anima el alto sin medirlo en JS (ver
// ProductsFilters, components/products).
const STATUS_OPTIONS = ["pendiente", "recibido", "cancelado"];

function CheckboxGroup({ legend, options, selected, onChange, labelFor }) {
  const toggle = (value) => {
    if (value === "All") return onChange([]);
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange(Array.from(next));
  };

  return (
    <fieldset>
      <legend className="text-xs font-medium text-slate-500">{legend}</legend>
      <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-sm sm:grid-cols-3 md:grid-cols-4">
        {options.map((option) => {
          const checked =
            selected.includes(option) ||
            (option === "All" && selected.length === 0);
          return (
            <label
              key={option}
              className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 ${checked ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"}`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(option)}
              />
              <span className="truncate">
                {labelFor ? labelFor(option) : option}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export default function OrdersHistoryFilters({
  open,
  onClose,
  suppliers,
  supplierFilter,
  onSupplierFilterChange,
  statusFilter,
  onStatusFilterChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  overdueOnly,
  onOverdueOnlyChange,
  onClearAll,
}) {
  return (
    <div
      className={`grid transition-[grid-template-rows,opacity,margin-top] duration-300 ease-in-out ${
        open
          ? "mt-4 grid-rows-[1fr] opacity-100"
          : "mt-0 grid-rows-[0fr] opacity-0"
      }`}
    >
      <div className="overflow-hidden">
        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-sm font-semibold">Filtros avanzados</div>
              <div className="text-xs text-slate-500">
                Filtra por estado, proveedor, fecha y entregas atrasadas
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClearAll}
                className="rounded-md border border-slate-200 px-3 py-1 text-sm hover:bg-slate-50"
              >
                Limpiar
              </button>
              <button
                onClick={onClose}
                className="rounded-md border border-slate-200 px-3 py-1 text-sm hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 items-start gap-4 md:grid-cols-3">
            <div>
              <div className="text-xs font-medium text-slate-500">
                Fecha del pedido
              </div>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => onDateFromChange(e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
                <span className="text-slate-500">—</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => onDateToChange(e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>

            <div className="flex flex-col">
              <div className="text-xs font-medium text-slate-500">
                Entregas
              </div>
              <label className="mt-1 flex h-[38px] cursor-pointer items-center gap-2 rounded-md border border-slate-200 px-2.5 text-sm text-slate-700 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={overdueOnly}
                  onChange={(e) => onOverdueOnlyChange(e.target.checked)}
                />
                Solo entregas atrasadas
              </label>
            </div>
          </div>

          <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
            <CheckboxGroup
              legend="Estado"
              options={["All", ...STATUS_OPTIONS]}
              selected={statusFilter}
              onChange={onStatusFilterChange}
              labelFor={(o) =>
                o === "All" ? "Todos" : STATUS_STYLE[o]?.label ?? o
              }
            />
            <CheckboxGroup
              legend="Proveedor"
              options={["All", ...suppliers]}
              selected={supplierFilter}
              onChange={onSupplierFilterChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
