// Piezas de armado del manual: los bloques con los que se escribe cada
// capítulo. Se mantienen juntas a propósito — son cinco componentes chicos que
// solo se usan aquí y siempre en combinación.

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Info, Lightbulb } from "lucide-react";

const CALLOUT_STYLES = {
  info: {
    wrap: "border-blue-200 bg-blue-50",
    title: "text-blue-900",
    body: "text-blue-800",
    Icon: Info,
  },
  warning: {
    wrap: "border-amber-200 bg-amber-50",
    title: "text-amber-900",
    body: "text-amber-800",
    Icon: AlertTriangle,
  },
  tip: {
    wrap: "border-teal-200 bg-teal-50/60",
    title: "text-teal-900",
    body: "text-teal-800",
    Icon: Lightbulb,
  },
};

export function Callout({
  tone,
  title,
  children,
}: {
  tone: "info" | "warning" | "tip";
  title: string;
  children: ReactNode;
}) {
  const styles = CALLOUT_STYLES[tone];

  return (
    <div className={`rounded-xl border p-5 ${styles.wrap}`}>
      <h3
        className={`flex items-center gap-2 text-sm font-semibold ${styles.title}`}
      >
        <styles.Icon className="h-4 w-4 shrink-0" aria-hidden />
        {title}
      </h3>
      <div className={`mt-2 text-sm leading-relaxed ${styles.body}`}>
        {children}
      </div>
    </div>
  );
}

// Tabla de campos de un formulario: qué se pide, qué es obligatorio y qué
// conviene saber antes de escribirlo.
export function FieldTable({
  rows,
}: {
  rows: { campo: string; obligatorio: boolean; notas?: string }[];
}) {
  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full min-w-[420px] text-left text-sm">
        <thead className="bg-slate-50 text-sm text-slate-600">
          <tr>
            <th className="px-4 py-2 font-medium">Campo</th>
            <th className="px-4 py-2 font-medium">¿Obligatorio?</th>
            <th className="px-4 py-2 font-medium">Notas</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.campo}>
              <td className="px-4 py-2.5 font-medium text-slate-800">
                {r.campo}
              </td>
              <td className="px-4 py-2.5">
                {r.obligatorio ? (
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-[12px] font-medium text-red-600">
                    Sí
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[12px] font-medium text-slate-500">
                    No
                  </span>
                )}
              </td>
              <td className="px-4 py-2.5 text-slate-600">{r.notas ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SimpleTable({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead className="bg-slate-50 text-sm text-slate-600">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-4 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={`px-4 py-2.5 align-top ${j === 0 ? "font-medium text-slate-800" : "text-slate-600"}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="mt-4 space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-sm leading-relaxed text-slate-700">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-500">
            {i + 1}
          </span>
          <span className="pt-0.5">{item}</span>
        </li>
      ))}
    </ol>
  );
}

// Un capítulo. El scroll-mt-20 deja el título visible cuando se llega desde el
// índice: sin él, la barra superior fija tapa el encabezado.
export function Section({
  id,
  icon: Icon,
  numero,
  titulo,
  proposito,
  children,
}: {
  id: string;
  icon: LucideIcon;
  numero: number;
  titulo: string;
  proposito: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-h`}
      className="scroll-mt-20 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex items-start gap-4">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"
          aria-hidden
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={`${id}-h`} className="text-lg font-semibold text-slate-900">
            <span className="tabular-nums text-slate-500">
              {String(numero).padStart(2, "0")}.
            </span>{" "}
            {titulo}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            {proposito}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-5 pl-0 sm:pl-[52px]">{children}</div>
    </section>
  );
}

// Subtítulo con su párrafo, el patrón que más se repite dentro de un capítulo.
export function Topic({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-900">{titulo}</h3>
      {children}
    </div>
  );
}

export function Faq({ q, children }: { q: string; children: ReactNode }) {
  return (
    <details className="group rounded-lg border border-slate-200 bg-white open:shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-slate-800 marker:content-none">
        {q}
        <span
          className="shrink-0 text-slate-500 transition-transform group-open:rotate-45"
          aria-hidden
        >
          +
        </span>
      </summary>
      <div className="border-t border-slate-100 px-4 py-3 text-sm leading-relaxed text-slate-600">
        {children}
      </div>
    </details>
  );
}
