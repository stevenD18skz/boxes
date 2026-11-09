"use client";

import { Loader2 } from "lucide-react";

import Dialog from "@/components/ui/Dialog";

// Anular no borra la venta: la marca como anulada y devuelve los productos al
// inventario. Se pregunta antes porque cambia el inventario, pero sin asustar:
// la venta sigue en el historial. El foco arranca en "No anular".
export default function VoidSaleDialog({ voiding, onClose, onConfirm }) {
  return (
    <Dialog
      title="¿Anular esta venta?"
      description="Los productos vuelven al inventario y la venta queda marcada como anulada en el historial. Si fue fiada, también sale de lo que te debe ese cliente."
      onClose={voiding ? undefined : onClose}
      dismissable={!voiding}
      className="max-w-sm p-6"
    >
      <div className="mt-5 flex flex-col-reverse gap-2.5 sm:flex-row">
        <button
          type="button"
          data-autofocus
          onClick={onClose}
          disabled={voiding}
          className="h-12 flex-1 rounded-lg border border-slate-300 text-base font-bold text-slate-800 transition-colors hover:bg-slate-50 disabled:opacity-50"
        >
          No anular
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={voiding}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-red-700 text-base font-bold text-white transition-colors hover:bg-red-800 disabled:opacity-70"
        >
          {voiding && <Loader2 className="h-5 w-5 animate-spin" aria-hidden />}
          {voiding ? "Anulando…" : "Sí, anular"}
        </button>
      </div>
    </Dialog>
  );
}
