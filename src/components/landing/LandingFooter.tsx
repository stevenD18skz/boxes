import Link from "next/link";

// Pie de la página pública. Va en el mismo tono oscuro que el cierre
// (FinalCta) a propósito: las dos secciones se leen como una sola base y el
// borde translúcido es lo único que las separa.
//
// Solo enlaza a lo que existe de verdad: las anclas apuntan a secciones de
// esta misma página y el resto a rutas reales de la aplicación. No hay
// contacto, redes ni enlaces legales porque todavía no hay datos reales que
// poner ahí — mejor un pie honesto que uno lleno de enlaces muertos.

const COLUMNS = [
  {
    title: "El producto",
    links: [
      { href: "/#beneficios", label: "Beneficios" },
      { href: "/#como-funciona", label: "Cómo funciona" },
      { href: "/#modulos", label: "Secciones" },
    ],
  },
  {
    title: "Empezar",
    links: [
      { href: "/simulacion", label: "Probar la simulación" },
      { href: "/signup", label: "Crear una tienda" },
      { href: "/login", label: "Entrar" },
    ],
  },
  {
    title: "Ayuda",
    links: [
      { href: "/manual", label: "Manual" },
      { href: "/#simulacion", label: "Qué trae la simulación" },
    ],
  },
];

export default function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-14">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5 md:gap-10">
          {/* Columna de marca: ocupa el doble que las de enlaces para que la
              descripción quepa en una línea de lectura cómoda. */}
          <div className="col-span-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            >
              <img
                src="/Boxes_logo.png"
                alt="Boxes"
                className="h-9 w-9 rounded-lg object-cover"
              />
              <span className="flex flex-col leading-tight">
                <span className="text-sm font-bold text-white">Boxes</span>
                <span className="text-[11px] text-slate-500">
                  Everything in one box
                </span>
              </span>
            </Link>

            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-500">
              El sistema de administración para tu tienda de barrio: inventario,
              punto de venta, pedidos a proveedores, gastos y reportes en un
              solo lugar.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="text-sm font-bold text-slate-300">
                {col.title}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="rounded text-sm text-slate-500 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Boxes · Everything in one box</p>
          <p>Hecho para tiendas de barrio.</p>
        </div>
      </div>
    </footer>
  );
}
