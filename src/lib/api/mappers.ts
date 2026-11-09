// De la fila de Supabase a la forma que ya usan las pantallas.
//
// La API devuelve exactamente los tipos de src/types (Product, Sale, Order,
// Expense, DailyClose), los mismos que hoy entrega el mock. Así, cuando se
// conecte el front, cambiar los servicios por llamadas a /api no obliga a
// tocar ni un componente.
//
// Lo que la base tiene de más (updated_at, voided_at, line_total, received_at)
// no sale por aquí a propósito: si en algún momento hace falta en pantalla, se
// agrega primero al tipo de src/types y después acá.

import type {
  Product,
  Sale,
  SaleProductLine,
  Order,
  OrderProductLine,
  Supplier,
  Expense,
  DailyClose,
  FiadoPayment,
} from "@/types";
import type {
  ProductRow,
  SaleRow,
  SaleItemRow,
  OrderRow,
  OrderItemRow,
  ExpenseRow,
  DailyCloseRow,
  ProductCategoryRow,
  ProductBrandRow,
  OrderSupplierRow,
} from "@/types/database";

const n = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const nOrNull = (value: unknown): number | null =>
  value === null || value === undefined ? null : n(value);

export function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    barcode: row.barcode ?? "",
    photo: row.photo ?? null,
    price: n(row.price),
    cost_price: n(row.cost_price),
    stock: n(row.stock),
    // Sin categoría el nombre viaja vacío y no como "Sin categoría": el texto
    // que se lee en pantalla lo pone la pantalla, que es donde se puede
    // traducir o cambiar sin tocar la base.
    category: row.category ?? "",
    category_id: row.category_id ?? null,
    brand: row.brand ?? "",
    brand_id: row.brand_id ?? null,
    description: row.description ?? "",
    created_at: row.created_at,
  };
}

export function toSaleLine(row: SaleItemRow): SaleProductLine {
  return {
    product_id: row.product_id ?? "",
    product: row.product_name,
    quantity: n(row.quantity),
    sale_price: n(row.sale_price),
    discount_type: row.discount_type ?? null,
    discount_value: n(row.discount_value),
  };
}

export function toSale(row: SaleRow): Sale {
  return {
    id: row.id,
    sale_date: row.sale_date,
    total_amount: n(row.total_amount),
    gain: n(row.gain),
    payment_method: row.payment_method,
    client_name: row.client_name ?? null,
    voided: Boolean(row.voided),
    products: (row.items ?? []).map(toSaleLine),
  };
}

export function toOrderLine(row: OrderItemRow): OrderProductLine {
  return {
    id: row.id,
    product_id: row.product_id ?? "",
    product: row.product_name,
    quantity: n(row.quantity),
    unit_cost: n(row.unit_cost),
    status: row.status,
  };
}

export function toOrder(row: OrderRow): Order {
  return {
    id: row.id,
    order_date: row.order_date,
    supplier: row.supplier,
    supplier_id: row.supplier_id ?? null,
    expected_delivery: row.expected_delivery ?? null,
    notes: row.notes ?? "",
    total_amount: n(row.total_amount),
    status: row.status,
    attachment: row.attachment ?? null,
    products: (row.items ?? []).map(toOrderLine),
  };
}

export function toExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    date: row.date,
    kind: row.kind,
    amount: n(row.amount),
    concept: row.concept ?? "",
    notes: row.notes ?? "",
  };
}

export function toDailyClose(row: DailyCloseRow): DailyClose {
  return {
    id: row.id,
    date: row.date,
    sales_total: n(row.sales_total),
    gain: n(row.gain),
    expenses_total: n(row.expenses_total),
    purchases_total: n(row.purchases_total),
    cash_in: nOrNull(row.cash_in),
    cash_out: nOrNull(row.cash_out),
    cash_counted: nOrNull(row.cash_counted),
    source: row.source,
  };
}

export function toCategory(row: ProductCategoryRow) {
  return {
    category_id: row.category_id,
    category: row.category,
    product_count: n(row.product_count),
    stock_units: n(row.stock_units),
    stock_value_cost: n(row.stock_value_cost),
  };
}

export function toBrand(row: ProductBrandRow) {
  return {
    brand_id: row.brand_id,
    brand: row.brand,
    product_count: n(row.product_count),
    stock_units: n(row.stock_units),
    stock_value_cost: n(row.stock_value_cost),
  };
}

export function toSupplier(row: OrderSupplierRow): Supplier {
  return {
    id: row.supplier_id,
    name: row.supplier,
    order_count: n(row.order_count),
  };
}

type FiadoPaymentRow = {
  id: string;
  client_name: string;
  amount: number | string;
  payment_method: FiadoPayment["payment_method"];
  paid_at: string;
};

export function toFiadoPayment(row: FiadoPaymentRow): FiadoPayment {
  return {
    id: row.id,
    client_name: row.client_name,
    amount: n(row.amount),
    payment_method: row.payment_method,
    paid_at: row.paid_at,
  };
}

// Columnas que hay que pedirle a PostgREST para armar cada forma.
export const SALE_SELECT = "*, items:sale_items(*)";
export const ORDER_SELECT = "*, items:order_items(*)";
