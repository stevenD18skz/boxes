"use client";

import {
  AlertTriangle,
  ArrowLeftRight,
  Banknote,
  CheckCircle2,
  CreditCard,
  Loader2,
  UserRound,
} from "lucide-react";
import MoneyInput from "@/components/ui/MoneyInput";
import { currency } from "@/utils/converts";
import { normalizeText } from "@/lib/text";

// Denominaciones de billetes colombianos (y la moneda de mil).
const BILLS = [1000, 2000, 5000, 10000, 20000, 50000, 100000];

export function suggestBills(total) {
  if (!total || total <= 0) return [];
  const options = new Set();
  for (const bill of BILLS) {
    const value = Math.ceil(total / bill) * bill;
    if (value > total) options.add(value);
  }
  return [...options].sort((a, b) => a - b).slice(0, 3);
}

function PaymentMethodButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-12 items-center justify-center gap-2 rounded-lg border-[1.5px] px-2 text-base font-bold transition-colors ${
        active
          ? "border-brand-600 bg-brand-600 text-white"
          : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
      }`}
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden />
      {label}
    </button>
  );
}

const METHODS = [
  { key: "efectivo", icon: Banknote, label: "Efectivo" },
  { key: "tarjeta", icon: CreditCard, label: "Tarjeta" },
  { key: "transferencia", icon: ArrowLeftRight, label: "Transferencia" },
  { key: "fiado", icon: UserRound, label: "Fiado" },
];

// Cobro de la venta: total, medio de pago y lo que cada medio pide.
//
// El vuelto se calcula acá porque solo depende del total y de lo recibido. Se
// muestra en rojo con el faltante cuando el monto no alcanza, en vez de un
// negativo que hay que interpretar: quien cobra necesita ver de un vistazo
// cuánto le falta por recibir.
export default function PaymentPanel({
  total,
  paymentMethod,
  onPaymentMethodChange,
  receivedAmount,
  onReceivedAmountChange,
  onExactAmount,
  clientName,
  onClientNameChange,
  knownClients = [],
  errors,
  confirming,
  onCancel,
  onConfirm,
}) {
  const typedKey = normalizeText(clientName);
  const existingDebt = typedKey
    ? (knownClients.find((c) => normalizeText(c.client_name) === typedKey)?.balance ?? 0)
    : 0;
  const receivedNum = parseFloat(receivedAmount);
  const vuelto = (Number.isNaN(receivedNum) ? 0 : receivedNum) - total;
  const insufficient =
    receivedAmount !== "" &&
    (Number.isNaN(receivedNum) || receivedNum < total);

  // Los billetes con que probablemente te paguen, según el total: el billete
  // más pequeño que alcanza de cada denominación. Para $13.500 salen $14.000,
  // $15.000 y $20.000. Tres más "Exacto" (Ley de Hick: pocas opciones).
  const billOptions = suggestBills(total);

  return (
    <div className="rounded-xl bg-white p-[18px] shadow-sm ring-1 ring-slate-100">
      <div className="mb-5 flex items-baseline justify-between gap-3">
        <div className="text-xl font-bold text-slate-900">Total a cobrar</div>
        <div className="text-3xl font-bold tabular-nums text-slate-900">
          {currency(total)}
        </div>
      </div>

      <fieldset>
        <legend className="mb-2 text-base font-bold text-slate-900">¿Cómo te pagan?</legend>
        <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {METHODS.map((m) => (
            <PaymentMethodButton
              key={m.key}
              active={paymentMethod === m.key}
              onClick={() => onPaymentMethodChange(m.key)}
              icon={m.icon}
              label={m.label}
            />
          ))}
        </div>
      </fieldset>

      {paymentMethod === "efectivo" && (
        <div>
          <label htmlFor="cash-received" className="block text-base font-bold text-slate-900">
            ¿Con cuánto te pagó?
          </label>
          <p id="cash-received-hint" className="mt-0.5 text-sm text-slate-600">
            Si te pagó exacto, déjalo así.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {billOptions.map((amount) => (
              <button
                key={amount}
                type="button"
                aria-pressed={Number(receivedAmount) === amount}
                onClick={() => onReceivedAmountChange(String(amount))}
                className={`h-12 min-w-[92px] rounded-lg border px-3 text-base font-bold tabular-nums transition-colors ${
                  Number(receivedAmount) === amount
                    ? "border-brand-600 bg-brand-50 text-brand-800"
                    : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                }`}
              >
                {currency(amount)}
              </button>
            ))}
            <button
              type="button"
              onClick={onExactAmount}
              className="h-12 rounded-lg border border-slate-300 bg-white px-4 text-base font-bold text-slate-800 transition-colors hover:bg-slate-50"
            >
              Exacto
            </button>
          </div>
          <MoneyInput
            id="cash-received"
            value={receivedAmount}
            onChange={onReceivedAmountChange}
            placeholder="Otro valor"
            aria-invalid={!!errors.monto}
            aria-describedby="cash-received-hint"
            className={`mt-2 h-12 w-full max-w-[240px] rounded-lg border px-3.5 text-lg font-bold tabular-nums outline-none placeholder:font-normal placeholder:text-slate-500 focus:ring-2 ${errors.monto ? "border-red-400 focus:ring-red-100" : "border-slate-300 focus:border-brand-600 focus:ring-brand-100"}`}
          />
          {errors.monto && (
            <div className="mt-1.5 text-sm font-bold text-red-700">{errors.monto}</div>
          )}

          {/* El vuelto es lo que hay que entregar YA: va grande. Si no alcanza,
              se dice cuánto falta en vez de mostrar un negativo. */}
          <div
            role="status"
            className={`mt-4 flex items-center justify-between gap-3 rounded-lg px-4 py-3.5 ${
              insufficient ? "bg-red-50" : "bg-emerald-50"
            }`}
          >
            <div
              className={`flex items-center gap-2 text-base font-bold ${
                insufficient ? "text-red-800" : "text-emerald-900"
              }`}
            >
              {insufficient && <AlertTriangle className="h-5 w-5" aria-hidden />}
              {insufficient ? "Falta por cobrar" : receivedAmount === "" ? "Pagó exacto" : "Devuelve"}
            </div>
            <div
              className={`text-2xl font-bold tabular-nums ${
                insufficient ? "text-red-800" : "text-emerald-900"
              }`}
            >
              {currency(
                insufficient
                  ? total - (Number.isNaN(receivedNum) ? 0 : receivedNum)
                  : receivedAmount === ""
                    ? 0
                    : vuelto,
              )}
            </div>
          </div>
        </div>
      )}

      {(paymentMethod === "tarjeta" || paymentMethod === "transferencia") && (
        <div className="flex items-center gap-2.5 rounded-lg bg-teal-50 p-3.5 text-sm font-medium text-teal-800">
          <CheckCircle2 className="h-[18px] w-[18px] shrink-0" />
          {paymentMethod === "tarjeta"
            ? "Confirma cuando el pago con tarjeta se acredite en el datáfono."
            : "Confirma cuando veas la transferencia (Nequi, Daviplata u otra) en tu cuenta."}
        </div>
      )}

      {paymentMethod === "fiado" && (
        <div>
          <label
            htmlFor="fiado-client"
            className="mb-1.5 block text-sm font-bold text-slate-900"
          >
            ¿A quién le fías?
          </label>
          {/* Un <datalist> sugiere los clientes que ya tienen fiado: así "Doña
              Rosa" no termina escrita de tres formas distintas en el cuaderno. */}
          <input
            id="fiado-client"
            type="text"
            list="fiado-clients"
            autoComplete="off"
            value={clientName}
            onChange={(e) => onClientNameChange(e.target.value)}
            placeholder="Ej. Don Roberto"
            aria-invalid={!!errors.cliente}
            aria-describedby="fiado-client-hint"
            className={`h-12 w-full max-w-sm rounded-lg border px-3.5 text-base outline-none placeholder:text-slate-500 focus:ring-2 ${errors.cliente ? "border-red-400 focus:ring-red-100" : "border-slate-300 focus:border-brand-600 focus:ring-brand-100"}`}
          />
          <datalist id="fiado-clients">
            {knownClients.map((c) => (
              <option key={c.client_name} value={c.client_name} />
            ))}
          </datalist>
          {errors.cliente && (
            <div className="mt-1.5 text-sm font-bold text-red-700">
              {errors.cliente}
            </div>
          )}
          <div
            id="fiado-client-hint"
            className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm font-bold text-amber-900"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            {existingDebt > 0
              ? `${clientName.trim()} ya te debe ${currency(existingDebt)}. Con esta venta quedaría debiendo ${currency(existingDebt + total)}.`
              : "Queda anotado en Fiados para cobrarlo después."}
          </div>
        </div>
      )}

      {/* El botón principal ocupa todo el ancho (Fitts) y en el celular queda
          pegado abajo, al alcance del pulgar. "Cancelar" queda aparte, como
          enlace: pegado al principal y con la misma forma era fácil tocarlo
          sin querer y perder la venta. */}
      <div className="sticky bottom-16 z-10 -mx-[18px] mt-5 border-t border-slate-100 bg-white px-[18px] pb-1 pt-3 md:static md:mx-0 md:border-0 md:p-0">
        <button
          type="button"
          onClick={onConfirm}
          disabled={confirming}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 text-lg font-bold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {confirming && <Loader2 className="h-5 w-5 animate-spin" aria-hidden />}
          {confirming ? "Guardando la venta…" : `Cobrar ${currency(total)}`}
        </button>
      </div>
      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={onCancel}
          disabled={confirming}
          className="min-h-[44px] px-3 text-sm font-bold text-slate-600 underline-offset-4 transition-colors hover:text-red-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancelar esta venta
        </button>
      </div>
    </div>
  );
}
