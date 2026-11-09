"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Lock,
  PackagePlus,
  Receipt,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";

import { pesos } from "@/utils/converts";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useFiados } from "@/hooks/useFiados";
import { useSession } from "@/hooks/useSession";
import RecentActivity from "@/components/dashboard/RecentActivity";
import DashboardSkeleton from "@/components/dashboard/DashboardSkeleton";
import { getGreeting, sentenceCase } from "@/components/dashboard/dashboardUtils";

// Inicio: lo que pasa HOY y lo próximo que hay que hacer, nada más.
// - Una acción principal, grande: vender (es lo que se hace el 80% del día).
// - Tres cifras, las del cuaderno de una tienda: lo que vendiste, lo que
//   ganaste más o menos y lo que te deben. Nada de porcentajes ni KPIs.
// - "Para revisar" solo aparece con cosas que piden acción; si no hay nada,
//   lo dice. Así la pantalla no grita cuando todo está bien.
// - Una tienda nueva ve primero cómo empezar.
export default function Home() {
  const { tienda } = useSession();
  const data = useDashboardData();
  const fiados = useFiados();

  const today = useMemo(
    () =>
      sentenceCase(
        new Date().toLocaleDateString("es-CO", {
          weekday: "long",
          day: "numeric",
          month: "long",
        }),
      ),
    [],
  );

  const firstName = tienda?.dueno?.split(" ")[0];
  const isNewStore = !data.loading && data.productCount === 0 && data.totalSalesCount === 0;

  const toReview: {
    href: string;
    icon: LucideIcon;
    tone: string;
    text: string;
    action: string;
  }[] = [];
  if (!data.loading) {
    if (data.lowStockCount > 0)
      toReview.push({
        href: "/products?stockOp=lt&stockVal=11",
        icon: AlertTriangle,
        tone: "bg-amber-50 text-amber-800",
        text: `${data.lowStockCount} ${data.lowStockCount === 1 ? "producto se está acabando" : "productos se están acabando"}`,
        action: "Ver cuáles",
      });
    if (data.pendingOrdersCount > 0)
      toReview.push({
        href: "/orders",
        icon: ClipboardList,
        tone: "bg-slate-100 text-slate-700",
        text: `${data.pendingOrdersCount} ${data.pendingOrdersCount === 1 ? "pedido espera" : "pedidos esperan"} que llegue la mercancía`,
        action: "Ver pedidos",
      });
    if (data.salesTodayCount > 0 && !data.todayClosed && new Date().getHours() >= 17)
      toReview.push({
        href: "/sales?modo=cierre",
        icon: Lock,
        tone: "bg-brand-50 text-brand-800",
        text: "Todavía no has cerrado el día",
        action: "Cerrar el día",
      });
  }

  const vsAyer =
    data.ventasAyer != null && data.ventasHoy > 0 ? data.ventasHoy - data.ventasAyer : null;

  return (
    <div className="mx-auto max-w-5xl">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
          {getGreeting()}
          {firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="text-base text-slate-600">{today}</p>
      </header>

      {data.loading ? (
        <div className="mt-6">
          <DashboardSkeleton />
        </div>
      ) : isNewStore ? (
        <FirstSteps />
      ) : (
        <div className="mt-6 space-y-6">
          {/* La acción del día, imposible de no ver (Von Restorff, Fitts). */}
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
            <Link
              href="/sales"
              className="flex min-h-[72px] items-center justify-center gap-3 rounded-xl bg-brand-600 px-6 text-xl font-bold text-white shadow-brand transition-colors hover:bg-brand-700"
            >
              <ShoppingCart className="h-7 w-7" aria-hidden />
              Vender
            </Link>
            <SecondaryAction href="/expenses?nuevo=1" icon={Receipt} label="Anotar un gasto" />
            <SecondaryAction
              href="/sales?modo=cierre"
              icon={data.todayClosed ? CheckCircle2 : Lock}
              label={data.todayClosed ? "Día cerrado" : "Cerrar el día"}
            />
          </div>

          <section aria-labelledby="hoy-title" className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
            <h2 id="hoy-title" className="px-5 pt-4 text-base font-bold text-slate-900">
              Hoy
            </h2>
            <dl className="grid divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <Figure
                label="Vendiste"
                value={pesos(data.ventasHoy)}
                note={
                  data.salesTodayCount === 0
                    ? "Todavía ninguna venta"
                    : vsAyer === null
                      ? `${data.salesTodayCount} ${data.salesTodayCount === 1 ? "venta" : "ventas"}`
                      : vsAyer >= 0
                        ? `${pesos(vsAyer)} más que ayer`
                        : `${pesos(-vsAyer)} menos que ayer`
                }
              />
              <Figure
                label="Ganaste más o menos"
                value={pesos(data.gananciaHoy)}
                note="Lo vendido menos lo que te costó"
              />
              <Figure
                label="Te deben en fiados"
                value={pesos(fiados.owed)}
                note={
                  fiados.debtors.length === 0
                    ? "Nadie te debe"
                    : `${fiados.debtors.length} ${fiados.debtors.length === 1 ? "cliente" : "clientes"}`
                }
                href="/fiados"
              />
            </dl>
          </section>

          <div className="grid items-start gap-6 lg:grid-cols-[3fr_2fr]">
            <section aria-labelledby="revisar-title" className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h2 id="revisar-title" className="text-base font-bold text-slate-900">
                Para revisar
              </h2>
              {toReview.length === 0 ? (
                <p className="mt-3 flex items-center gap-2 text-base text-slate-700">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden />
                  Todo en orden por ahora.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {toReview.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="flex min-h-[56px] items-center gap-3 rounded-lg px-2 transition-colors hover:bg-slate-50"
                      >
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${item.tone}`}>
                          <item.icon className="h-5 w-5" aria-hidden />
                        </span>
                        <span className="flex-1 text-base text-slate-800">{item.text}</span>
                        <span className="hidden text-sm font-bold text-brand-700 sm:inline">{item.action}</span>
                        <ChevronRight className="h-5 w-5 text-slate-500" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <RecentActivity items={data.activity} />
          </div>
        </div>
      )}
    </div>
  );
}

function SecondaryAction({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-[72px] items-center justify-center gap-2 rounded-xl bg-white px-4 text-base font-bold text-slate-800 ring-1 ring-slate-300 transition-colors hover:bg-slate-50"
    >
      <Icon className="h-5 w-5 text-brand-700" aria-hidden />
      {label}
    </Link>
  );
}

function Figure({
  label,
  value,
  note,
  href,
}: {
  label: string;
  value: string;
  note: string;
  href?: string;
}) {
  const body = (
    <>
      <dt className="text-base text-slate-600">{label}</dt>
      <dd className="mt-1 text-3xl font-bold tabular-nums text-slate-900">{value}</dd>
      <dd className="mt-1 text-sm text-slate-600">{note}</dd>
    </>
  );
  return href ? (
    <div className="px-5 py-4">
      <Link href={href} className="block rounded-lg transition-colors hover:text-brand-700">
        {body}
        <span className="mt-1 inline-flex items-center gap-1 text-sm font-bold text-brand-700">
          <BookOpen className="h-4 w-4" aria-hidden /> Ver fiados
        </span>
      </Link>
    </div>
  ) : (
    <div className="px-5 py-4">{body}</div>
  );
}

// Para la tienda que recién entra: tres pasos y nada más (tendencia a la
// meta: se ve cuánto falta para tener la tienda andando).
function FirstSteps() {
  const steps = [
    {
      href: "/products?new=1",
      icon: PackagePlus,
      title: "Agrega tus productos",
      text: "Uno por uno, escaneando el código, o subiendo tu lista en Excel.",
    },
    {
      href: "/sales",
      icon: ShoppingCart,
      title: "Haz tu primera venta",
      text: "Busca el producto o escanéalo, cobra y listo.",
    },
    {
      href: "/sales?modo=cierre",
      icon: Lock,
      title: "Cierra el día",
      text: "Cuenta la plata del cajón y la app te dice si cuadra.",
    },
  ];
  return (
    <section aria-labelledby="empieza-title" className="mt-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h2 id="empieza-title" className="text-xl font-bold text-slate-900">
        Empieza aquí
      </h2>
      <p className="mt-1 text-base text-slate-600">Tres pasos para tener tu tienda andando.</p>
      <ol className="mt-5 space-y-3">
        {steps.map((s, i) => (
          <li key={s.href}>
            <Link
              href={s.href}
              className="flex min-h-[72px] items-center gap-4 rounded-lg border border-slate-200 px-4 py-3 transition-colors hover:border-brand-600 hover:bg-brand-50"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-base font-bold text-white">
                {i + 1}
              </span>
              <span className="flex-1">
                <span className="block text-base font-bold text-slate-900">{s.title}</span>
                <span className="block text-sm text-slate-600">{s.text}</span>
              </span>
              <s.icon className="h-6 w-6 text-brand-700" aria-hidden />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
