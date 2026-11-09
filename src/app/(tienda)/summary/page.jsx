// ReportsPage.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { getDailyCloses } from "@/services/dailyCloses.service";
import { getSales } from "@/services/sales.service";
import { currency } from "@/utils/converts";
import { downloadCSV } from "@/utils/csv";
import { localDateKey } from "@/utils/dates";

import { Download, Info, Loader2, Printer } from "lucide-react";

import InsightCards from "@/components/summary/InsightCards";
import KpiGrid from "@/components/summary/KpiGrid";
import PaymentMethods from "@/components/summary/PaymentMethods";
import ProductPerformance from "@/components/summary/ProductPerformance";
import RangePicker from "@/components/summary/RangePicker";
import TrendChart from "@/components/summary/TrendChart";
import {
  DAY_LONG,
  MONTH_LONG,
  RANGE_PRESETS,
  addDays,
  aggregate,
  buildBuckets,
  buildReportCSV,
  dayDiff,
  delta,
  fmtD,
  iso,
  parseISO,
} from "@/components/summary/summaryUtils";

/*
  ReportsPage
  - Implementación del diseño "Reportes.dc.html" del proyecto de Claude Design
    "Boxes" (antes "ERP para tiendas y supermercados"), portado a Tailwind y montado sobre el
    shell de la app (sidebar + TopBar) en vez de la barra superior del mockup.
  - El mockup corría sobre datos generados: 12 productos con ritmo sintético,
    120 días de ventas hechas con un LCG, 3 fiados y porcentajes de medios de
    pago escritos a mano. Aquí todo sale de los cierres diarios reales, y los
    bloques que necesitan información por transacción —que el Excel nunca
    guardó— muestran un estado de espera en vez de cifras inventadas. Se llenan
    solos apenas se registren ventas una por una desde /sales.
  - La gráfica es de barras en CSS, igual que el diseño: no necesita Chart.js.
  - Esta página coordina rango y datos; el dibujo vive en components/summary y
    las cuentas de fechas en summaryUtils.
*/

export default function ReportsPage() {
  const [closes, setCloses] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  const [rangeKey, setRangeKey] = useState("7");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [metric, setMetric] = useState("ventas");
  const [selectedBarKey, setSelectedBarKey] = useState(null);
  const [productSearch, setProductSearch] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [c, s] = await Promise.all([getDailyCloses(), getSales()]);
        if (!alive) return;
        setCloses([...c]);
        setSales([...s]);
        // El rango personalizado arranca en las dos últimas semanas con datos.
        if (c.length) {
          setCustomTo(c[0].date);
          setCustomFrom(iso(addDays(parseISO(c[0].date), -13)));
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Los períodos se anclan al último día con datos, no a la fecha del sistema:
  // la contabilidad importada llega hasta diciembre de 2025 y, si se contara
  // desde hoy, todos los rangos saldrían vacíos. Cuando ese día no es hoy, la
  // página lo advierte arriba.
  const refDate = useMemo(
    () => (closes.length ? parseISO(closes[0].date) : new Date()),
    [closes],
  );
  const isStale = useMemo(() => iso(refDate) !== iso(new Date()), [refDate]);

  const { from, to, rangeError } = useMemo(() => {
    if (rangeKey === "mes") {
      return {
        from: new Date(refDate.getFullYear(), refDate.getMonth(), 1),
        to: refDate,
        rangeError: null,
      };
    }
    if (rangeKey === "custom") {
      if (!customFrom || !customTo)
        return { from: refDate, to: refDate, rangeError: null };
      const f = parseISO(customFrom);
      const t = parseISO(customTo);
      if (f > t) {
        return {
          from: t,
          to: t,
          rangeError: 'La fecha "Desde" debe ser anterior a "Hasta".',
        };
      }
      return { from: f, to: t, rangeError: null };
    }
    const preset = RANGE_PRESETS.find((r) => r.key === rangeKey);
    const n = preset?.days ?? 7;
    return { from: addDays(refDate, -(n - 1)), to: refDate, rangeError: null };
  }, [rangeKey, customFrom, customTo, refDate]);

  const inRange = useMemo(() => {
    const f = iso(from);
    const t = iso(to);
    return closes
      .filter((c) => c.date >= f && c.date <= t)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [closes, from, to]);

  // El período anterior es una ventana del mismo largo, pegada justo antes.
  const prevInRange = useMemo(() => {
    const span = Math.max(1, dayDiff(to, from) + 1);
    const pTo = addDays(from, -1);
    const pFrom = addDays(pTo, -(span - 1));
    const f = iso(pFrom);
    const t = iso(pTo);
    return closes.filter((c) => c.date >= f && c.date <= t);
  }, [closes, from, to]);

  // Las ventas registradas una por una dentro del período: con ellas se arman
  // el corte por medio de pago y el de productos (los cierres del Excel no
  // traen ese detalle).
  const salesInRange = useMemo(() => {
    const f = iso(from);
    const t = iso(to);
    return sales.filter((s) => {
      if (s.voided) return false;
      const day = localDateKey(new Date(s.sale_date));
      return day >= f && day <= t;
    });
  }, [sales, from, to]);

  const cur = useMemo(() => aggregate(inRange), [inRange]);
  const prev = useMemo(() => aggregate(prevInRange), [prevInRange]);

  const span = Math.max(1, dayDiff(to, from) + 1);
  const rangeDescription =
    span === 1
      ? `${DAY_LONG[to.getDay()]}, ${to.getDate()} de ${MONTH_LONG[to.getMonth()]} de ${to.getFullYear()}`
      : `Del ${fmtD(from)} al ${fmtD(to)} · ${span} días`;

  const margenPct =
    cur.ventas > 0 ? Math.round((cur.ganancia / cur.ventas) * 100) : 0;
  const prevMargen =
    prev.ventas > 0 ? Math.round((prev.ganancia / prev.ventas) * 100) : 0;

  const kpis = [
    {
      label: "Vendiste",
      value: currency(cur.ventas),
      valueClass: "text-slate-900",
      d: delta(cur.ventas, prev.ventas),
    },
    {
      label: "Ganaste",
      value: currency(cur.ganancia),
      valueClass: "text-emerald-600",
      d: delta(cur.ganancia, prev.ganancia),
    },
    {
      label: "Gastaste",
      value: currency(cur.gasto),
      valueClass: "text-rose-600",
      d: delta(cur.gasto, prev.gasto),
    },
    {
      label: "De cada $100 que vendes, ganas",
      value: `$${margenPct}`,
      valueClass: "text-slate-900",
      d: delta(margenPct, prevMargen),
    },
  ];

  const buckets = useMemo(() => buildBuckets(inRange), [inRange]);

  const exportCsv = () =>
    downloadCSV(
      `reporte_${iso(from)}_${iso(to)}.csv`,
      buildReportCSV(inRange),
    );

  // Cambiar de período deja sin sentido la barra seleccionada del período viejo.
  const changeRangeKey = (key) => {
    setRangeKey(key);
    setSelectedBarKey(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando reportes…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-16">
      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-3.5">
        <div>
          <h1 className="text-[26px] font-extrabold text-slate-900">Reportes</h1>
          <p className="mt-1 text-[15px] text-slate-500">{rangeDescription}</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={exportCsv}
            className="flex h-11 items-center gap-2 rounded-[10px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Download className="h-[18px] w-[18px]" />
            Descargar para Excel
          </button>
          <button
            onClick={() => window.print()}
            className="flex h-11 items-center gap-2 rounded-[10px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Printer className="h-[18px] w-[18px]" />
            Imprimir
          </button>
        </div>
      </div>

      {isStale && (
        <div className="flex gap-3 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-900 ring-1 ring-blue-100">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
          <p>
            Los períodos se cuentan desde el{" "}
            <strong>
              último día con datos ({fmtD(refDate)} de {refDate.getFullYear()})
            </strong>
            , no desde hoy. Es hasta donde llega la contabilidad importada del
            Excel.
          </p>
        </div>
      )}

      <RangePicker
        rangeKey={rangeKey}
        onRangeKeyChange={changeRangeKey}
        customFrom={customFrom}
        onCustomFromChange={(v) => {
          setCustomFrom(v);
          setSelectedBarKey(null);
        }}
        customTo={customTo}
        onCustomToChange={(v) => {
          setCustomTo(v);
          setSelectedBarKey(null);
        }}
        rangeError={rangeError}
      />

      <KpiGrid kpis={kpis} />

      <TrendChart
        buckets={buckets}
        metric={metric}
        onMetricChange={setMetric}
        selectedBarKey={selectedBarKey}
        onSelectBar={setSelectedBarKey}
      />

      <ProductPerformance sales={salesInRange} search={productSearch} onSearchChange={setProductSearch} />

      <InsightCards />

      <PaymentMethods sales={salesInRange} />
    </div>
  );
}
