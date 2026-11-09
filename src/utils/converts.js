const formatMoneySymbol = (money) => {
  return money
    ? new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        minimumFractionDigits: 0,
      })
        .format(money)
        .replace("COP", "")
        .trim()
    : "";
};

const formatMoney = (money) => {
  return money
    ? new Intl.NumberFormat("es-CO", {
        minimumFractionDigits: 0,
      }).format(money)
    : "";
};

// Helpers
const currency = (n) => {
  if (typeof n !== "number") return "-";
  return n.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  });
};


// "$5.000", igual a como lo muestra MoneyInput mientras se escribe. Para
// cualquier cifra de plata nueva en pantalla.
const pesos = (n) => `$${Math.round(Number(n) || 0).toLocaleString("es-CO")}`;

// "hoy", "ayer", "hace 3 días", "hace 2 semanas" o la fecha corta: como lo
// diría alguien en la tienda, no "2026-11-05T15:30:00Z".
const whenLabel = (iso, now = new Date()) => {
  if (!iso) return "";
  const date = new Date(iso);
  const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const days = Math.round((startOf(now) - startOf(date)) / 86400000);
  if (days <= 0) return "hoy";
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days} días`;
  if (days < 30) {
    const weeks = Math.round(days / 7);
    return weeks === 1 ? "hace una semana" : `hace ${weeks} semanas`;
  }
  return date.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
};

export { formatMoneySymbol, formatMoney, currency, pesos, whenLabel };
