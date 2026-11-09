# API de Boxes

Rutas HTTP en `src/app/api`. Corren en el servidor de Next y hablan con
Supabase con la `service_role`, así que el navegador nunca toca la base
directamente.

La configuración de la base y las claves está en
[`supabase/README.md`](../supabase/README.md).

## Cómo responde

Todo sale con la misma forma:

```jsonc
// éxito
{ "data": { ... } }
{ "data": [ ... ], "meta": { "page": 1, "limit": 50, "total": 435, "pages": 9 } }

// error
{ "error": { "message": "Ya existe un cierre para esa fecha", "code": "conflict" } }
```

`message` viene en español y está pensado para mostrarse tal cual en pantalla.
`code` es para que la aplicación pueda reaccionar distinto según el caso.

| Código HTTP | Cuándo |
|---|---|
| `400` | la URL o los parámetros están mal armados |
| `401` | sin sesión (`unauthenticated`), o correo/contraseña incorrectos en el login (`invalid_credentials`, el mismo para los dos casos a propósito) |
| `404` | no existe ese registro |
| `409` | choca con algo que ya existe (SKU repetido, cierre del mismo día) |
| `422` | el cuerpo tiene campos inválidos. Vienen todos juntos en `details` |
| `429` | demasiados intentos de login fallidos (`too_many_attempts`): 5 por correo o 20 por IP en 15 minutos |
| `503` | falta configurar Supabase o falta correr el SQL |

Los errores de formulario llegan campo por campo:

```json
{
  "error": {
    "message": "Hay campos con errores",
    "code": "invalid_payload",
    "details": { "name": "Es obligatorio", "price": "Debe ser un número" }
  }
}
```

Lo que devuelve `data` son exactamente los tipos de `src/types`
(`Product`, `Sale`, `Order`, `Expense`, `DailyClose`), los mismos que hoy
entrega el mock: cuando se conecte el front, cambiar los servicios por llamadas
a `/api` no obliga a tocar los componentes.

## Parámetros comunes de los listados

| Parámetro | Por defecto | Notas |
|---|---|---|
| `page` | `1` | |
| `limit` | `50` | máximo 500 |
| `sort` | según el recurso | solo las columnas permitidas; cualquier otra da 400 |
| `order` | `desc` | `asc` o `desc` |
| `q` | — | búsqueda de texto |
| `from` / `to` | — | rango de fechas `AAAA-MM-DD`, inclusivo |

Las fechas se interpretan en hora de Colombia (UTC-5), no en UTC: a las 7 de la
noche acá ya es el día siguiente en UTC y los cierres saldrían corridos.

---

## `GET /api`

Índice de la API.

## `GET /api/health`

Si la aplicación puede hablar con Supabase y si la base ya tiene esquema y
datos. Responde `200` cuando todo está bien y `503` cuando no.

```json
{
  "data": {
    "configurado": true,
    "usando_service_role": true,
    "estado": "ok",
    "mensaje": "Todo conectado.",
    "conteos": { "products": 435, "sales": 0, "orders": 0, "expenses": 522, "daily_closes": 365 }
  }
}
```

`estado` puede ser `ok`, `vacia` (falta correr las semillas), `sin_esquema`
(falta el `01_schema.sql`), `sin_configurar` (faltan las variables de entorno) o
`con_errores`.

Con `usando_service_role: false` las rutas están trabajando con la clave
pública: con RLS activo eso devuelve listas vacías en vez de un error, así que
conviene mirarlo cuando "no aparece nada".

---

## Productos

### `GET /api/products`

Ordena por `name` ascendente si no se dice otra cosa.

| Filtro | Ejemplo | Qué hace |
|---|---|---|
| `q` | `?q=arroz` | busca en nombre, SKU, código de barras, categoría y marca |
| `category` | `?category=Bebidas` | exacto, por nombre |
| `brand` | `?brand=Postobón` | exacto, por nombre |
| `barcode` | `?barcode=7702001` | exacto, para el lector del punto de venta |
| `lowStock` | `?lowStock=10` | los que tienen 10 o menos |
| `inStock` | `?inStock=false` | los que están en cero o en negativo |
| `estimatedCost` | `?estimatedCost=true` | los 398 que todavía tienen el costo calculado con el margen del 19% |

`sort`: `name`, `sku`, `price`, `cost_price`, `stock`, `category`, `brand`,
`created_at`.

### La categoría y la marca

Las dos son tablas propias de cada tienda (`categories`, `brands`) y el producto
apunta a una de cada una, o a ninguna. En la respuesta viajan por partida doble:

```json
{ "category": "Bebidas", "category_id": "8f2c…", "brand": "Postobón", "brand_id": "1a7d…" }
```

Al escribir (`POST` y `PATCH`) se acepta cualquiera de las dos formas:

| Se manda | Qué pasa |
|---|---|
| `"category_id": "8f2c…"` | se usa esa. Si no es de esta tienda, `400` |
| `"category": "Bebidas"` | se busca por nombre sin distinguir mayúsculas; **si no existe, se crea** |
| `"category": ""` o `"category_id": null` | el producto queda sin categoría |
| no se manda nada (solo en `PATCH`) | no se toca |

Cuando llegan las dos, manda el id. Así el formulario puede mandar el id de lo
que se eligió de la lista y el nombre de lo que se acaba de escribir, sin tener
que decidir nada. `brand` y `brand_id` funcionan igual.

Crear la categoría junto con el producto es a propósito: en el mostrador,
"registrar el producto" y "abrir la categoría nueva" son un solo movimiento.

### `POST /api/products`

```json
{
  "name": "Aceite Diana 900ml",
  "sku": "ACE-005",
  "price": 9400,
  "cost_price": 7614,
  "category": "Aceites",
  "brand": "Diana",
  "barcode": "",
  "stock": 0,
  "description": ""
}
```

Obligatorios: `name` y `price`. El SKU es opcional y, si se manda repetido
dentro de la misma tienda, da `409`.

### `GET` · `PATCH` · `DELETE /api/products/:id`

`PATCH` cambia solo lo que se mande.

Borrar un producto no borra el historial: las líneas de ventas y pedidos viejos
se quedan con el nombre del producto y su `product_id` en null.

### `GET /api/products/categories` · `GET /api/products/brands`

Las categorías y las marcas de la tienda, con su conteo. Para armar los filtros
y el select del formulario sin traerse los 435 productos. Incluyen las que
todavía no tienen ningún producto adentro.

```json
{ "data": [ { "category_id": "8f2c…", "category": "Aceites", "product_count": 12, "stock_units": 0, "stock_value_cost": 0 } ] }
```

```json
{ "data": [ { "brand_id": "1a7d…", "brand": "Diana", "product_count": 5, "stock_units": 0, "stock_value_cost": 0 } ] }
```

### `GET /api/barcode/:code`

Ficha pública de un producto según su código de barras. **Esta es la única ruta
que no habla con Supabase**: sale a preguntarle a los catálogos abiertos de
[Open Food Facts](https://world.openfoodfacts.org) y sus hermanas de cosmética y
de productos generales. Sirve para llenar el formulario de un producto que
todavía no existe en la tienda. No escribe nada.

No confundir con `GET /api/products?barcode=`, que busca adentro, en el catálogo
del negocio.

```json
{
  "data": {
    "barcode": "7702090022711",
    "name": "Postobon Agua Pet 600",
    "brand": "Postobon",
    "quantity": "600ml",
    "category": "Aguas",
    "photo": "https://images.openfoodfacts.org/images/products/.../front_es.5.400.jpg",
    "description": "Datos traídos de Open Food Facts el 27/07/2026 con el código 7702090022711.\n...",
    "source": {
      "id": "openfoodfacts",
      "label": "Open Food Facts",
      "url": "https://world.openfoodfacts.org/product/7702090022711"
    }
  }
}
```

| Caso | Respuesta |
|---|---|
| el código no son 8-14 dígitos | `400` |
| ningún catálogo lo tiene | `404` — es un desenlace normal, no una falla: hay que llenar el producto a mano |

`price`, `cost_price` y `stock` **nunca** vienen acá y tampoco se estiman: son
datos del negocio y los pone quien registra el producto. Lo que sí llega es del
fabricante, y por eso la respuesta trae `source`: la licencia de esos catálogos
(ODbL) pide citarlos, y el rastro queda escrito en la descripción del producto
para poder revisarlo después.

La respuesta se cachea un día y cada consulta espera 6 segundos como máximo
antes de darse por vencida.

---

## Ventas

Arranca vacío: el Excel de 2025 solo anotaba un total por día y eso está en
`/api/daily-closes`.

### `GET /api/sales`

| Filtro | Ejemplo |
|---|---|
| `from` / `to` | `?from=2026-07-01&to=2026-07-31` |
| `payment_method` | `?payment_method=fiado` |
| `voided` | `?voided=false` esconde las anuladas |
| `q` o `client` | `?client=maria` busca por cliente |

`sort`: `sale_date`, `total_amount`, `gain`, `created_at`.

### `POST /api/sales`

```json
{
  "payment_method": "efectivo",
  "client_name": null,
  "products": [
    { "product_id": "8867...", "quantity": 2, "sale_price": 18635, "discount_type": "pct", "discount_value": 10 }
  ]
}
```

- `products` no puede ir vacío. `discount_type` es `"pct"`, `"amount"` o null.
- Si no se manda `sale_price`, se toma el precio del catálogo.
- Con `payment_method: "fiado"` el `client_name` es obligatorio.
- `sale_date` se puede mandar; por defecto es ahora.
- El inventario baja solo. Con `"adjust_stock": false` no se toca.
- **`total_amount` y `gain` los calcula el servidor** con las líneas y el
  `cost_price` del catálogo. Lo que mande el cliente en esos dos campos se
  ignora: es plata.

También se acepta la forma `{ "sale": { ... }, "products": [ ... ] }`.

Responde `201` con la venta completa y sus líneas.

### `PATCH /api/sales/:id`

Anular es lo normal para deshacer una venta: queda en el historial y el
inventario se devuelve solo.

```json
{ "voided": true }
```

Con `"restore_stock": false` se anula sin devolver la mercancía (para cuando el
producto se dañó). También acepta `sale_date`, `payment_method` y `client_name`.

Una venta anulada no se puede reactivar: si la venta sí ocurrió, se registra de
nuevo.

### `DELETE /api/sales/:id`

Borra la venta y sus líneas, **sin** devolver el inventario. Es para un registro
que nunca debió existir; si la mercancía volvió al estante, lo correcto es
anular.

---

## Pedidos

### `GET /api/orders`

| Filtro | Ejemplo |
|---|---|
| `status` | `?status=pendiente` |
| `supplier` o `q` | `?supplier=coca` |
| `from` / `to` | sobre `order_date` |
| `late` | `?late=true` pendientes cuya fecha de entrega ya pasó |

`sort`: `order_date`, `expected_delivery`, `total_amount`, `supplier`, `created_at`.

### `POST /api/orders`

```json
{
  "supplier": "Distribuidora del Valle",
  "expected_delivery": "2026-08-01",
  "notes": "",
  "products": [ { "product_id": "8867...", "quantity": 5, "unit_cost": 15000 } ]
}
```

Obligatorios: `supplier` y al menos una línea. El total lo calcula el servidor.
Crear el pedido **no** toca el inventario.

### `POST /api/orders/:id/receive`

Marca el pedido como recibido y suma la mercancía al inventario. Cuerpo
opcional:

| Campo | Por defecto | Qué hace |
|---|---|---|
| `adjust_stock` | `true` | sumar o no al inventario |
| `update_cost` | `false` | además pisa el `cost_price` del catálogo con el costo del pedido y lo marca como costo real |

Es idempotente: recibir dos veces no suma el stock dos veces.

`update_cost` va apagado por defecto porque cambia datos del negocio; es la
forma limpia de ir reemplazando los 398 costos estimados por costos de factura.

### `PATCH /api/orders/:id`

Cambia `supplier`, `expected_delivery`, `notes`, `order_date`, `attachment` o
`status`. Mover el estado a `recibido` o `cancelado` mueve el inventario igual
que los endpoints dedicados.

Un pedido recibido no puede volver a `pendiente`: primero se cancela (eso
descuenta lo que había sumado).

### `DELETE /api/orders/:id`

Se rechaza si el pedido está recibido: su mercancía ya está contada en el
inventario. Hay que cancelarlo primero.

---

## Gastos y caja

`kind` distingue las tres cosas que anotaba el Excel:

| `kind` | Qué es |
|---|---|
| `gasto` | plata que salió por consumo del negocio |
| `entrada` | plata que entró a la caja por fuera de las ventas |
| `salida` | plata que salió de la caja |

### `GET /api/expenses`

Filtros: `kind`, `from`, `to`, `q` (busca en concepto y notas).
`sort`: `date`, `amount`, `kind`, `created_at`.

### `POST /api/expenses`

```json
{ "date": "2026-07-26", "kind": "gasto", "amount": 35000, "concept": "Bolsas", "notes": "" }
```

Obligatorios: `amount` y `concept`. `date` por defecto es hoy y `kind`,
`gasto`.

El concepto es obligatorio a propósito: los 353 gastos de 2025 entraron con un
concepto genérico porque el Excel solo guardaba el total del día, y la idea de
aquí en adelante es que cada gasto se sepa a qué fue.

### `GET` · `PATCH` · `DELETE /api/expenses/:id`

---

## Cierres diarios

Cada fila es un día completo del negocio, sin detalle de transacciones: es como
venía la contabilidad de 2025 y se conserva como modo de captura junto al
registro venta por venta.

### `GET /api/daily-closes`

Filtros: `from`, `to`, `source` (`excel` o `app`).
`sort`: `date`, `sales_total`, `gain`, `expenses_total`, `purchases_total`.

### `POST /api/daily-closes`

```json
{
  "date": "2026-07-26",
  "sales_total": 640000,
  "gain": 121600,
  "expenses_total": 25000,
  "purchases_total": 380000,
  "cash_in": null,
  "cash_out": null,
  "cash_counted": 412000
}
```

`cash_counted` es la plata que se contó en el cajón al cerrar (null = no se
contó). La pantalla de cierre la compara con lo esperado (ventas en efectivo +
abonos de fiado en efectivo + entradas − gastos − salidas) para decir si la
caja cuadra.

Solo `sales_total` es obligatorio. Si no se manda `gain`, se calcula como el
19% de la venta, que es lo que hace la columna GANANCIA del Excel; si se manda,
se respeta tal cual.

`cash_in` y `cash_out` en null significan "ese día no se anotó nada", que no es
lo mismo que cero. Un segundo cierre para la misma fecha da `409`.

### `GET` · `PATCH` · `DELETE /api/daily-closes/:id`

`:id` acepta el identificador o directamente la fecha:

```
GET /api/daily-closes/2025-12-31
```

---

## Fiados

El cuaderno de fiados. Lo que debe un cliente es la suma de sus ventas con
`payment_method = "fiado"` sin anular, menos sus abonos. El cliente se
identifica por el nombre, comparado sin mayúsculas, tildes ni espacios de más
(`src/lib/fiados.ts`). Los abonos nunca tocan el inventario.

### `GET /api/fiados`

Cada cliente con su saldo y sus movimientos, primero quien más debe.
`meta.total_owed` es lo que te deben en total.

```jsonc
{
  "data": [
    {
      "client_name": "Doña Rosa",
      "balance": 15000,
      "fiado_total": 20000,
      "paid_total": 5000,
      "last_activity": "2026-11-08T18:10:00Z",
      "entries": [
        { "type": "abono", "id": "…", "date": "2026-11-08T18:10:00Z", "amount": 5000, "payment_method": "efectivo" },
        { "type": "venta", "id": "…", "date": "2026-11-08T15:30:00Z", "amount": 20000 }
      ]
    }
  ],
  "meta": { "total_owed": 15000 }
}
```

### `POST /api/fiados/payments`

```json
{ "client_name": "Doña Rosa", "amount": 5000, "payment_method": "efectivo" }
```

Anota un abono, completo o parcial. `payment_method`: `efectivo` (por defecto),
`transferencia` o `tarjeta`.

### `DELETE /api/fiados/payments/:id`

Borra un abono anotado por error (es el "Deshacer" de la pantalla).

---

## `GET /api/summary`

Todos los indicadores del tablero en una sola consulta.

```
GET /api/summary?from=2025-01-01&to=2025-12-31
```

Sin parámetros toma desde el primer cierre registrado hasta hoy.

```jsonc
{
  "data": {
    "range": { "from": "2025-01-01", "to": "2025-12-31" },

    // el histórico del Excel
    "daily_closes": { "days": 365, "sales_total": 154490050, "gain": 29353171,
                      "expenses_total": 11836950, "purchases_total": 128838300,
                      "cash_in": 5641350, "cash_out": 5662550 },

    // las ventas registradas en la app
    "sales": { "count": 0, "total_amount": 0, "gain": 0, "ticket_avg": 0 },
    "sales_by_payment_method": {},

    "expenses": { "gasto": 11836950, "entrada": 5641350, "salida": 5662550 },
    "orders": { "total": 0, "pendientes": 0, "recibidos": 0, "cancelados": 0,
                "monto_pendiente": 0, "atrasados": 0 },
    "inventory": { "products": 435, "sin_stock": 435, "stock_bajo": 0,
                   "costo_estimado": 398, "valor_costo": 0, "valor_venta": 0 },

    "monthly": [ { "month": "2025-01", "days": 31, "sales_total": 12446400, "gain": 2364819,
                   "expenses_total": 939000, "purchases_total": 10702500 } ],
    "top_products": []
  }
}
```

**`daily_closes` y `sales` son dos formas de contar lo mismo** —el Excel de 2025
y las ventas de ahora en adelante— y vienen separadas justamente para que nadie
las sume. Lo mismo pasa con `expenses.gasto` y `daily_closes.expenses_total`.

Que `inventory` esté en ceros no es un error: el Excel nunca llevó inventario,
todos los productos arrancan en cero y hay que contar. `costo_estimado: 398` son
los productos cuyo costo todavía sale de multiplicar el precio por 0.81 en vez
de venir de una factura.

---

## Probar a mano

Con `npm run dev` corriendo:

```bash
curl http://localhost:3000/api/health
curl "http://localhost:3000/api/products?q=arroz&limit=3"
curl "http://localhost:3000/api/summary?from=2025-01-01&to=2025-12-31"

curl -X POST http://localhost:3000/api/expenses \
  -H "content-type: application/json" \
  -d '{"amount":35000,"concept":"Bolsas"}'
```
