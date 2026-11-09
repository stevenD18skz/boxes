import Link from "next/link";
import { ArrowRight, BookOpen, FlaskConical, HelpCircle } from "lucide-react";
import { CAPITULOS } from "./manualData";

export function ManualHeader() {
  return (
    <header>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm ring-1 ring-slate-200">
          <BookOpen className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Manual de usuario
          </h1>
          <p className="text-sm text-slate-500">
            Para qué sirve cada parte y cómo se usa. Si no sabes por dónde
            empezar, busca tu pregunta en el índice o en las preguntas frecuentes
            al final.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-teal-200 bg-teal-50/60 p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-teal-900">
          <FlaskConical className="h-4 w-4" aria-hidden />
          Se puede practicar mientras se lee
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-teal-800">
          El modo simulación abre la aplicación completa con una tienda
          inventada, para probar cualquier cosa de este manual sin miedo a dañar
          la información real.
        </p>
        <Link
          href="/simulacion"
          className="mt-4 inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-teal-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
        >
          Abrir la simulación
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </header>
  );
}

const INDEX_LINK_CLASS =
  "flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500";

export function ManualIndex() {
  return (
    <nav aria-labelledby="indice" className="mt-8">
      <h2 id="indice" className="text-lg font-semibold text-slate-900">
        Índice
      </h2>
      <ol className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {CAPITULOS.map((c, i) => (
          <li key={c.id}>
            <a href={`#${c.id}`} className={INDEX_LINK_CLASS}>
              <span className="tabular-nums text-slate-500">
                {String(i + 1).padStart(2, "0")}
              </span>
              <c.icon className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
              {c.titulo}
            </a>
          </li>
        ))}
        <li>
          <a href="#faq" className={INDEX_LINK_CLASS}>
            <span className="tabular-nums text-slate-500">
              {CAPITULOS.length + 1}
            </span>
            <HelpCircle
              className="h-4 w-4 shrink-0 text-slate-500"
              aria-hidden
            />
            Preguntas frecuentes
          </a>
        </li>
      </ol>
    </nav>
  );
}
