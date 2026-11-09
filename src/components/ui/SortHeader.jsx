"use client";

import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";

// Encabezado de columna ordenable. La flecha doble significa "se puede ordenar
// por aquí"; una sola flecha, la dirección activa.
export default function SortHeader({
  label,
  sortKey,
  sortBy,
  sortDir,
  onClick,
  align = "left",
  className = "",
}) {
  const active = sortBy === sortKey;
  const Icon = !active
    ? ChevronsUpDown
    : sortDir === "asc"
      ? ChevronUp
      : ChevronDown;
  return (
    <th
      className={`cursor-pointer select-none px-2 py-3 text-${align} transition-colors hover:bg-slate-50 ${active ? "text-blue-600" : "text-slate-500"} ${className}`}
      onClick={() => onClick(sortKey)}
      aria-sort={
        active ? (sortDir === "asc" ? "ascending" : "descending") : "none"
      }
    >
      <span
        className={`inline-flex items-center gap-1 text-xs font-bold ${align === "right" ? "flex-row-reverse" : ""}`}
      >
        {label}
        <Icon
          className={`h-3.5 w-3.5 ${active ? "text-blue-600" : "text-slate-500"}`}
        />
      </span>
    </th>
  );
}
