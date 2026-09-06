import { Box } from "lucide-react";
import { FieldTable, Section, Steps, Topic } from "../ManualPrimitives";

export default function ProductosChapter({ numero }: { numero: number }) {
  return (
    <Section
      id="productos"
      icon={Box}
      numero={numero}
      titulo="Productos"
      proposito="Mantener el catálogo al día: qué se vende, a cuánto y cuánto queda."
    >
      <Topic titulo="Crear o editar un producto">
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Botón <span className="font-medium">Nuevo producto</span> arriba a la
          derecha, o el lápiz sobre una fila para editar uno que ya existe.
        </p>
        <FieldTable
          rows={[
            { campo: "Nombre", obligatorio: true },
            {
              campo: "SKU",
              obligatorio: false,
              notas:
                "Tu código interno. Útil para lo que no trae código de barras. No se puede repetir dentro de la misma tienda.",
            },
            { campo: "Código de barras", obligatorio: false },
            {
              campo: "Categoría",
              obligatorio: false,
              notas:
                "Se elige de la lista. Si se escribe una que no está, aparece arriba el botón «Crear» y la categoría nueva nace al guardar el producto.",
            },
            {
              campo: "Marca",
              obligatorio: false,
              notas:
                "Funciona igual que la categoría. Se deja vacía en lo que se vende sin marca: granel, reempaque, hecho en casa.",
            },
            {
              campo: "Costo",
              obligatorio: true,
              notas:
                "Si se escribe a mano, deja de estar marcado como estimado.",
            },
            { campo: "Precio de venta", obligatorio: true },
            { campo: "Stock inicial", obligatorio: true },
            { campo: "Foto", obligatorio: false },
            { campo: "Descripción", obligatorio: false },
          ]}
        />
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Mientras se escribe el costo y el precio, el formulario muestra la
          ganancia por unidad y el margen sobre el precio de venta.
        </p>
      </Topic>

      <Topic titulo="Costo estimado">
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Los productos importados del Excel sin factura tienen el costo
          calculado como precio × 0,81 (el margen del 19% que usaba esa
          contabilidad). Se muestran con <span className="font-mono">~</span> y
          en gris. Para confirmarlo, se edita el producto y se escribe el costo
          real: la marca de estimado se quita sola.
        </p>
      </Topic>

      <Topic titulo="Inventario y stock">
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Cada fila tiene un control de stock con +/− o edición directa del
          número; el cambio se guarda solo. Un producto con 10 unidades o menos
          se marca <span className="font-medium text-amber-700">Stock bajo</span>
          ; con 0, se marca{" "}
          <span className="font-medium text-red-600">Agotado</span>.
        </p>
      </Topic>

      <Topic titulo="Buscar, filtrar y ordenar">
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          El buscador de arriba mira nombre, SKU, código de barras, categoría,
          marca y descripción. El botón{" "}
          <span className="font-medium">Filtros</span> abre un panel para acotar
          por rango de precio, por stock (cualquiera, menor que, mayor que o
          igual a un valor), por categoría y por marca. En esas dos listas hay
          también <span className="font-medium">Sin categoría</span> y{" "}
          <span className="font-medium">Sin marca</span>, para encontrar rápido
          lo que falta clasificar. Haciendo clic en el encabezado de una columna
          se ordena la tabla por ese campo.
        </p>
      </Topic>

      <Topic titulo="Cargar varios productos a la vez (importar)">
        <Steps
          items={[
            <>
              Botón <span className="font-medium">Importar</span>. Si hace falta
              un punto de partida, se puede descargar la plantilla de ejemplo
              desde el mismo cuadro.
            </>,
            "Arrastrar o elegir el archivo CSV. El sistema revisa cada fila y avisa cuáles están listas y cuáles tienen errores (nombre, precio, costo o stock inválidos).",
            "Confirmar: las filas con errores no se importan; se pueden corregir en el archivo y volver a intentar.",
          ]}
        />
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Las columnas <span className="font-mono">category</span> y{" "}
          <span className="font-mono">brand</span> se escriben con el nombre. Las
          que no existan todavía se crean solas al importar. La columna{" "}
          <span className="font-mono">photo</span> es opcional y lleva la
          dirección de la imagen (la misma que trae el CSV exportado), no el
          archivo: así se puede pasar el catálogo con sus fotos a otra cuenta.
        </p>
      </Topic>

      <Topic titulo="Eliminar, exportar e imprimir">
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Borrar un producto pide confirmación y da unos segundos para deshacerlo
          con el botón que aparece en el aviso. Con las casillas de la izquierda
          se pueden seleccionar varios y borrarlos juntos. Los botones{" "}
          <span className="font-medium">Exportar</span> e{" "}
          <span className="font-medium">Imprimir</span> trabajan sobre lo que
          esté filtrado en pantalla en ese momento.
        </p>
      </Topic>
    </Section>
  );
}
