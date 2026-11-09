"use client";

import { forwardRef } from "react";

// Input global para valores monetarios: el usuario escribe "3500" y ve "$3.500"
// mientras escribe. El valor que se reporta por onChange es siempre el número
// crudo (o "" si está vacío), nunca el texto formateado.
//
// Tolera cualquier forma de escribir plata (Ley de Postel): "5000", "5.000",
// "$5.000" o "5 000" quedan todos en 5000, porque solo se conservan los
// dígitos. Es el input que debe usarse para CUALQUIER monto de la app: un
// <input type="number"> lee "5.000" como 5.
const formatDisplay = (v) => {
  if (v === "" || v === null || v === undefined) return "";
  const n = Number(v);
  if (Number.isNaN(n)) return "";
  return `$${n.toLocaleString("es-CO")}`;
};

const MoneyInput = forwardRef(function MoneyInput(
  { value, onChange, placeholder = "$0", className = "", disabled = false, ...props },
  ref,
) {
  const handleChange = (e) => {
    const numeric = e.target.value.replace(/[^\d]/g, "");
    onChange(numeric === "" ? "" : numeric);
  };

  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={formatDisplay(value)}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      {...props}
    />
  );
});

export default MoneyInput;
