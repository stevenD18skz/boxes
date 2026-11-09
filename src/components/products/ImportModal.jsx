"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Loader2, UploadCloud, X } from "lucide-react";

// Importación en tres pasos: elegir archivo, ver qué filas sirven y confirmar.
// El paso intermedio existe porque un CSV de la tienda casi siempre trae alguna
// fila mal: es mejor mostrarlas antes que fallar a mitad de la carga.
export default function ImportModal({
  step,
  parsed,
  saving,
  onClose,
  onFile,
  onDownloadTemplate,
  onConfirm,
  onFinish,
}) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg animate-scale-in rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-lg font-extrabold text-slate-900">
            Importar productos
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:text-slate-700"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="flex items-center gap-2 px-5 pt-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`h-1.5 flex-1 rounded-full ${step >= n ? "bg-blue-600" : "bg-slate-200"}`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="flex flex-col items-center gap-4 p-5 text-center">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file) onFile(file);
              }}
              className={`flex w-full flex-col items-center gap-2.5 rounded-2xl border-2 border-dashed p-9 transition-colors ${
                dragOver ? "border-blue-400 bg-blue-50" : "border-slate-300"
              }`}
            >
              <UploadCloud className="h-9 w-9 text-slate-500" />
              <div className="text-[15px] font-bold text-slate-900">
                Arrastra tu archivo aquí
              </div>
              <div className="text-[13.5px] text-slate-500">Formato CSV</div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4.5 mt-1.5 px-3 rounded-lg bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
              >
                Seleccionar archivo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onFile(f);
                }}
                className="hidden"
              />
            </div>
            <button
              type="button"
              onClick={onDownloadTemplate}
              className="text-[13.5px] font-semibold text-blue-600 underline hover:text-blue-700"
            >
              Descargar plantilla de ejemplo
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-3.5 p-5">
            <div className="flex gap-2.5">
              <div className="flex-1 rounded-lg bg-emerald-50 p-3.5 text-center">
                <div className="text-2xl font-extrabold tabular-nums text-emerald-600">
                  {parsed.valid.length}
                </div>
                <div className="text-[12.5px] font-semibold text-emerald-800">
                  Listos para importar
                </div>
              </div>
              <div className="flex-1 rounded-lg bg-red-50 p-3.5 text-center">
                <div className="text-2xl font-extrabold tabular-nums text-red-600">
                  {parsed.errors.length}
                </div>
                <div className="text-[12.5px] font-semibold text-red-700">
                  Con errores
                </div>
              </div>
            </div>
            {parsed.errors.length > 0 && (
              <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-100">
                {parsed.errors.map((er, i) => (
                  <div
                    key={i}
                    className="flex gap-2 border-b border-slate-100 px-3.5 py-2.5 text-sm last:border-0"
                  >
                    <span className="shrink-0 font-bold text-slate-800">
                      Fila {er.row}
                    </span>
                    <span className="text-red-700">{er.reason}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-slate-500">
              Las filas con errores no se importarán. Puedes corregir el archivo
              y volver a intentarlo.
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col items-center gap-3.5 p-9 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            </div>
            <div className="text-lg font-extrabold text-slate-900">
              {parsed.valid.length} productos importados
            </div>
            <div className="text-sm text-slate-500">
              Ya puedes verlos en tu lista de productos.
            </div>
          </div>
        )}

        {step > 1 && (
          <div className="flex items-center gap-2.5 border-t border-slate-100 px-5 py-4">
            {step === 2 && (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={saving || parsed.valid.length === 0}
                  className="flex flex-[2] items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {saving
                    ? "Importando..."
                    : `Importar ${parsed.valid.length} productos`}
                </button>
              </>
            )}
            {step === 3 && (
              <button
                type="button"
                onClick={onFinish}
                className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
              >
                Ver productos
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
