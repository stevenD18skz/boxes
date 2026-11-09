"use client";

import { useRef } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { currency } from "@/utils/converts";

// Total, adjunto de la factura y los dos botones que cierran el pedido.
export default function OrderTotalPanel({
  total,
  attachment,
  onAttachmentChange,
  onRemoveAttachment,
  confirming,
  onCancel,
  onConfirm,
}) {
  const fileInputRef = useRef(null);

  return (
    <div className="rounded-xl bg-white p-[18px] shadow-sm ring-1 ring-slate-100">
      <div className="mb-4 flex items-baseline justify-between">
        <div className="text-[16px] font-bold text-slate-900">
          Costo total del pedido
        </div>
        <div className="text-[28px] font-extrabold tabular-nums text-slate-900">
          {currency(total)}
        </div>
      </div>

      <div className="mb-[18px] flex items-start gap-3.5">
        <div className="relative h-[88px] w-[88px] shrink-0">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-[88px] w-[88px] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100"
          >
            {attachment ? (
              <img
                src={attachment}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex flex-col items-center gap-1 text-slate-500">
                <ImagePlus className="h-5 w-5" />
                <span className="text-[10px] font-semibold">Factura</span>
              </span>
            )}
          </button>
          {attachment && (
            <button
              type="button"
              onClick={onRemoveAttachment}
              aria-label="Quitar adjunto"
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-500 shadow ring-1 ring-slate-200 hover:text-red-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onAttachmentChange}
          className="hidden"
        />
        <div className="pt-1.5 text-[13px] text-slate-500">
          <div className="mb-0.5 font-bold text-slate-700">
            Adjuntar factura o comprobante
          </div>
          Toca el recuadro para subir una foto del comprobante que te da el
          proveedor (opcional).
        </div>
      </div>

      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={onCancel}
          disabled={confirming}
          className="h-[50px] flex-1 rounded-lg border border-slate-200 text-[15px] font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={confirming}
          className="flex h-[50px] flex-[2] items-center justify-center gap-2 rounded-lg bg-indigo-600 text-[15px] font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {confirming && <Loader2 className="h-[18px] w-[18px] animate-spin" />}
          {confirming ? "Registrando..." : "Registrar pedido"}
        </button>
      </div>
    </div>
  );
}
