"use client";

import { CheckCircle2, Info, X, XCircle } from "lucide-react";

const ICONS = { error: XCircle, success: CheckCircle2, info: Info };

// El acento cambia por sección (Ventas en teal, Productos en azul, Pedidos en
// índigo) para que el aviso se sienta parte de la pantalla donde salió. Las
// clases van escritas enteras porque Tailwind no ve las que se arman
// concatenando strings en tiempo de ejecución.
const ACCENTS = {
  teal: { info: "text-teal-300", action: "text-teal-300 hover:text-teal-200" },
  blue: { info: "text-blue-300", action: "text-blue-300 hover:text-blue-200" },
  indigo: {
    info: "text-indigo-300",
    action: "text-indigo-300 hover:text-indigo-200",
  },
};

export default function ToastStack({ toasts, onDismiss, accent = "teal" }) {
  const tone = ACCENTS[accent] ?? ACCENTS.teal;
  const iconColor = {
    error: "text-red-400",
    success: "text-emerald-400",
    info: tone.info,
  };

  return (
    <div
      aria-live="polite"
      role="status"
      className="fixed inset-x-0 bottom-6 z-[70] flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((t) => {
        const Icon = ICONS[t.type] || Info;
        return (
          <div
            key={t.id}
            className="flex w-full max-w-md animate-fade-slide-up items-center gap-3 rounded-xl bg-slate-900 px-4 py-3.5 text-white shadow-xl"
          >
            <Icon
              className={`h-[18px] w-[18px] shrink-0 ${iconColor[t.type] || tone.info}`}
            />
            <span className="flex-1 text-sm font-medium">{t.text}</span>
            {t.action && (
              <button
                onClick={() => {
                  t.action.onClick();
                  onDismiss(t.id);
                }}
                className={`shrink-0 text-sm font-bold ${tone.action}`}
              >
                {t.action.label}
              </button>
            )}
            <button
              onClick={() => onDismiss(t.id)}
              aria-label="Cerrar notificación"
              className="shrink-0 text-slate-500 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
