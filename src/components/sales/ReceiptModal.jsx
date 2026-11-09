"use client";

import { CheckCircle2, Printer } from "lucide-react";

import Dialog from "@/components/ui/Dialog";
import { currency } from "@/utils/converts";
import { METHOD_LABELS } from "./salesUtils";

// La venta quedó guardada. Lo más grande es lo que hay que hacer AHORA con el
// cliente al frente: en efectivo, cuánto devolverle; en fiado, a nombre de
// quién quedó. El total pasa a segundo plano porque ya se cobró.
//
// "Nueva venta" tiene el foco al abrir: con Enter se sigue con el próximo
// cliente sin tocar el mouse.
export default function ReceiptModal({ data, onPrint, onClose }) {
  const vuelto = Math.max(0, data.vuelto || 0);
  const isCash = data.method === "efectivo";

  return (
    <Dialog title="Venta guardada" hideTitle onClose={onClose} className="max-w-md p-7 text-center">
      <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" aria-hidden />
      <p className="mt-2 text-base font-bold text-slate-700">Venta guardada</p>

      {isCash ? (
        vuelto > 0 ? (
          <>
            <p className="mt-4 text-lg font-bold text-slate-900">Devuelve</p>
            <p className="text-5xl font-bold tabular-nums text-slate-900">{currency(vuelto)}</p>
          </>
        ) : (
          <p className="mt-4 text-2xl font-bold text-slate-900">Pagó exacto, no hay vuelto</p>
        )
      ) : data.method === "fiado" ? (
        <>
          <p className="mt-4 text-lg text-slate-700">Quedó fiado a</p>
          <p className="text-3xl font-bold text-slate-900">{data.cliente}</p>
        </>
      ) : (
        <p className="mt-4 text-2xl font-bold text-slate-900">
          Pagó con {METHOD_LABELS[data.method]?.toLowerCase()}
        </p>
      )}

      <p className="mt-3 text-base text-slate-600">
        Total de la venta <strong className="tabular-nums text-slate-900">{currency(data.total)}</strong>
      </p>

      <div className="mt-6 flex w-full flex-col-reverse gap-2.5 sm:flex-row">
        <button
          type="button"
          onClick={() => onPrint(data)}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 text-base font-bold text-slate-800 transition-colors hover:bg-slate-50"
        >
          <Printer className="h-5 w-5" aria-hidden /> Imprimir recibo
        </button>
        <button
          type="button"
          data-autofocus
          onClick={onClose}
          className="h-12 flex-1 rounded-lg bg-brand-600 text-base font-bold text-white transition-colors hover:bg-brand-700"
        >
          Nueva venta
        </button>
      </div>
    </Dialog>
  );
}
