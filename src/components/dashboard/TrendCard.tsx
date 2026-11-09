import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";

const DeltaBadge = ({ pct }: { pct: number }) => {
  const positive = pct >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
        positive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
      }`}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {positive ? "+" : ""}
      {pct.toFixed(0)}%
    </span>
  );
};

// Indicador del día. Cuando el día todavía no tiene movimiento se muestra el
// texto neutro en vez del badge: un "+0%" en verde daría a entender que ya se
// midió algo.
export default function TrendCard({
  icon: Icon,
  label,
  value,
  pct,
  hint,
  accent = "bg-blue-50 text-blue-600",
  valueColor = "text-slate-800",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  /** Comparación contra el período anterior. Se omite cuando no hay con qué comparar. */
  pct?: number;
  /** Texto neutro que reemplaza al badge cuando el día todavía no tiene datos. */
  hint?: string;
  accent?: string;
  valueColor?: string;
}) {
  return (
    <div className="flex flex-col rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium leading-snug text-slate-500">
          {label}
        </span>
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${accent}`}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <div
        className={`mt-2 truncate text-2xl font-bold tabular-nums ${valueColor}`}
        title={value}
      >
        {value}
      </div>
      <div className="mt-2">
        {hint ? (
          <span className="text-xs text-slate-500">{hint}</span>
        ) : (
          pct !== undefined && <DeltaBadge pct={pct} />
        )}
      </div>
    </div>
  );
}
