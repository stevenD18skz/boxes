// Datos de mentira para el modo simulación.
//
// NADA de este archivo salió del negocio: son productos, ventas, pedidos y
// gastos inventados para que alguien pueda entrar a la aplicación, usarla de
// verdad y ver cómo se comporta, sin tocar la base de datos de la tienda.
// Los datos reales del Excel viven en src/lib/data y no se mezclan con esto.
//
// Es poca cosa a propósito: 22 productos, unas cuantas ventas y dos semanas de
// cierres. Lo suficiente para que las pantallas se vean con contenido y para
// probar el flujo completo (vender, pedir, recibir, cerrar el día).
//
// Las fechas se calculan contra el día en que se arranca la simulación, no
// están escritas a mano: así "hoy" siempre tiene movimiento y las gráficas de
// los últimos días muestran algo.

import type { Product, Sale, Order, Expense, DailyClose, FiadoPayment } from "@/types";

export type SimulationData = {
  products: Product[];
  sales: Sale[];
  orders: Order[];
  expenses: Expense[];
  dailyCloses: DailyClose[];
  fiadoPayments: FiadoPayment[];
};

// --- Ayudas de fecha -------------------------------------------------------
// Se usa la fecha local y no toISOString() para el día, porque en Colombia
// (UTC-5) el ISO devuelve el día siguiente durante la tarde y la noche.
const dayKey = (date: Date): string => {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
};

const daysAgo = (base: Date, days: number): Date =>
  new Date(base.getFullYear(), base.getMonth(), base.getDate() - days);

const at = (base: Date, days: number, hour: number, minute: number): string => {
  const d = daysAgo(base, days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

// --- Catálogo --------------------------------------------------------------
// [sku, nombre, categoría, marca, precio, costo, stock]
// Se deja en forma de tabla (una línea por producto) para poder leerlo y
// editarlo de un vistazo; por eso el prettier-ignore.
// La marca sale del propio nombre, que es como está escrito el catálogo real.
// Las dos que se venden sin marca (la panela y el queso, que llegan de finca)
// la dejan vacía a propósito: así la simulación también muestra cómo se ve un
// producto sin marca.
// prettier-ignore
const CATALOGO: Array<[string, string, string, string, number, number, number]> = [
  ["GRA-001", "Arroz Diana 500g",           "Granos y abarrotes", "Diana",      2800,  2100, 48],
  ["GRA-002", "Fríjol Cargamanto 500g",     "Granos y abarrotes", "La Muñeca",  6500,  5100, 10],
  ["GRA-003", "Azúcar Manuelita 1kg",       "Granos y abarrotes", "Manuelita",  4900,  3900, 30],
  ["GRA-004", "Panela Cuadrada 500g",       "Granos y abarrotes", "",           3200,  2400, 25],
  ["ACE-001", "Aceite Girasol 1000ml",      "Aceites",            "Girasol",   12900,  9800, 14],
  ["LAC-001", "Leche Entera 1L",            "Lácteos y huevos",   "Alquería",   4300,  3500, 36],
  ["LAC-002", "Huevos AA x30",              "Lácteos y huevos",   "Kikes",     18500, 15200,  9],
  ["LAC-003", "Queso Campesino 500g",       "Lácteos y huevos",   "",          14200, 11400,  7],
  ["PAN-001", "Pan Tajado Bimbo",           "Panadería",          "Bimbo",      6800,  5400, 12],
  ["PAN-002", "Arepas Doñarepa x5",         "Panadería",          "Doñarepa",   4600,  3600, 11],
  ["BEB-001", "Coca-Cola 1.5L",             "Bebidas",            "Coca-Cola",  5600,  4400, 24],
  ["BEB-002", "Agua Cristal 600ml",         "Bebidas",            "Cristal",    2000,  1400, 60],
  ["BEB-003", "Cerveza Águila 330ml",       "Bebidas",            "Águila",     3500,  2700, 72],
  ["BEB-004", "Café Sello Rojo 250g",       "Bebidas",            "Sello Rojo", 9900,  7900, 18],
  ["MEC-001", "Papas Margarita 105g",       "Mecato",             "Margarita",  5400,  4200, 20],
  ["MEC-002", "Galletas Festival x12",      "Mecato",             "Festival",   4800,  3700, 15],
  ["ENL-001", "Atún Van Camps",             "Enlatados",          "Van Camps",  6200,  4900, 22],
  ["CAR-001", "Salchichas Zenú x5",         "Carnes frías",       "Zenú",       8900,  7100,  0],
  ["ASE-001", "Detergente Fab 900g",        "Aseo del hogar",     "Fab",       11400,  9100,  8],
  ["ASE-002", "Jabón Rey x3",               "Aseo del hogar",     "Rey",        4200,  3200, 26],
  ["ASE-003", "Papel Higiénico Familia x4", "Aseo del hogar",     "Familia",    9800,  7600, 16],
  ["CUI-001", "Shampoo Savital 550ml",      "Cuidado personal",   "Savital",   16900, 13200,  6],
];

// Códigos de barras reales, para poder probar el lector con productos que
// de verdad existen. El resto del catálogo sigue usando el generador.
const BARCODES_REALES: Record<string, string> = {
  "GRA-001": "7702511000014", // Arroz Diana 500g
  "LAC-001": "7702001042050", // Leche Entera 1L
};

function buildProducts(hoy: Date): Product[] {
  return CATALOGO.map(
    ([sku, name, category, brand, price, cost, stock], i) => ({
      id: `sim-p-${String(i + 1).padStart(2, "0")}`,
      name,
      sku,
      barcode:
        BARCODES_REALES[sku] ??
        `770${String(1000000 + i * 7919).slice(0, 7)}`,
      photo: null,
      price,
      cost_price: cost,
      stock,
      category,
      // En simulación no hay tablas ni ids: la categoría y la marca son el
      // texto y nada más. El select de creación funciona igual.
      category_id: null,
      brand,
      brand_id: null,
      description:
        "Producto de ejemplo del modo simulación. No existe en la tienda.",
      created_at: at(hoy, 60, 8, 0),
    }),
  );
}

// --- Ventas ----------------------------------------------------------------
type LineaDemo = {
  sku: string;
  quantity: number;
  discount_type?: "pct" | "amount";
  discount_value?: number;
};

type VentaDemo = {
  id: string;
  hace: number;
  hora: [number, number];
  payment_method: Sale["payment_method"];
  client_name?: string;
  voided?: boolean;
  lineas: LineaDemo[];
};

const VENTAS: VentaDemo[] = [
  {
    id: "sim-v-01",
    hace: 0,
    hora: [8, 15],
    payment_method: "efectivo",
    lineas: [
      { sku: "PAN-001", quantity: 1 },
      { sku: "LAC-001", quantity: 2 },
      { sku: "BEB-004", quantity: 1 },
    ],
  },
  {
    id: "sim-v-02",
    hace: 0,
    hora: [10, 40],
    payment_method: "efectivo",
    lineas: [{ sku: "BEB-003", quantity: 6 }],
  },
  {
    id: "sim-v-03",
    hace: 0,
    hora: [12, 5],
    payment_method: "transferencia",
    lineas: [
      { sku: "GRA-001", quantity: 3 },
      { sku: "ACE-001", quantity: 1, discount_type: "pct", discount_value: 10 },
      { sku: "LAC-002", quantity: 1 },
    ],
  },
  {
    id: "sim-v-04",
    hace: 0,
    hora: [15, 30],
    payment_method: "fiado",
    client_name: "Doña Rosa (tienda de la esquina)",
    lineas: [
      { sku: "ASE-001", quantity: 2 },
      { sku: "ASE-003", quantity: 1 },
    ],
  },
  {
    id: "sim-v-05",
    hace: 1,
    hora: [9, 20],
    payment_method: "tarjeta",
    lineas: [
      { sku: "CUI-001", quantity: 1 },
      {
        sku: "MEC-001",
        quantity: 2,
        discount_type: "amount",
        discount_value: 800,
      },
    ],
  },
  {
    id: "sim-v-06",
    hace: 1,
    hora: [17, 45],
    payment_method: "efectivo",
    lineas: [
      { sku: "ENL-001", quantity: 4 },
      { sku: "GRA-002", quantity: 1 },
    ],
  },
  {
    // Una venta anulada, para que se vea cómo queda en el historial.
    id: "sim-v-07",
    hace: 2,
    hora: [11, 10],
    payment_method: "efectivo",
    voided: true,
    lineas: [{ sku: "LAC-003", quantity: 2 }],
  },
];

function buildSales(hoy: Date, products: Product[]): Sale[] {
  const porSku = new Map(products.map((p) => [p.sku, p]));

  return VENTAS.map((venta) => {
    let total = 0;
    let costo = 0;

    const lineas = venta.lineas.map((linea) => {
      const producto = porSku.get(linea.sku)!;
      const base = producto.price * linea.quantity;
      const descuento =
        linea.discount_type === "pct"
          ? base * ((linea.discount_value ?? 0) / 100)
          : Math.min(linea.discount_value ?? 0, base);

      total += base - descuento;
      costo += producto.cost_price * linea.quantity;

      return {
        product_id: producto.id,
        product: producto.name,
        quantity: linea.quantity,
        sale_price: producto.price,
        discount_type: linea.discount_type ?? null,
        discount_value: linea.discount_value ?? 0,
      };
    });

    return {
      id: venta.id,
      sale_date: at(hoy, venta.hace, venta.hora[0], venta.hora[1]),
      total_amount: Math.round(total),
      gain: Math.round(total - costo),
      payment_method: venta.payment_method,
      client_name: venta.client_name ?? null,
      voided: venta.voided ?? false,
      products: lineas,
    };
  }).sort((a, b) => b.sale_date.localeCompare(a.sale_date));
}

// --- Pedidos ---------------------------------------------------------------
type PedidoDemo = {
  id: string;
  hace: number;
  supplier: string;
  entregaEnDias: number | null;
  status: Order["status"];
  notes: string;
  lineas: Array<{ sku: string; quantity: number }>;
};

const PEDIDOS: PedidoDemo[] = [
  {
    id: "sim-o-01",
    hace: 1,
    supplier: "Distribuidora La Economía",
    entregaEnDias: 2,
    status: "pendiente",
    notes: "Confirmar precio del aceite antes de recibir.",
    lineas: [
      { sku: "ACE-001", quantity: 12 },
      { sku: "GRA-001", quantity: 40 },
      { sku: "GRA-003", quantity: 20 },
    ],
  },
  {
    // Pendiente con la fecha de entrega ya pasada: así se ve el aviso de atraso.
    id: "sim-o-02",
    hace: 6,
    supplier: "Lácteos del Campo",
    entregaEnDias: -2,
    status: "pendiente",
    notes: "Llamar, no han entregado.",
    lineas: [
      { sku: "LAC-001", quantity: 30 },
      { sku: "LAC-003", quantity: 10 },
    ],
  },
  {
    id: "sim-o-03",
    hace: 8,
    supplier: "Postobón S.A.",
    entregaEnDias: -5,
    status: "recibido",
    notes: "",
    lineas: [
      { sku: "BEB-001", quantity: 24 },
      { sku: "BEB-002", quantity: 48 },
    ],
  },
  {
    id: "sim-o-04",
    hace: 12,
    supplier: "Comercializadora El Trigal",
    entregaEnDias: -9,
    status: "cancelado",
    notes: "Cancelado: subieron el precio de un día para otro.",
    lineas: [{ sku: "PAN-001", quantity: 20 }],
  },
];

function buildOrders(hoy: Date, products: Product[]): Order[] {
  const porSku = new Map(products.map((p) => [p.sku, p]));

  return PEDIDOS.map((pedido, pedidoIdx) => {
    let total = 0;
    // La fase de cada línea sigue la del pedido completo: si ya se recibió o
    // canceló, todas sus líneas quedan igual (el proveedor entrega todo
    // junto). Si sigue pendiente, la primera línea queda "en_espera" y el
    // resto "por_pedir", solo para que la demo muestre las dos fases.
    const lineas = pedido.lineas.map((linea, lineaIdx) => {
      const producto = porSku.get(linea.sku)!;
      total += producto.cost_price * linea.quantity;
      const status: Order["products"][number]["status"] =
        pedido.status === "pendiente"
          ? lineaIdx === 0
            ? "en_espera"
            : "por_pedir"
          : pedido.status;
      return {
        id: `${pedido.id}-l${pedidoIdx}${lineaIdx}`,
        product_id: producto.id,
        product: producto.name,
        quantity: linea.quantity,
        unit_cost: producto.cost_price,
        status,
      };
    });

    return {
      id: pedido.id,
      order_date: at(hoy, pedido.hace, 7, 30),
      supplier: pedido.supplier,
      // La simulación no tiene una tabla propia de proveedores (se deducen
      // de los pedidos, ver deriveSuppliersFromOrders en orders.service.js).
      supplier_id: null,
      expected_delivery:
        pedido.entregaEnDias === null
          ? null
          : dayKey(daysAgo(hoy, -pedido.entregaEnDias)),
      notes: pedido.notes,
      total_amount: total,
      status: pedido.status,
      attachment: null,
      products: lineas,
    };
  });
}

// --- Gastos y caja ---------------------------------------------------------
// [días atrás, tipo, monto, concepto]
const GASTOS: Array<[number, Expense["kind"], number, string]> = [
  [0, "gasto", 18000, "Bolsas y empaques"],
  [0, "gasto", 12000, "Transporte del mercado"],
  [0, "entrada", 50000, "Base de caja de la mañana"],
  [1, "gasto", 35000, "Recibo del agua"],
  [1, "salida", 200000, "Pago a Postobón"],
  [2, "gasto", 9500, "Elementos de aseo"],
  [3, "gasto", 145000, "Recibo de la luz"],
  [3, "salida", 150000, "Retiro para el banco"],
  [4, "gasto", 22000, "Domicilio de la panadería"],
  [5, "entrada", 80000, "Abono de Doña Rosa"],
  [6, "gasto", 15000, "Gas de la cocina"],
  [8, "gasto", 60000, "Mantenimiento de la nevera"],
];

function buildExpenses(hoy: Date): Expense[] {
  return GASTOS.map(([hace, kind, amount, concept], i) => ({
    id: `sim-g-${String(i + 1).padStart(2, "0")}`,
    date: dayKey(daysAgo(hoy, hace)),
    kind,
    amount,
    concept,
    notes: "",
  }));
}

// --- Cierres diarios -------------------------------------------------------
// Catorce días anteriores a hoy. [venta, gasto, compra, entrada, salida]
// La ganancia se calcula al 19%, el mismo margen que usa la contabilidad.
const CIERRES: Array<[number, number, number, number | null, number | null]> = [
  [612400, 24000, 180000, null, null],
  [488900, 31500, 0, null, 120000],
  [735200, 18700, 420000, 60000, null],
  [521000, 42000, 95000, null, null],
  [694300, 15600, 310000, null, null],
  [812500, 58000, 0, null, 200000],
  [903700, 27300, 540000, null, null],
  [455800, 19400, 0, null, null],
  [578600, 63200, 275000, 45000, null],
  [641900, 21800, 130000, null, null],
  [702400, 34500, 380000, null, 90000],
  [534700, 16900, 0, null, null],
  [667300, 48600, 210000, null, null],
  [749100, 25200, 460000, null, null],
];

function buildDailyCloses(hoy: Date): DailyClose[] {
  return CIERRES.map(([sales, expenses, purchases, cashIn, cashOut], i) => {
    const fecha = dayKey(daysAgo(hoy, i + 1));
    return {
      id: `sim-dc-${fecha}`,
      date: fecha,
      sales_total: sales,
      gain: Math.round(sales * 0.19),
      expenses_total: expenses,
      purchases_total: purchases,
      cash_in: cashIn,
      cash_out: cashOut,
      source: "app" as const,
    };
  });
}

// Arma el juego completo de datos. Se llama una sola vez, cuando alguien
// arranca la simulación; de ahí en adelante todo vive en sessionStorage.
export function buildSimulationData(hoy: Date = new Date()): SimulationData {
  const products = buildProducts(hoy);
  return {
    products,
    sales: buildSales(hoy, products),
    orders: buildOrders(hoy, products),
    expenses: buildExpenses(hoy),
    dailyCloses: buildDailyCloses(hoy),
    fiadoPayments: buildFiadoPayments(hoy),
  };
}

// Un abono de ejemplo para que el cuaderno de fiados muestre un saldo que ya
// bajó. Es a la misma clienta que fió en sim-v-04.
function buildFiadoPayments(hoy: Date): FiadoPayment[] {
  return [
    {
      id: "sim-a-01",
      client_name: "Doña Rosa (tienda de la esquina)",
      amount: 5000,
      payment_method: "efectivo",
      paid_at: at(hoy, 0, 18, 10),
    },
  ];
}
