"use client";

import { useEffect, useMemo, useState } from "react";
import { currency } from "@/utils/converts";
import {
  brandOf,
  categoryOf,
  getMargin,
} from "@/components/products/productsUtils";
import { matchesText } from "@/lib/text";

// Búsqueda, filtros, orden y paginación del catálogo. Vive aparte de la página
// porque es lógica sin pantalla: recibe la lista de productos y devuelve la
// porción que toca dibujar, más los controles para moverla.
// Un producto sin categoría o sin marca también es un grupo por el que se
// quiere filtrar ("¿qué me falta clasificar?"): categoryOf y brandOf le ponen
// nombre a ese vacío, el mismo que muestran la tabla y las tarjetas.
export function useProductFilters(products, { perPage = 8 } = {}) {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState([]); // multi-select
  const [brandFilter, setBrandFilter] = useState([]); // multi-select
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minCost, setMinCost] = useState("");
  const [maxCost, setMaxCost] = useState("");
  const [stockOp, setStockOp] = useState("any"); // any, lt, gt, eq
  const [stockVal, setStockVal] = useState("");

  const [sortBy, setSortBy] = useState(null); // name|category|brand|price|cost_price|margin|stock
  const [sortDir, setSortDir] = useState("asc");

  const [page, setPage] = useState(1);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(products.map(categoryOf))).sort()],
    [products],
  );

  const brands = useMemo(
    () => ["All", ...Array.from(new Set(products.map(brandOf))).sort()],
    [products],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = products.slice();

    if (categoryFilter.length > 0 && !categoryFilter.includes("All")) {
      list = list.filter((p) => categoryFilter.includes(categoryOf(p)));
    }

    if (brandFilter.length > 0 && !brandFilter.includes("All")) {
      list = list.filter((p) => brandFilter.includes(brandOf(p)));
    }

    if (q) {
      list = list.filter((p) =>
        matchesText(q, p.name, p.sku, p.barcode, p.category, p.brand, p.description),
      );
    }

    const min = Number(minPrice);
    const max = Number(maxPrice);
    if (!Number.isNaN(min) && minPrice !== "")
      list = list.filter((p) => p.price >= min);
    if (!Number.isNaN(max) && maxPrice !== "")
      list = list.filter((p) => p.price <= max);

    const minC = Number(minCost);
    const maxC = Number(maxCost);
    if (!Number.isNaN(minC) && minCost !== "")
      list = list.filter((p) => p.cost_price >= minC);
    if (!Number.isNaN(maxC) && maxCost !== "")
      list = list.filter((p) => p.cost_price <= maxC);

    const sVal = Number(stockVal);
    if (stockOp !== "any" && !Number.isNaN(sVal)) {
      if (stockOp === "lt") list = list.filter((p) => p.stock < sVal);
      if (stockOp === "gt") list = list.filter((p) => p.stock > sVal);
      if (stockOp === "eq") list = list.filter((p) => p.stock === sVal);
    }

    // El margen no es una columna de la base: se calcula, así que se ordena
    // aparte. La categoría y la marca se ordenan por el nombre del grupo, para
    // que los productos sin clasificar queden juntos y no dispersos.
    // Sin orden elegido, alfabético por nombre.
    const sortValue = (p) => {
      if (sortBy === "margin") return getMargin(p);
      if (sortBy === "category") return categoryOf(p);
      if (sortBy === "brand") return brandOf(p);
      return p[sortBy];
    };

    if (sortBy) {
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
    } else {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [
    products,
    query,
    categoryFilter,
    brandFilter,
    minPrice,
    maxPrice,
    minCost,
    maxCost,
    stockOp,
    stockVal,
    sortBy,
    sortDir,
  ]);

  const activeFilterCount =
    (categoryFilter.length > 0 ? 1 : 0) +
    (brandFilter.length > 0 ? 1 : 0) +
    (minPrice !== "" ? 1 : 0) +
    (maxPrice !== "" ? 1 : 0) +
    (minCost !== "" ? 1 : 0) +
    (maxCost !== "" ? 1 : 0) +
    (stockOp !== "any" && stockVal !== "" ? 1 : 0);
  const hasActiveSearch = query.trim() !== "" || activeFilterCount > 0;

  const filterChips = useMemo(() => {
    const chips = [];
    categoryFilter.forEach((c) =>
      chips.push({
        key: `cat-${c}`,
        label: c,
        onRemove: () =>
          setCategoryFilter((prev) => prev.filter((x) => x !== c)),
      }),
    );
    brandFilter.forEach((b) =>
      chips.push({
        key: `brand-${b}`,
        label: b,
        onRemove: () => setBrandFilter((prev) => prev.filter((x) => x !== b)),
      }),
    );
    if (minPrice !== "")
      chips.push({
        key: "min",
        label: `Desde ${currency(Number(minPrice))}`,
        onRemove: () => setMinPrice(""),
      });
    if (maxPrice !== "")
      chips.push({
        key: "max",
        label: `Hasta ${currency(Number(maxPrice))}`,
        onRemove: () => setMaxPrice(""),
      });
    if (minCost !== "")
      chips.push({
        key: "minCost",
        label: `Costo desde ${currency(Number(minCost))}`,
        onRemove: () => setMinCost(""),
      });
    if (maxCost !== "")
      chips.push({
        key: "maxCost",
        label: `Costo hasta ${currency(Number(maxCost))}`,
        onRemove: () => setMaxCost(""),
      });
    if (stockOp !== "any" && stockVal !== "") {
      const opLabel =
        stockOp === "lt"
          ? "menor que"
          : stockOp === "gt"
            ? "mayor que"
            : "igual a";
      chips.push({
        key: "stock",
        label: `Stock ${opLabel} ${stockVal}`,
        onRemove: () => {
          setStockOp("any");
          setStockVal("");
        },
      });
    }
    return chips;
  }, [
    categoryFilter,
    brandFilter,
    minPrice,
    maxPrice,
    minCost,
    maxCost,
    stockOp,
    stockVal,
  ]);

  const clearAllFilters = () => {
    setQuery("");
    setCategoryFilter([]);
    setBrandFilter([]);
    setMinPrice("");
    setMaxPrice("");
    setMinCost("");
    setMaxCost("");
    setStockOp("any");
    setStockVal("");
  };

  // La búsqueda de texto vuelve a la página 1 en su propio setter; el resto de
  // los filtros, aquí.
  useEffect(() => {
    setPage(1);
  }, [
    categoryFilter,
    brandFilter,
    minPrice,
    maxPrice,
    minCost,
    maxCost,
    stockOp,
    stockVal,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));

  // Si se filtró tanto que la página actual ya no existe, hay que retroceder o
  // la tabla queda en blanco sin explicación.
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
    categoryFilter,
    brandFilter,
    minPrice,
    maxPrice,
    minCost,
    maxCost,
    stockOp,
    stockVal,
    sortBy,
    sortDir,
    page,
    perPage,
    // derivados
    categories,
    brands,
    filtered,
    pageItems,
    totalPages,
    activeFilterCount,
    hasActiveSearch,
    filterChips,
    // acciones
    setQuery: changeQuery,
    setCategoryFilter,
    setBrandFilter,
    setMinPrice,
    setMaxPrice,
    setMinCost,
    setMaxCost,
    setStockOp,
    setStockVal,
    setPage,
    toggleSort,
    clearAllFilters,
  };
}

export default useProductFilters;
