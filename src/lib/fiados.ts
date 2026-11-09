// El cuaderno de fiados: arma, a partir de las ventas fiadas y de los abonos,
// cuánto debe cada cliente. Lo usan /api/fiados y la rama de simulación de
// services/fiados.service.js, así que las dos dan exactamente lo mismo.

import type { FiadoClient, FiadoEntry, FiadoPayment } from "@/types/fiado";
import { normalizeText } from "./text";

/** Lo mínimo de una venta que necesita el cuaderno. */
export interface FiadoSaleLike {
  id: string;
  sale_date: string;
  total_amount: number;
  payment_method: string;
  client_name: string | null;
  voided: boolean;
}

export const clientKey = (name: string | null | undefined): string =>
  normalizeText(name);

export function buildFiadoLedger(
  sales: FiadoSaleLike[],
  payments: FiadoPayment[],
): FiadoClient[] {
  const byClient = new Map<
    string,
    { name: string; nameDate: string; entries: FiadoEntry[] }
  >();

  const add = (name: string, entry: FiadoEntry) => {
    const key = clientKey(name);
    if (!key) return;
    const current = byClient.get(key);
    if (!current) {
      byClient.set(key, { name: name.trim(), nameDate: entry.date, entries: [entry] });
      return;
    }
    current.entries.push(entry);
    // El nombre que se muestra es el de la venta fiada más reciente: así lo
    // escribió quien vende. Un abono no lo cambia (se anota desde el cuaderno
    // con el nombre que ya tenía).
    if (entry.type === "venta" && entry.date > current.nameDate) {
      current.name = name.trim();
      current.nameDate = entry.date;
    }
  };

  for (const sale of sales) {
    if (sale.payment_method !== "fiado" || sale.voided || !sale.client_name) continue;
    add(sale.client_name, {
      type: "venta",
      id: String(sale.id),
      date: sale.sale_date,
      amount: Number(sale.total_amount) || 0,
    });
  }
  for (const payment of payments) {
    add(payment.client_name, {
      type: "abono",
      id: String(payment.id),
      date: payment.paid_at,
      amount: Number(payment.amount) || 0,
      payment_method: payment.payment_method,
    });
  }

  const clients: FiadoClient[] = [];
  for (const { name, entries } of byClient.values()) {
    entries.sort((a, b) => (a.date < b.date ? 1 : -1));
    const fiado_total = entries
      .filter((e) => e.type === "venta")
      .reduce((sum, e) => sum + e.amount, 0);
    const paid_total = entries
      .filter((e) => e.type === "abono")
      .reduce((sum, e) => sum + e.amount, 0);
    clients.push({
      client_name: name,
      fiado_total,
      paid_total,
      balance: Math.max(0, Math.round((fiado_total - paid_total) * 100) / 100),
      last_activity: entries[0]?.date ?? "",
      entries,
    });
  }

  // Primero quien más debe; los que ya están a paz y salvo, al final.
  return clients.sort(
    (a, b) => b.balance - a.balance || (a.last_activity < b.last_activity ? 1 : -1),
  );
}

export const totalOwed = (clients: FiadoClient[]): number =>
  clients.reduce((sum, c) => sum + c.balance, 0);
