// Constantes y cálculos compartidos por la página de Productos y sus
// componentes. Todo lo de aquí es puro: recibe un producto (o una fila de CSV)
// y devuelve un número, un texto o un error; nada toca la pantalla ni el
// servicio.

import { csvField } from "@/utils/csv";

export const LOW_STOCK_THRESHOLD = 10;

// Un producto puede no tener categoría ni marca: en la base eso es un null, y
// acá es este texto. Vive en un solo lugar porque la tabla, las tarjetas y la
// casilla del filtro tienen que decir exactamente lo mismo; si no coinciden, el
// filtro "Sin categoría" no encuentra nada y parece roto.
export const SIN_CATEGORIA = "Sin categoría";
export const SIN_MARCA = "Sin marca";

export const categoryOf = (p) => p.category || SIN_CATEGORIA;
export const brandOf = (p) => p.brand || SIN_MARCA;

export const CSV_TEMPLATE_HEADERS = [
  "name",
  "sku",
  "barcode",
  "category",
  "brand",
  "cost_price",
  "price",
  "stock",
  "description",
  "photo",
];

/* --- margen --- */

export const getMargin = (p) =>
  (Number(p.price) || 0) - (Number(p.cost_price) || 0);

// El margen se mide sobre el PRECIO DE VENTA, igual que la contabilidad del
// negocio: en Hoja1 la ganancia siempre fue venta x 19%. Medirlo sobre el costo
// daría otro número (23% en vez de 19%) y no cuadraría con el resto de la app.
export const getMarginPct = (p) =>
  Number(p.price) ? Math.round((getMargin(p) / Number(p.price)) * 100) : 0;

/* --- SKU sugerido --- */

// Del nombre de la categoría a las tres letras que van antes del guion:
// "Lácteos" -> "LAC". Sin tilde, sin espacios, mayúsculas.
export const skuCategoryPrefix = (categoryName) => {
  const clean = String(categoryName || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase();
  return clean.slice(0, 3) || "PRD";
};

// El siguiente consecutivo libre para esa categoría dentro de existingSkus (el
// catálogo ya cargado de la tienda, o el que sea al editar). Arranca justo
// después del más alto que ya exista con ese prefijo -no desde 0 cada vez- y,
// si por lo que sea ese ya está tomado, sigue subiendo hasta encontrar uno
// libre: es lo mismo que valida el guardado (ver skuOwner en products/page),
// solo que acá se hace antes, para no ofrecer un SKU que de todas formas va a
// rebotar.
export const nextAvailableSku = (categoryName, existingSkus = []) => {
  const prefix = skuCategoryPrefix(categoryName);
  const taken = new Set(
    existingSkus.map((s) => String(s || "").trim().toUpperCase()).filter(Boolean),
  );

  const re = new RegExp(`^${prefix}-(\\d+)$`);
  let n = 1;
  for (const sku of taken) {
    const match = re.exec(sku);
    if (match) n = Math.max(n, Number(match[1]) + 1);
  }

  let candidate = `${prefix}-${String(n).padStart(4, "0")}`;
  while (taken.has(candidate)) {
    n += 1;
    candidate = `${prefix}-${String(n).padStart(4, "0")}`;
  }
  return candidate;
};

/* --- consulta por código de barras --- */

// Campos que puede llenar una consulta por código de barras. El precio, el
// costo y el stock quedan afuera a propósito: son datos del negocio y ningún
// catálogo de afuera los sabe.
//
// La marca sí entra: es un dato del fabricante, igual que el nombre, y viene
// limpia en la respuesta de Open Facts. Como la categoría, llega marcada y se
// crea recién al guardar si no existía.
export const LOOKUP_FIELDS = ["name", "brand", "category", "description"];

export const BARCODE_RE = /^\d{8,14}$/;

export const FIELD_LABELS = {
  name: "nombre",
  brand: "marca",
  category: "categoría",
  description: "descripción",
  photo: "foto",
};

/* --- importación --- */

// Devuelve el motivo del rechazo, o null si la fila sirve.
//
// El SKU no se exige: es opcional en toda la aplicación (ver
// supabase/sql/01_schema.sql). Si viene, la base rechaza el repetido dentro
// de la misma tienda.
export const validateImportRow = (obj) => {
  if (!obj.name?.trim()) return "Falta el nombre";
  if (
    obj.price === undefined ||
    obj.price === "" ||
    Number.isNaN(Number(obj.price)) ||
    Number(obj.price) < 0
  )
    return "Precio inválido";
  if (
    obj.cost_price === undefined ||
    obj.cost_price === "" ||
    Number.isNaN(Number(obj.cost_price)) ||
    Number(obj.cost_price) < 0
  )
    return "Costo inválido";
  if (
    obj.stock === undefined ||
    obj.stock === "" ||
    Number.isNaN(Number(obj.stock)) ||
    Number(obj.stock) < 0
  )
    return "Stock inválido";
  return null;
};

export const CSV_TEMPLATE_ROWS = [
  CSV_TEMPLATE_HEADERS.join(","),
  [
    "Arroz 1Kg",
    "ARZ-001",
    "",
    "Granos",
    "Diana",
    1800,
    2500,
    100,
    "Arroz blanco de grano largo",
    "",
  ].join(","),
];

/* --- exportación --- */

export const buildProductsCSV = (products) => {
  // "photo" es la URL pública de la foto, no la imagen: el bucket es público,
  // así que la misma URL sigue sirviendo en otra tienda y el CSV alcanza para
  // llevarse el catálogo con fotos y todo.
  const rows = [
    "id,name,sku,barcode,category,brand,cost_price,price,stock,description,photo,created_at",
  ];
  products.forEach((p) =>
    rows.push(
      [
        p.id,
        p.name,
        p.sku,
        p.barcode,
        p.category,
        p.brand,
        p.cost_price,
        p.price,
        p.stock,
        p.description,
        p.photo,
        p.created_at,
      ]
        .map(csvField)
        .join(","),
    ),
  );
  return rows;
};

export const buildProductsPrintHTML = (products) => {
  const cols = [
    "Nombre",
    "SKU",
    "Código de barras",
    "Categoría",
    "Marca",
    "Costo",
    "Precio",
    "Stock",
    "Descripción",
  ];
  return `
      <html><head><meta charset="utf-8"><title>Productos</title>
      <style>body{font-family:system-ui, -apple-system, Roboto, 'Helvetica Neue', Arial;} table{width:100%;border-collapse:collapse;} th,td{padding:8px;border:1px solid #ddd;text-align:left;} th{background:#f7f7f7}</style>
      </head><body>
      <h2>Listado de productos — ${new Date().toLocaleString()}</h2>
      <table><thead><tr>${cols.map((c) => `<th>${c}</th>`).join("")}</tr></thead>
      <tbody>
      ${products.map((p) => `<tr><td>${p.name}</td><td>${p.sku}</td><td>${p.barcode || ""}</td><td>${p.category || ""}</td><td>${p.brand || ""}</td><td>${p.cost_price}</td><td>${p.price}</td><td>${p.stock}</td><td>${p.description || ""}</td></tr>`).join("")}
      </tbody></table>
      </body></html>`;
};
