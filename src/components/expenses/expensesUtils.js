import { ArrowDownLeft, ArrowUpRight, Receipt } from "lucide-react";
import { localDateKey } from "@/utils/dates";

export const PAGE_SIZE = 25;

// Los tres tipos de registro. Gasto es plata que se fue del negocio; entrada y
// salida son movimientos de caja por fuera de las ventas.
export const KIND_META = {
  gasto: {
    label: "Gasto",
    hint: "Lo que pagaste del negocio: arriendo, luz, bolsas, transporte.",
    icon: Receipt,
    badge: "bg-rose-50 text-rose-700 ring-rose-600/20",
    accent: "text-rose-600",
  },
  entrada: {
    label: "Entrada de caja",
    hint: "Plata que metiste al cajón y no es de una venta, como sencillo para vueltas.",
    icon: ArrowDownLeft,
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    accent: "text-emerald-600",
  },
  salida: {
    label: "Salida de caja",
    hint: "Plata que sacaste del cajón sin que sea un gasto, como lo que llevas a la casa.",
    icon: ArrowUpRight,
    badge: "bg-amber-50 text-amber-700 ring-amber-600/20",
    accent: "text-amber-600",
  },
};

export const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export const today = () => localDateKey();

// "2025-07-26" -> "26/07/2025". Se parte el texto en vez de crear un Date para
// no arriesgar el corrimiento de zona horaria.
export const formatDate = (iso) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

export const emptyDraft = () => ({
  id: null,
  date: today(),
  kind: "gasto",
  amount: "",
  concept: "",
  notes: "",
});
