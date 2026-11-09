"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QrCode, Loader2 } from "lucide-react";

import { getClientPairingId } from "@/lib/phoneScanner";

/*
  La entrada corta para el teléfono que ya se emparejó una vez.

  El QR manda a /scan/<id>, y esa página guarda el emparejamiento en este
  teléfono. De ahí en adelante basta con abrir /scan -o el acceso directo que
  el celular haya guardado- y se vuelve solo a la misma pantalla, sin tener que
  pedirle a nadie que abra el modal del computador para apuntar otra vez.

  Sin nada guardado no hay a dónde ir: el identificador del emparejamiento solo
  existe en el computador, y adivinarlo es justamente lo que no se puede hacer.
*/
export default function ScanEntryPage() {
  const router = useRouter();
  // No se decide nada hasta montar: localStorage no existe en el servidor, y
  // pintar "no hay emparejamiento" antes de mirarlo sería mentir por un
  // instante justo cuando sí lo hay.
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const saved = getClientPairingId();
    if (saved) {
      router.replace(`/scan/${saved}`);
      return;
    }
    setChecked(true);
  }, [router]);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950 px-6 text-center">
      {!checked ? (
        <>
          <Loader2 className="h-7 w-7 animate-spin text-white/70" aria-hidden />
          <p className="text-sm text-white/70">Buscando el emparejamiento…</p>
        </>
      ) : (
        <>
          <QrCode className="h-10 w-10 text-slate-500" aria-hidden />
          <p className="text-base font-bold text-white">
            Este teléfono todavía no está emparejado
          </p>
          <p className="max-w-sm text-sm leading-relaxed text-slate-500">
            En el computador, entra a Ventas o a Productos y oprime{" "}
            <span className="font-semibold text-slate-200">
              Escanear con el celular
            </span>
            . Apunta la cámara al código que aparece y este teléfono queda
            listo, también para las próximas veces.
          </p>
        </>
      )}
    </div>
  );
}
