"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Check,
  Flashlight,
  FlashlightOff,
  Loader2,
  Play,
  Smartphone,
  WifiOff,
} from "lucide-react";

import CameraViewport from "@/components/ui/CameraViewport";
import { useCameraScanner } from "@/hooks/useCameraScanner";
import { usePhoneScannerClient } from "@/hooks/usePhoneScanner";
import { rememberClientPairingId } from "@/lib/phoneScanner";
import {
  DEFAULT_PHONE_SCANNER_IDLE_SECONDS,
  formatIdleDuration,
} from "@/lib/settings";

/*
  El celular haciendo de lector para la pantalla del computador.

  Es una página pública a propósito: entra desde otro navegador (se apunta el
  QR con el teléfono, no se comparte la sesión) y no tendría la cookie de la
  tienda. Puede serlo porque no lee ni escribe nada del negocio -no hay
  productos, ni precios, ni ventas acá- : abre la cámara y emite al canal el
  código que leyó. Quién la recibe lo decide el identificador del
  emparejamiento, que va en la dirección y es un UUID aleatorio.

  La página no busca el producto ni decide nada: eso pasa del otro lado, en la
  pantalla que ya tiene el catálogo cargado y la sesión abierta. Acá solo se
  lee y se manda, igual que haría un lector de mano.

  La cámara no se queda encendida sola. Se apaga por dos caminos, y los dos
  terminan en la misma pantalla de pausa con su botón para reanudar:
  - Por su propio reloj, al pasar el rato de inactividad configurado en
    Configuración > Ahorro de batería sin leer nada (?idle=... en la URL, ver
    pairingUrl en src/lib/phoneScanner.ts). Es un reloj de acá y no un aviso
    del computador, para que funcione incluso si se cayó la conexión: una
    cámara encendida y olvidada calienta el teléfono y se come la carga en una
    tarde. Con ?idle=0 el ahorro está apagado y este reloj no corre.
  - Porque el computador avisó que ya terminó. En Productos alcanza con un
    código: se lee, se trae la ficha y lo que sigue se revisa allá.
*/

const STATUS_STYLES = {
  connected: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  waiting: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  broken: "bg-red-500/15 text-red-300 ring-red-500/30",
};

const PAUSE_COPY = {
  idle: (idleSeconds) => ({
    title: "Cámara en pausa",
    detail: `Pasaron ${formatIdleDuration(idleSeconds)} sin leer nada y se apagó para no gastar la batería del teléfono.`,
  }),
  done: () => ({
    title: "Código recibido",
    detail:
      "El computador ya lo tiene y el registro sigue allá. Puedes volver a escanear cuando lo necesites.",
  }),
};

function PhoneScannerScreen() {
  const { id } = useParams();
  const pairingId = typeof id === "string" ? id : null;

  // Sale de la URL (ver pairingUrl en src/lib/phoneScanner.ts): el computador
  // que armó el QR ya sabe la configuración de Ahorro de batería de la
  // tienda, y esta página es pública y no tiene sesión con la que pedírsela.
  // Sin el parámetro (un QR viejo, por ejemplo) se usa el valor por defecto;
  // con ?idle=0 el ahorro está apagado y la cámara no se apaga sola.
  const searchParams = useSearchParams();
  const idleSeconds = useMemo(() => {
    const raw = searchParams.get("idle");
    if (raw === null) return DEFAULT_PHONE_SCANNER_IDLE_SECONDS;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [searchParams]);

  // Lo último que se intentó mandar, para poder confirmar en pantalla. Quien
  // escanea está mirando la mercancía, no el teléfono: el aviso tiene que
  // decir si el código llegó de verdad, no solo que se leyó.
  const [lastSent, setLastSent] = useState(null);
  const [sentCount, setSentCount] = useState(0);
  // null = escaneando. Con un motivo dentro = cámara apagada.
  const [pause, setPause] = useState(null);
  // Cambia con cada lectura y es lo que reinicia el reloj de inactividad.
  const [lastScanAt, setLastScanAt] = useState(() => Date.now());

  const handleRemoteStop = useCallback((reason) => {
    setPause({ reason: reason === "idle" ? "idle" : "done" });
  }, []);

  const { status, desktopConnected, sendCode } = usePhoneScannerClient({
    pairingId,
    onStop: handleRemoteStop,
  });

  // Se recuerda el emparejamiento apenas se abre: la próxima vez basta entrar
  // a /scan y este teléfono vuelve solo a la misma pantalla, sin repetir el QR.
  useEffect(() => {
    if (pairingId) rememberClientPairingId(pairingId);
  }, [pairingId]);

  const handleScan = useCallback(
    async (code) => {
      setLastScanAt(Date.now());
      setLastSent({ code, state: "sending" });
      const ok = await sendCode(code);
      setLastSent({ code, state: ok ? "sent" : "failed" });
      if (ok) setSentCount((n) => n + 1);
    },
    [sendCode],
  );

  const camera = useCameraScanner({ active: !pause, onScan: handleScan });
  const { torchOn, torchAvailable, toggleTorch } = camera;

  // El reloj de inactividad. Se rearma con cada lectura porque lastScanAt
  // cambia, así que el rato configurado cuenta desde el último código y no
  // desde que se abrió la página. idleSeconds en null es el ahorro apagado:
  // no hay reloj que armar.
  useEffect(() => {
    if (pause || idleSeconds == null) return;
    const timer = setTimeout(
      () => setPause({ reason: "idle" }),
      idleSeconds * 1000,
    );
    return () => clearTimeout(timer);
  }, [pause, lastScanAt, idleSeconds]);

  // Sin esto la pantalla se apaga sola a los treinta segundos y hay que
  // despertarla en cada producto, que es justo lo que este atajo venía a
  // evitar. Se suelta al pausar: con la cámara apagada no hay nada que mirar.
  useEffect(() => {
    if (pause) return;
    let lock = null;
    let cancelled = false;

    const acquire = async () => {
      if (!navigator.wakeLock) return;
      try {
        lock = await navigator.wakeLock.request("screen");
      } catch {
        /* el navegador la negó: la pantalla se apagará como siempre */
      }
    };

    // El bloqueo se suelta solo al pasar la pestaña a segundo plano, así que
    // hay que volver a pedirlo al regresar.
    const onVisibility = () => {
      if (document.visibilityState === "visible" && !cancelled) acquire();
    };

    acquire();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      lock?.release().catch(() => {});
    };
  }, [pause]);

  const resume = () => {
    setPause(null);
    setLastSent(null);
    setLastScanAt(Date.now());
  };

  const link =
    status === "error" || status === "unavailable"
      ? {
          tone: "broken",
          icon: WifiOff,
          text:
            status === "unavailable"
              ? "Sin conexión con el servidor"
              : "Se perdió la conexión",
        }
      : status === "connecting"
        ? { tone: "waiting", icon: Loader2, text: "Conectando…", spin: true }
        : desktopConnected
          ? { tone: "connected", icon: Check, text: "Conectado al computador" }
          : {
              tone: "waiting",
              icon: AlertTriangle,
              text: "El computador no está escuchando",
            };

  const LinkIcon = link.icon;

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-950">
      <div className="flex shrink-0 items-center gap-2 px-3 py-3 sm:px-4">
        <span
          className={`flex min-w-0 flex-1 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${STATUS_STYLES[link.tone]}`}
        >
          <LinkIcon
            className={`h-3.5 w-3.5 shrink-0 ${link.spin ? "animate-spin" : ""}`}
            aria-hidden
          />
          <span className="truncate">{link.text}</span>
        </span>

        {torchAvailable && !pause && (
          <button
            type="button"
            onClick={toggleTorch}
            aria-pressed={torchOn}
            aria-label={torchOn ? "Apagar la linterna" : "Prender la linterna"}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
              torchOn
                ? "bg-amber-400 text-slate-900"
                : "text-white/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            {torchOn ? (
              <Flashlight className="h-5 w-5" aria-hidden />
            ) : (
              <FlashlightOff className="h-5 w-5" aria-hidden />
            )}
          </button>
        )}
      </div>

      {pause ? (
        /* La cámara está apagada de verdad acá (active=false), no solo tapada:
           ese es el punto de toda esta pantalla. */
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <span
            className={`flex h-14 w-14 items-center justify-center rounded-full ${
              pause.reason === "done" ? "bg-emerald-500/15" : "bg-slate-800"
            }`}
          >
            {pause.reason === "done" ? (
              <Check className="h-7 w-7 text-emerald-400" aria-hidden />
            ) : (
              <Smartphone className="h-7 w-7 text-slate-500" aria-hidden />
            )}
          </span>
          <p className="text-base font-bold text-white">
            {PAUSE_COPY[pause.reason](
              idleSeconds ?? DEFAULT_PHONE_SCANNER_IDLE_SECONDS,
            ).title}
          </p>
          <p className="max-w-sm text-sm leading-relaxed text-slate-500">
            {
              PAUSE_COPY[pause.reason](
                idleSeconds ?? DEFAULT_PHONE_SCANNER_IDLE_SECONDS,
              ).detail
            }
          </p>
          {sentCount > 0 && (
            <p className="text-xs text-slate-500">
              {sentCount}{" "}
              {sentCount === 1 ? "código enviado" : "códigos enviados"} en esta
              sesión
            </p>
          )}
          <button
            type="button"
            onClick={resume}
            autoFocus
            className="mt-2 flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-7 text-sm font-bold text-white transition-colors hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Play className="h-4 w-4" aria-hidden />
            Volver a escanear
          </button>
        </div>
      ) : (
        <CameraViewport
          camera={camera}
          errorHint="Sin cámara este teléfono no puede servir de lector. En el computador puedes seguir escribiendo el código a mano."
          notice={
            lastSent ? (
              lastSent.state === "failed" ? (
                <p className="flex animate-fade-slide-up items-center gap-2 rounded-full bg-red-500/95 px-4 py-2 text-sm font-bold text-white shadow-lg">
                  <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                  No se pudo enviar {lastSent.code}
                </p>
              ) : lastSent.state === "sending" ? (
                <p className="flex items-center gap-2 rounded-full bg-slate-800/95 px-4 py-2 text-sm font-bold text-white shadow-lg">
                  <Loader2
                    className="h-4 w-4 shrink-0 animate-spin"
                    aria-hidden
                  />
                  Enviando {lastSent.code}
                </p>
              ) : (
                <p className="flex animate-fade-slide-up items-center gap-2 rounded-full bg-emerald-500/95 px-4 py-2 text-sm font-bold text-white shadow-lg">
                  <Check className="h-4 w-4 shrink-0" aria-hidden />
                  Enviado {lastSent.code}
                </p>
              )
            ) : null
          }
        />
      )}

      {!pause && (
        <div className="shrink-0 px-4 pb-5 pt-3 text-center">
          <p className="flex items-center justify-center gap-1.5 text-xs leading-relaxed text-white/50">
            <Smartphone className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {sentCount > 0
              ? `${sentCount} ${sentCount === 1 ? "código enviado" : "códigos enviados"} · sigue pasando productos`
              : "Apunta al código de barras. Cada lectura entra en el computador."}
          </p>
        </div>
      )}
    </div>
  );
}

// useSearchParams exige un límite de Suspense alrededor: sin esto el build
// falla con "should be wrapped in a suspense boundary". Mismo patrón que
// src/app/(auth)/login/page.jsx.
export default function PhoneScannerPage() {
  return (
    <Suspense fallback={null}>
      <PhoneScannerScreen />
    </Suspense>
  );
}
