"use client";

import useSWR from "swr";

import { useIsClient } from "@/hooks/useIsClient";
import { getFiados } from "@/services/fiados.service";
import { totalOwed } from "@/lib/fiados";

// El cuaderno de fiados, cacheado con SWR bajo la clave "fiados". Ventas
// la revalida cuando registra una venta fiada (ver sales/page.jsx), e Inicio
// la usa para el "Te deben".
export function useFiados() {
  const isClient = useIsClient();
  const swr = useSWR(isClient ? "fiados" : null, getFiados, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });
  const clients = swr.data ?? [];
  return {
    clients,
    owed: totalOwed(clients),
    debtors: clients.filter((c) => c.balance > 0),
    loading: !swr.data && !swr.error,
    error: swr.error,
    reload: () => swr.mutate(),
  };
}
