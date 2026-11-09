import { currency } from "@/utils/converts";
import type { Product } from "@/types/product";
import { LOW_STOCK_THRESHOLD } from "./dashboardUtils";

// Se ordena por existencias, no por ventas: el Excel nunca guardó qué producto
// se vendió, así que un "más vendidos" sería inventado.
export default function TopProductsHome({ items }: { items: Product[] }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <h3 className="text-sm font-semibold text-slate-700">
        Productos con más existencias
      </h3>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">Aún no hay productos.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {items.map((p: Product) => (
            <li key={p.id} className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-slate-800">
                  {p.name}
                </div>
                <div className="text-xs text-slate-500">
                  {p.category || "Sin categoría"} ·{" "}
                  <span
                    className={
                      p.stock <= LOW_STOCK_THRESHOLD
                        ? "font-medium text-amber-600"
                        : ""
                    }
                  >
                    stock {p.stock}
                  </span>
                </div>
              </div>
              <div className="shrink-0 text-sm font-semibold tabular-nums text-slate-700">
                {currency(p.price)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
