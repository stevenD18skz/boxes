import Link from "next/link";
import type { LucideIcon } from "lucide-react";

// Acceso directo a una tarea del día. El primario va en azul sólido: es el que
// se usa cien veces al día (registrar una venta) y conviene que salte a la
// vista sin tener que leer.
export default function QuickAction({
  href,
  icon: Icon,
  label,
  hint,
  primary = false,
  accent = "bg-blue-50 text-blue-600",
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  hint: string;
  primary?: boolean;
  accent?: string;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 rounded-xl p-4 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
        primary
          ? "bg-blue-600 text-white hover:bg-blue-700"
          : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
      }`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${
          primary ? "bg-white/15" : accent
        }`}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 text-left">
        <span className="block text-sm font-semibold">{label}</span>
        <span
          className={`block text-xs ${primary ? "text-blue-100" : "text-slate-500"}`}
        >
          {hint}
        </span>
      </span>
    </Link>
  );
}
