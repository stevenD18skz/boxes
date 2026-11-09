// Lo que pasó en un día, armado con lo que la app ya tiene registrado: las
// ventas, los abonos de fiado y los gastos. Con eso el cierre no le pide a
// nadie que recuerde ni sume nada (Ley de Tesler: esa complejidad la absorbe
// el sistema); solo pide contar la plata del cajón.

import { localDateKey } from "@/utils/dates";

const METHODS = ["efectivo", "tarjeta", "transferencia", "fiado"];

export function summarizeDay({ date, sales = [], expenses = [], fiadoClients = [] }) {
  const ventas = { efectivo: 0, tarjeta: 0, transferencia: 0, fiado: 0 };
  let count = 0;
  let gain = 0;
  for (const s of sales) {
    if (s.voided || localDateKey(new Date(s.sale_date)) !== date) continue;
    const method = METHODS.includes(s.payment_method) ? s.payment_method : "efectivo";
    ventas[method] += Number(s.total_amount) || 0;
    gain += Number(s.gain) || 0;
    count += 1;
  }
  const totalVendido = Object.values(ventas).reduce((a, b) => a + b, 0);

  // Lo que pagaron de fiados viejos ese día también entra a la plata del día.
  const abonos = { efectivo: 0, tarjeta: 0, transferencia: 0 };
  for (const client of fiadoClients) {
    for (const e of client.entries ?? []) {
      if (e.type !== "abono" || localDateKey(new Date(e.date)) !== date) continue;
      abonos[e.payment_method in abonos ? e.payment_method : "efectivo"] += e.amount;
    }
  }

  let gastos = 0;
  let entradas = 0;
  let salidas = 0;
  for (const e of expenses) {
    if (e.date !== date) continue;
    if (e.kind === "entrada") entradas += Number(e.amount) || 0;
    else if (e.kind === "salida") salidas += Number(e.amount) || 0;
    else gastos += Number(e.amount) || 0;
  }

  // Plata que debería haber en el cajón (sin contar la base con que se abrió):
  // lo cobrado en efectivo, más lo que entró por fuera, menos lo que se sacó.
  // Los gastos se asumen pagados con plata del cajón, que es lo normal.
  const efectivoEsperado = ventas.efectivo + abonos.efectivo + entradas - gastos - salidas;

  return {
    date,
    count,
    ventas,
    totalVendido,
    gain,
    abonos,
    abonosTotal: abonos.efectivo + abonos.tarjeta + abonos.transferencia,
    gastos,
    entradas,
    salidas,
    efectivoEsperado,
  };
}

/** "Cuadra", "Sobran $X" o "Faltan $X", con un margen de $100 por las monedas. */
export function cashVerdict(counted, expected) {
  const diff = Math.round(counted - expected);
  if (Math.abs(diff) < 100) return { kind: "ok", diff: 0 };
  return diff > 0 ? { kind: "sobra", diff } : { kind: "falta", diff: -diff };
}
