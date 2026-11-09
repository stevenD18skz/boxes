"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { AlertTriangle, Check, Loader2, Unlink, X } from "lucide-react";

import { pairingUrl } from "@/lib/phoneScanner";

/*
  Emparejar el celular con esta pantalla para que haga de lector.

  El modal es solo para emparejar y para ver cómo va: una vez hecho, quien
  atiende levanta el teléfono y escanea sin abrir nada, porque la pantalla se
  queda escuchando el canal mientras esté abierta (ver usePhoneScannerHost).
  Por eso no hay un botón de "empezar": no hay nada que empezar.

  El QR lleva la dirección de la página del celular con el identificador del
  emparejamiento dentro. Se muestra también escrita debajo, para el caso de que
  la cámara del teléfono no quiera con el código -pasa con pantallas muy
  brillantes o muy sucias- y toque escribirla.

  Se carga con next/dynamic desde las pantallas que lo usan: el generador de QR
  solo hace falta el rato que alguien está emparejando, y no tiene por qué
  viajar en el primer cargue de Ventas ni de Productos. El botón que lo abre
  está en PhoneScannerButton, que sí es liviano y va siempre.
*/
export default function PhoneScannerModal({
  pairingId,
  status,
  phoneConnected,
  onReset,
  onClose,
  /** Se llama una sola vez, justo cuando el celular pasa de desconectado a
   *  conectado mientras el modal está abierto (no si ya estaba conectado al
   *  abrirlo). Pensado para que quien lo use dispare un toast. */
  onConnected,
  /**
   * Ahorro de batería de Configuración: cuánto rato sin leer nada antes de
   * que el celular apague su cámara solo, en segundos (null = nunca). Viaja
   * en la URL del QR porque /scan es pública y no tiene sesión con la que
   * pedirle la configuración a la tienda.
   */
  idleSeconds,
}) {
  // window no existe en el servidor. El modal solo se monta tras un clic, pero
  // se arma la dirección después del montaje para no depender de eso.
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (pairingId) setUrl(pairingUrl(pairingId, idleSeconds));
  }, [pairingId, idleSeconds]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Ya cumplió su propósito: una vez el celular queda del otro lado no hay
  // nada más que emparejar, así que se avisa y se cierra solo. El ref (y no un
  // useState) es porque esto es "ya pasó una vez", no algo que deba redibujar
  // nada. No dispara si el modal se abre con el celular ya conectado -por
  // ejemplo, para desvincularlo-, solo en la transición de verdad.
  const wasConnectedRef = useRef(phoneConnected);
  useEffect(() => {
    if (phoneConnected && !wasConnectedRef.current) {
      wasConnectedRef.current = true;
      onConnected?.();
      onClose();
    }
    wasConnectedRef.current = phoneConnected;
  }, [phoneConnected, onConnected, onClose]);

  const unavailable = status === "unavailable";

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/45 px-4 py-8 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md animate-scale-in rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-5">
          <div>
            <h3 className="text-xl font-extrabold text-slate-900">
              Escanear con el celular
            </h3>
            <p className="mt-0.5 text-sm text-slate-500">
              Tu teléfono hace de lector y los códigos entran en esta pantalla.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:text-slate-700"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-4 p-5">
          {unavailable ? (
            <div className="flex w-full gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <AlertTriangle
                className="h-5 w-5 shrink-0 text-amber-600"
                aria-hidden
              />
              <div>
                <p className="text-sm font-bold text-amber-900">
                  Falta configurar la conexión
                </p>
                <p className="mt-0.5 text-[13px] text-amber-800">
                  El puente con el celular usa Supabase. Sin
                  NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY no
                  hay por dónde mandar los códigos.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Blanco y con margen alrededor: los lectores de QR necesitan la
                  zona en blanco del borde para encontrar el código. */}
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                {url ? (
                  <QRCodeSVG value={url} size={188} level="M" marginSize={0} />
                ) : (
                  <div className="flex h-[188px] w-[188px] items-center justify-center">
                    <Loader2
                      className="h-6 w-6 animate-spin text-slate-300"
                      aria-hidden
                    />
                  </div>
                )}
              </div>

              <p className="max-w-sm text-center text-sm leading-relaxed text-slate-600">
                Apunta la cámara de tu celular a este código. Queda emparejado
                también para las próximas veces.
              </p>

              {url && (
                <p className="w-full break-all rounded-lg bg-slate-50 px-3 py-2 text-center font-mono text-[11px] leading-relaxed text-slate-500">
                  {url}
                </p>
              )}

              {/* Lo que de verdad importa saber: si el celular ya está del otro
                  lado. Sin esto quedaría apuntando el QR sin saber si sirvió. */}
              <div
                className={`flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold ${
                  phoneConnected
                    ? "bg-emerald-50 text-emerald-700"
                    : status === "error"
                      ? "bg-red-50 text-red-700"
                      : "bg-slate-50 text-slate-500"
                }`}
              >
                {phoneConnected ? (
                  <>
                    <Check className="h-4 w-4 shrink-0" aria-hidden />
                    Celular conectado, ya puedes escanear
                  </>
                ) : status === "error" ? (
                  <>
                    <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                    Se perdió la conexión con el servidor
                  </>
                ) : (
                  <>
                    <Loader2
                      className="h-4 w-4 shrink-0 animate-spin"
                      aria-hidden
                    />
                    Esperando al celular…
                  </>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col gap-2.5 border-t border-slate-100 px-5 py-4 sm:flex-row-reverse">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-700 sm:flex-1"
          >
            Listo
          </button>
          {/* Rompe el vínculo y saca un código nuevo: para cuando el celular
              emparejado se prestó, se perdió o se cambió de dueño. */}
          <button
            type="button"
            onClick={onReset}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 sm:flex-1"
          >
            <Unlink className="h-4 w-4" aria-hidden />
            Desvincular el celular
          </button>
        </div>
      </div>
    </div>
  );
}
