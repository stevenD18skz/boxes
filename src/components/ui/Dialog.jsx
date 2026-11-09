"use client";

import { useEffect, useId, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Ventana encima de la pantalla, hecha bien para quien navega con teclado o
// lector de pantalla:
// - se anuncia como diálogo (role="dialog", aria-modal) con su título;
// - al abrir, el foco va al elemento con data-autofocus (o al primero que se
//   pueda enfocar); Tab no se escapa hacia la página de atrás;
// - Escape y el clic afuera la cierran (salvo dismissable={false});
// - al cerrar, el foco vuelve a donde estaba.
//
// `title` es obligatorio aunque no se vea: es lo que lee el lector de pantalla.
export default function Dialog({
  title,
  description,
  onClose,
  dismissable = true,
  className = "",
  children,
  hideTitle = false,
}) {
  const panelRef = useRef(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const panel = panelRef.current;
    const target =
      panel?.querySelector("[data-autofocus]") || panel?.querySelector(FOCUSABLE) || panel;
    target?.focus();

    const onKey = (e) => {
      if (e.key === "Escape" && dismissable) {
        e.stopPropagation();
        onClose?.();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const items = [...panel.querySelectorAll(FOCUSABLE)];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
    // Solo al abrir y cerrar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 px-4"
      onMouseDown={(e) => {
        if (dismissable && e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={`w-full animate-scale-in rounded-2xl bg-white shadow-dialog outline-none ${className}`}
      >
        <h2 id={titleId} className={hideTitle ? "sr-only" : "text-lg font-bold text-slate-900"}>
          {title}
        </h2>
        {description && (
          <p id={descId} className="mt-1 text-base text-slate-700">
            {description}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
