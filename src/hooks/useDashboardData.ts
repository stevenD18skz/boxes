"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { useIsClient } from "@/hooks/useIsClient";
import { localDateKey } from "@/utils/dates";
import { getProducts } from "@/services/products.service";
import { getSales } from "@/services/sales.service";
import { getOrders } from "@/services/orders.service";
import { getDailyCloses } from "@/services/dailyCloses.service";
import { getExpenses } from "@/services/expenses.service";
import type { Product } from "@/types/product";
import type { Sale } from "@/types/sale";
import type { Order } from "@/types/order";
import type { DailyClose } from "@/types/dailyClose";
import type { Expense } from "@/types/expense";
import {
  LOW_STOCK_THRESHOLD,
  buildActivity,
  pctDelta,
  type ActivityItem,
  type DayBreakdown,
} from "@/components/dashboard/dashboardUtils";

// Todo lo que Inicio necesita saber, en un solo lugar.
//
// Los datos se piden en el cliente y no se importan directo del mock: así esta
// pantalla también funciona con los datos de la simulación, que viven en la
// pestaña del navegador y el servidor no puede ver.
//
// Cacheado con SWR bajo las mismas claves que usan Productos ("products") y
// Ventas ("sales"): entrar a Inicio después de haber estado en cualquiera de
// esas dos no vuelve a pedir nada, usa lo que ya está en caché. Sin
// revalidación automática, igual que en useProductsCatalog: estos datos no
// cambian solos, solo cuando algo en la propia app los guarda.
const swrOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  shouldRetryOnError: false,
};

export function useDashboardData() {
  // Las keys se apagan (null) hasta montar: la caché ya trae estos datos
  // restaurados de localStorage antes de este render, pero el servidor
  // arranca siempre sin nada. Sin este freno, el primer render en el
  // navegador ya mostraría el contenido real donde el servidor mandó el
  // esqueleto de carga, y React marcaría un desajuste de hidratación (ver
  // useIsClient).
  const isClient = useIsClient();
  const productsSWR = useSWR<Product[]>(
    isClient ? "products" : null,
    getProducts,
    swrOptions,
  );
  const salesSWR = useSWR<Sale[]>(isClient ? "sales" : null, getSales, swrOptions);
  const ordersSWR = useSWR<Order[]>(
    isClient ? "orders" : null,
    getOrders,
    swrOptions,
  );
  const dailyClosesSWR = useSWR<DailyClose[]>(
    isClient ? "daily-closes" : null,
    getDailyCloses,
    swrOptions,
  );
  const expensesSWR = useSWR<Expense[]>(
    isClient ? "expenses" : null,
    getExpenses,
    swrOptions,
  );

  const products = productsSWR.data ?? [];
  const sales = salesSWR.data ?? [];
  const orders = ordersSWR.data ?? [];
  const dailyCloses = dailyClosesSWR.data ?? [];
  const expenses = expensesSWR.data ?? [];

  const loading =
    !isClient ||
    productsSWR.isLoading ||
    salesSWR.isLoading ||
    ordersSWR.isLoading ||
    dailyClosesSWR.isLoading ||
    expensesSWR.isLoading;

  const lowStockCount = useMemo(
    () => products.filter((p) => p.stock <= LOW_STOCK_THRESHOLD).length,
    [products],
  );

  // Inicio siempre habla de HOY, la fecha real del sistema. Si el día todavía
  // no tiene movimiento, cada tarjeta lo dice en vez de mostrar el último día
  // registrado como si fuera hoy. El histórico completo vive en /summary.
  const today = useMemo(() => {
    const byDate = new Map(dailyCloses.map((c) => [c.date, c]));
    const now = new Date();
    const dayAgo = (n: number) =>
      localDateKey(
        new Date(now.getFullYear(), now.getMonth(), now.getDate() - n),
      );

    const todayIsoValue = dayAgo(0);
    const todayClose = byDate.get(todayIsoValue) ?? null;
    const yesterdayClose = byDate.get(dayAgo(1)) ?? null;

    // Si todavía no se cerró el día a mano, se arma con lo que ya se
    // registró venta por venta (cada venta ya trae su ganancia calculada) y
    // los gastos de hoy. Las compras a proveedores no tienen una fecha de
    // "recibido" que seguir, así que quedan en cero hasta que el día se
    // cierre con ese dato puesto a mano.
    // Se usa tanto para armar el día en vivo (cuando no hay cierre manual)
    // como para saber qué producto se movió más hoy, sin importar si el día
    // ya se cerró: eso pasa por caja, no por el cierre.
    const salesToday = sales.filter(
      (s) => !s.voided && localDateKey(new Date(s.sale_date)) === todayIsoValue,
    );

    let liveToday: {
      ventas: number;
      gain: number;
      gasto: number;
      compra: number;
    } | null = null;
    if (!todayClose) {
      if (salesToday.length > 0) {
        const gastoHoy = expenses
          .filter((e) => e.kind === "gasto" && e.date === todayIsoValue)
          .reduce((sum, e) => sum + e.amount, 0);
        liveToday = {
          ventas: salesToday.reduce((sum, s) => sum + s.total_amount, 0),
          gain: salesToday.reduce((sum, s) => sum + s.gain, 0),
          gasto: gastoHoy,
          compra: 0,
        };
      }
    }

    const effectiveToday = todayClose
      ? {
          ventas: todayClose.sales_total,
          gain: todayClose.gain,
          gasto: todayClose.expenses_total,
          compra: todayClose.purchases_total,
        }
      : liveToday;

    const ordered = [...dailyCloses].sort((a, b) =>
      b.date.localeCompare(a.date),
    );

    // El más vendido de HOY en unidades, no en plata: junta las líneas de
    // todas las ventas del día por producto y se queda con la de mayor
    // cantidad.
    const qtyByProduct = new Map<string, { name: string; quantity: number }>();
    for (const s of salesToday) {
      for (const line of s.products) {
        const key = line.product_id ?? line.product;
        const prev = qtyByProduct.get(key);
        qtyByProduct.set(key, {
          name: line.product,
          quantity: (prev?.quantity ?? 0) + line.quantity,
        });
      }
    }
    let topProductToday: { name: string; quantity: number } | null = null;
    for (const entry of qtyByProduct.values()) {
      if (!topProductToday || entry.quantity > topProductToday.quantity) {
        topProductToday = entry;
      }
    }

    const breakdown: DayBreakdown | null = effectiveToday
      ? {
          date: todayIsoValue,
          ventas: effectiveToday.ventas,
          ganancia: effectiveToday.gain,
          gasto: effectiveToday.gasto,
          compra: effectiveToday.compra,
          costo: effectiveToday.ventas - effectiveToday.gain,
          neto: effectiveToday.gain - effectiveToday.gasto,
        }
      : null;

    // Sin cierre manual pero con ventas ya registradas: se agrega una fila
    // "Hoy" armada con esas ventas para que la tabla no se vea vacía mientras
    // el resto de Inicio ya está contando ese movimiento.
    const recentClosesBase = todayClose
      ? ordered
      : liveToday
        ? [
            {
              id: "live-today",
              date: todayIsoValue,
              sales_total: liveToday.ventas,
              gain: liveToday.gain,
              expenses_total: liveToday.gasto,
              purchases_total: liveToday.compra,
              cash_in: null,
              cash_out: null,
              source: "app" as const,
            },
            ...ordered,
          ]
        : ordered;

    return {
      salesTodayCount: salesToday.length,
      todayClosed: !!todayClose,
      ventasAyer: yesterdayClose?.sales_total ?? null,
      hasToday: !!effectiveToday,
      ventasHoy: effectiveToday?.ventas ?? 0,
      ventasDelta: pctDelta(
        effectiveToday?.ventas ?? 0,
        yesterdayClose?.sales_total ?? 0,
      ),
      gananciaHoy: effectiveToday?.gain ?? 0,
      gananciaDelta: pctDelta(
        effectiveToday?.gain ?? 0,
        yesterdayClose?.gain ?? 0,
      ),
      topProductToday,
      dayBreakdown: breakdown,
      lastRecorded: ordered[0] ?? null,
      recentCloses: recentClosesBase.slice(0, 7),
      todayIso: todayIsoValue,
    };
  }, [dailyCloses, sales, expenses]);

  const topProductsHome = useMemo(
    () =>
      products
        .slice()
        .sort((a, b) => b.stock - a.stock)
        .slice(0, 5),
    [products],
  );

  const activity: ActivityItem[] = useMemo(
    () => buildActivity(products, sales, orders),
    [products, sales, orders],
  );

  const pendingOrdersCount = useMemo(
    () => orders.filter((o) => o.status === "pendiente").length,
    [orders],
  );

  return {
    ...today,
    lowStockCount,
    topProductsHome,
    activity,
    loading,
    productCount: products.length,
    totalSalesCount: sales.length,
    pendingOrdersCount,
  };
}

export default useDashboardData;
