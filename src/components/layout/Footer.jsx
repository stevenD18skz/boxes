import Link from "next/link";
import { Clock, Mail, Phone, BookOpen } from "lucide-react";

// Pie del panel: aparece debajo de cada pantalla, así que se queda compacto y
// sin nada que compita con el contenido. Repite los destinos de la barra
// lateral para quien termina de leer una tabla larga y no quiere volver
// arriba a buscarlos.
//
// El correo y el teléfono son los que ya venían en el proyecto: son de prueba
// (dominio .local) y hay que reemplazarlos por los reales antes de publicar.

const SECTIONS = [
  { href: "/dashboard", label: "Inicio" },
  { href: "/products", label: "Productos" },
  { href: "/sales", label: "Ventas" },
  { href: "/orders", label: "Pedidos" },
  { href: "/expenses", label: "Gastos y caja" },
  { href: "/summary", label: "Reportes" },
];

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2.5">
              <img
                src="/Boxes_logo.png"
                alt="Boxes"
                className="h-9 w-9 rounded-lg object-cover"
              />
              <span className="flex flex-col leading-tight">
                <span className="text-sm font-bold text-slate-900">Boxes</span>
                <span className="text-[11px] text-slate-500">
                  Everything in one box
                </span>
              </span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              Panel ligero para administrar tu tienda. Pensado para dueños:
              claro, directo y rápido.
            </p>
          </div>

          {/* Ocupa dos columnas para que los seis enlaces quepan en dos filas
              en vez de estirar el pie hacia abajo. */}
          <nav className="lg:col-span-2" aria-label="Secciones">
            <h2 className="text-sm font-bold text-slate-600">
              Secciones
            </h2>
            <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5">
              {SECTIONS.map((s) => (
                <li key={s.href}>
                  <Link
                    href={s.href}
                    className="rounded text-sm text-slate-600 transition-colors hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="text-sm font-bold text-slate-600">
              Soporte
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <a
                  href="mailto:soporte@boxes.local"
                  className="flex items-center gap-2 rounded text-slate-600 transition-colors hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <Mail className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                  soporte@boxes.local
                </a>
              </li>
              <li>
                <a
                  href="tel:+57123456789"
                  className="flex items-center gap-2 rounded text-slate-600 transition-colors hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <Phone
                    className="h-4 w-4 shrink-0 text-slate-500"
                    aria-hidden
                  />
                  +57 1 234 567 89
                </a>
              </li>
              <li>
                <Link
                  href="/manual"
                  className="flex items-center gap-2 rounded text-slate-600 transition-colors hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <BookOpen
                    className="h-4 w-4 shrink-0 text-slate-500"
                    aria-hidden
                  />
                  Manual de uso
                </Link>
              </li>
              <li className="flex items-center gap-2 text-slate-500">
                <Clock className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                Lun a Vie, 9:00 - 18:00
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-slate-200 pt-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Boxes · Everything in one box</p>
          <p>Versión 1.0</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
