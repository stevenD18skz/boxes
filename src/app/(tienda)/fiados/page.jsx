"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, RotateCw, Search, ShoppingCart } from "lucide-react";

import FiadoClientCard from "@/components/fiados/FiadoClientCard";
import ToastStack from "@/components/ui/ToastStack";
import { useFiados } from "@/hooks/useFiados";
import { useToasts } from "@/hooks/useToasts";
import { createFiadoPayment, deleteFiadoPayment } from "@/services/fiados.service";
import { matchesText } from "@/lib/text";
import { pesos } from "@/utils/converts";

/*
  Fiados: el cuaderno de la tienda.
  - Cada cliente con lo que debe (lo que se llevó fiado menos lo que ha
    abonado). Primero quien más debe.
  - El pago se anota ahí mismo, completo o por partes, y se puede deshacer.
    Nunca toca el inventario: la mercancía ya salió el día que se fió.
  - Los que ya pagaron todo bajan a "A paz y salvo", plegados.
*/
export default function FiadosPage() {
  const { clients, debtors, owed, loading, error, reload } = useFiados();
  const [query, setQuery] = useState("");
  const [openKey, setOpenKey] = useState(null);
  const [showSettled, setShowSettled] = useState(false);
  const { toasts, push, dismiss } = useToasts({ duration: 6000 });

  const settled = useMemo(() => clients.filter((c) => c.balance <= 0), [clients]);
  const visibleDebtors = useMemo(
    () => debtors.filter((c) => matchesText(query, c.client_name)),
    [debtors, query],
  );
  const visibleSettled = useMemo(
    () => settled.filter((c) => matchesText(query, c.client_name)),
    [settled, query],
  );

  const handlePay = async (client, amount, method) => {
    try {
      const payment = await createFiadoPayment({
        client_name: client.client_name,
        amount,
        payment_method: method,
      });
      await reload();
      const left = client.balance - amount;
      push(
        left <= 0
          ? `${client.client_name} quedó a paz y salvo`
          : `Pago de ${pesos(amount)} anotado. Todavía debe ${pesos(left)}`,
        "success",
        {
          label: "Deshacer",
          onClick: async () => {
            try {
              await deleteFiadoPayment(payment.id);
              await reload();
              push("Pago deshecho", "info");
            } catch {
              push("No se pudo deshacer el pago. Intenta otra vez.", "error");
            }
          },
        },
      );
      if (left <= 0) setOpenKey(null);
    } catch (e) {
      push(e?.message || "No se pudo anotar el pago. Revisa la conexión e intenta otra vez.", "error");
    }
  };

  const keyOf = (c) => c.client_name.toLowerCase();
  const toggle = (c) => setOpenKey((k) => (k === keyOf(c) ? null : keyOf(c)));

  return (
    <div className="mx-auto max-w-3xl">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fiados</h1>
          <p className="mt-1 text-base text-slate-600">
            Lo que te deben tus clientes. Toca un nombre para anotar lo que te pagó.
          </p>
        </div>
        {!loading && !error && debtors.length > 0 && (
          <div className="text-right">
            <p className="text-sm text-slate-600">Te deben en total</p>
            <p className="text-3xl font-bold tabular-nums text-slate-900">{pesos(owed)}</p>
            <p className="text-sm text-slate-600">
              {debtors.length} {debtors.length === 1 ? "cliente" : "clientes"}
            </p>
          </div>
        )}
      </header>

      {loading && (
        <ul className="mt-6 space-y-3" aria-busy="true" aria-label="Cargando fiados">
          {[0, 1, 2].map((i) => (
            <li key={i} className="h-16 animate-pulse rounded-xl bg-slate-200/70" />
          ))}
        </ul>
      )}

      {!loading && error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5">
          <p className="font-bold text-red-800">No se pudo abrir el cuaderno de fiados.</p>
          <p className="mt-1 text-sm text-red-800">
            Puede ser la conexión a internet. Tus datos no se perdieron.
          </p>
          <button
            type="button"
            onClick={() => reload()}
            className="mt-3 inline-flex h-11 items-center gap-2 rounded-lg bg-white px-4 text-sm font-bold text-red-800 ring-1 ring-red-200 transition-colors hover:bg-red-100"
          >
            <RotateCw className="h-4 w-4" aria-hidden />
            Intentar otra vez
          </button>
        </div>
      )}

      {!loading && !error && clients.length === 0 && (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-slate-500" aria-hidden />
          <p className="mt-3 text-lg font-bold text-slate-900">Nadie te debe nada</p>
          <p className="mx-auto mt-1 max-w-sm text-base text-slate-600">
            Cuando vendas y elijas <strong>Fiado</strong> como forma de pago, el cliente aparece
            aquí con lo que te debe.
          </p>
          <Link
            href="/sales"
            className="mt-5 inline-flex h-12 items-center gap-2 rounded-lg bg-brand-600 px-5 text-base font-bold text-white transition-colors hover:bg-brand-700"
          >
            <ShoppingCart className="h-5 w-5" aria-hidden />
            Ir a vender
          </Link>
        </div>
      )}

      {!loading && !error && clients.length > 0 && (
        <>
          {clients.length > 5 && (
            <div className="relative mt-6">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar cliente"
                aria-label="Buscar cliente"
                className="h-12 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-base text-slate-900 placeholder:text-slate-500 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </div>
          )}

          {debtors.length === 0 ? (
            <p className="mt-6 rounded-xl bg-emerald-50 px-5 py-4 text-base font-bold text-emerald-800">
              Todos tus clientes están a paz y salvo.
            </p>
          ) : visibleDebtors.length === 0 ? (
            <p className="mt-6 text-base text-slate-600">
              Nadie que te deba se llama «{query}».
            </p>
          ) : (
            <ul className="mt-6 space-y-3">
              {visibleDebtors.map((c) => (
                <FiadoClientCard
                  key={keyOf(c)}
                  client={c}
                  open={openKey === keyOf(c)}
                  onToggle={() => toggle(c)}
                  onPay={handlePay}
                />
              ))}
            </ul>
          )}

          {settled.length > 0 && (
            <section className="mt-8">
              <button
                type="button"
                onClick={() => setShowSettled((s) => !s)}
                aria-expanded={showSettled}
                className="text-sm font-bold text-brand-700 underline-offset-4 hover:underline"
              >
                {showSettled ? "Ocultar" : "Ver"} los que están a paz y salvo ({settled.length})
              </button>
              {showSettled && (
                <ul className="mt-3 space-y-3">
                  {visibleSettled.map((c) => (
                    <FiadoClientCard
                      key={keyOf(c)}
                      client={c}
                      open={openKey === keyOf(c)}
                      onToggle={() => toggle(c)}
                      onPay={handlePay}
                    />
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      )}

      <ToastStack toasts={toasts} onDismiss={dismiss} accent="teal" />
    </div>
  );
}
