"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ClipboardList, SearchX } from "lucide-react";
import { getOrders } from "@/services/orders.service";
import { useToasts } from "@/hooks/useToasts";
import { useOrderHistoryFilters } from "@/hooks/useOrderHistoryFilters";

import ToastStack from "@/components/ui/ToastStack";
import Pagination from "@/components/ui/Pagination";
import OrdersHistoryToolbar from "@/components/orders/OrdersHistoryToolbar";
import OrdersHistoryFilters from "@/components/orders/OrdersHistoryFilters";
import OrdersHistoryTable from "@/components/orders/OrdersHistoryTable";
import OrdersHistoryCardList from "@/components/orders/OrdersHistoryCardList";

/*
  OrdersHistoryPage
  - "Ver historial completo" de Pedidos: mismo patrón de la página de
    Productos (buscador + filtros expandibles arriba, tabla/tarjetas en medio,
    paginación abajo) aplicado a los pedidos, para no tener que aprender una
    UI distinta solo porque cambió la pantalla.
  - La lista completa sale de getOrders() (ya trae todos los pedidos, ver
    services/orders.service.js) y el filtrado/orden/paginación pasa en el
    navegador, igual que Productos/Ventas/Gastos con sus propias listas.
*/
export default function OrdersHistoryPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { toasts, push, dismiss } = useToasts();

  const filters = useOrderHistoryFilters(orders);
  const { pageItems, filtered } = filters;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getOrders();
        if (mounted) setOrders(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        push("No se pudo cargar el historial de pedidos", "error");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto min-h-screen">
      <Link
        href="/orders"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a Pedidos
      </Link>

      <div className="mt-2 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Historial completo de pedidos
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {loading
              ? "Cargando…"
              : `${filtered.length} de ${orders.length} pedido${orders.length === 1 ? "" : "s"}`}
          </p>
        </div>
      </div>

      {!loading && orders.length > 0 && (
        <>
          <div className="mt-4">
            <OrdersHistoryToolbar
              query={filters.query}
              onQueryChange={filters.setQuery}
              filtersOpen={filtersOpen}
              onToggleFilters={() => setFiltersOpen((s) => !s)}
              activeFilterCount={filters.activeFilterCount}
              filterChips={filters.filterChips}
              onClearAll={filters.clearAllFilters}
            />
          </div>

          <OrdersHistoryFilters
            open={filtersOpen}
            onClose={() => setFiltersOpen(false)}
            suppliers={filters.suppliers}
            supplierFilter={filters.supplierFilter}
            onSupplierFilterChange={filters.setSupplierFilter}
            statusFilter={filters.statusFilter}
            onStatusFilterChange={filters.setStatusFilter}
            dateFrom={filters.dateFrom}
            onDateFromChange={filters.setDateFrom}
            dateTo={filters.dateTo}
            onDateToChange={filters.setDateTo}
            overdueOnly={filters.overdueOnly}
            onOverdueOnlyChange={filters.setOverdueOnly}
            onClearAll={filters.clearAllFilters}
          />
        </>
      )}

      {loading && (
        <div className="mt-4 space-y-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3.5 py-1.5">
              <div className="h-3 w-24 shrink-0 animate-pulse rounded bg-slate-100 motion-reduce:animate-none" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100 motion-reduce:animate-none" />
              <div className="ml-auto h-3 w-20 animate-pulse rounded bg-slate-100 motion-reduce:animate-none" />
            </div>
          ))}
        </div>
      )}

      {!loading && orders.length === 0 && (
        <div className="mt-4 flex flex-col items-center gap-3.5 rounded-xl bg-white p-16 text-center shadow-sm ring-1 ring-slate-100">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <ClipboardList className="h-8 w-8 text-slate-500" />
          </div>
          <p className="text-lg font-bold text-slate-900">
            Todavía no hay pedidos
          </p>
          <p className="max-w-sm text-sm text-slate-500">
            Los pedidos que registres a tus proveedores van a aparecer acá.
          </p>
          <Link
            href="/orders"
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700"
          >
            Registrar un pedido
          </Link>
        </div>
      )}

      {!loading && orders.length > 0 && filtered.length === 0 && (
        <div className="mt-4 flex flex-col items-center gap-3.5 rounded-xl bg-white p-16 text-center shadow-sm ring-1 ring-slate-100">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <SearchX className="h-8 w-8 text-slate-500" />
          </div>
          <p className="text-lg font-bold text-slate-900">
            No encontramos pedidos
          </p>
          <p className="max-w-sm text-sm text-slate-500">
            Prueba con otra palabra de búsqueda o quita algunos filtros para
            ver más resultados.
          </p>
          <button
            onClick={filters.clearAllFilters}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700"
          >
            Limpiar filtros
          </button>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <>
          <OrdersHistoryTable
            items={pageItems}
            sortBy={filters.sortBy}
            sortDir={filters.sortDir}
            onSort={filters.toggleSort}
          />
          <OrdersHistoryCardList items={pageItems} />

          <Pagination
            page={filters.page}
            totalPages={filters.totalPages}
            perPage={filters.perPage}
            total={filtered.length}
            onPageChange={filters.setPage}
          />
        </>
      )}

      <ToastStack toasts={toasts} onDismiss={dismiss} accent="indigo" />
    </div>
  );
}
