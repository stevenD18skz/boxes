import { PASOS } from "./landingData";

// Tres pasos para bajarle el miedo a "va a ser complicado montar esto".
// La línea que une los pasos solo aparece en escritorio, donde las tarjetas van
// en fila; apiladas en móvil no tendría a dónde ir.
export default function HowItWorksSection() {
  return (
    <section
      aria-labelledby="como-funciona"
      className="border-y border-slate-100 bg-slate-50"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
        <div className="max-w-2xl">
          <h2
            id="como-funciona"
            className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl"
          >
            Tres pasos y ya está funcionando
          </h2>
        </div>

        <ol className="relative mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div
            aria-hidden
            className="absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-blue-200 via-teal-200 to-transparent md:block"
          />
          {PASOS.map((p, i) => (
            <li key={p.titulo} className="relative">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-blue-100 bg-white text-base font-bold text-blue-600 shadow-sm">
                {i + 1}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                {p.titulo}
              </h3>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
                {p.texto}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
