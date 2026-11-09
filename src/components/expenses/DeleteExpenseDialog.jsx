"use client";

import Dialog from "@/components/ui/Dialog";
import { currency } from "@/utils/converts";
import { formatDate } from "./expensesUtils";

// Se repite el registro completo (concepto, fecha y monto) en vez de un
// "¿seguro?" genérico: con 25 filas iguales en pantalla es fácil haber tocado
// el botón equivocado. El foco arranca en "No borrar".
export default function DeleteExpenseDialog({ item, onCancel, onConfirm }) {
  return (
    <Dialog
      title="¿Borrar este movimiento?"
      description={`${item.concept}, del ${formatDate(item.date)}, por ${currency(item.amount)}. Se borra del todo.`}
      onClose={onCancel}
      className="max-w-sm p-5"
    >
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          data-autofocus
          onClick={onCancel}
          className="h-11 rounded-lg border border-slate-300 px-4 text-base font-bold text-slate-800 transition-colors hover:bg-slate-50"
        >
          No borrar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="h-11 rounded-lg bg-red-700 px-4 text-base font-bold text-white transition-colors hover:bg-red-800"
        >
          Sí, borrar
        </button>
      </div>
    </Dialog>
  );
}
