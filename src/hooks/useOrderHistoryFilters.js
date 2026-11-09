"use client";

import { useEffect, useMemo, useState } from "react";
import { isOverdue } from "@/components/orders/ordersUtils";
import { matchesText } from "@/lib/text";

// Búsqueda, filtros, orden y paginación del historial completo de pedidos.
// Mismo patrón que useProductFilters: recibe la lista completa (ya viene
// entera de getOrders, ver services/orders.service.js) y devuelve la porción
// que toca dibujar, más los controles para moverla — todo en el navegador,
// igual que ya hacen Productos, Ventas y Gastos con sus propias listas.
export function useOrderHistoryFilters(orders, { perPage = 10 } = {}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState([]); // multi-select
  const [supplierFilter, setSupplierFilter] = useState([]); // multi-select
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);

  const [sortBy, setSortBy] = useState("order_date");
  const [sortDir, setSortDir] = useState("desc");

  const [page, setPage] = useState(1);

  const suppliers = useMemo(
    () => Array.from(new Set(orders.map((o) => o.supplier))).sort(),
    [orders],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = orders.slice();

    if (statusFilter.length > 0 && !statusFilter.includes("All")) {
      list = list.filter((o) => statusFilter.includes(o.status));
    }

    if (supplierFilter.length > 0 && !supplierFilter.includes("All")) {
      list = list.filter((o) => supplierFilter.includes(o.supplier));
    }

    if (q) {
      list = list.filter((o) =>
        matchesText(q, o.supplier, o.notes, ...o.products.map((p) => p.product)),
      );
    }

    if (dateFrom) {
      list = list.filter((o) => o.order_date.slice(0, 10) >= dateFrom);
    }
    if (dateTo) {
      list = list.filter((o) => o.order_date.slice(0, 10) <= dateTo);
    }

    if (overdueOnly) {
      list = list.filter(isOverdue);
    }

    const sortValue = (o) => {
      if (sortBy === "total_amount") return o.total_amount;
      if (sortBy === "supplier") return o.supplier;
      if (sortBy === "expected_delivery") return o.expected_delivery ?? "";
      if (sortBy === "status") return o.status;
      return o[sortBy];
    };

    list.sort((a, b) => {
      const aVal = sortValue(a);
      const bVal = sortValue(b);
      if (typeof aVal === "string" || typeof bVal === "string") {
        const aText = String(aVal ?? "");
        const bText = String(bVal ?? "");
        return sortDir === "asc"
          ? aText.localeCompare(bText)
          : bText.localeCompare(aText);
      }
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });

    return list;
  }, [
    orders,
    query,
    statusFilter,
    supplierFilter,
    dateFrom,
    dateTo,
    overdueOnly,
    sortBy,
    sortDir,
  ]);

  const activeFilterCount =
    (statusFilter.length > 0 ? 1 : 0) +
    (supplierFilter.length > 0 ? 1 : 0) +
    (dateFrom !== "" ? 1 : 0) +
    (dateTo !== "" ? 1 : 0) +
    (overdueOnly ? 1 : 0);
  const hasActiveSearch = query.trim() !== "" || activeFilterCount > 0;

  const filterChips = useMemo(() => {
    const chips = [];
    statusFilter.forEach((s) =>
      chips.push({
        key: `status-${s}`,
        label: s,
        onRemove: () => setStatusFilter((prev) => prev.filter((x) => x !== s)),
      }),
    );
    supplierFilter.forEach((s) =>
      chips.push({
        key: `supplier-${s}`,
        label: s,
        onRemove: () =>
          setSupplierFilter((prev) => prev.filter((x) => x !== s)),
      }),
    );
    if (dateFrom)
      chips.push({
        key: "from",
        label: `Desde ${dateFrom}`,
        onRemove: () => setDateFrom(""),
      });
    if (dateTo)
      chips.push({
        key: "to",
        label: `Hasta ${dateTo}`,
        onRemove: () => setDateTo(""),
      });
    if (overdueOnly)
      chips.push({
        key: "overdue",
        label: "Entrega atrasada",
        onRemove: () => setOverdueOnly(false),
      });
    return chips;
  }, [statusFilter, supplierFilter, dateFrom, dateTo, overdueOnly]);

  const clearAllFilters = () => {
    setQuery("");
    setStatusFilter([]);
    setSupplierFilter([]);
    setDateFrom("");
    setDateTo("");
    setOverdueOnly(false);
  };

  useEffect(() => {
    setPage(1);
  }, [statusFilter, supplierFilter, dateFrom, dateTo, overdueOnly]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));

  useEffect(() => {
    setPage((p) => (p > totalPages ? totalPages : p));
  }, [totalPages]);

  const pageItems = useMemo(
    () => filtered.slice((page - 1) * perPage, page * perPage),
    [filtered, page, perPage],
  );

  const changeQuery = (value) => {
    setQuery(value);
    setPage(1);
  };

  const toggleSort = (key) => {
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setSortDir("asc");
    }
  };

  return {
    // valores
    query,
    statusFilter,
    supplierFilter,
    dateFrom,
    dateTo,
    overdueOnly,
    sortBy,
    sortDir,
    page,
    perPage,
    // derivados
    suppliers,
    filtered,
    pageItems,
    totalPages,
    activeFilterCount,
    hasActiveSearch,
    filterChips,
    // acciones
    setQuery: changeQuery,
    setStatusFilter,
    setSupplierFilter,
    setDateFrom,
    setDateTo,
    setOverdueOnly,
    setPage,
    toggleSort,
    clearAllFilters,
  };
}

export default useOrderHistoryFilters;
