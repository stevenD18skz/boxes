// OrdersPageEnhanced.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, PackagePlus, XCircle } from "lucide-react";
import { getProducts } from "@/services/products.service";
import { currency } from "@/utils/converts";
import {
  getOrders,
  createOrderWithDetails,
  receiveOrder,
  cancelOrder,
  addOrderItem,
  updateOrderItemStatus,
  getSuppliers,
  renameSupplier,
} from "@/services/orders.service";
import { uid } from "@/utils/id";
import { openPrintWindow } from "@/utils/print";
import { useToasts } from "@/hooks/useToasts";

import ToastStack from "@/components/ui/ToastStack";
import LowStockOrderWidget from "@/components/orders/LowStockOrderWidget";
import OrderConfirmedModal from "@/components/orders/OrderConfirmedModal";
import OrderHeaderForm from "@/components/orders/OrderHeaderForm";
import OrderItemsPanel from "@/components/orders/OrderItemsPanel";
import OrderLines from "@/components/orders/OrderLines";
import OrderProductSearch from "@/components/orders/OrderProductSearch";
import OrderTotalPanel from "@/components/orders/OrderTotalPanel";
import OrdersSidebar from "@/components/orders/OrdersSidebar";
import StatusConfirmDialog from "@/components/orders/StatusConfirmDialog";
import {
  STATUS_STYLE,
  buildOrderPrintHTML,
  formatDeliveryDate,
} from "@/components/orders/ordersUtils";
import { matchesText } from "@/lib/text";

/*
 OrdersPageEnhanced
 - Layout/estilo portado del prototipo de Claude Design: un único buscador
   que agrega productos a un carrito de pedido (mismo patrón que Ventas),
   autocompletado de proveedor con "repetir último pedido", adjuntar
   factura/comprobante, y sobre todo: estado del pedido (pendiente/recibido/
   cancelado) — al marcar "recibido" el stock de cada producto sube de
   verdad; antes esta conexión entre Pedidos e inventario no existía.
 - Esta página coordina el estado y habla con los servicios; el dibujo vive en
   components/orders.
*/

export default function OrdersPageEnhanced() {
  const router = useRouter();

  // data
  const [allProducts, setAllProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // encabezado del pedido. El proveedor viaja como { id, name } | null (ver
  // CreatableSelect): id cuando se eligió uno ya guardado, o null con solo el
  // nombre cuando se acaba de escribir uno nuevo -se crea junto con el pedido.
  const [supplierChoice, setSupplierChoice] = useState(null);
  const [expectedDelivery, setExpectedDelivery] = useState("");
  const [notes, setNotes] = useState("");
  const [attachment, setAttachment] = useState(null);

  // búsqueda + carrito
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestionIndex, setSuggestionIndex] = useState(-1);
  const [lines, setLines] = useState([]);
  const [focusTarget, setFocusTarget] = useState(null);
  // Misma idea que en Ventas (ver CartLines/justAddedKey): la línea o el
  // producto recién agregado se pinta un instante y se apaga solo, como
  // confirmación visual de que el producto sí entró.
  const [justAddedKey, setJustAddedKey] = useState(null);
  const justAddedTimeoutRef = useRef(null);
  const flashLine = (key) => {
    setJustAddedKey(key);
    if (justAddedTimeoutRef.current) clearTimeout(justAddedTimeoutRef.current);
    justAddedTimeoutRef.current = setTimeout(() => setJustAddedKey(null), 900);
  };
  useEffect(() => () => clearTimeout(justAddedTimeoutRef.current), []);

  const [orderErrors, setOrderErrors] = useState({});
  const [confirming, setConfirming] = useState(false);

  const [orderConfirmedData, setOrderConfirmedData] = useState(null);

  const [statusConfirm, setStatusConfirm] = useState(null); // {orderId, action}
  const [statusUpdating, setStatusUpdating] = useState(false);

  // pedido pendiente abierto para seguir agregándole productos u otro día
  // más; null mientras se arma un pedido nuevo desde cero (el flujo de
  // siempre, con lines/OrderHeaderForm más abajo).
  const [openOrderId, setOpenOrderId] = useState(null);
  const [addingItem, setAddingItem] = useState(false);
  const [itemStatusBusyId, setItemStatusBusyId] = useState(null);

  const { toasts, push, dismiss } = useToasts();

  const searchInputRef = useRef(null);
  const qtyRefs = useRef({});

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      setLoadingOrders(true);
      try {
        const p = await getProducts();
        const ord = await getOrders();
        const sup = await getSuppliers();
        if (!mounted) return;
        const ordersList = Array.isArray(ord) ? ord : [];
        setAllProducts(Array.isArray(p) ? p : []);
        setOrders(ordersList);
        setSuppliers(Array.isArray(sup) ? sup : []);

        // Deep-link desde el historial completo (/orders/history): abrir de
        // una vez el pedido pendiente que se venía a editar, en vez de
        // obligar a buscarlo otra vez en la lista de acá.
        const openId = new URLSearchParams(window.location.search).get("open");
        if (openId) {
          const order = ordersList.find((o) => o.id === openId);
          if (order && order.status === "pendiente") {
            setOpenOrderId(order.id);
          } else if (order) {
            push("Ese pedido ya no está pendiente y no se puede editar", "info");
          } else {
            push("No se encontró ese pedido", "error");
          }
          router.replace("/orders");
        }
      } catch (err) {
        console.error("Error fetching orders/products:", err);
        push("No se pudieron cargar tus productos y ventas. Revisa el internet y recarga la página.", "error");
      } finally {
        if (mounted) setLoadingOrders(false);
      }
    };
    fetchData();
    return () => (mounted = false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // El foco se mueve como efecto y no en el mismo handler porque el elemento
  // destino todavía no existe cuando se agrega una línea nueva.
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
    return allProducts
      .filter((p) => matchesText(searchQuery, p.name, p.sku, p.barcode))
      .slice(0, 5);
  }, [searchQuery, allProducts]);

  const openOrder = useMemo(
    () => orders.find((o) => o.id === openOrderId) ?? null,
    [orders, openOrderId],
  );

  // El último pedido a este proveedor: por id cuando se eligió uno ya
  // guardado (la señal más precisa), y por nombre como respaldo -pedidos de
  // antes de este cambio, o uno recién escrito que todavía no tiene id-.
  const lastMatchingOrder = useMemo(() => {
    if (!supplierChoice) return null;
    const q = supplierChoice.name.trim().toLowerCase();
    if (!q) return null;
    const matches = orders
      .filter((o) =>
        supplierChoice.id
          ? o.supplier_id === supplierChoice.id
          : o.supplier.trim().toLowerCase() === q,
      )
      .slice()
      .sort((a, b) => new Date(b.order_date) - new Date(a.order_date));
    return matches[0] || null;
  }, [orders, supplierChoice]);
  const showRepeatLast = !!lastMatchingOrder && lines.length === 0;

  // Se copian las cantidades del pedido anterior pero los costos se leen del
  // catálogo de hoy: el proveedor pudo haber subido precios desde entonces.
  const repeatLastOrder = () => {
    if (!lastMatchingOrder) return;
    const newLines = lastMatchingOrder.products
      .map((p) => {
        const product = allProducts.find(
          (ap) => String(ap.id) === String(p.product_id),
        );
        if (!product) return null;
        return {
          _key: uid(),
          productId: product.id,
          name: product.name,
          sku: product.sku,
          unitCost: Number(product.cost_price ?? 0),
          quantity: p.quantity,
        };
      })
      .filter(Boolean);
    setLines(newLines);
    push("Pedido anterior copiado", "success");
  };

  // Con un pedido abierto, agregar es inmediato: la línea ya se guarda en la
  // base (no hay "Confirmar pedido" que la deje pendiente de enviar), así que
  // se puede ir sumando productos hoy y seguir mañana. Sin pedido abierto es
  // el carrito de siempre: local hasta que se registra el pedido completo.
  const addLineFromProduct = async (product) => {
    if (openOrder) {
      setSearchQuery("");
      setSuggestionIndex(-1);
      setAddingItem(true);
      try {
        const updated = await addOrderItem(openOrder.id, {
          product_id: product.id,
          product: product.name,
          quantity: 1,
          unit_cost: Number(product.cost_price ?? 0),
        });
        setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
        const newItem = updated.products
          .filter((it) => String(it.product_id) === String(product.id))
          .slice(-1)[0];
        if (newItem) flashLine(newItem.id);
      } catch (err) {
        console.error(err);
        push("No se pudo agregar el producto al pedido", "error");
      } finally {
        setAddingItem(false);
      }
      return;
    }

    setLines((prev) => {
      const existingIdx = prev.findIndex((l) => l.productId === product.id);
      if (existingIdx >= 0) {
        const existing = prev[existingIdx];
        const next = prev.slice();
        next[existingIdx] = { ...existing, quantity: existing.quantity + 1 };
        setFocusTarget({ type: "qty", key: existing._key });
        flashLine(existing._key);
        return next;
      }
      const key = uid();
      setFocusTarget({ type: "qty", key });
      flashLine(key);
      return [
        ...prev,
        {
          _key: key,
          productId: product.id,
          name: product.name,
          sku: product.sku,
          unitCost: Number(product.cost_price ?? 0),
          quantity: 1,
        },
      ];
    });
    setSearchQuery("");
    setSuggestionIndex(-1);
  };

  // Producto elegido desde el widget de "menos stock": va al pedido que esté
  // abierto ahora mismo, o al carrito nuevo si no hay ninguno. Mismo camino
  // que elegirlo en el buscador, solo que sin tener que volver a escribirlo.
  const quickAddLowStock = (product) => addLineFromProduct(product);

  const openOrderForEditing = (order) => {
    setOpenOrderId(order.id);
    resetDraft();
  };

  const startNewOrder = () => {
    setOpenOrderId(null);
    resetDraft();
  };

  const changeItemStatus = async (itemId, status) => {
    if (!openOrder) return;
    setItemStatusBusyId(itemId);
    try {
      const updated = await updateOrderItemStatus(openOrder.id, itemId, status);
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    } catch (err) {
      console.error(err);
      push("No se pudo cambiar el estado del producto", "error");
    } finally {
      setItemStatusBusyId(null);
    }
  };

  const handleSearchKeyDown = (e) => {
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
    let v = parseInt(raw, 10);
    if (Number.isNaN(v) || v < 1) v = 1;
    setLines((prev) =>
      prev.map((l) => (l._key === key ? { ...l, quantity: v } : l)),
    );
  };
  const stepQty = (key, delta) => {
    setLines((prev) =>
      prev.map((l) =>
        l._key === key ? { ...l, quantity: Math.max(1, l.quantity + delta) } : l,
      ),
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

  const total = useMemo(
    () => lines.reduce((sum, l) => sum + l.unitCost * l.quantity, 0),
    [lines],
  );

  const onAttachmentChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAttachment(reader.result);
    reader.readAsDataURL(file);
  };

  const resetDraft = () => {
    setLines([]);
    setSearchQuery("");
    setSupplierChoice(null);
    setExpectedDelivery("");
    setNotes("");
    setAttachment(null);
    setOrderErrors({});
  };

  const cancelOrderDraft = () => {
    resetDraft();
    push("Pedido cancelado", "info");
  };

  // Renombrar un proveedor desde el lápiz del select (ver CreatableSelect). El
  // error se relanza para que el select se quede abierto en modo edición con
  // el motivo debajo del campo, en vez de solo un toast que ya se cerró para
  // cuando se vuelve a mirar (mismo patrón que categoría/marca en Productos).
  const handleRenameSupplier = async (option, name) => {
    try {
      const updated = await renameSupplier(option, name);
      const sup = await getSuppliers();
      setSuppliers(Array.isArray(sup) ? sup : []);
      push(`Proveedor renombrado a "${updated.name}"`, "success");
      return updated;
    } catch (err) {
      console.error(err);
      push(err?.message || "Error renombrando el proveedor", "error");
      throw err;
    }
  };

  const confirmOrder = async () => {
    if (confirming) return;
    if (!lines.length) {
      push("Agrega al menos un producto", "error");
      return;
    }
    const errors = {};
    if (!supplierChoice?.name?.trim())
      errors.supplier = "Elige o escribe un proveedor";
    if (!expectedDelivery) errors.fecha = "Elige la fecha de entrega esperada";
    setOrderErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const orderPayload = {
      total_amount: Number(total),
      order_date: new Date().toISOString(),
      supplier: supplierChoice.name.trim(),
      supplier_id: supplierChoice.id ?? null,
      expected_delivery: expectedDelivery,
      notes: notes || "",
      status: "pendiente",
      attachment: attachment || null,
    };
    const productsFormat = lines.map((l) => ({
      product_id: l.productId,
      quantity: l.quantity,
      unit_cost: l.unitCost,
    }));
    const items = lines.map((l) => ({
      name: l.name,
      quantity: l.quantity,
      subtotal: l.unitCost * l.quantity,
    }));

    setConfirming(true);
    try {
      await createOrderWithDetails(orderPayload, productsFormat);
      const [updatedOrders, updatedSuppliers] = await Promise.all([
        getOrders(),
        getSuppliers(),
      ]);
      setOrders(Array.isArray(updatedOrders) ? updatedOrders : []);
      setSuppliers(Array.isArray(updatedSuppliers) ? updatedSuppliers : []);

      setOrderConfirmedData({
        total,
        supplier: orderPayload.supplier,
        expectedDelivery: orderPayload.expected_delivery,
        items,
      });

      resetDraft();
    } catch (err) {
      console.error("Error creating order:", err);
      push("Error registrando pedido. Intenta de nuevo.", "error");
    } finally {
      setConfirming(false);
    }
  };

  const printOrder = (data) => {
    if (!data) return;
    if (!openPrintWindow(buildOrderPrintHTML(data))) {
      push("Permite las ventanas emergentes para imprimir el pedido", "error");
    }
  };

  const requestReceive = (id) =>
    setStatusConfirm({ orderId: id, action: "recibir" });
  const requestCancel = (id) =>
    setStatusConfirm({ orderId: id, action: "cancelar" });
  const cancelStatusConfirm = () => setStatusConfirm(null);

  // Marcar "recibido" es el único punto donde Pedidos mueve el inventario:
  // receiveOrder ya suma el stock del lado del servidor (excluyendo lo
  // cancelado dentro del pedido), de una sola vez y de forma idempotente —
  // acá no hay que sumarlo también a mano.
  const doStatusConfirm = async () => {
    if (!statusConfirm) return;
    setStatusUpdating(true);
    try {
      if (statusConfirm.action === "recibir") {
        await receiveOrder(statusConfirm.orderId);
        push("Pedido marcado como recibido, stock actualizado", "success");
      } else {
        await cancelOrder(statusConfirm.orderId);
        push("Pedido cancelado", "info");
      }
      // Un pedido recibido o cancelado ya no se puede editar: si era el que
      // estaba abierto, se vuelve a la vista de armar un pedido nuevo.
      if (openOrderId === statusConfirm.orderId) setOpenOrderId(null);
      const [updatedOrders, updatedProducts] = await Promise.all([
        getOrders(),
        getProducts(),
      ]);
      setOrders(Array.isArray(updatedOrders) ? updatedOrders : []);
      setAllProducts(Array.isArray(updatedProducts) ? updatedProducts : []);
    } catch (err) {
      console.error(err);
      push("Error actualizando el pedido", "error");
    } finally {
      setStatusUpdating(false);
      setStatusConfirm(null);
    }
  };

  return (
    <>
      <div className="mx-auto grid min-h-screen grid-cols-1 gap-6 lg:grid-cols-3">
        {/* MAIN */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {openOrder ? "Editar pedido" : "Registrar pedido"}
              </h1>
              <p className="mt-0.5 text-sm text-slate-500">
                {openOrder
                  ? `A ${openOrder.supplier} — sigue agregando lo que haga falta`
                  : "Compra a un proveedor"}
              </p>
            </div>
            {openOrder && (
              <button
                type="button"
                onClick={startNewOrder}
                className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                <PackagePlus className="h-4 w-4" aria-hidden />
                Nuevo pedido
              </button>
            )}
          </div>

          {openOrder ? (
            <>
              <div className="rounded-xl bg-white p-[18px] shadow-sm ring-1 ring-slate-100">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11.5px] font-bold ${(STATUS_STYLE[openOrder.status] || STATUS_STYLE.pendiente).chip}`}
                      >
                        {(STATUS_STYLE[openOrder.status] || STATUS_STYLE.pendiente).label}
                      </span>
                      {openOrder.expected_delivery && (
                        <span className="text-xs text-slate-500">
                          Entrega esperada:{" "}
                          {formatDeliveryDate(openOrder.expected_delivery)}
                        </span>
                      )}
                    </div>
                    {openOrder.notes && (
                      <p className="mt-1.5 text-sm text-slate-600">
                        {openOrder.notes}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-[22px] font-extrabold tabular-nums text-slate-900">
                      {currency(openOrder.total_amount)}
                    </div>
                    <div className="text-xs text-slate-500">Costo total</div>
                  </div>
                </div>
                <div className="mt-3.5 flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => requestReceive(openOrder.id)}
                    className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-50 text-[13.5px] font-bold text-emerald-800 hover:bg-emerald-100"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Marcar recibido
                  </button>
                  <button
                    type="button"
                    onClick={() => requestCancel(openOrder.id)}
                    className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-50 text-[13.5px] font-bold text-red-700 hover:bg-red-100"
                  >
                    <XCircle className="h-4 w-4" />
                    Cancelar pedido
                  </button>
                </div>
              </div>

              <OrderProductSearch
                inputRef={searchInputRef}
                query={searchQuery}
                onQueryChange={handleQueryChange}
                onKeyDown={handleSearchKeyDown}
                suggestions={suggestions}
                suggestionIndex={suggestionIndex}
                onPick={addLineFromProduct}
              />

              {addingItem && (
                <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                  Agregando producto al pedido…
                </p>
              )}

              <OrderItemsPanel
                items={openOrder.products}
                busyItemId={itemStatusBusyId}
                onChangeStatus={changeItemStatus}
                justAddedId={justAddedKey}
              />
            </>
          ) : (
            <>
              <OrderHeaderForm
                supplier={supplierChoice}
                onSupplierChange={(value) => {
                  setSupplierChoice(value);
                  if (orderErrors.supplier)
                    setOrderErrors((er) => ({ ...er, supplier: undefined }));
                }}
                suppliers={suppliers}
                onRenameSupplier={handleRenameSupplier}
                showRepeatLast={showRepeatLast}
                lastOrderItemCount={lastMatchingOrder?.products.length ?? 0}
                onRepeatLast={repeatLastOrder}
                expectedDelivery={expectedDelivery}
                onExpectedDeliveryChange={(value) => {
                  setExpectedDelivery(value);
                  if (orderErrors.fecha)
                    setOrderErrors((er) => ({ ...er, fecha: undefined }));
                }}
                notes={notes}
                onNotesChange={setNotes}
                errors={orderErrors}
              />

              <OrderProductSearch
                inputRef={searchInputRef}
                query={searchQuery}
                onQueryChange={handleQueryChange}
                onKeyDown={handleSearchKeyDown}
                suggestions={suggestions}
                suggestionIndex={suggestionIndex}
                onPick={addLineFromProduct}
              />

              <OrderLines
                lines={lines}
                qtyRefs={qtyRefs}
                onQtyChange={changeQty}
                onQtyStep={stepQty}
                onQtyKeyDown={handleQtyKeyDown}
                onRemove={removeLine}
                justAddedKey={justAddedKey}
              />

              {lines.length > 0 && (
                <OrderTotalPanel
                  total={total}
                  attachment={attachment}
                  onAttachmentChange={onAttachmentChange}
                  onRemoveAttachment={() => setAttachment(null)}
                  confirming={confirming}
                  onCancel={cancelOrderDraft}
                  onConfirm={confirmOrder}
                />
              )}
            </>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <OrdersSidebar
            orders={orders}
            loading={loadingOrders}
            openOrderId={openOrderId}
            onOpen={openOrderForEditing}
            onReceive={requestReceive}
            onCancel={requestCancel}
          />
          <LowStockOrderWidget products={allProducts} onAdd={quickAddLowStock} />

        </div>
      </div>

      {statusConfirm && (
        <StatusConfirmDialog
          action={statusConfirm.action}
          updating={statusUpdating}
          onClose={cancelStatusConfirm}
          onConfirm={doStatusConfirm}
        />
      )}

      {orderConfirmedData && (
        <OrderConfirmedModal
          data={orderConfirmedData}
          onPrint={printOrder}
          onClose={() => setOrderConfirmedData(null)}
        />
      )}

      <ToastStack toasts={toasts} onDismiss={dismiss} accent="indigo" />
    </>
  );
}
