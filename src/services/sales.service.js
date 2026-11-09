// Ventas registradas una por una desde la aplicación.
//
// createSaleWithDetails arma la venta completa. En simulación resuelve el
// nombre y precio de cada producto a mano contra el mock; fuera de
// simulación eso lo hace create_sale() en la base a partir de product_id, así
// que solo hay que pasar las líneas.

import { collection, commit, isSimulationOn } from "../lib/dataSource";
import { apiFetch, apiFetchAll } from "../lib/api/client";

const all = () => collection("sales");

const sameId = (a, b) => String(a) === String(b);

export const getSales = async () => {
  if (isSimulationOn()) return [...all()];
  return apiFetchAll("/api/sales");
};

export const getSaleById = async (id) => {
  if (isSimulationOn()) {
    const sale = all().find((s) => sameId(s.id, id));
    if (!sale) throw new Error("Sale not found");
    return sale;
  }
  const { data } = await apiFetch(`/api/sales/${id}`);
  return data;
};

export const createSale = async (sale) => {
  if (isSimulationOn()) {
    all().unshift(sale);
    commit("sales");
    return sale;
  }
  const { data } = await apiFetch("/api/sales", {
    method: "POST",
    body: JSON.stringify(sale),
  });
  return data;
};

export const createSaleWithDetails = async (sale, saleProducts) => {
  if (isSimulationOn()) {
    const products = collection("products");

    const detailedProducts = saleProducts.map((line) => {
      const product = products.find((p) => sameId(p.id, line.product_id));
      return {
        product_id: line.product_id,
        product: product ? product.name : `Producto #${line.product_id}`,
        quantity: line.quantity,
        sale_price: line.sale_price ?? product?.price ?? 0,
        discount_type: line.discount_type ?? null,
        discount_value: line.discount_value ?? 0,
      };
    });

    const created = {
      id: `s${Date.now()}`,
      payment_method: "efectivo",
      client_name: null,
      voided: false,
      ...sale,
      products: detailedProducts,
    };

    all().unshift(created);
    commit("sales");
    // Igual que create_sale() en la base: descuenta el inventario en la misma
    // operación, y puede quedar en negativo si se vendió más de lo anotado.
    adjustSimulatedStock(created.products, -1);
    return created;
  }

  const { data } = await apiFetch("/api/sales", {
    method: "POST",
    body: JSON.stringify({ ...sale, products: saleProducts }),
  });
  return data;
};

function adjustSimulatedStock(lines, sign) {
  const products = collection("products");
  for (const line of lines ?? []) {
    const product = products.find((p) => sameId(p.id, line.product_id));
    if (product) product.stock = Number(product.stock ?? 0) + sign * Number(line.quantity ?? 0);
  }
  commit("products");
}

export const updateSale = async (id, changes) => {
  if (isSimulationOn()) {
    const sale = all().find((s) => sameId(s.id, id));
    if (!sale) throw new Error("Sale not found");
    // Igual que void_sale() en la base: anular devuelve lo vendido al inventario.
    const voiding = changes.voided === true && !sale.voided;
    Object.assign(sale, changes);
    commit("sales");
    if (voiding && changes.restore_stock !== false) adjustSimulatedStock(sale.products, +1);
    return sale;
  }
  const { data } = await apiFetch(`/api/sales/${id}`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
  return data;
};

export const deleteSale = async (id) => {
  if (isSimulationOn()) {
    const sales = all();
    const index = sales.findIndex((s) => sameId(s.id, id));
    if (index === -1) throw new Error("Sale not found");
    sales.splice(index, 1);
    commit("sales");
    return { message: "Sale deleted" };
  }
  await apiFetch(`/api/sales/${id}`, { method: "DELETE" });
  return { message: "Sale deleted" };
};
