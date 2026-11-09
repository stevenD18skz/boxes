import type { PaymentMethod } from "./sale";

/** Un abono que un cliente hizo a lo que debe. */
export interface FiadoPayment {
  id: string;
  client_name: string;
  amount: number;
  payment_method: Exclude<PaymentMethod, "fiado">;
  paid_at: string;
}

/** Una línea del cuaderno: lo que se fió (venta) o lo que pagó (abono). */
export interface FiadoEntry {
  type: "venta" | "abono";
  id: string;
  date: string;
  amount: number;
  /** Solo en abonos: cómo pagó. */
  payment_method?: Exclude<PaymentMethod, "fiado">;
}

/** La página de un cliente en el cuaderno de fiados. */
export interface FiadoClient {
  /** Nombre como se escribió la última vez. */
  client_name: string;
  /** Total fiado menos total abonado. Nunca negativo. */
  balance: number;
  fiado_total: number;
  paid_total: number;
  last_activity: string;
  /** Lo más reciente primero. */
  entries: FiadoEntry[];
}
