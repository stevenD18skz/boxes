"use client";

import Link from "next/link";
import { BookOpen, ChevronRight } from "lucide-react";

import { useFiados } from "@/hooks/useFiados";
import { pesos } from "@/utils/converts";

// Lo que te deben, tomado del cuaderno de fiados (descontando lo que ya
// abonaron). Antes había aquí otras dos tarjetas que siempre decían
// "Esperando datos" porque nunca se calculaban: se quitaron, eran ruido.
export default function InsightCards() {
  const { debtors, owed, loading } = useFiados();
  if (loading) return null;
  const top = debtors.slice(0, 3);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-800">
            <BookOpen className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-base font-bold text-slate-900">Te deben en fiados</h2>
            <p className="text-sm text-slate-600">
              {debtors.length === 0
                ? "Nadie te debe nada ahora mismo."
                : `${debtors.length} ${debtors.length === 1 ? "cliente" : "clientes"}`}
            </p>
          </div>
        </div>
        <p className="text-2xl font-bold tabular-nums text-slate-900">{pesos(owed)}</p>
      </div>

      {top.length > 0 && (
        <ul className="mt-4 divide-y divide-slate-100">
          {top.map((c) => (
            <li key={c.client_name} className="flex items-center justify-between gap-3 py-2.5">
              <span className="truncate text-base text-slate-800">{c.client_name}</span>
              <span className="text-base font-bold tabular-nums text-slate-900">{pesos(c.balance)}</span>
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/fiados"
        className="mt-3 inline-flex min-h-[44px] items-center gap-1 text-sm font-bold text-brand-700 hover:underline"
      >
        {debtors.length > 0 ? "Ver todos y anotar pagos" : "Ir a Fiados"}
        <ChevronRight className="h-4 w-4" aria-hidden />
      </Link>
    </section>
  );
}
