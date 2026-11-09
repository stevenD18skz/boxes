"use client";

// Configuración de la tienda. Por ahora solo trae el ahorro de batería del
// escáner del celular; la idea es que las próximas configuraciones agreguen
// otra <section> acá al lado, todas contra el mismo useSettings.
import { useEffect, useState } from "react";
import { Loader2, Smartphone } from "lucide-react";

import { useSettings } from "@/hooks/useSettings";
import { useToasts } from "@/hooks/useToasts";
import Switch from "@/components/ui/Switch";
import ToastStack from "@/components/ui/ToastStack";
import {
  PHONE_SCANNER_IDLE_MAX_SECONDS,
  PHONE_SCANNER_IDLE_MIN_SECONDS,
  PHONE_SCANNER_IDLE_STEP_SECONDS,
  formatIdleDuration,
} from "@/lib/settings";

export default function SettingsPage() {
  const { settings, loading, update } = useSettings();
  const { toasts, push, dismiss } = useToasts();

  // Borrador del control deslizante: se guarda al soltar, no en cada paso del
  // arrastre, para no mandar una petición por cada pixel. Se resincroniza si
  // el valor de verdad cambia por otro lado (otra pestaña, otra carga).
  const [draftSeconds, setDraftSeconds] = useState(
    settings.phoneScannerIdleSeconds,
  );
  useEffect(() => {
    setDraftSeconds(settings.phoneScannerIdleSeconds);
  }, [settings.phoneScannerIdleSeconds]);

  const [savingKey, setSavingKey] = useState(null);

  const save = async (patch, key) => {
    setSavingKey(key);
    try {
      await update(patch);
    } catch (err) {
      push(
        err instanceof Error ? err.message : "No se pudo guardar el cambio",
        "error",
      );
    } finally {
      setSavingKey(null);
    }
  };

  const commitIdleSeconds = () => {
    if (draftSeconds === settings.phoneScannerIdleSeconds) return;
    save({ phoneScannerIdleSeconds: draftSeconds }, "idleSeconds");
  };

  return (
    <>
      <header>
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
          Configuración
        </h1>
        <p className="mt-1 text-sm text-slate-500">Ajustes de esta tienda.</p>
      </header>

      <main className="mt-4 max-w-2xl space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Smartphone className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-slate-900">
                Escáner del celular
              </h3>
              <p className="mt-0.5 text-sm text-slate-500">
                Cómo se comporta el celular que emparejas para leer códigos de
                barras.
              </p>

              <div className="mt-4 flex items-center justify-between gap-4 border-t border-slate-100 pt-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    Ahorro de batería
                    {savingKey === "autoDisconnect" && (
                      <Loader2
                        className="h-3.5 w-3.5 animate-spin text-slate-500"
                        aria-hidden
                      />
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Apaga la cámara y desconecta el celular solo cuando pasa
                    un rato sin escanear nada. Apagado, el celular se queda
                    conectado sin límite.
                  </p>
                </div>
                <Switch
                  checked={settings.phoneScannerAutoDisconnect}
                  disabled={loading || savingKey === "autoDisconnect"}
                  ariaLabel="Ahorro de batería"
                  onChange={() =>
                    save(
                      {
                        phoneScannerAutoDisconnect:
                          !settings.phoneScannerAutoDisconnect,
                      },
                      "autoDisconnect",
                    )
                  }
                />
              </div>

              {settings.phoneScannerAutoDisconnect && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="idle-seconds"
                      className="flex items-center gap-2 text-sm font-semibold text-slate-800"
                    >
                      Tiempo de inactividad
                      {savingKey === "idleSeconds" && (
                        <Loader2
                          className="h-3.5 w-3.5 animate-spin text-slate-500"
                          aria-hidden
                        />
                      )}
                    </label>
                    <span className="text-sm font-bold text-blue-600">
                      {formatIdleDuration(draftSeconds)}
                    </span>
                  </div>
                  <input
                    id="idle-seconds"
                    type="range"
                    min={PHONE_SCANNER_IDLE_MIN_SECONDS}
                    max={PHONE_SCANNER_IDLE_MAX_SECONDS}
                    step={PHONE_SCANNER_IDLE_STEP_SECONDS}
                    value={draftSeconds}
                    disabled={loading || savingKey === "idleSeconds"}
                    onChange={(e) => setDraftSeconds(Number(e.target.value))}
                    onMouseUp={commitIdleSeconds}
                    onTouchEnd={commitIdleSeconds}
                    onKeyUp={commitIdleSeconds}
                    className="mt-3 w-full accent-blue-600"
                  />
                  <div className="mt-1 flex justify-between text-[11px] text-slate-500">
                    <span>
                      {formatIdleDuration(PHONE_SCANNER_IDLE_MIN_SECONDS)}
                    </span>
                    <span>
                      {formatIdleDuration(PHONE_SCANNER_IDLE_MAX_SECONDS)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <ToastStack toasts={toasts} onDismiss={dismiss} accent="blue" />
    </>
  );
}
