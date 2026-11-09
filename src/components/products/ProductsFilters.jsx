"use client";

// Panel de filtros avanzados. Es expandible y no un drawer, a pedido explícito:
// abrirlo no tapa la tabla, así se ve el efecto de cada filtro en el momento.
//
// El truco de grid-rows-[0fr] a [1fr] anima el alto sin tener que medirlo en
// JS; el hijo necesita overflow-hidden para que el contenido se recorte
// mientras la fila crece.
// Categorías y marcas se filtran igual: una lista de casillas donde "All" es
// no filtrar nada. Vive acá adentro para que las dos se comporten idéntico sin
// tener que acordarse de cambiar las dos.
function CheckboxGroup({ legend, options, selected, onChange }) {
  const toggle = (value) => {
    if (value === "All") return onChange([]);
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange(Array.from(next));
  };

  return (
    <fieldset>
      <legend className="text-sm font-bold text-slate-700">{legend}</legend>
      <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-sm sm:grid-cols-3 md:grid-cols-5">
        {options.map((option) => {
          const checked =
            selected.includes(option) ||
            (option === "All" && selected.length === 0);
          return (
            <label
              key={option}
              className={`flex min-h-[44px] cursor-pointer items-center gap-2 rounded-md px-2 py-1 ${checked ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(option)}
              />
              <span className="truncate">{option === "All" ? "Todas" : option}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export default function ProductsFilters({
  open,
  onClose,
  categories,
  categoryFilter,
  onCategoryFilterChange,
  brands,
  brandFilter,
  onBrandFilterChange,
  minPrice,
  onMinPriceChange,
  maxPrice,
  onMaxPriceChange,
  minCost,
  onMinCostChange,
  maxCost,
  onMaxCostChange,
  stockOp,
  onStockOpChange,
  stockVal,
  onStockValChange,
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
                Filtra por precio, costo, stock, categorías y marcas
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
                Precio (COP)
              </div>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={minPrice}
                  onChange={(e) => onMinPriceChange(e.target.value)}
                  placeholder="Min"
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
                <span className="text-slate-500">—</span>
                <input
                  type="number"
                  min="0"
                  value={maxPrice}
                  onChange={(e) => onMaxPriceChange(e.target.value)}
                  placeholder="Max"
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Ej: Min 1000, Max 5000
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-slate-500">
                Costo (COP)
              </div>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={minCost}
                  onChange={(e) => onMinCostChange(e.target.value)}
                  placeholder="Min"
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
                <span className="text-slate-500">—</span>
                <input
                  type="number"
                  min="0"
                  value={maxCost}
                  onChange={(e) => onMaxCostChange(e.target.value)}
                  placeholder="Max"
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Ej: Min 500, Max 3000
              </div>
            </div>

            <div className="flex flex-col">
              <div className="text-xs font-medium text-slate-500">Stock</div>
              <div className="mt-1 flex items-center gap-2">
                <select
                  value={stockOp}
                  onChange={(e) => onStockOpChange(e.target.value)}
                  className="rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="any">Cualquiera</option>
                  <option value="lt">Menor que</option>
                  <option value="gt">Mayor que</option>
                  <option value="eq">Igual a</option>
                </select>
                <input
                  type="number"
                  min="0"
                  value={stockVal}
                  onChange={(e) => onStockValChange(e.target.value)}
                  placeholder="Valor"
                  disabled={stockOp === "any"}
                  className="w-24 rounded-md border border-slate-200 px-2 py-1.5 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-300"
                />
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Ej: menor que 10 para ver bajos stocks
              </div>
            </div>

          </div>

          <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
            <CheckboxGroup
              legend="Categorías"
              options={categories}
              selected={categoryFilter}
              onChange={onCategoryFilterChange}
            />
            <CheckboxGroup
              legend="Marcas"
              options={brands}
              selected={brandFilter}
              onChange={onBrandFilterChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
