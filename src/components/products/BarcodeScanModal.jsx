"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Camera,
  ImagePlus,
  Loader2,
  Maximize2,
  PackageSearch,
  Pencil,
  ScanLine,
  Search,
  X,
} from "lucide-react";

import CameraScannerModal from "@/components/ui/CameraScannerModal";
import ImageViewer from "@/components/ui/ImageViewer";
import PhoneScannerButton from "@/components/ui/PhoneScannerButton";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { useCameraScannerAvailable } from "@/hooks/useCameraScanner";
import { usePhoneScannerLink } from "@/hooks/usePhoneScanner";
import { lookupBarcode } from "@/services/barcode.service";

/*
  Registrar un producto empezando por el código de barras.

  El orden importa y es el mismo que hace la mano: primero se pasa el lector por
  la mercancía, después se decide. Por eso el campo del código está solo arriba
  y el resultado aparece abajo, sin sacar a nadie de la pantalla: si el producto
  que salió no es el que está en la mano, se vuelve a escanear encima y ya.

  Antes de salir a preguntarle a nadie se revisa el catálogo propio. Escanear
  algo que ya está registrado es lo más común del mundo cuando se está haciendo
  inventario, y crear un duplicado ahí rompe las ventas: dos productos con el
  mismo código y el lector no sabe cuál sumar.

  Funciona con lector de teclado (la app del celular o un lector USB) por
  useBarcodeScanner, y también escribiendo el código a mano y dando Enter.
*/

// El generador de QR solo hace falta mientras alguien empareja el celular, que
// es un rato y una vez: se baja en ese momento y no en el primer cargue.
const PhoneScannerModal = dynamic(
  () => import("@/components/ui/PhoneScannerModal"),
  { ssr: false },
);

// EAN-8, UPC-A, EAN-13 y los ITF-14 de las cajas del proveedor.
const BARCODE_RE = /^\d{8,14}$/;

const Field = ({ label, value }) =>
  value ? (
    <div className="flex gap-2 text-[13px]">
      <span className="w-28 shrink-0 font-semibold text-slate-500">
        {label}
      </span>
      <span className="min-w-0 flex-1 text-slate-800">{value}</span>
    </div>
  ) : null;

export default function BarcodeScanModal({
  onClose,
  onUse,
  onManual,
  onEditExisting,
  findByBarcode,
  /** Toast de la página de Productos, para avisos que no caben en el modal. */
  onNotice,
}) {
  const [code, setCode] = useState("");
  const [state, setState] = useState({ status: "idle" });
  const [photoOpen, setPhotoOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const cameraAvailable = useCameraScannerAvailable();
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const inputRef = useRef(null);
  // Cada consulta lleva un número. Si alguien escanea otra cosa mientras la
  // anterior venía en camino, la respuesta vieja llega y se descarta en vez de
  // pisar en pantalla el producto nuevo.
  const requestId = useRef(0);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const run = async (raw) => {
    const clean = String(raw ?? "").trim();
    if (!clean) return;
    setCode(clean);

    const existing = findByBarcode(clean);
    if (existing) {
      setState({ status: "duplicate", product: existing });
      return;
    }
    if (!BARCODE_RE.test(clean)) {
      setState({ status: "invalid" });
      return;
    }

    const id = ++requestId.current;
    setState({ status: "loading" });
    try {
      const found = await lookupBarcode(clean);
      if (id !== requestId.current) return;
      setState(found ? { status: "found", found } : { status: "empty" });
    } catch (err) {
      if (id !== requestId.current) return;
      setState({ status: "error", message: err.message });
    }
  };

  // Con la cámara abierta el lector de teclado se apaga: no hay teclado a la
  // vista y dejarlo escuchando solo abre la puerta a procesar el mismo código
  // dos veces.
  const { scanning } = useBarcodeScanner({ onScan: run, enabled: !cameraOpen });

  // El celular emparejado entra por run() igual que el lector: revisa
  // duplicados y sale a consultar la ficha.
  //
  // Acá un código es todo el trabajo, a diferencia de Ventas donde se pasa
  // mercancía sin parar. Apenas entra uno se cierra el QR y se le dice al
  // teléfono que apague la cámara: lo que sigue es mirar la ficha en el
  // computador, y el celular ya no pinta nada.
  const phoneScanner = usePhoneScannerLink({
    onScan: (code) => {
      setPhoneModalOpen(false);
      phoneScannerRef.current?.stopPhone("done");
      run(code);
    },
    pairing: phoneModalOpen,
    onIdle: () => {
      setPhoneModalOpen(false);
      onNotice?.("Se pausó el escaneo con el celular por inactividad", "info");
    },
  });
  // El propio objeto que devuelve el hook, para poder usar stopPhone desde el
  // onScan que se le pasa a ese mismo hook.
  const phoneScannerRef = useRef(null);
  phoneScannerRef.current = phoneScanner;

  const handleKeyDown = (e) => {
    // useBarcodeScanner ya resolvió este Enter en fase de captura y lo canceló.
    // Si se sigue de largo, la misma consulta saldría dos veces.
    if (e.defaultPrevented) return;
    if (e.key === "Enter") {
      e.preventDefault();
      run(code);
    }
  };

  const busy = state.status === "loading";

  return (
    <>
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 px-4 py-8 backdrop-blur-sm sm:items-center"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg animate-scale-in rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-5">
          <div>
            <h3 className="text-xl font-extrabold text-slate-900">
              Registrar por código de barras
            </h3>
            <p className="mt-0.5 text-sm text-slate-500">
              Pasa el lector o escribe el código y damos con la ficha del
              producto.
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

        <div className="flex flex-col gap-4 p-5">
          <div>
            <label
              htmlFor="scan-barcode"
              className="text-sm font-semibold text-slate-700"
            >
              Código de barras
            </label>
            <div className="mt-1 flex gap-2">
              <div className="relative flex-1">
                <ScanLine
                  className={`pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 ${scanning ? "animate-pulse text-blue-600" : "text-slate-500"
                    }`}
                  aria-hidden
                />
                <input
                  id="scan-barcode"
                  ref={inputRef}
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="7702090022711"
                  className="h-11 w-full rounded-lg border border-slate-200 pl-10 pr-3 font-mono text-[15px] tracking-wide outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <button
                type="button"
                onClick={() => run(code)}
                disabled={busy || !code.trim()}
                className="flex shrink-0 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Buscar
              </button>
            </div>

            {/* Solo aparece donde de verdad se puede: aparato con cámara,
                navegador que sabe leer códigos y conexión segura. En el
                computador del mostrador sin webcam no se ve, y el flujo de
                teclado de siempre queda igual que estaba. */}
            {cameraAvailable && (
              <button
                type="button"
                onClick={() => setCameraOpen(true)}
                className="mt-2 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 text-sm font-bold text-blue-700 transition-colors hover:bg-blue-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <Camera className="h-4 w-4" aria-hidden />
                Escanear con la cámara
              </button>
            )}

            {/* El complemento del anterior: en el computador del mostrador,
                que no tiene con qué leer, el lector es el celular. */}
            {phoneScanner.available && (
              <PhoneScannerButton
                phoneConnected={phoneScanner.phoneConnected}
                onClick={() => setPhoneModalOpen(true)}
                className="mt-2 w-full"
              />
            )}

              <p className="mt-1.5 text-sm text-slate-500 ">
                <span className="font-normal text-[17px]">ⓘ</span> Si usas lector, basta con escanear: el Enter lo manda él solo.
              </p>
          </div>

          {state.status === "idle" && (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center">
              <ScanLine className="h-8 w-8 text-slate-300" aria-hidden />
              <p className="text-md font-semibold text-slate-600">
                Esperando el código
              </p>
              <p className="max-w-md text-sm text-slate-500">
                Buscamos el nombre, la marca, la presentación y la foto en los
                catálogos públicos. El precio, el costo y el stock los pones tú.
              </p>
            </div>
          )}

          {busy && (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-8 text-center">
              <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
              <p className="text-sm font-semibold text-slate-600">
                Buscando {code}…
              </p>
            </div>
          )}

          {state.status === "duplicate" && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex gap-3">
                <AlertTriangle
                  className="h-5 w-5 shrink-0 text-amber-600"
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-amber-900">
                    Ese código ya está registrado
                  </p>
                  <p className="mt-0.5 text-[13px] text-amber-800">
                    Es{" "}
                    <span className="font-semibold">
                      {state.product.name}
                    </span>{" "}
                    (SKU {state.product.sku}). Registrarlo otra vez dejaría dos
                    productos con el mismo código y el lector de Ventas no
                    sabría cuál cobrar.
                  </p>
                  <button
                    type="button"
                    onClick={() => onEditExisting(state.product)}
                    className="mt-2.5 flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-[13px] font-bold text-amber-900 hover:bg-amber-100"
                  >
                    <Pencil className="h-[15px] w-[15px]" />
                    Editar el que ya existe
                  </button>
                </div>
              </div>
            </div>
          )}

          {state.status === "invalid" && (
            <div className="flex gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
              <AlertTriangle
                className="h-5 w-5 shrink-0 text-red-500"
                aria-hidden
              />
              <div>
                <p className="text-sm font-bold text-red-800">
                  Ese código no tiene forma de código de barras
                </p>
                <p className="mt-0.5 text-[13px] text-red-700">
                  Son entre 8 y 14 dígitos, sin letras ni espacios. Revisa que
                  el lector haya leído completo.
                </p>
              </div>
            </div>
          )}

          {state.status === "error" && (
            <div className="flex gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
              <AlertTriangle
                className="h-5 w-5 shrink-0 text-red-500"
                aria-hidden
              />
              <div>
                <p className="text-sm font-bold text-red-800">
                  No se pudo consultar
                </p>
                <p className="mt-0.5 text-[13px] text-red-700">
                  {state.message}
                </p>
                <p className="mt-1 text-[13px] text-red-700">
                  Puedes registrarlo a mano igual: el código ya quedó escrito.
                </p>
              </div>
            </div>
          )}

          {state.status === "empty" && (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-7 text-center">
              <PackageSearch className="h-8 w-8 text-slate-500" aria-hidden />
              <p className="text-sm font-bold text-slate-800">
                No está en los catálogos públicos
              </p>
              <p className="max-w-sm text-[13px] text-slate-500">
                Pasa seguido con productos locales, artesanales o de granel.
                Sigue con el formulario: el código {code} ya queda puesto y solo
                falta llenar el resto.
              </p>
            </div>
          )}

          {state.status === "found" && (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="flex gap-3.5 bg-white p-4">
                {state.found.photo ? (
                  <button
                    type="button"
                    onClick={() => setPhotoOpen(true)}
                    aria-label="Ver la foto en grande"
                    className="group relative h-20 w-20 shrink-0 cursor-zoom-in overflow-hidden rounded-lg border border-slate-200 bg-slate-50 transition-colors hover:border-blue-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <img
                      src={state.found.photo}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:bg-slate-900/40 group-hover:opacity-100 group-focus-visible:bg-slate-900/40 group-focus-visible:opacity-100">
                      <Maximize2 className="h-4 w-4 text-white" aria-hidden />
                    </span>
                  </button>
                ) : (
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                    <div className="flex h-full w-full items-center justify-center text-slate-300">
                      <ImagePlus className="h-5 w-5" />
                    </div>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold leading-snug text-slate-900">
                    {state.found.name || "(la ficha no trae nombre)"}
                  </p>
                  <div className="mt-2 flex flex-col gap-1">
                    <Field label="Marca" value={state.found.brand} />
                    <Field
                      label="Presentación"
                      value={state.found.quantity}
                    />
                    <Field label="Categoría" value={state.found.category} />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-sm text-slate-500">
                  El precio, el costo y el stock no vienen de acá: esos son de
                  tu negocio y los llenas en el siguiente paso.
                </p>
                <a
                  href={state.found.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 inline-flex items-center gap-1 text-sm font-semibold text-blue-600 underline hover:text-blue-700 "
                >
                  Ficha en {state.found.source.label}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2.5 border-t border-slate-100 px-5 py-5 sm:flex-row">
          {/* <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 sm:flex-1"
          >
            Cancelar
          </button> */}
          <button
            type="button"
            onClick={() =>
              // El código solo se arrastra al formulario si sirve. Con un
              // duplicado se suelta a propósito: llenarlo a mano después de la
              // advertencia sería justo la forma de terminar con dos productos
              // con el mismo código.
              onManual(
                state.status !== "duplicate" && BARCODE_RE.test(code.trim())
                  ? code.trim()
                  : "",
              )
            }
            className="rounded-lg border border-slate-200 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 sm:flex-1"
          >
            Llenar a mano
          </button>
          <button
            type="button"
            onClick={() => onUse(state.found)}
            disabled={state.status !== "found"}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-[1.4]"
          >
            Usar estos datos
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>

    {/* La cámara entrega el código igual que el lector de teclado: entra por
        run(), que ya revisa duplicados y sale a consultar la ficha. */}
    {cameraOpen && (
      <CameraScannerModal
        title="Escanear el producto"
        onScan={(scanned) => run(scanned)}
        onClose={() => setCameraOpen(false)}
      />
    )}

    {/* Solo para emparejar y ver el estado: hecho eso, el celular manda
        códigos con esta pantalla abierta aunque el modal esté cerrado. */}
    {phoneModalOpen && (
      <PhoneScannerModal
        pairingId={phoneScanner.pairingId}
        status={phoneScanner.status}
        phoneConnected={phoneScanner.phoneConnected}
        onReset={phoneScanner.reset}
        onClose={() => setPhoneModalOpen(false)}
        onConnected={() =>
          onNotice?.("Celular vinculado correctamente", "success")
        }
      />
    )}

    {/* Hermano del modal y no hijo, para que quede por encima de él. */}
    {photoOpen && state.status === "found" && state.found.photo && (
      <ImageViewer
        src={state.found.photo}
        title={state.found.name || "Foto del producto"}
        onClose={() => setPhotoOpen(false)}
      />
    )}
    </>
  );
}
