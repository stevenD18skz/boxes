// Modo simulación: la aplicación completa funcionando con datos de mentira.
//
// Todo vive en sessionStorage, que es memoria de la pestaña: los cambios
// aguantan recargar la página y navegar entre secciones, pero desaparecen al
// cerrar la pestaña. Es exactamente la persistencia que necesita una prueba —
// se puede vender, editar y borrar sin miedo, y al cerrar todo vuelve a cero.
//
// La base de datos de la tienda no se toca nunca desde aquí.

import { buildSimulationData, type SimulationData } from "./mockUpSimulacion";
import { SIM_COOKIE } from "./cookie";

export type CollectionName = keyof SimulationData;

const FLAG_KEY = "erp-simulacion";
const DATA_KEY = "erp-simulacion-datos";

// sessionStorage no lo puede leer el servidor. middleware.ts necesita saber
// que la simulación está encendida para no exigirle login a una pantalla que
// nunca va a tocar datos reales, y la única forma de avisarle es una cookie.
// Sin Max-Age: es de sesión, se borra sola al cerrar el navegador.
function setSimCookie(on: boolean): void {
  if (typeof document === "undefined") return;
  document.cookie = on
    ? `${SIM_COOKIE}=1; path=/; SameSite=Lax`
    : `${SIM_COOKIE}=; path=/; Max-Age=0; SameSite=Lax`;
}

// Si cambia la forma de los datos de ejemplo, subir esto: las simulaciones
// viejas que sigan abiertas se vuelven a sembrar solas en vez de romperse.
const VERSION = 2;

type StoredData = { version: number; startedAt: string; data: SimulationData };

// Copia en memoria de lo que hay en sessionStorage. Los servicios la mutan
// directamente (push, splice) igual que hacían con el mock, y después llaman a
// commit() para guardar.
let cache: SimulationData | null = null;

const listeners = new Set<() => void>();

const canUseStorage = (): boolean =>
  typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";

function notify(): void {
  for (const listener of listeners) listener();
}

/** Solo es verdad en el navegador y con la simulación encendida. */
export function isSimulationOn(): boolean {
  if (!canUseStorage()) return false;
  try {
    return window.sessionStorage.getItem(FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

function seed(): StoredData {
  const stored: StoredData = {
    version: VERSION,
    startedAt: new Date().toISOString(),
    data: buildSimulationData(),
  };
  cache = stored.data;
  if (canUseStorage()) {
    try {
      window.sessionStorage.setItem(DATA_KEY, JSON.stringify(stored));
    } catch {
      // Sin espacio o con el almacenamiento bloqueado: la simulación sigue
      // funcionando en memoria, solo que no aguanta recargar la página.
    }
  }
  return stored;
}

function load(): SimulationData {
  if (cache) return cache;
  if (!canUseStorage()) return buildSimulationData();

  try {
    const raw = window.sessionStorage.getItem(DATA_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredData;
      if (parsed?.version === VERSION && parsed.data) {
        cache = parsed.data;
        return cache;
      }
    }
  } catch {
    // Dato corrupto: se siembra de nuevo más abajo.
  }

  return seed().data;
}

/** Enciende la simulación y siembra los datos de ejemplo. */
export function startSimulation(): void {
  if (!canUseStorage()) return;
  try {
    window.sessionStorage.setItem(FLAG_KEY, "1");
  } catch {
    return;
  }
  cache = null;
  seed();
  setSimCookie(true);
  notify();
}

/**
 * Retoma una simulación que ya estaba abierta en la pestaña. Vuelve a poner la
 * cookie porque se puede haber borrado sin que la pestaña se entere: en
 * localhost la cookie se comparte entre puertos (3000, 3100…) y el
 * sessionStorage no, así que entrar o salir de la simulación en otro puerto la
 * borra. Sin cookie, middleware.ts manda a /login aunque la simulación siga
 * encendida aquí.
 */
export function resumeSimulation(): void {
  if (isSimulationOn()) setSimCookie(true);
}

/** Vuelve a dejar los datos de ejemplo como estaban al principio. */
export function restartSimulation(): void {
  if (!isSimulationOn()) return;
  cache = null;
  seed();
  notify();
}

/** Apaga la simulación y borra los datos de prueba de la pestaña. */
export function stopSimulation(): void {
  cache = null;
  if (canUseStorage()) {
    try {
      window.sessionStorage.removeItem(FLAG_KEY);
      window.sessionStorage.removeItem(DATA_KEY);
    } catch {
      // Nada que hacer: igual quedó limpia la copia en memoria.
    }
  }
  setSimCookie(false);
  notify();
}

/** Cuándo se arrancó esta simulación, para mostrarlo en el aviso. */
export function simulationStartedAt(): string | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.sessionStorage.getItem(DATA_KEY);
    if (!raw) return null;
    return (JSON.parse(raw) as StoredData).startedAt ?? null;
  } catch {
    return null;
  }
}

/** El arreglo vivo de una colección. Los servicios lo mutan en el sitio. */
export function simulationCollection<K extends CollectionName>(
  name: K,
): SimulationData[K] {
  return load()[name];
}

/** Guarda en sessionStorage lo que haya quedado en memoria. */
export function commitCollection(name: CollectionName): void {
  if (!cache || !canUseStorage()) return;
  try {
    const raw = window.sessionStorage.getItem(DATA_KEY);
    const stored: StoredData = raw
      ? (JSON.parse(raw) as StoredData)
      : { version: VERSION, startedAt: new Date().toISOString(), data: cache };
    stored.version = VERSION;
    stored.data = { ...stored.data, [name]: cache[name] };
    window.sessionStorage.setItem(DATA_KEY, JSON.stringify(stored));
  } catch {
    // Igual que en seed(): se pierde solo la persistencia, no la simulación.
  }
}

/** Avisa cuando la simulación se enciende, se apaga o se reinicia. */
export function subscribeToSimulation(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
