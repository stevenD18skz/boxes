import { pesos } from "@/utils/converts";
import WaitingForData from "./WaitingForData";

const METHODS = [
  { key: "efectivo", label: "Efectivo" },
  { key: "transferencia", label: "Transferencia" },
  { key: "tarjeta", label: "Tarjeta" },
  { key: "fiado", label: "Fiado" },
];

// Cómo te pagaron en el período, con las ventas registradas en la app. Es una
// sola serie (plata por medio de pago), así que va en barras de un solo color
// con la cifra escrita al lado: no hace falta leyenda ni adivinar colores.
// El Excel no guardaba el medio de pago, así que solo cuenta lo de la app.
export default function PaymentMethods({ sales = [] }) {
  const totals = METHODS.map((m) => ({
    ...m,
    amount: sales
      .filter((s) => s.payment_method === m.key)
      .reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0),
    count: sales.filter((s) => s.payment_method === m.key).length,
  }));
  const total = totals.reduce((sum, t) => sum + t.amount, 0);
  const max = Math.max(...totals.map((t) => t.amount), 1);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold text-slate-900">¿Cómo te pagaron?</h2>
      <p className="mb-4 mt-0.5 text-sm text-slate-600">
        Así sabes cuánta plata entró en efectivo a la caja y cuánto quedó fiado.
      </p>

      {total === 0 ? (
        <WaitingForData
          title="Todavía no hay ventas registradas en este período"
          detail="Cada venta que registres en la app guarda cómo te pagaron. Desde la primera, aquí ves el reparto."
          cta="Ir a vender"
          href="/sales"
        />
      ) : (
        <ul className="space-y-3">
          {totals.map((t) => {
            const pct = Math.round((t.amount / total) * 100);
            return (
              <li
                key={t.key}
                title={`${t.label}: ${pesos(t.amount)} en ${t.count} ${t.count === 1 ? "venta" : "ventas"} (${pct}%)`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-base text-slate-800">{t.label}</span>
                  <span className="tabular-nums">
                    <strong className="text-base text-slate-900">{pesos(t.amount)}</strong>
                    <span className="ml-2 text-sm text-slate-600">{pct}%</span>
                  </span>
                </div>
                <div className="mt-1 h-2.5 rounded-full bg-slate-100" aria-hidden>
                  <div
                    className="h-2.5 rounded-full bg-brand-600"
                    style={{ width: `${t.amount > 0 ? Math.max(2, (t.amount / max) * 100) : 0}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
