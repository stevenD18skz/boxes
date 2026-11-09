import { HelpCircle } from "lucide-react";
import { Section, SimpleTable } from "../ManualPrimitives";

export default function ProblemasChapter({ numero }: { numero: number }) {
  return (
    <Section
      id="problemas"
      icon={HelpCircle}
      numero={numero}
      titulo="Problemas comunes"
      proposito="Qué significa cada aviso que puede aparecer, y qué hacer."
    >
      <SimpleTable
        head={["Aviso", "Qué significa / qué hacer"]}
        rows={[
          [
            '"Ya existe un cierre para esa fecha"',
            "Ese día ya se cerró. En Ventas → Cerrar el día lo ves y lo puedes corregir.",
          ],
          [
            '"Agrega al menos un producto"',
            "Se intentó registrar una venta o un pedido sin ninguna línea agregada.",
          ],
          [
            '"El monto recibido debe cubrir el total"',
            "En una venta en efectivo, el monto recibido es menor que el total a cobrar.",
          ],
          [
            '"Sin stock disponible para agregar" / "Sin más stock disponible"',
            "Se intentó vender más unidades de las que hay en inventario para ese producto.",
          ],
          [
            '"El nombre es obligatorio"',
            "Faltan datos obligatorios al guardar un producto. El SKU no es uno de ellos: se puede dejar vacío.",
          ],
          [
            '"Ya tienes otro producto con ese SKU"',
            "Ese código interno ya está en uso en tu tienda. Cámbialo o déjalo vacío. Los SKU de otras tiendas no cuentan: cada tienda lleva los suyos.",
          ],
          [
            'Fila con error al importar ("Falta el nombre", "Precio inválido", etc.)',
            "Esa fila del CSV no se va a importar. Se corrige en el archivo y se vuelve a intentar; el resto de filas válidas no se pierden.",
          ],
          [
            '"Permite las ventanas emergentes para..."',
            "El navegador bloqueó la ventana de impresión o del PDF. Hay que permitir las ventanas emergentes para este sitio e intentar de nuevo.",
          ],
          [
            "Un botón de Deshacer aparece un momento y luego desaparece",
            "Es normal: después de borrar algo hay unos segundos para deshacerlo antes de que quede confirmado.",
          ],
        ]}
      />
    </Section>
  );
}
