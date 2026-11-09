"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, HandCoins, ShoppingBag, Loader2 } from "lucide-react";

import MoneyInput from "@/components/ui/MoneyInput";
import { pesos, whenLabel } from "@/utils/converts";

const METHODS = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "tarjeta", label: "Tarjeta" },
];

const methodLabel = (value) =>
  METHODS.find((m) => m.value === value)?.label.toLowerCase() ?? value;

// Una página del cuaderno: el cliente, cuánto debe y, al abrirla, la historia
// de lo que se le fió y lo que ha pagado, con el abono ahí mismo (sin ventana
// emergente: es una tarea corta que no necesita tapar la pantalla).
export default function FiadoClientCard({ client, open, onToggle, onPay }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("efectivo");
  const [saving, setSaving] = useState(false);
  const amountRef = useRef(null);
  const settled = client.balance <= 0;
  const panelId = `fiado-${client.client_name.replace(/\W+/g, "-")}`;

  useEffect(() => {
    if (open && !settled) {
      setAmount("");
      setMethod("efectivo");
      // Se enfoca el monto para escribir de una, sin otro toque.
      requestAnimationFrame(() => amountRef.current?.focus());
    }
  }, [open, settled]);

  const value = Number(amount) || 0;
  const tooMuch = value > client.balance;
  const canSave = value > 0 && !tooMuch && !saving;

  const submit = async (e) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    try {
      await onPay(client, value, method);
      setAmount("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex min-h-[64px] w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-slate-50"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-bold text-slate-900">
            {client.client_name}
          </span>
          <span className="mt-0.5 block text-sm text-slate-500">
            {settled ? "A paz y salvo" : `Último movimiento ${whenLabel(client.last_activity)}`}
          </span>
        </span>
        <span className="text-right">
          <span
            className={`block text-xl font-bold tabular-nums ${
              settled ? "text-slate-500" : "text-slate-900"
            }`}
          >
            {pesos(client.balance)}
          </span>
          {!settled && <span className="block text-xs text-slate-500">debe</span>}
        </span>
        <ChevronDown
          aria-hidden
          className={`h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div id={panelId} className="border-t border-slate-100 bg-slate-50/60 px-4 py-4">
          {!settled && (
            <form onSubmit={submit} className="rounded-lg border border-slate-200 bg-white p-4">
              <label htmlFor={`${panelId}-amount`} className="block text-sm font-bold text-slate-900">
                ¿Cuánto te pagó?
              </label>
              <div className="mt-2 flex flex-wrap items-stretch gap-2">
                <MoneyInput
                  id={`${panelId}-amount`}
                  ref={amountRef}
                  value={amount}
                  onChange={setAmount}
                  aria-invalid={tooMuch}
                  aria-describedby={`${panelId}-hint`}
                  className="h-12 min-w-0 flex-1 rounded-lg border border-slate-300 px-3 text-lg font-bold tabular-nums text-slate-900 placeholder:font-normal placeholder:text-slate-500 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
                <button
                  type="button"
                  onClick={() => setAmount(String(client.balance))}
                  className="h-12 rounded-lg border border-slate-300 px-4 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Todo ({pesos(client.balance)})
                </button>
              </div>
              <p
                id={`${panelId}-hint`}
                className={`mt-1.5 text-sm ${tooMuch ? "font-bold text-red-700" : "text-slate-500"}`}
              >
                {tooMuch
                  ? `Solo debe ${pesos(client.balance)}. Escribe un valor igual o menor.`
                  : "Puede ser una parte: el resto sigue debiéndolo."}
              </p>

              <fieldset className="mt-3">
                <legend className="text-sm font-bold text-slate-900">¿Cómo te pagó?</legend>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {METHODS.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      aria-pressed={method === m.value}
                      onClick={() => setMethod(m.value)}
                      className={`h-11 rounded-lg border text-sm font-bold transition-colors ${
                        method === m.value
                          ? "border-brand-600 bg-brand-50 text-brand-800"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <button
                type="submit"
                disabled={!canSave}
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 text-base font-bold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
              >
                {saving ? (
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                ) : (
                  <HandCoins className="h-5 w-5" aria-hidden />
                )}
                {saving
                  ? "Guardando…"
                  : value > 0
                    ? `Anotar pago de ${pesos(value)}`
                    : "Anotar pago"}
              </button>
            </form>
          )}

          <h3 className={`text-sm font-bold text-slate-900 ${settled ? "" : "mt-5"}`}>
            Movimientos
          </h3>
          <ul className="mt-2 divide-y divide-slate-200">
            {client.entries.map((entry) => {
              const isSale = entry.type === "venta";
              const Icon = isSale ? ShoppingBag : HandCoins;
              return (
                <li key={`${entry.type}-${entry.id}`} className="flex items-center gap-3 py-2.5">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      isSale ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-slate-900">
                      {isSale ? "Se llevó fiado" : `Pagó en ${methodLabel(entry.payment_method)}`}
                    </span>
                    <span className="block text-sm text-slate-500">{whenLabel(entry.date)}</span>
                  </span>
                  <span
                    className={`text-base font-bold tabular-nums ${
                      isSale ? "text-slate-900" : "text-emerald-700"
                    }`}
                  >
                    {isSale ? "+" : "−"}
                    {pesos(entry.amount)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </li>
  );
}
