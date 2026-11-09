// SalePageEnhanced.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import useSWR, { mutate } from "swr";
import { useIsClient } from "@/hooks/useIsClient";
import { getProducts } from "@/services/products.service";
import { matchesText } from "@/lib/text";
import { useFiados } from "@/hooks/useFiados";
import {
  getSales,
  createSaleWithDetails,
  updateSale,
} from "@/services/sales.service";
import { openPrintWindow } from "@/utils/print";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { useCameraScannerAvailable } from "@/hooks/useCameraScanner";
import { useIsMobileDevice } from "@/hooks/useIsMobileDevice";
import { usePhoneScannerLink } from "@/hooks/usePhoneScanner";
import { useSettings } from "@/hooks/useSettings";
import { useToasts } from "@/hooks/useToasts";

import CameraScannerModal from "@/components/ui/CameraScannerModal";
import PhoneScannerFab from "@/components/ui/PhoneScannerFab";
import ToastStack from "@/components/ui/ToastStack";
import CartLines from "@/components/sales/CartLines";
import DailyCloseMode from "@/components/sales/DailyCloseMode";
import ModeSwitcher from "@/components/sales/ModeSwitcher";
import PaymentPanel from "@/components/sales/PaymentPanel";
import ProductSearchBar from "@/components/sales/ProductSearchBar";
import ReceiptModal from "@/components/sales/ReceiptModal";
import RecentSales from "@/components/sales/RecentSales";
import SalesHistoryMode from "@/components/sales/SalesHistoryMode";
import TodayTotalsCard from "@/components/sales/TodayTotalsCard";
import VoidSaleDialog from "@/components/sales/VoidSaleDialog";
import {
  buildReceiptHTML,
  lineCost,
  lineSubtotal,
  uid,
} from "@/components/sales/salesUtils";
import { currency } from "@/utils/converts";

/*
  SalePageEnhanced
  - Layout/estilo portado del prototipo de Claude Design: un único buscador
    arriba que agrega productos a un carrito (en vez de una fila por línea),
    descuentos por línea (%/$), métodos de pago (efectivo/tarjeta/
    transferencia/fiado), recibo de éxito y anulación de ventas con
    devolución real de stock.
  - Tres maneras de escanear, y ninguna estorba a la otra: lectores que
    funcionan como teclado (apps como Barcode to PC, o un lector USB físico),
    ver useBarcodeScanner; la cámara del propio aparato, ver useCameraScanner,
    que solo se ofrece donde de verdad funciona; y el celular emparejado como
    lector remoto, ver usePhoneScanner, que es el camino del computador de
    mostrador sin cámara. Mientras la cámara está abierta el lector de teclado
    se apaga, para no procesar el mismo código dos veces. El buscador de todas
    formas empareja por código de barras si se escribe o se pega a mano.
  - Esta página coordina el estado; el dibujo vive en los componentes de
    components/sales y los cálculos compartidos en salesUtils.
*/

// Solo se baja cuando alguien va a emparejar: trae el generador de QR y esa
// pantalla se abre una vez, no en cada venta.
const PhoneScannerModal = dynamic(
  () => import("@/components/ui/PhoneScannerModal"),
  { ssr: false },
);

// Mismas claves ("products", "sales") y mismas opciones que useProductsCatalog
// y useDashboardData: comparten caché con Productos e Inicio, así que llegar
// acá desde cualquiera de esos dos no vuelve a pedir nada. Sin revalidación
// automática porque el catálogo y las ventas no cambian solos, solo cuando
// esta misma pantalla u otra guarda algo (ver mutate más abajo).
const swrOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  shouldRetryOnError: false,
};

const SALE_DRAFT_KEY = "boxes-venta-en-curso";

export default function SalePageEnhanced() {
  // modo de captura: "transaccion" registra venta por venta con carrito;
  // "cierre" anota un único total al final del día, como se llevaba en el
  // Excel; "historial" sólo consulta lo ya registrado.
  const [mode, setModeState] = useState("transaccion");
  // El modo vive también en la dirección (?modo=cierre): así Inicio puede
  // abrir directo el cierre del día y recargar no te devuelve al carrito.
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("modo");
    if (fromUrl === "cierre" || fromUrl === "historial") setModeState(fromUrl);
  }, []);
  const setMode = (next) => {
    setModeState(next);
    const url = new URL(window.location.href);
    if (next === "transaccion") url.searchParams.delete("modo");
    else url.searchParams.set("modo", next);
    window.history.replaceState(null, "", url);
  };

  // data
  // keys en null hasta montar: mismo motivo que en useDashboardData, para no
  // desajustar la hidratación con lo que ya trae la caché de localStorage.
  const isClient = useIsClient();
  const {
    data: allProducts = [],
    error: productsError,
    mutate: mutateProducts,
  } = useSWR(isClient ? "products" : null, getProducts, swrOptions);
  const {
    data: sales = [],
    isLoading: salesLoading,
    error: salesError,
    mutate: mutateSales,
  } = useSWR(isClient ? "sales" : null, getSales, swrOptions);
  const loadingSales = !isClient || salesLoading;
  // Los clientes que ya tienen fiado, para sugerirlos al fiar otra vez.
  const { clients: fiadoClients } = useFiados();

  // búsqueda + carrito
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestionIndex, setSuggestionIndex] = useState(-1);
  const [lines, setLines] = useState([]);
  const [focusTarget, setFocusTarget] = useState(null);
  // Línea que se acaba de agregar o sumar: se pinta un instante en CartLines
  // y se apaga sola. Es la confirmación visual de que el escaneo sí pegó,
  // pensada para cuando se pasan varios códigos seguidos sin mirar el
  // teclado ni esperar a leer el toast.
  const [justAddedKey, setJustAddedKey] = useState(null);
  const justAddedTimeoutRef = useRef(null);
  const flashLine = (key) => {
    setJustAddedKey(key);
    if (justAddedTimeoutRef.current) clearTimeout(justAddedTimeoutRef.current);
    justAddedTimeoutRef.current = setTimeout(() => setJustAddedKey(null), 900);
  };
  useEffect(() => () => clearTimeout(justAddedTimeoutRef.current), []);
  const [cameraOpen, setCameraOpen] = useState(false);
  const cameraAvailable = useCameraScannerAvailable();
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  // El botón para vincular el celular no tiene sentido en el propio celular:
  // ahí el aparato ya es el lector, no hay a quién emparejar.
  const isMobileDevice = useIsMobileDevice();

  // descuento por línea
  const [discountEditingKey, setDiscountEditingKey] = useState(null);
  const [discountDraftType, setDiscountDraftType] = useState("pct");
  const [discountDraftValue, setDiscountDraftValue] = useState("");

  // pago
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [receivedAmount, setReceivedAmount] = useState("");
  const [clientName, setClientName] = useState("");
  const [saleErrors, setSaleErrors] = useState({});
  const [confirming, setConfirming] = useState(false);

  // recibo / anulación
  const [receiptData, setReceiptData] = useState(null);
  const [voidConfirmId, setVoidConfirmId] = useState(null);
  const [voiding, setVoiding] = useState(false);

  const { toasts, push, dismiss } = useToasts();

  const searchInputRef = useRef(null);
  const qtyRefs = useRef({});

  useEffect(() => {
    if (!productsError && !salesError) return;
    console.error("Error fetching sales/products:", productsError || salesError);
    push("No se pudieron cargar tus productos y ventas. Revisa el internet y recarga la página.", "error");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productsError, salesError]);

  useEffect(() => {
    if (!focusTarget) return;
    if (focusTarget.type === "search") {
      searchInputRef.current?.focus();
    } else if (focusTarget.type === "qty") {
      const el = qtyRefs.current[focusTarget.key];
      el?.focus();
      el?.select?.();
    }
    setFocusTarget(null);
  }, [focusTarget]);

  const suggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    // Sin tildes ni mayúsculas: "cafe" encuentra "Café".
    return allProducts
      .filter((p) => matchesText(searchQuery, p.name, p.sku, p.barcode))
      .slice(0, 5);
  }, [searchQuery, allProducts]);

  const totals = useMemo(() => {
    const total = lines.reduce((sum, l) => sum + lineSubtotal(l), 0);
    const cost = lines.reduce((sum, l) => sum + lineCost(l), 0);
    return { total, cost, gain: total - cost };
  }, [lines]);

  // Devuelve true si el producto quedó agregado (o su cantidad aumentó), y
  // false si no había stock. El llamador decide qué feedback extra dar: el
  // buscador manual no necesita nada más, pero el escáner de código sí
  // avisa cada resultado porque quien escanea no está mirando el carrito.
  //
  // focusQty controla a dónde va el foco después de agregar. Por defecto va
  // al campo de cantidad, para que el buscador manual permita editarla al
  // toque. El escaneo por código de barras pasa focusQty=false: si el foco
  // quedara en el input de cantidad (con su contenido seleccionado), el
  // siguiente escaneo del mismo producto escribiría sus dígitos ahí encima
  // -reemplazando la cantidad por el código de barras- antes de que
  // useBarcodeScanner llegue a procesar el Enter, y el valor gigante
  // resultante terminaba recortado al stock máximo. Ver useBarcodeScanner.ts.
  //
  // focus=false no mueve el foco a ninguna parte. Lo usa el escaneo con
  // cámara: el visor está encima de la pantalla, y enfocar el buscador que
  // quedó detrás levantaría el teclado del celular tapando la cámara.
  const addLineFromProduct = (
    product,
    { focusQty = true, focus = true } = {},
  ) => {
    // El inventario de una tienda nunca cuadra exacto: si el cliente tiene el
    // producto en la mano, se vende aunque el sistema diga que no hay. Solo se
    // avisa, una vez, para que se revise el inventario después.
    const stockNow = Number(product.stock ?? 0);
    let added = true;
    setLines((prev) => {
      const existingIdx = prev.findIndex(
        (l) => l.productId === product.id && !l.discountType,
      );
      if (existingIdx >= 0) {
        const existing = prev[existingIdx];
        const nextQty = existing.quantity + 1;
        if (nextQty === Math.max(0, stockNow) + 1) {
          push(
            `Según el inventario solo había ${Math.max(0, stockNow)}. Se vende igual: revisa el inventario de ${product.name} después.`,
            "info",
          );
        }
        const next = prev.slice();
        next[existingIdx] = { ...existing, quantity: nextQty };
        if (focus)
          setFocusTarget(
            focusQty ? { type: "qty", key: existing._key } : { type: "search" },
          );
        flashLine(existing._key);
        return next;
      }
      const key = uid();
      if (stockNow <= 0) {
        push(
          `El inventario dice que no hay ${product.name}. Se vende igual: revísalo después.`,
          "info",
        );
      }
      if (focus)
        setFocusTarget(focusQty ? { type: "qty", key } : { type: "search" });
      flashLine(key);
      return [
        ...prev,
        {
          _key: key,
          productId: product.id,
          name: product.name,
          sku: product.sku,
          photo: product.photo ?? null,
          unitPrice: Number(product.price ?? 0),
          cost: Number(product.cost_price ?? 0),
          quantity: 1,
          stock: Number(product.stock ?? 0),
          discountType: null,
          discountValue: 0,
        },
      ];
    });
    setSearchQuery("");
    setSuggestionIndex(-1);
    return added;
  };

  // Callback de los tres escáneres: el lector de teclado (celular con Barcode
  // to PC, o un lector USB el día de mañana), la cámara de este aparato y el
  // celular emparejado por Realtime. Los tres entregan lo mismo —el código— y
  // de aquí en adelante el camino es idéntico: busca coincidencia exacta por
  // código de barras y avisa siempre el resultado, porque quien escanea suele
  // estar mirando la mercancía, no la pantalla.
  const handleBarcodeScan = (code, { fromCamera = false } = {}) => {
    // Ley de Postel: el mismo producto puede llegar como EAN-13 (con un 0
    // adelante) o como UPC-A (sin él), según el lector. Se comparan solo los
    // dígitos y sin ceros a la izquierda.
    const digits = (v) => String(v || "").replace(/\D/g, "").replace(/^0+/, "");
    const wanted = digits(code);
    const match = wanted
      ? allProducts.find((p) => digits(p.barcode) === wanted)
      : null;
    if (!match) {
      push(`Ningún producto tiene el código ${code}`, "error");
      return;
    }
    if (addLineFromProduct(match, { focusQty: false, focus: !fromCamera })) {
      push(`${match.name} agregado por código de barras`, "success");
    }
  };

  const { scanning: barcodeScanning } = useBarcodeScanner({
    onScan: handleBarcodeScan,
    // Con la cámara abierta el lector de teclado se apaga: no hay teclado a la
    // vista y dejarlo escuchando solo abre la puerta a agregar dos veces.
    enabled:
      mode === "transaccion" && !receiptData && !voidConfirmId && !cameraOpen,
  });

  // Ahorro de batería de Configuración: null es "nunca desconectar".
  const { settings } = useSettings();
  const idleSeconds = settings.phoneScannerAutoDisconnect
    ? settings.phoneScannerIdleSeconds
    : null;

  // El celular emparejado entra por el mismo camino que el lector de teclado,
  // incluido el foco de vuelta al buscador: desde el punto de vista de esta
  // pantalla es un lector más, solo que la lectura llega por el canal en vez
  // de por el teclado.
  const phoneScanner = usePhoneScannerLink({
    onScan: handleBarcodeScan,
    pairing: phoneModalOpen,
    idleTimeoutMs: idleSeconds == null ? null : idleSeconds * 1000,
    // Pasó el rato de inactividad configurado: la cámara del teléfono ya se
    // apagó sola, así que el modal del QR se cierra para no dejar en pantalla
    // algo que ya no está funcionando, y se dice por qué.
    onIdle: () => {
      setPhoneModalOpen(false);
      push("Se pausó el escaneo con el celular por inactividad", "info");
    },
  });

  const handleSearchKeyDown = (e) => {
    // useBarcodeScanner ya resolvió este Enter (llegó a document en fase de
    // captura, antes que a este input) y canceló el evento con
    // preventDefault(). Si se sigue de largo aquí, el buscador agregaría el
    // producto otra vez por su cuenta, ahora por coincidencia difusa en vez
    // de por el código exacto.
    if (e.defaultPrevented) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSuggestionIndex((i) =>
        Math.min((i < 0 ? -1 : i) + 1, suggestions.length - 1),
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSuggestionIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (!suggestions.length) return;
      const idx = suggestionIndex >= 0 ? suggestionIndex : 0;
      addLineFromProduct(suggestions[idx]);
    } else if (e.key === "Escape") {
      setSearchQuery("");
      setSuggestionIndex(-1);
    }
  };

  const handleQueryChange = (value) => {
    setSearchQuery(value);
    setSuggestionIndex(-1);
  };

  const changeQty = (key, raw) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l._key !== key) return l;
        let v = parseInt(raw, 10);
        if (Number.isNaN(v)) v = 1;
        v = Math.max(1, v);
        return { ...l, quantity: v };
      }),
    );
  };
  const stepQty = (key, delta) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l._key !== key) return l;
        const next = Math.max(1, l.quantity + delta);
        return { ...l, quantity: next };
      }),
    );
  };
  const handleQtyKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      setFocusTarget({ type: "search" });
    }
  };
  const removeLine = (key) => {
    setLines((prev) => prev.filter((l) => l._key !== key));
    delete qtyRefs.current[key];
  };

  const cancelDiscount = () => {
    setDiscountEditingKey(null);
    setDiscountDraftValue("");
  };
  const applyDiscount = () => {
    const value = parseFloat(discountDraftValue);
    if (Number.isNaN(value) || value <= 0) {
      setDiscountEditingKey(null);
      return;
    }
    setLines((prev) =>
      prev.map((l) =>
        l._key === discountEditingKey
          ? { ...l, discountType: discountDraftType, discountValue: value }
          : l,
      ),
    );
    setDiscountEditingKey(null);
    setDiscountDraftValue("");
  };

  // El botón que abre el editor sigue comentado dentro de CartLines; el estado
  // se conserva completo para reactivarlo sin volver a armarlo.
  const discountProps = {
    editingKey: discountEditingKey,
    draftType: discountDraftType,
    onDraftTypeChange: setDiscountDraftType,
    draftValue: discountDraftValue,
    onDraftValueChange: setDiscountDraftValue,
    onCancel: cancelDiscount,
    onApply: applyDiscount,
  };

  const setPayment = (m) => {
    setPaymentMethod(m);
    setSaleErrors({});
  };
  const changeReceivedAmount = (numeric) => {
    setReceivedAmount(numeric);
    if (saleErrors.monto)
      setSaleErrors((er) => ({ ...er, monto: undefined }));
  };
  const changeClientName = (value) => {
    setClientName(value);
    if (saleErrors.cliente)
      setSaleErrors((er) => ({ ...er, cliente: undefined }));
  };
  const setExactAmount = () =>
    setReceivedAmount(String(Math.ceil(totals.total)));

  const resetSaleDraft = () => {
    setLines([]);
    setSearchQuery("");
    setReceivedAmount("");
    setClientName("");
    setPaymentMethod("efectivo");
    setSaleErrors({});
  };

  // Cancelar no pregunta "¿seguro?": deja deshacer. Es más rápido para quien
  // canceló a propósito y salva a quien lo tocó sin querer.
  const cancelSale = () => {
    const snapshot = { lines, paymentMethod, receivedAmount, clientName };
    resetSaleDraft();
    push("Venta cancelada", "info", {
      label: "Deshacer",
      onClick: () => {
        setLines(snapshot.lines);
        setPaymentMethod(snapshot.paymentMethod);
        setReceivedAmount(snapshot.receivedAmount);
        setClientName(snapshot.clientName);
      },
    });
  };

  // La venta a medias sobrevive a ir a otra pantalla o recargar: en la tienda
  // interrumpen a cada rato ("¿cuánto vale el arroz?") y perder 8 productos
  // ya escaneados es lo peor que puede pasar. Vive en sessionStorage, que es
  // de esta pestaña: al cerrarla se va.
  const draftRestored = useRef(false);
  useEffect(() => {
    if (draftRestored.current) return;
    draftRestored.current = true;
    try {
      const saved = JSON.parse(window.sessionStorage.getItem(SALE_DRAFT_KEY) || "null");
      if (saved?.lines?.length) {
        setLines(saved.lines);
        setPaymentMethod(saved.paymentMethod || "efectivo");
        setReceivedAmount(saved.receivedAmount || "");
        setClientName(saved.clientName || "");
        push(
          `Seguimos con la venta que dejaste a medias (${saved.lines.length} ${saved.lines.length === 1 ? "producto" : "productos"})`,
          "info",
        );
      }
    } catch {
      // Sin almacenamiento disponible: se empieza en blanco, como siempre.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!draftRestored.current) return;
    try {
      if (lines.length) {
        window.sessionStorage.setItem(
          SALE_DRAFT_KEY,
          JSON.stringify({ lines, paymentMethod, receivedAmount, clientName }),
        );
      } else {
        window.sessionStorage.removeItem(SALE_DRAFT_KEY);
      }
    } catch {
      // Lleno o bloqueado: la venta sigue en pantalla, solo no aguanta recargar.
    }
  }, [lines, paymentMethod, receivedAmount, clientName]);

  const confirmSale = async () => {
    if (confirming) return;
    if (!lines.length) {
      push("Agrega al menos un producto", "error");
      return;
    }
    const errors = {};
    // Vacío es "pagó exacto" (Ley de Tesler: el sistema asume lo obvio en vez
    // de obligar a escribirlo). Solo es error si lo que se escribió no alcanza.
    if (paymentMethod === "efectivo" && receivedAmount !== "") {
      const recibido = parseFloat(receivedAmount);
      if (Number.isNaN(recibido) || recibido < totals.total)
        errors.monto = `Con eso no alcanza: faltan ${currency(totals.total - (recibido || 0))}`;
    }
    if (paymentMethod === "fiado" && !clientName.trim())
      errors.cliente = "Escribe a quién le fías, para saber a quién cobrarle";
    setSaleErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const total = totals.total;
    const recibido =
      paymentMethod === "efectivo" && receivedAmount !== ""
        ? Number(receivedAmount)
        : total;
    const salePayload = {
      total_amount: Number(total),
      sale_date: new Date().toISOString(),
      gain: Number(totals.gain),
      payment_method: paymentMethod,
      client_name: paymentMethod === "fiado" ? clientName.trim() : null,
      voided: false,
    };
    const productsFormat = lines.map((l) => ({
      product_id: l.productId,
      quantity: l.quantity,
      sale_price: l.unitPrice,
      discount_type: l.discountType,
      discount_value: l.discountValue,
    }));
    const receiptItems = lines.map((l) => ({
      name: l.name,
      quantity: l.quantity,
      subtotal: lineSubtotal(l),
    }));

    setConfirming(true);
    try {
      // La venta y el descuento del inventario van juntos en una sola
      // operación (create_sale en la base, o el servicio en simulación): o
      // queda todo o no queda nada.
      await createSaleWithDetails(salePayload, productsFormat);

      // mutate() sin argumentos revalida contra la API y deja el resultado en
      // la caché compartida: Inicio y Productos ven el stock y la venta
      // nuevos sin tener que volver a pedirlos ellos mismos.
      await Promise.all([
        mutateSales(),
        mutateProducts(),
        paymentMethod === "fiado" ? mutate("fiados") : null,
      ]);

      setReceiptData({
        total,
        method: paymentMethod,
        cliente: salePayload.client_name,
        vuelto: paymentMethod === "efectivo" ? recibido - total : null,
        items: receiptItems,
      });

      resetSaleDraft();
    } catch (err) {
      console.error("Error creating sale:", err);
      push("Error registrando venta. Intenta de nuevo.", "error");
    } finally {
      setConfirming(false);
    }
  };

  const printReceipt = (data) => {
    if (!data) return;
    if (!openPrintWindow(buildReceiptHTML(data))) {
      push("Permite las ventanas emergentes para imprimir el recibo", "error");
    }
  };

  const requestVoid = (id) => setVoidConfirmId(id);
  const cancelVoidRequest = () => setVoidConfirmId(null);

  // Anular no borra la venta: la marca y devuelve al inventario lo que se
  // había descontado al registrarla.
  const confirmVoidSale = async () => {
    const sale = sales.find((s) => s.id === voidConfirmId);
    if (!sale) {
      setVoidConfirmId(null);
      return;
    }
    setVoiding(true);
    try {
      // Anular y devolver el inventario es una sola operación (void_sale en la
      // base, o el servicio en simulación).
      await updateSale(sale.id, { voided: true });
      await Promise.all([
        mutateSales(),
        mutateProducts(),
        sale.payment_method === "fiado" ? mutate("fiados") : null,
      ]);
      push("Venta anulada. Los productos volvieron al inventario.", "info");
    } catch (err) {
      console.error(err);
      push("No se pudo anular la venta. Revisa la conexión e intenta otra vez.", "error");
    } finally {
      setVoiding(false);
      setVoidConfirmId(null);
    }
  };

  const todaySales = useMemo(
    () =>
      sales.filter(
        (s) =>
          !s.voided &&
          new Date(s.sale_date).toDateString() === new Date().toDateString(),
      ),
    [sales],
  );
  const todayTotal = useMemo(
    () => todaySales.reduce((sum, s) => sum + s.total_amount, 0),
    [todaySales],
  );

  return (
    <>
      <h1 className="sr-only">Ventas</h1>
      <ModeSwitcher mode={mode} onChange={setMode} />

      {mode === "cierre" ? (
        <DailyCloseMode onNotify={push} />
      ) : mode === "historial" ? (
        <SalesHistoryMode
          sales={sales}
          loading={loadingSales}
          onVoid={requestVoid}
        />
      ) : (
        <div className="mx-auto min-h-screen grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* MAIN */}
          <div className="flex flex-col gap-4 lg:col-span-3">
            <ProductSearchBar
              inputRef={searchInputRef}
              query={searchQuery}
              onQueryChange={handleQueryChange}
              onKeyDown={handleSearchKeyDown}
              suggestions={suggestions}
              suggestionIndex={suggestionIndex}
              onPick={addLineFromProduct}
              scanning={barcodeScanning}
              cameraAvailable={cameraAvailable}
              onOpenCamera={() => setCameraOpen(true)}
            />

            <CartLines
              lines={lines}
              qtyRefs={qtyRefs}
              onQtyChange={changeQty}
              onQtyStep={stepQty}
              onQtyKeyDown={handleQtyKeyDown}
              onRemove={removeLine}
              discount={discountProps}
              justAddedKey={justAddedKey}
              cameraAvailable={cameraAvailable}
              onOpenCamera={() => setCameraOpen(true)}
              phoneAvailable={phoneScanner.available && !isMobileDevice}
              phoneConnected={phoneScanner.phoneConnected}
              onOpenPhoneModal={() => setPhoneModalOpen(true)}
            />

            {lines.length > 0 && (
              <PaymentPanel
                total={totals.total}
                paymentMethod={paymentMethod}
                onPaymentMethodChange={setPayment}
                receivedAmount={receivedAmount}
                onReceivedAmountChange={changeReceivedAmount}
                onExactAmount={setExactAmount}
                clientName={clientName}
                onClientNameChange={changeClientName}
                knownClients={fiadoClients}
                errors={saleErrors}
                confirming={confirming}
                onCancel={cancelSale}
                onConfirm={confirmSale}
              />
            )}
          </div>

          {/* SIDEBAR */}
          <div className="flex flex-col gap-4">
            <TodayTotalsCard total={todayTotal} count={todaySales.length} />

            <RecentSales
              sales={sales}
              loading={loadingSales}
              onVoid={requestVoid}
              onSeeAll={() => setMode("historial")}
            />
          </div>
        </div>
      )}

      {voidConfirmId && (
        <VoidSaleDialog
          voiding={voiding}
          onClose={cancelVoidRequest}
          onConfirm={confirmVoidSale}
        />
      )}

      {receiptData && (
        <ReceiptModal
          data={receiptData}
          onPrint={printReceipt}
          onClose={() => setReceiptData(null)}
        />
      )}

      {/* En modo continuo: se queda abierta pasando mercancía, porque el cajero
          tiene la mano ocupada y cerrar y abrir por cada artículo sería más
          lento que teclear. Va antes que ToastStack —los dos son z-[70]— para
          que los avisos de "agregado" y "ningún producto tiene ese código"
          queden por encima del visor y no debajo. */}
      {cameraOpen && (
        <CameraScannerModal
          continuous
          title="Escanear productos"
          onScan={(code) => handleBarcodeScan(code, { fromCamera: true })}
          onClose={() => setCameraOpen(false)}
        />
      )}

      {/* Solo para emparejar y ver el estado: una vez hecho, el celular manda
          códigos con esta pantalla abierta aunque el modal esté cerrado. */}
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

      {/* Botón flotante y no en la barra de búsqueda: es un atajo de
          emparejar, no algo que se toque venta a venta. En celular no
          aparece -el aparato ya está en la mano de quien escanea-. */}
      {phoneScanner.available && !isMobileDevice && (
        <PhoneScannerFab
          phoneConnected={phoneScanner.phoneConnected}
          onClick={() => setPhoneModalOpen(true)}
        />
      )}

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
