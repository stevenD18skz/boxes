// Las filas tal como vienen de Supabase, antes de pasarlas por los mappers.
//
// Esto es el reflejo de supabase/sql/01_schema.sql: si allá se agrega o cambia
// una columna, hay que cambiarla también acá.
//
// Los numeric de Postgres llegan como número en el JSON, pero cuando el valor
// es muy grande PostgREST los manda como texto. Por eso los mappers siempre
// pasan por Number() en vez de confiar en el tipo.

import type {
  PaymentMethod,
  OrderStatus,
  OrderItemStatus,
  ExpenseKind,
  DailyCloseSource,
} from "@/types";

export type SaleDiscountType = "pct" | "amount";

// Sale de la vista v_products y no de la tabla: category y brand son el nombre
// ya resuelto de las tablas categories y brands, que es lo que la API devuelve
// y por lo que se busca y se ordena. Los ids son los que se escriben.
export interface ProductRow {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  photo: string | null;
  price: number | string;
  cost_price: number | string;
  stock: number | string;
  category_id: string | null;
  category: string | null;
  brand_id: string | null;
  brand: string | null;
  description: string;
  created_at: string;
  updated_at: string;
}

// Una fila de categories o de brands. Las dos tablas tienen la misma forma.
export interface TaxonomyRow {
  id: string;
  tienda_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface SaleItemRow {
  id: string;
  sale_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number | string;
  sale_price: number | string;
  discount_type: SaleDiscountType | null;
  discount_value: number | string;
  line_total: number | string;
  created_at: string;
}

export interface SaleRow {
  id: string;
  sale_date: string;
  total_amount: number | string;
  gain: number | string;
  payment_method: PaymentMethod;
  client_name: string | null;
  voided: boolean;
  voided_at: string | null;
  created_at: string;
  updated_at: string;
  /** Llega solo cuando la consulta pide items:sale_items(*). */
  items?: SaleItemRow[] | null;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number | string;
  unit_cost: number | string;
  line_total: number | string;
  status: OrderItemStatus;
  created_at: string;
}

export interface OrderRow {
  id: string;
  order_date: string;
  supplier: string;
  supplier_id: string | null;
  expected_delivery: string | null;
  notes: string;
  total_amount: number | string;
  status: OrderStatus;
  attachment: string | null;
  received_at: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItemRow[] | null;
}

export interface ExpenseRow {
  id: string;
  date: string;
  kind: ExpenseKind;
  amount: number | string;
  concept: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface DailyCloseRow {
  id: string;
  date: string;
  sales_total: number | string;
  gain: number | string;
  expenses_total: number | string;
  purchases_total: number | string;
  cash_in: number | string | null;
  cash_out: number | string | null;
  cash_counted: number | string | null;
  source: DailyCloseSource;
  created_at: string;
  updated_at: string;
}

export interface ProductCategoryRow {
  category_id: string;
  category: string;
  product_count: number | string;
  stock_units: number | string;
  stock_value_cost: number | string;
}

export interface ProductBrandRow {
  brand_id: string;
  brand: string;
  product_count: number | string;
  stock_units: number | string;
  stock_value_cost: number | string;
}

export interface OrderSupplierRow {
  supplier_id: string;
  supplier: string;
  order_count: number | string;
}
