import Link from "next/link";
import { currency } from "@/utils/converts";
import type { DailyClose } from "@/types/dailyClose";
import { shortDate } from "./dashboardUtils";

/*
  RecentCloses
  - Ocupa el lugar de la antigua tabla de "ventas recientes", que estaba vacía
    porque el Excel nunca guardó ventas individuales. Los cierres diarios sí son
    el registro real del negocio, así que este bloque siempre tiene qué mostrar.
*/
export default function RecentCloses({
  items,
  todayIso,
}: {
  items: DailyClose[];
  todayIso: string;
}) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-700">
          Últimos cierres diarios
        </h3>
        <Link
          href="/summary"
          className="text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          Ver todo
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm font-semibold text-slate-600">
            Todavía no has cerrado ningún día
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Al final de la jornada anota cuánto vendiste y queda registrado aquí.
          </p>
          <Link
            href="/sales"
            className="mt-4 inline-flex h-9 items-center rounded-lg border border-slate-200 px-3.5 text-[13px] font-bold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Cerrar el día
          </Link>
        </div>
      ) : (
        <div className="-mx-1 mt-1 overflow-x-auto">
          <table className="w-full min-w-[460px] text-left text-sm">
            <thead>
              <tr className="text-sm text-slate-600">
                <th className="px-1 pb-2 font-medium">Día</th>
                <th className="px-1 pb-2 text-right font-medium">Venta</th>
                <th className="px-1 pb-2 text-right font-medium">Ganancia</th>
                <th className="px-1 pb-2 text-right font-medium">Gasto</th>
                <th className="px-1 pb-2 text-right font-medium">Compra</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => {
                const isToday = c.date === todayIso;
                return (
                  <tr key={c.id} className="border-t border-slate-100">
                    <td className="whitespace-nowrap px-1 py-2.5 text-slate-600">
                      {isToday ? (
                        <span className="font-semibold text-blue-600">Hoy</span>
                      ) : (
                        shortDate(c.date)
                      )}
                    </td>
                    <td className="px-1 py-2.5 text-right font-semibold tabular-nums text-slate-800">
                      {currency(c.sales_total)}
                    </td>
                    <td className="px-1 py-2.5 text-right tabular-nums text-emerald-600">
                      {currency(c.gain)}
                    </td>
                    <td className="px-1 py-2.5 text-right tabular-nums text-rose-600">
                      {c.expenses_total ? currency(c.expenses_total) : "—"}
                    </td>
                    <td className="px-1 py-2.5 text-right tabular-nums text-slate-500">
                      {c.purchases_total ? currency(c.purchases_total) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
