"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  createProduct,
  updateProduct,
  deleteProduct,
} from "@/services/products.service";
import { uid } from "@/utils/id";
import { downloadCSV, parseCSV } from "@/utils/csv";
import { openPrintWindow } from "@/utils/print";
import { useToasts } from "@/hooks/useToasts";
import { useProductFilters } from "@/hooks/useProductFilters";
import { useProductsCatalog } from "@/hooks/useProductsCatalog";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { useIsMobileDevice } from "@/hooks/useIsMobileDevice";
import { usePhoneScannerLink } from "@/hooks/usePhoneScanner";
import { useSettings } from "@/hooks/useSettings";
import { lookupBarcode } from "@/services/barcode.service";

import CameraScannerModal from "@/components/ui/CameraScannerModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import ImageViewer from "@/components/ui/ImageViewer";
import Pagination from "@/components/ui/Pagination";
import PhoneScannerFab from "@/components/ui/PhoneScannerFab";
import ToastStack from "@/components/ui/ToastStack";
import BarcodeScanModal from "@/components/products/BarcodeScanModal";
import ImportModal from "@/components/products/ImportModal";
import ProductForm from "@/components/products/ProductForm";
import ProductsCardList from "@/components/products/ProductsCardList";
import ProductsCatalogEmpty from "@/components/products/ProductsCatalogEmpty";
import ProductsEmptyState from "@/components/products/ProductsEmptyState";
import ProductsFilters from "@/components/products/ProductsFilters";
import ProductsHeader from "@/components/products/ProductsHeader";
import ProductsSkeleton from "@/components/products/ProductsSkeleton";
import ProductsTable from "@/components/products/ProductsTable";
import ProductsToolbar from "@/components/products/ProductsToolbar";
import SelectionBar from "@/components/products/SelectionBar";
import {
  CSV_TEMPLATE_ROWS,
  buildProductsCSV,
  buildProductsPrintHTML,
  nextAvailableSku,
  validateImportRow,
} from "@/components/products/productsUtils";

/*
  Products CRUD Page
  - Layout/estilo portado del prototipo de Claude Design (tarjetas blancas,
    fila de acciones arriba, columna de Margen, foto de producto, stepper de
    stock siempre visible, importar CSV real, checkboxes cuadrados).
  - Se conserva el panel de filtros propio (expandible, no drawer) y la barra
    de paginación propia ("Mostrando X-Y de Z / Anterior / pág. / Siguiente")
    a pedido explícito — el resto sigue el diseño nuevo.
  - Deep-link desde el inicio: /products?new=1 abre el formulario,
    /products?stockOp=lt&stockVal=11 abre ya filtrado por stock bajo
  - Esta página coordina el estado y habla con el servicio; el dibujo vive en
    components/products y el filtrado en useProductFilters.
*/

// La API ya devuelve el motivo real en español ("Ya tienes otro producto con
// ese SKU", "El precio no puede ser negativo"...) y apiFetch lo pone en
// err.message. Mostrar un genérico en su lugar obligaba a abrir la consola
// para saber qué corregir.
const errorText = (err, fallback) => {
  const message = err instanceof Error ? err.message.trim() : "";
  return message ? `${fallback}: ${message}` : fallback;
};

// Trae el generador de QR: se baja al emparejar, no en el primer cargue.
const PhoneScannerModal = dynamic(
  () => import("@/components/ui/PhoneScannerModal"),
  { ssr: false },
);

// EAN-8, UPC-A, EAN-13 y los ITF-14 de las cajas del proveedor. Mismo patrón
// que usa BarcodeScanModal.
const BARCODE_RE = /^\d{8,14}$/;

// Si le dan varias veces seguidas a +/- del stock, se espera este tiempo sin
// más clics antes de mandar la petición: mismo principio que un buscador que
// espera a que se deje de teclear.
const STOCK_COMMIT_DELAY_MS = 500;

export default function ProductsPage() {
  const router = useRouter();

  // Productos, categorías y marcas viven en caché de SWR (ver
  // useProductsCatalog): entrar y salir de esta página ya no vuelve a pedirle
  // nada a Supabase, solo la primera vez de la sesión o cuando algo lo pide a
  // propósito (refresh / refreshTaxonomies).
  //
  // El catálogo de categorías y marcas se pide aparte porque son tablas
  // propias: hay que poder elegir una que exista aunque hoy no tenga ningún
  // producto adentro. Deducirlas de la lista de productos, como se hacía antes,
  // dejaba fuera justamente esas.
  const {
    products,
    categories,
    brands,
    loading,
    refreshing,
    productsError,
    lastUpdated,
    setProducts,
    refresh,
    refreshTaxonomies,
    renameCategory,
    renameBrand,
  } = useProductsCatalog();

  const filters = useProductFilters(products);
  const { pageItems, filtered } = filters;

  const [selected, setSelected] = useState(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);

  // formulario / diálogo de confirmación
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  // registro por código de barras: el modal de escaneo y lo que ese escaneo
  // dejó listo para el formulario (null cuando se abre el formulario vacío)
  const [scanOpen, setScanOpen] = useState(false);
  const [prefill, setPrefill] = useState(null);

  // En celular/tablet "Escanear código" abre la cámara de una: nadie que trae
  // el teléfono para escanear quiere primero ver un formulario con un campo
  // de texto y un botón. En el computador del mostrador sigue abriendo el
  // modal de siempre, que además sirve para teclear el código a mano.
  const isMobileDevice = useIsMobileDevice();
  const [cameraOpen, setCameraOpen] = useState(false);
  const openScan = () => (isMobileDevice ? setCameraOpen(true) : setScanOpen(true));

  // foto abierta a pantalla completa desde la tabla o las tarjetas (los dos
  // modales abren la suya por su cuenta, para que quede encima de ellos)
  const [zoomed, setZoomed] = useState(null);

  // el celular emparejado como lector de esta pantalla
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);

  // importación
  const [importOpen, setImportOpen] = useState(false);
  const [importStep, setImportStep] = useState(1);
  const [importParsed, setImportParsed] = useState({ valid: [], errors: [] });
  const [importSaving, setImportSaving] = useState(false);

  const { toasts, push, dismiss } = useToasts({ duration: 5000 });

  // El fetch en sí vive en useProductsCatalog (SWR); acá solo se avisa si
  // falló, igual que antes con el catch de fetchProducts.
  useEffect(() => {
    if (!productsError) return;
    console.error(productsError);
    push(errorText(productsError, "No se pudo cargar productos"), "error");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productsError]);

  // Deep-link desde el inicio: abrir filtro de stock bajo o el formulario de creación
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qOp = params.get("stockOp");
    const qVal = params.get("stockVal");
    const qNew = params.get("new");
    if (qOp && qVal) {
      filters.setStockOp(qOp);
      filters.setStockVal(qVal);
      setFiltersOpen(true);
    }
    if (qNew) {
      setEditing(null);
      setShowForm(true);
    }
    if (qOp || qVal || qNew) {
      router.replace("/products");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // cerrar modales con Escape, del más superficial al más profundo
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (confirm) setConfirm(null);
      else if (importOpen) setImportOpen(false);
      else if (scanOpen) setScanOpen(false);
      else if (showForm) closeForm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirm, showForm, importOpen, scanOpen]);

  /* --- selección --- */

  const toggleSelect = (id) =>
    setSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const clearSelection = () => setSelected(new Set());
  const allPageSelected =
    pageItems.length > 0 && pageItems.every((p) => selected.has(p.id));
  const somePageSelected =
    pageItems.some((p) => selected.has(p.id)) && !allPageSelected;
  const toggleSelectAllPage = () => {
    if (allPageSelected) return clearSelection();
    setSelected((s) => {
      const next = new Set(s);
      pageItems.forEach((p) => next.add(p.id));
      return next;
    });
  };

  /* --- stock rápido (optimista, con debounce por producto) --- */

  // id -> { timeoutId, baseline }. "baseline" es el stock que había antes de
  // que arrancara esta tanda de clics: si la petición falla, es a donde hay
  // que devolver la fila (no al valor del clic anterior, que ya no existió
  // para la API).
  const stockTimers = useRef(new Map());

  useEffect(() => {
    const timers = stockTimers.current;
    return () => timers.forEach(({ timeoutId }) => clearTimeout(timeoutId));
  }, []);

  const quickUpdateStock = (id, newStock) => {
    // La UI se siente inmediata: el número cambia en el acto en cada clic.
    setProducts((ps) =>
      ps.map((p) => (p.id === id ? { ...p, stock: newStock } : p)),
    );

    const pending = stockTimers.current.get(id);
    if (pending) clearTimeout(pending.timeoutId);
    const baseline =
      pending?.baseline ?? products.find((p) => p.id === id)?.stock ?? newStock;

    // La llamada a la API se reprograma en cada clic: solo se dispara la
    // última, después de que pase STOCK_COMMIT_DELAY_MS sin que vuelvan a
    // tocar +/-. Diez clics en tres segundos terminan en una sola petición.
    const timeoutId = setTimeout(async () => {
      stockTimers.current.delete(id);
      if (newStock === baseline) return; // fueron y volvieron, nada que guardar
      try {
        await updateProduct(id, { stock: newStock });
      } catch (err) {
        console.error(err);
        setProducts((ps) =>
          ps.map((p) => (p.id === id ? { ...p, stock: baseline } : p)),
        );
        push(errorText(err, "Error actualizando stock"), "error");
      }
    }, STOCK_COMMIT_DELAY_MS);

    stockTimers.current.set(id, { timeoutId, baseline });
  };

  /* --- exportar --- */

  const exportCSV = () => {
    downloadCSV(
      `productos_${new Date().toISOString().slice(0, 10)}.csv`,
      buildProductsCSV(filtered),
    );
    push(`CSV con ${filtered.length} productos descargado`, "success");
  };

  const exportPDF = () => {
    if (!openPrintWindow(buildProductsPrintHTML(filtered))) {
      push("Permite las ventanas emergentes para exportar el PDF", "error");
      return;
    }
    push("Preparando PDF...", "info");
  };

  const downloadTemplate = () =>
    downloadCSV("plantilla_productos.csv", CSV_TEMPLATE_ROWS);

  /* --- CRUD, optimista y esperando la respuesta para dar feedback real --- */

  const handleSave = async (payload) => {
    if (payload.id) {
      const prev = products.slice();
      setProducts((ps) =>
        ps.map((p) => (p.id === payload.id ? { ...p, ...payload } : p)),
      );
      try {
        // La respuesta manda sobre lo que se pintó de una: si la categoría era
        // nueva, ahí viene con su id, y si ya existía escrita distinta, viene
        // con la ortografía que estaba guardada.
        const saved = await updateProduct(payload.id, payload);
        setProducts((ps) =>
          ps.map((p) => (p.id === payload.id ? { ...p, ...saved } : p)),
        );
        push("Producto actualizado", "success");
        refreshTaxonomies();
      } catch (err) {
        console.error(err);
        setProducts(prev);
        push(errorText(err, "Error actualizando producto"), "error");
        throw err;
      }
    } else {
      // El id local es provisional: sirve para pintar la fila mientras el
      // servidor contesta, y se reemplaza por el de verdad apenas llega. Sin
      // eso, editar un producto recién creado apuntaría a un id inventado.
      const localId = uid();
      const optimistic = {
        ...payload,
        id: localId,
        created_at: new Date().toISOString(),
      };
      setProducts((ps) => [optimistic, ...ps]);
      try {
        const saved = await createProduct(payload);
        setProducts((ps) =>
          ps.map((p) => (p.id === localId ? { ...optimistic, ...saved } : p)),
        );
        push("Producto creado", "success");
        refreshTaxonomies();
      } catch (err) {
        console.error(err);
        setProducts((ps) => ps.filter((p) => p.id !== localId));
        push(errorText(err, "Error creando producto"), "error");
        throw err;
      }
    }
  };

  // Renombrar categoría/marca desde el lápiz del select del formulario (ver
  // CreatableSelect). El error se relanza para que el select se quede abierto
  // en modo edición con el motivo debajo del campo -"Ya tienes una categoría
  // con ese nombre"-, en vez de solo un toast que ya se cerró para cuando se
  // vuelve a mirar.
  const handleRenameCategory = async (option, name) => {
    try {
      const updated = await renameCategory(option, name);
      push(`Categoría renombrada a "${updated.name}"`, "success");
      return updated;
    } catch (err) {
      console.error(err);
      push(errorText(err, "Error renombrando la categoría"), "error");
      throw err;
    }
  };

  const handleRenameBrand = async (option, name) => {
    try {
      const updated = await renameBrand(option, name);
      push(`Marca renombrada a "${updated.name}"`, "success");
      return updated;
    } catch (err) {
      console.error(err);
      push(errorText(err, "Error renombrando la marca"), "error");
      throw err;
    }
  };

  const handleDelete = async (product) => {
    const prev = products.slice();
    setProducts((ps) => ps.filter((p) => p.id !== product.id));
    push(`"${product.name}" eliminado`, "info", {
      label: "Deshacer",
      onClick: async () => {
        setProducts(prev);
        try {
          // Vuelve con otro id: la fila anterior ya no existe en la base. Se
          // reemplaza en pantalla para que editarlo después apunte al bueno.
          const restored = await createProduct(product);
          setProducts((ps) =>
            ps.map((p) => (p.id === product.id ? { ...p, ...restored } : p)),
          );
        } catch (err) {
          console.error(err);
        }
      },
    });
    try {
      await deleteProduct(product.id);
    } catch (err) {
      console.error(err);
      setProducts(prev);
      push(errorText(err, "Error eliminando producto"), "error");
    }
  };

  const handleBulkDelete = async () => {
    const toDelete = Array.from(selected);
    if (!toDelete.length) return;
    const prev = products.slice();
    setProducts((ps) => ps.filter((p) => !selected.has(p.id)));
    clearSelection();
    push(`${toDelete.length} productos eliminados`, "info");
    try {
      for (const id of toDelete) await deleteProduct(id);
    } catch (err) {
      console.error(err);
      setProducts(prev);
      push(errorText(err, "Error en eliminación masiva"), "error");
    }
  };

  /* --- formulario --- */

  const openNewForm = () => {
    setEditing(null);
    setPrefill(null);
    setShowForm(true);
  };
  const openEditForm = (product) => {
    setEditing(product);
    setShowForm(true);
  };
  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setPrefill(null);
  };

  /* --- registro por código de barras --- */

  // El catálogo propio se revisa antes de salir a preguntar afuera: dos
  // productos con el mismo código dejarían al lector de Ventas sin saber cuál
  // cobrar, y eso es peor que no registrar nada.
  const findByBarcode = (code) => {
    const target = String(code).trim();
    return products.find((p) => (p.barcode || "").trim() === target) ?? null;
  };

  // Lo mismo pero para el formulario, donde el código también se puede escribir
  // a mano y hay que dejar que un producto conserve el suyo al editarlo.
  const barcodeOwner = (code, exceptId) => {
    const target = String(code ?? "").trim();
    if (!target) return null;
    return (
      products.find(
        (p) => (p.barcode || "").trim() === target && p.id !== exceptId,
      ) ?? null
    );
  };

  // El SKU también tiene que ser único, pero solo dentro de esta tienda: el
  // catálogo cargado acá ya viene filtrado por tienda, así que buscar en él es
  // exactamente lo que valida la base. Se compara sin mayúsculas ni espacios,
  // igual que el índice de Postgres.
  const skuOwner = (sku, exceptId) => {
    const target = String(sku ?? "").trim().toLowerCase();
    if (!target) return null;
    return (
      products.find(
        (p) => (p.sku || "").trim().toLowerCase() === target && p.id !== exceptId,
      ) ?? null
    );
  };

  // El siguiente SKU libre para una categoría, calculado sobre el catálogo ya
  // cargado (mismo dato que usa skuOwner arriba, así que no hace falta otra
  // consulta a Supabase).
  const suggestSku = (categoryName, exceptId) =>
    nextAvailableSku(
      categoryName,
      products.filter((p) => p.id !== exceptId).map((p) => p.sku),
    );

  // stopPhone nace del hook del celular, más abajo, pero hace falta acá arriba:
  // se guarda en un ref para no pelear con el orden de las declaraciones.
  const stopPhoneRef = useRef(null);

  // Cuando el formulario (Nuevo/Editar producto) está abierto, ProductForm
  // deja acá su propio handleScan: un código que llega del celular se mete en
  // el campo del formulario y dispara su búsqueda, en vez de abrir un
  // formulario nuevo por encima. Null mientras el formulario está cerrado.
  const formScanHandlerRef = useRef(null);

  // Con un formulario abierto ya no hay nada que escanear: lo que sigue es
  // revisar la ficha en el computador. Se le dice al celular que apague la
  // cámara -queda emparejado, solo en pausa, con su botón para volver- en vez
  // de dejarlo encendido mandando códigos que nadie va a escuchar, porque el
  // escaneo suelto se apaga mientras haya un modal abierto.
  const restPhone = () => stopPhoneRef.current?.("done");

  // Lo que trajo la consulta pasa al formulario como propuesta, no como hecho:
  // queda marcado en pantalla y quien registra lo confirma antes de guardar.
  const openScannedForm = (found) => {
    const values = {};
    for (const [key, value] of Object.entries({
      barcode: found.barcode,
      name: found.name,
      brand: found.brand,
      category: found.category,
      description: found.description,
      photo: found.photo,
    })) {
      if (value) values[key] = value;
    }
    restPhone();
    setScanOpen(false);
    setEditing(null);
    setPrefill({ values, source: found.source });
    setShowForm(true);
  };

  // Sin ficha pública, pero el código escaneado sirve igual: se arrastra al
  // formulario para no tener que volver a pasar el lector.
  const openManualForm = (barcode) => {
    restPhone();
    setScanOpen(false);
    setEditing(null);
    setPrefill(barcode ? { values: { barcode }, source: null } : null);
    setShowForm(true);
  };

  const openExistingFromScan = (product) => {
    restPhone();
    setScanOpen(false);
    setPrefill(null);
    setEditing(product);
    setShowForm(true);
  };

  // Escaneo "suelto": el lector se pasó sin abrir antes el modal de escaneo,
  // por ejemplo mirando el catálogo. Si el código ya es de un producto propio,
  // se busca como si se hubiera escrito y dado Enter en la barra —acá no hace
  // falta Enter de verdad porque el filtro ya es instantáneo—. Si no es de
  // nadie, se sigue el mismo camino que "Registrar por código de barras": se
  // consulta afuera y se llega directo al formulario con lo que haya traído.
  const handleGlobalScan = async (raw) => {
    const clean = String(raw ?? "").trim();
    if (!clean) return;

    const existing = findByBarcode(clean);
    if (existing) {
      filters.setQuery(clean);
      return;
    }

    if (!BARCODE_RE.test(clean)) {
      push(`"${clean}" no tiene forma de código de barras`, "error");
      openManualForm(clean);
      return;
    }

    push(`Buscando ${clean}…`, "info");
    try {
      const found = await lookupBarcode(clean);
      if (found) {
        openScannedForm(found);
      } else {
        push("No está en los catálogos públicos, complétalo a mano", "info");
        openManualForm(clean);
      }
    } catch (err) {
      console.error(err);
      push(errorText(err, "No se pudo consultar el código"), "error");
      openManualForm(clean);
    }
  };

  // Apagado mientras cualquier modal está abierto: el de escaneo y el
  // formulario ya tienen su propio lector de teclado (o su propio campo de
  // código), y dejar este prendido a la vez procesaría el mismo escaneo dos
  // veces.
  const noModalOpen =
    !scanOpen && !cameraOpen && !showForm && !importOpen && !confirm && !zoomed;

  useBarcodeScanner({ onScan: handleGlobalScan, enabled: noModalOpen });

  // El celular emparejado entra por el mismo handleGlobalScan que el lector de
  // teclado, así que hereda todo su comportamiento: si el código ya es de un
  // producto tuyo filtra la tabla y ahí se queda -puedes seguir pasando varios
  // para mirar existencias-, y si no lo es, consulta la ficha y abre el
  // formulario, momento en el que restPhone() manda a descansar la cámara.
  //
  // Con el formulario abierto el código no pasa por handleGlobalScan -eso
  // abriría un formulario nuevo encima del que ya está abierto-, sino que se
  // le entrega al propio ProductForm por formScanHandlerRef, igual que ya
  // hace con el lector de teclado: se mete en su campo de código y dispara su
  // búsqueda.
  //
  // Apagado mientras haya OTRO modal abierto (escaneo, importar...), por el
  // mismo motivo que el lector de teclado: cada uno trae su propio puente y
  // dos escuchando el mismo canal procesarían el código dos veces. El
  // formulario es la excepción: se queda encendido para poder escanear
  // directo sobre él sin perder el emparejamiento.
  // Ahorro de batería de Configuración: null es "nunca desconectar".
  const { settings } = useSettings();
  const idleSeconds = settings.phoneScannerAutoDisconnect
    ? settings.phoneScannerIdleSeconds
    : null;

  const phoneScanner = usePhoneScannerLink({
    onScan: (code) => {
      if (showForm) {
        formScanHandlerRef.current?.(code);
        restPhone();
        return;
      }
      handleGlobalScan(code);
    },
    pairing: phoneModalOpen,
    active: noModalOpen || phoneModalOpen || showForm,
    idleTimeoutMs: idleSeconds == null ? null : idleSeconds * 1000,
    onIdle: () => {
      setPhoneModalOpen(false);
      push("Se pausó el escaneo con el celular por inactividad", "info");
    },
  });
  stopPhoneRef.current = phoneScanner.stopPhone;

  /* --- importar CSV --- */

  const handleImportFile = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCSV(String(reader.result || ""));
      if (!rows.length) {
        push("El archivo está vacío", "error");
        return;
      }
      const headers = rows[0].map((h) => h.trim().toLowerCase());
      const valid = [];
      const errors = [];
      rows.slice(1).forEach((r, idx) => {
        const obj = {};
        headers.forEach((h, i) => (obj[h] = (r[i] ?? "").trim()));
        const reason = validateImportRow(obj);
        if (reason) {
          // +2 porque la fila 1 es el encabezado y quien corrige el archivo
          // cuenta desde 1, no desde 0.
          errors.push({ row: idx + 2, reason });
        } else {
          valid.push({
            name: obj.name,
            sku: obj.sku,
            barcode: obj.barcode || "",
            // Por nombre y sin id: la API la busca y, si no está, la crea.
            // Importar 200 filas puede traer categorías y marcas nuevas.
            category: obj.category || "",
            brand: obj.brand || "",
            cost_price: Number(obj.cost_price),
            price: Number(obj.price),
            stock: Number(obj.stock),
            description: obj.description || "",
            // Llega como URL, no como archivo: no hay nada que subir. Es lo que
            // permite migrar el catálogo a otra cuenta sin perder las fotos.
            photo: obj.photo || "",
          });
        }
      });
      setImportParsed({ valid, errors });
      setImportStep(2);
    };
    reader.readAsText(file);
  };

  const confirmImport = async () => {
    setImportSaving(true);
    const created = [];
    for (const row of importParsed.valid) {
      try {
        // Se guarda lo que devuelve el servidor y no lo que se mandó: trae el
        // id real y la categoría y la marca ya resueltas (creadas si hacía
        // falta), que es lo que la tabla tiene que pintar.
        created.push(await createProduct(row));
      } catch (err) {
        console.error(err);
      }
    }
    setProducts((ps) => [...created, ...ps]);
    setImportSaving(false);
    setImportStep(3);
    refreshTaxonomies();
  };

  // Catálogo vacío de verdad: la tienda no tiene ni un producto. Se mira
  // products y no filtered, porque filtered también queda en cero cuando lo que
  // pasa es que la búsqueda no encontró nada, y ese es el otro caso.
  const catalogEmpty = !loading && products.length === 0;

  const closeImport = () => {
    setImportOpen(false);
    setImportStep(1);
    setImportParsed({ valid: [], errors: [] });
  };

  return (
    <>
      <div className="mx-auto min-h-screen">
        <ProductsHeader
          loading={refreshing}
          canExport={filtered.length > 0}
          lastUpdated={lastUpdated}
          onRefresh={refresh}
          onImport={() => setImportOpen(true)}
          onExportCSV={exportCSV}
          onExportPDF={exportPDF}
          onScan={openScan}
          onNew={openNewForm}
        />

        {/* Buscar y filtrar sobre un catálogo vacío no puede dar otro
            resultado que el que ya se está viendo, así que la barra se va y
            deja la pantalla enfocada en cargar el primer producto. */}
        {!catalogEmpty && (
          <>
            <ProductsToolbar
              query={filters.query}
              onQueryChange={filters.setQuery}
              filtersOpen={filtersOpen}
              onToggleFilters={() => setFiltersOpen((s) => !s)}
              activeFilterCount={filters.activeFilterCount}
              filterChips={filters.filterChips}
              onClearAll={filters.clearAllFilters}
            />

            <ProductsFilters
              open={filtersOpen}
              onClose={() => setFiltersOpen(false)}
              categories={filters.categories}
              categoryFilter={filters.categoryFilter}
              onCategoryFilterChange={filters.setCategoryFilter}
              brands={filters.brands}
              brandFilter={filters.brandFilter}
              onBrandFilterChange={filters.setBrandFilter}
              minPrice={filters.minPrice}
              onMinPriceChange={filters.setMinPrice}
              maxPrice={filters.maxPrice}
              onMaxPriceChange={filters.setMaxPrice}
              minCost={filters.minCost}
              onMinCostChange={filters.setMinCost}
              maxCost={filters.maxCost}
              onMaxCostChange={filters.setMaxCost}
              stockOp={filters.stockOp}
              onStockOpChange={filters.setStockOp}
              stockVal={filters.stockVal}
              onStockValChange={filters.setStockVal}
              onClearAll={filters.clearAllFilters}
            />
          </>
        )}

        <SelectionBar
          count={selected.size}
          onClear={clearSelection}
          onDelete={() => setConfirm({ type: "bulk-delete" })}
        />

        {!loading && pageItems.length > 0 && (
          <>
            <ProductsTable
              items={pageItems}
              perPage={filters.perPage}
              selected={selected}
              allPageSelected={allPageSelected}
              somePageSelected={somePageSelected}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAllPage}
              sortBy={filters.sortBy}
              sortDir={filters.sortDir}
              onSort={filters.toggleSort}
              onStockCommit={quickUpdateStock}
              onEdit={openEditForm}
              onDelete={(p) => setConfirm({ type: "delete", payload: p })}
              onZoomPhoto={setZoomed}
            />
            <ProductsCardList
              items={pageItems}
              selected={selected}
              onToggleSelect={toggleSelect}
              onStockCommit={quickUpdateStock}
              onEdit={openEditForm}
              onDelete={(p) => setConfirm({ type: "delete", payload: p })}
              onZoomPhoto={setZoomed}
            />
          </>
        )}

        {loading && <ProductsSkeleton />}

        {/* Los dos vacíos son excluyentes y tienen salidas distintas: si no hay
            catálogo, hay que crear el primer producto; si hay catálogo pero la
            búsqueda no dejó nada, hay que limpiar filtros. */}
        {catalogEmpty && (
          <ProductsCatalogEmpty
            onNew={openNewForm}
            onScan={openScan}
            onImport={() => setImportOpen(true)}
            onDownloadTemplate={downloadTemplate}
          />
        )}

        {!loading && products.length > 0 && filtered.length === 0 && (
          <ProductsEmptyState
            hasActiveSearch={filters.hasActiveSearch}
            onClearFilters={filters.clearAllFilters}
          />
        )}

        {!loading && filtered.length > 0 && (
          <Pagination
            page={filters.page}
            totalPages={filters.totalPages}
            perPage={filters.perPage}
            total={filtered.length}
            onPageChange={filters.setPage}
          />
        )}
      </div>

      {scanOpen && (
        <BarcodeScanModal
          findByBarcode={findByBarcode}
          onClose={() => setScanOpen(false)}
          onUse={openScannedForm}
          onManual={openManualForm}
          onEditExisting={openExistingFromScan}
          onNotice={push}
        />
      )}

      {/* Cámara directa (celular): el mismo camino que un escaneo suelto
          —handleGlobalScan ya revisa duplicados, valida el código y consulta
          el catálogo público— así que al cerrarse la cámara, lo que sigue es
          directo el formulario con lo que haya traído la consulta. */}
      {cameraOpen && (
        <CameraScannerModal
          title="Escanear producto"
          onScan={handleGlobalScan}
          onClose={() => setCameraOpen(false)}
        />
      )}

      {showForm && (
        <ProductForm
          initial={editing}
          prefill={prefill}
          barcodeOwner={barcodeOwner}
          skuOwner={skuOwner}
          suggestSku={suggestSku}
          categories={categories}
          brands={brands}
          onRenameCategory={handleRenameCategory}
          onRenameBrand={handleRenameBrand}
          phoneScanRef={formScanHandlerRef}
          onClose={closeForm}
          onSave={async (p) => {
            await handleSave(p);
            closeForm();
          }}
        />
      )}

      {confirm && (
        <ConfirmDialog
          onClose={() => setConfirm(null)}
          onConfirm={() => {
            if (confirm.type === "delete") handleDelete(confirm.payload);
            else handleBulkDelete();
            setConfirm(null);
          }}
          title={
            confirm.type === "delete"
              ? "Eliminar producto"
              : "Eliminar productos seleccionados"
          }
          description={
            confirm.type === "delete"
              ? `¿Eliminar ${confirm.payload.name}? Esta acción no se puede deshacer.`
              : `¿Eliminar ${selected.size} productos? Esta acción no se puede deshacer.`
          }
        />
      )}

      {importOpen && (
        <ImportModal
          step={importStep}
          parsed={importParsed}
          saving={importSaving}
          onClose={closeImport}
          onFile={handleImportFile}
          onDownloadTemplate={downloadTemplate}
          onConfirm={confirmImport}
          onFinish={() => {
            closeImport();
            push(`${importParsed.valid.length} productos importados`, "success");
          }}
        />
      )}

      {zoomed?.photo && (
        <ImageViewer
          src={zoomed.photo}
          title={zoomed.name}
          onClose={() => setZoomed(null)}
        />
      )}

      {/* A nivel de página y no dentro del modal de escaneo: emparejado una
          vez, se puede escanear desde el catálogo sin abrir nada, igual que
          con un lector de mano. */}
      {phoneModalOpen && (
        <PhoneScannerModal
          pairingId={phoneScanner.pairingId}
          status={phoneScanner.status}
          phoneConnected={phoneScanner.phoneConnected}
          onReset={phoneScanner.reset}
          onClose={() => setPhoneModalOpen(false)}
          onConnected={() => push("Celular vinculado correctamente", "success")}
          idleSeconds={idleSeconds}
        />
      )}

      {/* Botón flotante y no en la cabecera: es un atajo de emparejar, no una
          acción del catálogo. En celular no tiene sentido -el aparato ya está
          en la mano de quien escanea, no hay a quién vincular-. */}
      {phoneScanner.available && !isMobileDevice && (
        <PhoneScannerFab
          phoneConnected={phoneScanner.phoneConnected}
          onClick={() => setPhoneModalOpen(true)}
        />
      )}

      <ToastStack toasts={toasts} onDismiss={dismiss} accent="blue" />
    </>
  );
}
