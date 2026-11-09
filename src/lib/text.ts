// Comparar texto como lo escribe la gente: sin importar mayúsculas, tildes ni
// espacios de más. "cafe" encuentra "Café", "doña rosa" es la misma clienta
// que "Doña  Rosa ". Se usa en todos los buscadores y en el cuaderno de fiados.

export function normalizeText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** true si `query` aparece dentro de alguno de los textos, sin tildes ni mayúsculas. */
export function matchesText(query: string, ...fields: unknown[]): boolean {
  const q = normalizeText(query);
  if (!q) return true;
  return fields.some((field) => normalizeText(field).includes(q));
}
