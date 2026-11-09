"use client";

import { AlertTriangle } from "lucide-react";

import Dialog from "./Dialog";

// "¿Seguro?" para acciones que no se pueden deshacer. El foco arranca en
// Cancelar: un Enter por reflejo no borra nada.
export default function ConfirmDialog({
  title = "Confirmar",
  description = "¿Estás seguro?",
  confirmLabel = "Eliminar",
  cancelLabel = "Cancelar",
  onClose,
  onConfirm,
}) {
  return (
    <Dialog title={title} hideTitle onClose={onClose} className="max-w-sm p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-700">
          <AlertTriangle className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <p className="text-lg font-bold text-slate-900">{title}</p>
          <p className="mt-1 text-base text-slate-700">{description}</p>
        </div>
      </div>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          data-autofocus
          onClick={onClose}
          className="h-11 rounded-lg border border-slate-300 px-4 text-base font-bold text-slate-800 transition-colors hover:bg-slate-50"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="h-11 rounded-lg bg-red-700 px-4 text-base font-bold text-white transition-colors hover:bg-red-800"
        >
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
