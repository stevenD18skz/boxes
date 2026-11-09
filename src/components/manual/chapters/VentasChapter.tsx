import { ShoppingCart } from "lucide-react";
import {
  Callout,
  Section,
  SimpleTable,
  Steps,
  Topic,
} from "../ManualPrimitives";

export default function VentasChapter({ numero }: { numero: number }) {
  return (
    <Section
      id="ventas"
      icon={ShoppingCart}
      numero={numero}
      titulo="Ventas"
      proposito="Registrar lo que se vende, venta por venta o el total del día."
    >
      <Callout tone="info" title="Todo lo de vender, en un mismo lugar">
        Arriba hay tres opciones: <span className="font-medium">Vender</span>{" "}
        (cobrar a cada cliente), <span className="font-medium">Cerrar el día</span>{" "}
        (contar la plata del cajón al final) y{" "}
        <span className="font-medium">Ventas anteriores</span> (buscar o anular
        una venta ya hecha).
      </Callout>

      <Topic titulo="Armar una venta">
        <Steps
          items={[
            "Escribir el producto (no importan las tildes: «cafe» encuentra «Café») o pasar el código de barras, y elegirlo de las sugerencias. Si el inventario dice que no hay, igual se puede vender: la app solo avisa para que lo revises después.",
            "Ajustar la cantidad de cada línea con los +/− o escribiéndola directamente.",
            <>
              Si hace falta, poner un descuento por línea con el botón de
              descuento: por porcentaje o por un monto fijo (el monto nunca puede
              ser mayor que el valor de esa línea).
            </>,
            "Elegir la forma de pago y completar lo que pida.",
            <>
              Botón <span className="font-medium">Cobrar</span>. Se descuenta
              del inventario y aparece, en grande, el vuelto que hay que
              entregar. Si te interrumpen a mitad de una venta y te vas a otra
              pantalla, la venta te espera tal como la dejaste.
            </>,
          ]}
        />
      </Topic>

      <Topic titulo="Formas de pago">
        <SimpleTable
          head={["Forma de pago", "Qué pide", "Qué pasa"]}
          rows={[
            [
              "Efectivo",
              "Con cuánto te pagó (si pagó exacto, nada)",
              'Te propone los billetes con que te pueden pagar según el total, por ejemplo $15.000 o $20.000, y muestra en grande cuánto devolver. Si no alcanza, dice cuánto falta.',
            ],
            [
              "Tarjeta",
              "Solo confirmar",
              "Aviso para confirmar cuando el pago se acredite en el datáfono. No hay conexión real con una pasarela ni con el datáfono.",
            ],
            [
              "Transferencia",
              "Solo confirmar",
              "Aviso para confirmar cuando se vea la transferencia (Nequi, Daviplata u otra) en la cuenta.",
            ],
            [
              "Fiado",
              "A quién le fías",
              'Queda anotado en Fiados a nombre de esa persona. Si ya te debía, te dice cuánto y cómo queda.',
            ],
          ]}
        />
      </Topic>

      <Topic titulo="Anular una venta">
        <p className="mt-2 text-base leading-relaxed text-slate-700">
          En <span className="font-medium">Ventas anteriores</span>, con el botón
          de anular. La venta queda marcada como anulada en el historial, los
          productos vuelven al inventario y, si fue fiada, sale de lo que te debe
          ese cliente.
        </p>
      </Topic>

      <Topic titulo="Cerrar el día">
        <Steps
          items={[
            "La app ya sabe lo que vendiste (por efectivo, transferencia, tarjeta y fiado), lo que te pagaron de fiados y los gastos que anotaste. Te lo muestra sumado.",
            "Cuenta la plata del cajón y escríbela. Al instante te dice si la caja cuadra, si sobra o si falta, y cuánto.",
            "Toca Cerrar el día. Verás el resumen: cuánto vendiste, si fue más o menos que el día anterior y cuánto te deben.",
          ]}
        />
        <Callout tone="info" title="Si no anotas cada venta">
          Si ese día no hay ventas registradas en la app, te pide escribir el
          total que llevaste en tu cuaderno, como se hacía en el Excel.
        </Callout>
        <Callout tone="warning" title="Un solo cierre por día">
          Si el día ya está cerrado, la app te lo muestra y te deja corregirlo,
          en vez de crear otro.
        </Callout>
      </Topic>
    </Section>
  );
}
