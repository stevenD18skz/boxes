// Cierre diario: el formato en que el Excel de contabilidad registraba el negocio.
// Cada fila de Hoja1 era un día completo, sin detalle de transacciones.
// Se conserva como modo de captura junto al registro venta por venta.

export type DailyCloseSource = "excel" | "app";

export interface DailyClose {
  id: string;
  /** Fecha del cierre en formato YYYY-MM-DD. */
  date: string;
  /** Columna VENTA del Excel: total vendido en el día. */
  sales_total: number;
  /** Columna GANANCIA del Excel: venta x 19%. */
  gain: number;
  /** Columna GASTO del Excel. */
  expenses_total: number;
  /** Columna COMPRA del Excel: mercancía comprada a proveedores ese día. */
  purchases_total: number;
  /** Columna DENTRADA: dinero que entró a la caja por fuera de las ventas. */
  cash_in: number | null;
  /** Columna SALIDA: dinero que salió de la caja. */
  cash_out: number | null;
  /** Plata contada en el cajón al cerrar. null = no se contó. */
  cash_counted?: number | null;
  /** "excel" = importado del archivo de 2025; "app" = cerrado desde la aplicación. */
  source: DailyCloseSource;
}

// Datos que arma el formulario de cierre diario antes de guardar.
export type NewDailyClose = Omit<DailyClose, "id" | "source"> &
  Partial<Pick<DailyClose, "id" | "source">>;
export type DailyCloseUpdate = Partial<Omit<DailyClose, "id">>;
