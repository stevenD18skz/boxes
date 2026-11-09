import { BENEFICIOS } from "./landingData";

// Lo que cambia en el negocio, antes de entrar en qué botones trae. Va primero
// que la lista de módulos a propósito: a quien atiende una tienda le importa
// más "dejar de adivinar el stock" que "módulo de inventario".
export default function BenefitsSection() {
  return (
    <section
      id="beneficios"
      aria-labelledby="beneficios-h"
      // scroll-mt deja el título por debajo del encabezado fijo al llegar
      // desde el menú; sin él queda tapado.
      className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 md:px-6 md:py-20"
    >
      <div className="max-w-2xl">
        <h2
          id="beneficios-h"
          className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl"
        >
          Menos cuentas a mano, más control
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-slate-600">
          No es un cuaderno digital: las cosas se actualizan solas cuando vendes,
          cuando recibes mercancía y cuando anotas un gasto.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">
        {BENEFICIOS.map((b) => (
          <article
            key={b.titulo}
            className="rounded-2xl border border-slate-200 bg-white p-6 transition-shadow hover:shadow-md"
          >
            <span
              className={`flex h-11 w-11 items-center justify-center rounded-xl ${b.accent}`}
            >
              <b.icon className="h-5 w-5" aria-hidden />
            </span>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              {b.titulo}
            </h3>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
              {b.texto}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
