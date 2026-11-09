import { ArrowDownLeft, ArrowUpRight, Receipt, Wallet } from "lucide-react";
import { currency } from "@/utils/converts";

const TONES = {
  rose: "bg-rose-50 text-rose-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
};

function SummaryCard({ label, value, icon: Icon, tone, hint }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className={`rounded-md p-1.5 ${TONES[tone]}`}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-sm text-slate-500">{label}</span>
      </div>
      <p className="mt-2 text-xl font-semibold tabular-nums text-slate-800">
        {currency(value)}
      </p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

// Totales del período filtrado. El neto cambia de color según el signo: es la
// única cifra de la fila que puede dar negativo.
export default function ExpenseSummaryCards({ totals }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <SummaryCard
        label="Gastos"
        value={totals.gasto}
        icon={Receipt}
        tone="rose"
      />
      <SummaryCard
        label="Entradas de caja"
        value={totals.entrada}
        icon={ArrowDownLeft}
        tone="emerald"
      />
      <SummaryCard
        label="Salidas de caja"
        value={totals.salida}
        icon={ArrowUpRight}
        tone="amber"
      />
      <SummaryCard
        label="Neto"
        value={totals.neto}
        icon={Wallet}
        tone={totals.neto >= 0 ? "emerald" : "rose"}
        hint="Entradas menos salidas y gastos"
      />
    </div>
  );
}
