// Cuaderno de fiados: quién debe, cuánto, y los abonos que va haciendo.
//
// En simulación se arma con las ventas fiadas y los abonos del mock usando la
// misma función que el servidor (src/lib/fiados.ts), así que las dos ramas
// devuelven exactamente lo mismo.

import { collection, commit, isSimulationOn } from "../lib/dataSource";
import { apiFetch } from "../lib/api/client";
import { buildFiadoLedger } from "../lib/fiados";

/** Lista de clientes con su saldo, primero quien más debe. */
export const getFiados = async () => {
  if (isSimulationOn()) {
    return buildFiadoLedger(collection("sales"), collection("fiadoPayments"));
  }
  const { data } = await apiFetch("/api/fiados");
  return data;
};

/** Registra lo que un cliente abonó. `payment_method`: efectivo, transferencia o tarjeta. */
export const createFiadoPayment = async ({ client_name, amount, payment_method }) => {
  if (isSimulationOn()) {
    const payment = {
      id: `sim-a-${Date.now()}`,
      client_name: String(client_name).trim(),
      amount: Number(amount),
      payment_method: payment_method ?? "efectivo",
      paid_at: new Date().toISOString(),
    };
    collection("fiadoPayments").unshift(payment);
    commit("fiadoPayments");
    return payment;
  }
  const { data } = await apiFetch("/api/fiados/payments", {
    method: "POST",
    body: JSON.stringify({ client_name, amount, payment_method }),
  });
  return data;
};

/** Borra un abono anotado por error. */
export const deleteFiadoPayment = async (id) => {
  if (isSimulationOn()) {
    const payments = collection("fiadoPayments");
    const index = payments.findIndex((p) => String(p.id) === String(id));
    if (index === -1) throw new Error("No existe ese abono");
    payments.splice(index, 1);
    commit("fiadoPayments");
    return { id, deleted: true };
  }
  await apiFetch(`/api/fiados/payments/${id}`, { method: "DELETE" });
  return { id, deleted: true };
};
