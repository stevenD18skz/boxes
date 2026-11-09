"use client";

// Pantalla de paso: enciende la simulación y entra a la aplicación.
//
// Si ya había una simulación abierta en esta pestaña no se vuelve a sembrar, se
// continúa donde iba. Para empezar de nuevo está el botón "Reiniciar datos" del
// aviso amarillo.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FlaskConical, AlertTriangle } from "lucide-react";

import { isSimulationOn, resumeSimulation, startSimulation } from "@/lib/simulation/store";
import { useSession } from "@/hooks/useSession";

export default function SimulacionPage() {
  const router = useRouter();
  const { tienda, loading } = useSession();
  const [error, setError] = useState(false);

  useEffect(() => {
    // Todavía no sabemos si hay sesión real: esperar antes de decidir, para
    // no encender la simulación encima de una tienda ya autenticada.
    if (loading) return;

    // Si ya hay una sesión real, esa tienda manda: no tiene sentido mezclarla
    // con datos inventados, así que se entra directo al dashboard real.
    if (tienda) {
      router.replace("/dashboard");
      return;
    }

    if (isSimulationOn()) resumeSimulation();
    else startSimulation();

    // Si el navegador tiene bloqueado el almacenamiento de la pestaña (modo
    // privado con restricciones, por ejemplo), no hay dónde guardar los datos
    // de prueba y es mejor decirlo que entrar a una aplicación vacía.
    if (!isSimulationOn()) {
      setError(true);
      return;
    }

    router.replace("/dashboard");
  }, [router, tienda, loading]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        {error ? (
          <>
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
              <AlertTriangle className="h-6 w-6 text-amber-600" aria-hidden />
            </span>
            <h1 className="mt-4 text-lg font-semibold text-slate-900">
              No se pudo abrir la simulación
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Este navegador no está dejando guardar datos temporales en la
              pestaña, y la simulación los necesita. Suele pasar en ventanas de
              incógnito con restricciones.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex min-h-[44px] items-center rounded-lg border border-slate-300 px-5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Volver al inicio
            </Link>
          </>
        ) : (
          <>
            <span className="mx-auto flex h-12 w-12 animate-pulse items-center justify-center rounded-full bg-teal-50">
              <FlaskConical className="h-6 w-6 text-teal-600" aria-hidden />
            </span>
            <h1 className="mt-4 text-lg font-semibold text-slate-900">
              Preparando la simulación
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Cargando una tienda de ejemplo con productos, ventas y pedidos
              inventados. La información real no se toca.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
