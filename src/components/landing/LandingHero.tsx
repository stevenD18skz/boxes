import Link from "next/link";
import { ArrowRight, Check, FlaskConical } from "lucide-react";
import AppPreview, { AppPreviewMobile } from "./AppPreview";

const GARANTIAS = ["Sin instalar nada", "Sin tarjeta", "Funciona en el celular"];

// Hero de la página pública. Sobrio a propósito: fondo de papel, el titular
// dice qué es en pocas palabras y la vista de la app muestra el resto. Sin
// etiqueta encima del título, sin texto en degradado ni manchas de color de
// fondo: eso es decorado de plantilla, no información.
export default function LandingHero({
  hasSession = false,
}: {
  hasSession?: boolean;
}) {
  return (
    <section className="relative isolate overflow-hidden border-b border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-[1440px] px-4 py-16 md:px-6 md:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-14">
          <div>
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-slate-900 md:text-6xl">
              Toda tu tienda
              <br />
              <span className="text-brand-700">en una sola caja</span>
            </h1>

            <p className="mt-6 max-w-xl text-xl leading-relaxed text-slate-700">
              Vende, anota los fiados y cierra el día sin cuaderno ni calculadora.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={hasSession ? "/dashboard" : "/login"}
                className="group flex min-h-[56px] items-center justify-center gap-2 rounded-xl bg-brand-600 px-7 text-lg font-bold text-white shadow-brand transition-colors hover:bg-brand-700"
              >
                Entrar a mi tienda
                <ArrowRight
                  className="h-5 w-5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                  aria-hidden
                />
              </Link>

              <Link
                href="/simulacion"
                className="flex min-h-[56px] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-7 text-lg font-bold text-slate-800 transition-colors hover:border-slate-400 hover:bg-slate-50"
              >
                <FlaskConical className="h-5 w-5 text-brand-700" aria-hidden />
                Probarla sin registrarme
              </Link>
            </div>

            <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2">
              {GARANTIAS.map((g) => (
                <li key={g} className="flex items-center gap-1.5 text-base text-slate-700">
                  <Check className="h-5 w-5 shrink-0 text-brand-700" aria-hidden />
                  {g}
                </li>
              ))}
            </ul>
          </div>

          {/* Vista de la aplicación: pc de fondo, celular montado encima */}
          <div className="relative pb-10 pl-8 pr-4 pt-2 sm:pb-14 sm:pl-14">
            <div className="lg:rotate-1 lg:transform">
              <AppPreview />
            </div>
            <div className="absolute -bottom-6 left-0 hidden w-36 rotate-[-8deg] sm:block sm:w-40 md:w-44">
              <AppPreviewMobile />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
