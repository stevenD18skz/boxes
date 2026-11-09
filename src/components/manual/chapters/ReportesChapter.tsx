import { BarChart3 } from "lucide-react";
import { Callout, Section, Topic } from "../ManualPrimitives";

export default function ReportesChapter({ numero }: { numero: number }) {
  return (
    <Section
      id="reportes"
      icon={BarChart3}
      numero={numero}
      titulo="Reportes"
      proposito="Leer los números del negocio sin ser contador."
    >
      <Topic titulo="Elegir el período">
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Hoy, últimos 7 días, últimos 30 días, este mes, o un rango de fechas
          elegido a mano. Los períodos se cuentan a partir del último día que
          tiene datos cargados (hoy, hasta donde llega la contabilidad importada
          del Excel), no necesariamente desde la fecha de hoy; si es el caso, la
          pantalla lo avisa.
        </p>
      </Topic>

      <Topic titulo="Qué muestra">
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-600">
          <li>
            Cuatro indicadores del período, comparados contra el período anterior
            equivalente: cuánto se vendió, cuánto se ganó, cuánto se gastó, y el
            margen (de cada $100 vendidos, cuántos quedan de ganancia).
          </li>
          <li>
            Una gráfica de barras de ventas o ganancia por día (por semana si el
            rango pasa de 31 días); al hacer clic en una barra se ve el detalle
            de ese día o semana.
          </li>
          <li>
            <span className="font-medium">Te deben en fiados:</span> el total
            y los clientes que más deben. El detalle y los pagos están en
            Fiados.
          </li>
        </ul>
      </Topic>

      <Callout tone="info" title="Tarjetas que todavía están esperando datos">
        "Qué se vendió y cuánto ganaste", "Se te van a acabar pronto", "Plata
        quieta en la estantería" y "Cómo te pagaron" necesitan ventas
        registradas producto por producto y con método de pago; el histórico
        importado del Excel solo traía el total del día, así que esas tarjetas se
        van a ir llenando a medida que se registren ventas desde la aplicación.
      </Callout>

      <Topic titulo="Descargar o imprimir">
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          El botón <span className="font-medium">Descargar Excel</span> baja un
          archivo CSV (se abre bien en Excel, aunque no es un .xlsx) con fecha,
          venta, ganancia, gasto, compra, entrada y salida de caja del período
          elegido. El botón <span className="font-medium">Imprimir</span> abre el
          diálogo de impresión del navegador.
        </p>
      </Topic>
    </Section>
  );
}
