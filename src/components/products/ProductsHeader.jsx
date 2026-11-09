"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Clock,
  Download,
  PlusCircle,
  Printer,
  RefreshCw,
  ScanLine,
  Upload,
} from "lucide-react";

const formatUpdatedAt = (date) =>
  date.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });

// Título + acciones del inventario. Antes eran seis botones iguales; ahora
// (Ley de Hick) una acción principal, una secundaria que se usa a diario
// (escanear) y lo de vez en cuando agrupado en "Más opciones".
// Descargar e imprimir trabajan sobre lo que se está viendo con los filtros,
// por eso se apagan cuando no hay nada en pantalla.
export default function ProductsHeader({
  loading,
  canExport,
  lastUpdated,
  onRefresh,
  onImport,
  onExportCSV,
  onExportPDF,
  onScan,
  onNew,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e) => {
      if (!menuRef.current?.contains(e.target) && !buttonRef.current?.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    menuRef.current?.querySelector("button:not([disabled])")?.focus();
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const run = (fn) => () => {
    setMenuOpen(false);
    fn?.();
  };

  const menuItem =
    "flex min-h-[48px] w-full items-center gap-3 rounded-lg px-3 text-left text-base text-slate-800 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Productos</h1>
        <p className="mt-1 text-base text-slate-600">Lo que tienes en la tienda y cuánto te queda.</p>
        {lastUpdated && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
            <Clock className="h-4 w-4 shrink-0" aria-hidden />
            Actualizado a las {formatUpdatedAt(lastUpdated)}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <button
            ref={buttonRef}
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex h-12 items-center gap-2 rounded-lg px-3 text-base font-bold text-slate-700 transition-colors hover:bg-slate-100"
          >
            Más opciones
            <ChevronDown className={`h-5 w-5 transition-transform ${menuOpen ? "rotate-180" : ""}`} aria-hidden />
          </button>
          {menuOpen && (
            <div
              ref={menuRef}
              role="menu"
              className="absolute right-0 z-30 mt-1 w-72 animate-dropdown-in rounded-xl border border-slate-200 bg-white p-1.5 shadow-pop"
            >
              <button role="menuitem" type="button" onClick={run(onImport)} className={menuItem}>
                <Upload className="h-5 w-5 text-slate-600" aria-hidden />
                Subir tu lista desde Excel
              </button>
              <button role="menuitem" type="button" onClick={run(onExportCSV)} disabled={!canExport} className={menuItem}>
                <Download className="h-5 w-5 text-slate-600" aria-hidden />
                Descargar la lista
              </button>
              <button role="menuitem" type="button" onClick={run(onExportPDF)} disabled={!canExport} className={menuItem}>
                <Printer className="h-5 w-5 text-slate-600" aria-hidden />
                Imprimir la lista
              </button>
              <button role="menuitem" type="button" onClick={run(onRefresh)} disabled={loading} className={menuItem}>
                <RefreshCw className={`h-5 w-5 text-slate-600 ${loading ? "animate-spin" : ""}`} aria-hidden />
                Volver a cargar
              </button>
            </div>
          )}
        </div>

        {/* El escaneo con el celular vive aparte, como botón flotante (ver
            PhoneScannerFab): se empareja una vez y queda. */}
        <button
          type="button"
          onClick={onScan}
          className="flex h-12 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-base font-bold text-slate-800 transition-colors hover:bg-slate-50"
        >
          <ScanLine className="h-5 w-5 text-brand-700" aria-hidden />
          Escanear
        </button>
        <button
          type="button"
          onClick={onNew}
          className="flex h-12 items-center gap-2 rounded-lg bg-brand-600 px-5 text-base font-bold text-white shadow-sm transition-colors hover:bg-brand-700"
        >
          <PlusCircle className="h-5 w-5" aria-hidden />
          Agregar producto
        </button>
      </div>
    </div>
  );
}
