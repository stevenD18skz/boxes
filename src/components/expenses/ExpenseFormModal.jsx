"use client";

import { Loader2 } from "lucide-react";

import Dialog from "@/components/ui/Dialog";
import MoneyInput from "@/components/ui/MoneyInput";
import { KIND_META } from "./expensesUtils";

const fieldClass =
  "h-12 w-full rounded-lg border border-slate-300 px-3 text-base text-slate-900 outline-none placeholder:text-slate-500 focus:border-brand-600 focus:ring-2 focus:ring-brand-100";

// Alta y edición de un movimiento. El mismo formulario sirve para los dos: lo
// distingue que el borrador traiga id o no. El monto usa MoneyInput: con un
// <input type="number">, escribir "5.000" guardaba $5.
export default function ExpenseFormModal({ draft, onDraftChange, saving, onClose, onSubmit }) {
  const patch = (fields) => onDraftChange({ ...draft, ...fields });
  const meta = KIND_META[draft.kind] ?? KIND_META.gasto;

  return (
    <Dialog
      title={draft.id ? "Corregir movimiento" : "Anotar un gasto o movimiento"}
      onClose={saving ? undefined : onClose}
      dismissable={!saving}
      className="max-w-md p-5"
    >
      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <fieldset>
          <legend className="mb-2 block text-base font-bold text-slate-900">¿Qué fue?</legend>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(KIND_META).map(([k, m]) => (
              <button
                key={k}
                type="button"
                aria-pressed={draft.kind === k}
                onClick={() => patch({ kind: k })}
                className={`min-h-[48px] rounded-lg border px-2 text-sm font-bold transition-colors ${
                  draft.kind === k
                    ? "border-brand-600 bg-brand-50 text-brand-800"
                    : "border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-sm text-slate-600">{meta.hint}</p>
        </fieldset>

        <div>
          <label htmlFor="expense-amount" className="mb-1.5 block text-base font-bold text-slate-900">
            ¿Cuánto?
          </label>
          <MoneyInput
            id="expense-amount"
            data-autofocus
            value={draft.amount}
            onChange={(v) => patch({ amount: v })}
            className={`${fieldClass} text-lg font-bold tabular-nums`}
          />
        </div>

        <div>
          <label htmlFor="expense-concept" className="mb-1.5 block text-base font-bold text-slate-900">
            ¿En qué?
          </label>
          <input
            id="expense-concept"
            value={draft.concept}
            onChange={(e) => patch({ concept: e.target.value })}
            placeholder="Arriendo, luz, transporte…"
            className={fieldClass}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="expense-date" className="mb-1.5 block text-sm font-bold text-slate-900">
              Día
            </label>
            <input
              id="expense-date"
              type="date"
              value={draft.date}
              onChange={(e) => patch({ date: e.target.value })}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="expense-notes" className="mb-1.5 block text-sm font-bold text-slate-900">
              Nota <span className="font-normal text-slate-600">(si quieres)</span>
            </label>
            <input
              id="expense-notes"
              value={draft.notes}
              onChange={(e) => patch({ notes: e.target.value })}
              className={fieldClass}
            />
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-12 rounded-lg px-4 text-base font-bold text-slate-700 transition-colors hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 text-base font-bold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-5 w-5 animate-spin" aria-hidden />}
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
