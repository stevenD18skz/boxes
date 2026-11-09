"use client";

import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";

// Control de stock que vive en la propia fila: se ajusta con +/− o escribiendo
// el número. El borrador local existe para poder escribir "1", "12", "125" sin
// que cada tecla dispare un guardado; el valor sale hacia afuera al salir del
// campo o con Enter, y si lo escrito no sirve se vuelve a lo que había.
export default function StockStepper({ value, onCommit }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  const commitDraft = () => {
    const v = parseInt(draft, 10);
    if (!Number.isNaN(v) && v >= 0 && v !== value) onCommit(v);
    else setDraft(String(value));
  };
  const step = (delta) => onCommit(Math.max(0, value + delta));

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Restar una unidad"
        onClick={() => step(-1)}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <input
        type="number"
        min="0"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitDraft}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        aria-label="Cantidad en stock"
        className="no-spinner w-14 rounded-md border border-slate-200 py-1 text-center text-sm font-semibold tabular-nums text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      />
      <button
        type="button"
        aria-label="Sumar una unidad"
        onClick={() => step(1)}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
