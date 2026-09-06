// Lectura y escritura de CSV. Se hace a mano en vez de traer una librería:
// son archivos de la propia tienda, exportados por esta misma aplicación o
// armados en Excel, no CSV arbitrarios de internet.

// Parser tolerante a comillas dobles y a saltos de línea de Windows. Devuelve
// una matriz de filas; las filas totalmente vacías se descartan, porque Excel
// suele dejar una al final del archivo.
export function parseCSV(text) {
  const rows = [];
  let cur = "";
  let row = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQuotes = false;
      } else cur += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(cur);
      cur = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cur);
      cur = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else {
      cur += c;
    }
  }
  if (cur !== "" || row.length) {
    row.push(cur);
    rows.push(row);
  }
  return rows;
}

// Prepara un valor para escribirlo como campo de CSV. Solo entrecomilla cuando
// hace falta, y adentro dobla las comillas: es lo que espera parseCSV (y Excel).
// No sirve JSON.stringify, que escapa a la manera de JSON (\") y deja el campo
// ilegible al releerlo.
export function csvField(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// Dispara la descarga de un archivo de texto. El objeto URL se libera enseguida
// porque, si no, el blob se queda en memoria hasta que se recargue la página.
export function downloadTextFile(filename, content, type = "text/csv;charset=utf-8;") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Une las líneas y descarga. Cada línea ya viene armada por quien llama, que es
// el que sabe qué columnas exporta.
export function downloadCSV(filename, rows) {
  downloadTextFile(filename, rows.join("\n"));
}
