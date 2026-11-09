import Link from "next/link";
import { PackageSearch } from "lucide-react";
import { LOW_STOCK_THRESHOLD } from "./dashboardUtils";

// Va con la forma de TrendCard pero es un enlace: lleva a Productos ya filtrado
// por stock bajo, para no obligar a repetir el filtro a mano.
export default function LowStockCard({ count }: { count: number }) {
  return (
    <Link
      href={`/products?stockOp=lt&stockVal=${LOW_STOCK_THRESHOLD + 1}`}
      className="flex flex-col rounded-xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-100 transition-colors hover:bg-slate-50"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium leading-snug text-slate-500">
          Stock bajo
        </span>
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            count > 0
              ? "bg-amber-50 text-amber-600"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          <PackageSearch className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <div className="mt-2 text-2xl font-bold tabular-nums text-amber-600">
        {count}
      </div>
      <div className="mt-2 text-xs text-slate-500">productos por revisar</div>
    </Link>
  );
}
