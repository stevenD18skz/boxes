-- =============================================================================
-- Boxes · Esquema de base de datos (Supabase / PostgreSQL)
-- =============================================================================
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> New query -> pegar -> Run.
-- Es idempotente: se puede volver a correr sin romper nada.
--
-- Orden de ejecución de la carpeta supabase/sql:
--   01_schema.sql          <- este archivo: tablas, vistas, funciones, RLS,
--                             bucket de fotos. Es la ÚNICA fuente de verdad del
--                             esquema — no queda historia de versiones viejas
--                             en otros archivos, así que no hace falta leer
--                             nada más para saber cómo es la base hoy.
--   05_policies_dev.sql    <- OPCIONAL, solo si el navegador va a consultar
--                             directo (desarrollo sin service_role a mano)
--   node scripts/seed-tiendas.mjs   <- crea las tiendas (en la terminal, no
--                             en el SQL Editor: el hash de la contraseña se
--                             calcula con Node, no con Postgres)
--   10_seed_demo.sql       <- ~32 productos, un par de semanas de ventas y
--                             gastos de ejemplo, solo para la tienda de demo
--   99_reset.sql            <- DESTRUCTIVO, borra las tablas de negocio para
--                             volver a empezar (conserva tiendas)
--
-- Modelo de datos, en corto:
--   tiendas                  cada negocio que usa la app. Multi-tenant: todo
--                             lo demás cuelga de tienda_id.
--   products                 catálogo, con categoría y marca en tablas propias.
--   categories / brands      opcionales, de cada tienda.
--   sales / sale_items       ventas registradas desde la app (venta por venta).
--   orders / order_items     pedidos a proveedores.
--   expenses                 gastos y movimientos de caja.
--   daily_closes             cierre diario (para cuando se importa un
--                             histórico de contabilidad externo; la app no
--                             escribe acá directamente).
--
-- No hay Supabase Auth ni RLS por identidad: todo el acceso pasa por las
-- rutas de /api con la service_role key, así que el aislamiento entre
-- tiendas vive en las rutas y en las funciones (todas piden tienda_id), no en
-- políticas de RLS. RLS queda activo y SIN políticas en todas las tablas de
-- negocio: eso es lo que impide que la anon key (la que va en el navegador)
-- pueda leer o escribir nada directo. Ver el bloque RLS al final y
-- 05_policies_dev.sql si hace falta abrirlo mientras se desarrolla.
-- =============================================================================

create extension if not exists pgcrypto;   -- gen_random_uuid()
-- pg_trgm vive en el esquema `extensions` y no en `public`: lo que esté en
-- public queda expuesto por la API de Supabase. Las bases creadas antes lo
-- tenían en public; el bloque de abajo lo mueve (el índice que lo usa sigue
-- funcionando igual).
create extension if not exists pg_trgm with schema extensions;  -- búsqueda por nombre con ILIKE
do $$ begin
  if exists (
    select 1 from pg_extension
    where extname = 'pg_trgm' and extnamespace = 'public'::regnamespace
  ) then
    alter extension pg_trgm set schema extensions;
  end if;
end $$;

-- ----------------------------------------------------------------- TIPOS ----
-- create type no acepta "if not exists", de ahí los bloques con excepción.
do $$ begin
  create type public.payment_method as enum ('efectivo','tarjeta','transferencia','fiado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_status as enum ('pendiente','recibido','cancelado');
exception when duplicate_object then null; end $$;

-- Fase de cada producto DENTRO de un pedido, aparte de order_status (que es
-- del pedido completo). 'recibido' acá se pone solo, junto para todas las
-- líneas, cuando se recibe el pedido entero: el proveedor siempre entrega
-- todo de una vez, nunca por partes (ver receive_order más abajo).
do $$ begin
  create type public.order_item_status as enum ('por_pedir','en_espera','recibido','cancelado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.expense_kind as enum ('gasto','entrada','salida');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.daily_close_source as enum ('excel','app');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sale_discount_type as enum ('pct','amount');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------ updated_at ---------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================== TIENDAS =====
-- Sin Supabase Auth: el login pasa por /api/auth/login, que compara el hash
-- guardado acá con scrypt (ver src/lib/auth/password.ts). email es lo que se
-- usa para entrar; nombre es el dato de negocio que se muestra en el topbar.
create table if not exists public.tiendas (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null check (length(btrim(nombre)) > 0),
  dueno         text not null check (length(btrim(dueno)) > 0),
  email         text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  password_hash text not null,
  -- Un solo jsonb para toda la configuración de la tienda (ver
  -- src/lib/settings.ts, que sabe rellenar lo que falte con sus valores por
  -- defecto): así una opción nueva no pide otra migración.
  settings      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Login sin importar mayúsculas/minúsculas, y sin dos tiendas con el mismo
-- nombre o correo.
create unique index if not exists tiendas_nombre_lower_idx on public.tiendas (lower(nombre));
create unique index if not exists tiendas_email_lower_idx  on public.tiendas (lower(email));

drop trigger if exists tiendas_set_updated_at on public.tiendas;
create trigger tiendas_set_updated_at
  before update on public.tiendas
  for each row execute function public.set_updated_at();

-- Intentos de login fallidos, para frenar a quien prueba contraseñas a ciegas
-- (ver src/lib/auth/loginThrottle.ts). Una fila por intento fallido; al entrar
-- bien se borran las del correo. Las de más de un día se limpian solas desde
-- la misma ruta, así que la tabla nunca crece.
create table if not exists public.login_attempts (
  id           bigint generated always as identity primary key,
  email        text not null,
  ip           text not null,
  attempted_at timestamptz not null default now()
);
create index if not exists login_attempts_email_idx on public.login_attempts (email, attempted_at);
create index if not exists login_attempts_ip_idx    on public.login_attempts (ip, attempted_at);

-- ========================================================== CATEGORÍAS ======
-- Van antes que products: la tabla las referencia por llave foránea.
create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  tienda_id  uuid not null references public.tiendas(id) on delete cascade,
  name       text not null check (length(btrim(name)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists categories_tienda_name_idx
  on public.categories (tienda_id, lower(btrim(name)));

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- ============================================================== MARCAS ======
create table if not exists public.brands (
  id         uuid primary key default gen_random_uuid(),
  tienda_id  uuid not null references public.tiendas(id) on delete cascade,
  name       text not null check (length(btrim(name)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists brands_tienda_name_idx
  on public.brands (tienda_id, lower(btrim(name)));

drop trigger if exists brands_set_updated_at on public.brands;
create trigger brands_set_updated_at
  before update on public.brands
  for each row execute function public.set_updated_at();

-- =========================================================== PRODUCTOS ======
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  tienda_id   uuid not null references public.tiendas(id),
  name        text not null check (length(btrim(name)) > 0),
  -- Opcional: en una tienda de barrio se busca por nombre y se cobra por
  -- código de barras. Sirve para lo que no trae código impreso (granel,
  -- reempaque) y para que el importador de CSV reconozca una fila ya
  -- cargada. Único por tienda y solo cuando no está vacío (ver el índice
  -- parcial más abajo): dos tiendas pueden usar el mismo SKU sin chocar.
  sku         text not null default '',
  barcode     text not null default '',
  photo       text,
  price       numeric(14,2) not null default 0 check (price >= 0),
  cost_price  numeric(14,2) not null default 0 check (cost_price >= 0),
  -- numeric y no integer: hay producto que se vende por peso. Se permite
  -- negativo a propósito: vender antes de contar deja el stock en rojo, que
  -- es justo la señal de que falta hacer el conteo.
  stock       numeric(12,3) not null default 0,
  -- Categoría y marca son opcionales: null es "sin categoría" / "sin marca",
  -- que es lo normal en el granel y lo hecho en casa. No hay una fila de
  -- relleno para representar la ausencia.
  category_id uuid references public.categories(id) on delete set null,
  brand_id    uuid references public.brands(id) on delete set null,
  description text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists products_tienda_id_idx   on public.products (tienda_id);
create index if not exists products_category_id_idx on public.products (category_id);
create index if not exists products_brand_id_idx    on public.products (brand_id);
create index if not exists products_name_trgm_idx   on public.products using gin (name extensions.gin_trgm_ops);
create index if not exists products_barcode_idx     on public.products (barcode) where barcode <> '';

-- Se compara sin mayúsculas ni espacios de sobra: quien escribe "arz-001" un
-- martes y "ARZ-001" el jueves está nombrando la misma cosa. Parcial: los SKU
-- vacíos (la mayoría, en una tienda de barrio) no compiten por unicidad.
create unique index if not exists products_tienda_sku_idx
  on public.products (tienda_id, lower(btrim(sku)))
  where btrim(coalesce(sku, '')) <> '';

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- =============================================================== VENTAS =====
create table if not exists public.sales (
  id             uuid primary key default gen_random_uuid(),
  tienda_id      uuid not null references public.tiendas(id),
  sale_date      timestamptz not null default now(),
  total_amount   numeric(14,2) not null default 0 check (total_amount >= 0),
  gain           numeric(14,2) not null default 0,
  payment_method public.payment_method not null default 'efectivo',
  client_name    text,
  voided         boolean not null default false,
  voided_at      timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- El fiado sin nombre de cliente no se puede cobrar.
  constraint sales_fiado_needs_client
    check (payment_method <> 'fiado' or nullif(btrim(coalesce(client_name,'')),'') is not null)
);

create index if not exists sales_tienda_id_idx on public.sales (tienda_id);
create index if not exists sales_sale_date_idx on public.sales (sale_date desc);
create index if not exists sales_payment_method_idx on public.sales (payment_method);
create index if not exists sales_client_name_idx on public.sales (client_name) where client_name is not null;

drop trigger if exists sales_set_updated_at on public.sales;
create trigger sales_set_updated_at
  before update on public.sales
  for each row execute function public.set_updated_at();

create table if not exists public.sale_items (
  id             uuid primary key default gen_random_uuid(),
  sale_id        uuid not null references public.sales(id) on delete cascade,
  -- on delete set null: borrar un producto del catálogo no puede borrar el
  -- historial de ventas. product_name guarda el nombre tal como se vendió.
  product_id     uuid references public.products(id) on delete set null,
  product_name   text not null,
  quantity       numeric(12,3) not null check (quantity > 0),
  sale_price     numeric(14,2) not null check (sale_price >= 0),
  discount_type  public.sale_discount_type,
  discount_value numeric(14,2) not null default 0 check (discount_value >= 0),
  -- Misma fórmula que usa la pantalla de ventas: el descuento por monto nunca
  -- puede pasarse del subtotal de la línea.
  line_total     numeric(14,2) generated always as (
    round(
      (quantity * sale_price) - case
        when discount_type = 'pct' then (quantity * sale_price) * (discount_value / 100)
        when discount_type = 'amount' then
          case when discount_value > quantity * sale_price
               then quantity * sale_price
               else discount_value end
        else 0
      end
    , 2)
  ) stored,
  created_at     timestamptz not null default now()
);

create index if not exists sale_items_sale_id_idx on public.sale_items (sale_id);
create index if not exists sale_items_product_id_idx on public.sale_items (product_id);

-- Proveedores de la tienda. Misma forma que categories/brands (id, tienda_id,
-- name) para reutilizar el mismo mecanismo de "elegir de la lista o crear
-- escribiendo" (ver src/lib/api/taxonomy.ts).
create table if not exists public.suppliers (
  id         uuid primary key default gen_random_uuid(),
  tienda_id  uuid not null references public.tiendas(id) on delete cascade,
  name       text not null check (length(btrim(name)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists suppliers_tienda_name_idx
  on public.suppliers (tienda_id, lower(btrim(name)));

drop trigger if exists suppliers_set_updated_at on public.suppliers;
create trigger suppliers_set_updated_at
  before update on public.suppliers
  for each row execute function public.set_updated_at();

-- ============================================================== PEDIDOS =====
-- orders.supplier (texto) es "el nombre del proveedor en el momento de este
-- pedido concreto" y se conserva tal cual aunque el proveedor se renombre
-- después -igual que order_items.product_name se conserva aunque el producto
-- cambie de nombre-. supplier_id es solo el enlace hacia la tabla de
-- proveedores, para el select del formulario y para poder renombrar sin
-- reescribir pedidos viejos.
create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  tienda_id         uuid not null references public.tiendas(id),
  order_date        timestamptz not null default now(),
  supplier          text not null check (length(btrim(supplier)) > 0),
  supplier_id       uuid references public.suppliers(id) on delete set null,
  expected_delivery date,
  notes             text not null default '',
  total_amount      numeric(14,2) not null default 0 check (total_amount >= 0),
  status            public.order_status not null default 'pendiente',
  attachment        text,
  received_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Instalaciones que ya tenían la tabla antes de que existiera esta columna.
alter table public.orders
  add column if not exists supplier_id uuid references public.suppliers(id) on delete set null;

create index if not exists orders_tienda_id_idx on public.orders (tienda_id);
create index if not exists orders_order_date_idx on public.orders (order_date desc);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_supplier_idx on public.orders (supplier);
create index if not exists orders_supplier_id_idx on public.orders (supplier_id);

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- Backfill: una fila de suppliers por cada proveedor de texto que ya exista
-- en pedidos (instalaciones que tenían orders.supplier antes de que existiera
-- supplier_id), y enlazar esos pedidos con la fila correspondiente. En una
-- instalación nueva no hay pedidos todavía, así que esto no hace nada.
insert into public.suppliers (tienda_id, name)
select distinct o.tienda_id, btrim(o.supplier)
from public.orders o
where o.supplier_id is null
  and not exists (
    select 1 from public.suppliers s
    where s.tienda_id = o.tienda_id
      and lower(btrim(s.name)) = lower(btrim(o.supplier))
  );

update public.orders o
set supplier_id = s.id
from public.suppliers s
where o.supplier_id is null
  and s.tienda_id = o.tienda_id
  and lower(btrim(s.name)) = lower(btrim(o.supplier));

create table if not exists public.order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  product_id   uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity     numeric(12,3) not null check (quantity > 0),
  unit_cost    numeric(14,2) not null default 0 check (unit_cost >= 0),
  line_total   numeric(14,2) generated always as (round(quantity * unit_cost, 2)) stored,
  status       public.order_item_status not null default 'por_pedir',
  created_at   timestamptz not null default now()
);

-- Instalaciones que ya tenían la tabla antes de que existiera esta columna.
alter table public.order_items
  add column if not exists status public.order_item_status not null default 'por_pedir';

create index if not exists order_items_order_id_idx on public.order_items (order_id);
create index if not exists order_items_product_id_idx on public.order_items (product_id);

-- =============================================================== GASTOS =====
create table if not exists public.expenses (
  id         uuid primary key default gen_random_uuid(),
  tienda_id  uuid not null references public.tiendas(id),
  date       date not null,
  kind       public.expense_kind not null default 'gasto',
  amount     numeric(14,2) not null check (amount >= 0),
  concept    text not null default '',
  notes      text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expenses_tienda_id_idx on public.expenses (tienda_id);
create index if not exists expenses_date_idx on public.expenses (date desc);
create index if not exists expenses_kind_idx on public.expenses (kind);

drop trigger if exists expenses_set_updated_at on public.expenses;
create trigger expenses_set_updated_at
  before update on public.expenses
  for each row execute function public.set_updated_at();

-- ======================================================== CIERRE DIARIO =====
-- Para cuando se importa un histórico de contabilidad externo (Excel u otra
-- fuente). La app registra ventas y gastos en vivo con sales/expenses; esta
-- tabla no la escribe la app por su cuenta.
create table if not exists public.daily_closes (
  id              uuid primary key default gen_random_uuid(),
  tienda_id       uuid not null references public.tiendas(id),
  date            date not null,
  sales_total     numeric(14,2) not null default 0 check (sales_total >= 0),
  gain            numeric(14,2) not null default 0,
  expenses_total  numeric(14,2) not null default 0 check (expenses_total >= 0),
  purchases_total numeric(14,2) not null default 0 check (purchases_total >= 0),
  cash_in         numeric(14,2),   -- null = ese día no se anotó nada
  cash_out        numeric(14,2),
  -- Plata que se contó en el cajón al cerrar. null = no se contó (cierres del
  -- Excel o anotados a mano). La diferencia con lo esperado se calcula en la
  -- pantalla a partir de las ventas, abonos y gastos del día.
  cash_counted    numeric(14,2) check (cash_counted is null or cash_counted >= 0),
  source          public.daily_close_source not null default 'app',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- Un cierre por fecha y por tienda, no por fecha global.
  constraint daily_closes_tienda_date_key unique (tienda_id, date)
);

create index if not exists daily_closes_tienda_id_idx on public.daily_closes (tienda_id);
create index if not exists daily_closes_date_idx on public.daily_closes (date desc);
create index if not exists daily_closes_source_idx on public.daily_closes (source);

-- Para bases creadas antes de que existiera la columna.
alter table public.daily_closes
  add column if not exists cash_counted numeric(14,2)
  check (cash_counted is null or cash_counted >= 0);

drop trigger if exists daily_closes_set_updated_at on public.daily_closes;
create trigger daily_closes_set_updated_at
  before update on public.daily_closes
  for each row execute function public.set_updated_at();

-- ======================================================== ABONOS DE FIADO ==
-- El cuaderno de fiados: lo que un cliente debe es la suma de sus ventas
-- fiadas (sales con payment_method = 'fiado' y sin anular) menos lo que ha
-- abonado aquí. Se permiten abonos parciales ("me dio 10 mil") porque así se
-- cobra el fiado en una tienda de barrio.
--
-- El cliente se identifica por su nombre, igual que en sales.client_name; la
-- API compara sin mayúsculas, tildes ni espacios de más
-- (src/lib/fiados.ts). Un abono nunca toca el inventario: la mercancía ya
-- salió el día que se fió.
create table if not exists public.fiado_payments (
  id             uuid primary key default gen_random_uuid(),
  tienda_id      uuid not null references public.tiendas(id),
  client_name    text not null check (length(btrim(client_name)) > 0),
  amount         numeric(14,2) not null check (amount > 0),
  payment_method public.payment_method not null default 'efectivo'
                 check (payment_method <> 'fiado'),
  paid_at        timestamptz not null default now(),
  created_at     timestamptz not null default now()
);
create index if not exists fiado_payments_tienda_idx on public.fiado_payments (tienda_id, paid_at desc);

-- ================================================================= VISTAS ===
-- security_invoker = true en todas: sin eso una vista se consulta con los
-- permisos de quien la creó y se salta el RLS de la tabla de abajo, o sea que
-- con la anon key se podría leer por la puerta de atrás lo que la tabla le
-- niega. Con el interruptor puesto, la API (service_role) sigue viendo todo
-- y el navegador, nada.

-- Los productos con el nombre de su categoría y de su marca ya resueltos.
-- Existe para que la API pueda buscar y ordenar por esos nombres con una sola
-- consulta plana: PostgREST no sabe meter una tabla relacionada dentro de un
-- `or(...)`, así que el join se hace acá. Se lee de la vista y se escribe en
-- la tabla.
drop view if exists public.v_products;
create view public.v_products with (security_invoker = true) as
select
  p.id,
  p.name,
  p.sku,
  p.barcode,
  p.photo,
  p.price,
  p.cost_price,
  p.stock,
  p.description,
  p.created_at,
  p.updated_at,
  p.tienda_id,
  p.category_id,
  p.brand_id,
  c.name as category,
  b.name as brand
from public.products p
left join public.categories c on c.id = p.category_id
left join public.brands     b on b.id = p.brand_id;

-- Ventas registradas en la app, agrupadas por día y por tienda.
create or replace view public.v_sales_daily with (security_invoker = true) as
select
  s.tienda_id,
  (s.sale_date at time zone 'America/Bogota')::date as date,
  count(*)                          as sales_count,
  coalesce(sum(s.total_amount), 0)  as sales_total,
  coalesce(sum(s.gain), 0)          as gain
from public.sales s
where not s.voided
group by 1, 2;

-- Lo mismo que v_sales_daily pero agrupado por mes, y sobre daily_closes en
-- vez de sales: es lo que alimenta cualquier histórico importado.
create or replace view public.v_monthly_summary with (security_invoker = true) as
select
  dc.tienda_id,
  to_char(date_trunc('month', dc.date), 'YYYY-MM') as month,
  count(*)                             as days,
  coalesce(sum(dc.sales_total), 0)     as sales_total,
  coalesce(sum(dc.gain), 0)            as gain,
  coalesce(sum(dc.expenses_total), 0)  as expenses_total,
  coalesce(sum(dc.purchases_total), 0) as purchases_total
from public.daily_closes dc
group by 1, 2;

-- Las categorías de la tienda con su conteo, para los filtros y el select del
-- formulario. Salen de la tabla y no de los productos: una categoría recién
-- creada aparece aunque todavía no tenga nada adentro.
create or replace view public.v_product_categories with (security_invoker = true) as
select
  c.tienda_id,
  c.id                                     as category_id,
  c.name                                   as category,
  count(p.id)                              as product_count,
  coalesce(sum(p.stock), 0)                as stock_units,
  coalesce(sum(p.stock * p.cost_price), 0) as stock_value_cost
from public.categories c
left join public.products p on p.category_id = c.id
group by 1, 2, 3;

create or replace view public.v_product_brands with (security_invoker = true) as
select
  b.tienda_id,
  b.id                                     as brand_id,
  b.name                                   as brand,
  count(p.id)                              as product_count,
  coalesce(sum(p.stock), 0)                as stock_units,
  coalesce(sum(p.stock * p.cost_price), 0) as stock_value_cost
from public.brands b
left join public.products p on p.brand_id = b.id
group by 1, 2, 3;

-- Los proveedores de la tienda con cuántos pedidos activos tiene cada uno
-- (los cancelados no cuentan, igual que "Compras históricas" en Pedidos).
-- Salen de la tabla y no de los pedidos: un proveedor recién creado aparece
-- aunque todavía no tenga ningún pedido.
create or replace view public.v_order_suppliers with (security_invoker = true) as
select
  s.tienda_id,
  s.id                                                as supplier_id,
  s.name                                               as supplier,
  count(o.id) filter (where o.status <> 'cancelado')  as order_count
from public.suppliers s
left join public.orders o on o.supplier_id = s.id
group by 1, 2, 3;

-- =========================================================== FUNCIONES ======
-- Todo lo que toca dos tablas a la vez vive aquí: supabase-js no puede abrir
-- una transacción desde el cliente, así que la venta + sus líneas + el
-- descuento de stock (o el pedido, o el cierre) tienen que pasar o fallar
-- juntos dentro de una función. Todas piden p_tienda_id explícito y filtran
-- por él: es lo que impide que una tienda toque los datos de otra.

-- Registra una venta completa. Devuelve la fila de sales ya con los totales.
-- p_sale : { sale_date, payment_method, client_name, voided }
-- p_items: [ { product_id, product, quantity, sale_price, discount_type, discount_value } ]
-- El total y la ganancia NO se toman del cliente: se calculan aquí a partir de
-- las líneas y del cost_price del catálogo.
create or replace function public.create_sale(
  p_sale         jsonb,
  p_items        jsonb,
  p_tienda_id    uuid,
  p_adjust_stock boolean default true
)
returns public.sales
language plpgsql
as $$
declare
  v_sale public.sales;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta necesita al menos una línea de producto'
      using errcode = '22023';
  end if;

  insert into public.sales (tienda_id, sale_date, payment_method, client_name, voided)
  values (
    p_tienda_id,
    coalesce((p_sale->>'sale_date')::timestamptz, now()),
    coalesce((p_sale->>'payment_method')::public.payment_method, 'efectivo'),
    nullif(btrim(coalesce(p_sale->>'client_name', '')), ''),
    coalesce((p_sale->>'voided')::boolean, false)
  )
  returning * into v_sale;

  insert into public.sale_items (
    sale_id, product_id, product_name, quantity, sale_price, discount_type, discount_value
  )
  select
    v_sale.id,
    p.id,
    coalesce(nullif(btrim(coalesce(it->>'product', '')), ''), p.name, 'Producto sin registrar'),
    coalesce((it->>'quantity')::numeric, 0),
    coalesce((it->>'sale_price')::numeric, p.price, 0),
    nullif(it->>'discount_type', '')::public.sale_discount_type,
    coalesce((it->>'discount_value')::numeric, 0)
  from jsonb_array_elements(p_items) as it
  left join public.products p
    on p.id = nullif(it->>'product_id', '')::uuid
   and p.tienda_id = p_tienda_id;

  update public.sales s
  set total_amount = t.total,
      gain         = t.total - t.cost
  from (
    select
      coalesce(sum(si.line_total), 0)                          as total,
      coalesce(sum(si.quantity * coalesce(p.cost_price, 0)), 0) as cost
    from public.sale_items si
    left join public.products p on p.id = si.product_id
    where si.sale_id = v_sale.id
  ) t
  where s.id = v_sale.id
  returning s.* into v_sale;

  if p_adjust_stock and not v_sale.voided then
    update public.products p
    set stock = p.stock - agg.qty
    from (
      select si.product_id, sum(si.quantity) as qty
      from public.sale_items si
      where si.sale_id = v_sale.id and si.product_id is not null
      group by si.product_id
    ) agg
    where p.id = agg.product_id and p.tienda_id = p_tienda_id;
  end if;

  return v_sale;
end;
$$;

-- Anula una venta y devuelve la mercancía al inventario.
-- Se prefiere anular antes que borrar: la venta anulada queda en el historial.
create or replace function public.void_sale(
  p_sale_id       uuid,
  p_tienda_id     uuid,
  p_restore_stock boolean default true
)
returns public.sales
language plpgsql
as $$
declare
  v_sale public.sales;
begin
  select * into v_sale from public.sales where id = p_sale_id and tienda_id = p_tienda_id;
  if not found then
    raise exception 'Venta no encontrada' using errcode = 'P0002';
  end if;
  if v_sale.voided then
    return v_sale;  -- ya estaba anulada: no se devuelve el stock dos veces
  end if;

  if p_restore_stock then
    update public.products p
    set stock = p.stock + agg.qty
    from (
      select si.product_id, sum(si.quantity) as qty
      from public.sale_items si
      where si.sale_id = p_sale_id and si.product_id is not null
      group by si.product_id
    ) agg
    where p.id = agg.product_id and p.tienda_id = p_tienda_id;
  end if;

  update public.sales
  set voided = true, voided_at = now()
  where id = p_sale_id
  returning * into v_sale;

  return v_sale;
end;
$$;

-- Crea un pedido a proveedor con sus líneas. No toca el stock: eso pasa al
-- recibir (receive_order).
-- p_order: { order_date, supplier, expected_delivery, notes, status, attachment }
-- p_items: [ { product_id, product, quantity, unit_cost } ]
create or replace function public.create_order(
  p_order     jsonb,
  p_items     jsonb,
  p_tienda_id uuid
)
returns public.orders
language plpgsql
as $$
declare
  v_order public.orders;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'El pedido necesita al menos una línea de producto'
      using errcode = '22023';
  end if;

  insert into public.orders (tienda_id, order_date, supplier, supplier_id, expected_delivery, notes, status, attachment)
  values (
    p_tienda_id,
    coalesce((p_order->>'order_date')::timestamptz, now()),
    btrim(coalesce(p_order->>'supplier', '')),
    nullif(p_order->>'supplier_id', '')::uuid,
    nullif(p_order->>'expected_delivery', '')::date,
    coalesce(p_order->>'notes', ''),
    coalesce((p_order->>'status')::public.order_status, 'pendiente'),
    nullif(p_order->>'attachment', '')
  )
  returning * into v_order;

  insert into public.order_items (order_id, product_id, product_name, quantity, unit_cost, status)
  select
    v_order.id,
    p.id,
    coalesce(nullif(btrim(coalesce(it->>'product', '')), ''), p.name, 'Producto sin registrar'),
    coalesce((it->>'quantity')::numeric, 0),
    coalesce((it->>'unit_cost')::numeric, p.cost_price, 0),
    coalesce((it->>'status')::public.order_item_status, 'por_pedir')
  from jsonb_array_elements(p_items) as it
  left join public.products p
    on p.id = nullif(it->>'product_id', '')::uuid
   and p.tienda_id = p_tienda_id;

  update public.orders o
  set total_amount = t.total
  from (
    select coalesce(sum(oi.line_total), 0) as total
    from public.order_items oi
    where oi.order_id = v_order.id and oi.status <> 'cancelado'
  ) t
  where o.id = v_order.id
  returning o.* into v_order;

  return v_order;
end;
$$;

-- Marca el pedido como recibido y suma la mercancía al inventario.
-- p_update_cost: si se pasa en true, además pisa el cost_price del catálogo
-- con el costo del pedido. Va apagado por defecto porque cambia datos del
-- negocio.
-- El stock y el costo solo se toman de líneas no canceladas, y al recibir
-- cada línea no cancelada pasa a 'recibido': el proveedor siempre entrega
-- todo el pedido de una vez, nunca por partes.
create or replace function public.receive_order(
  p_order_id     uuid,
  p_tienda_id    uuid,
  p_adjust_stock boolean default true,
  p_update_cost  boolean default false
)
returns public.orders
language plpgsql
as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order_id and tienda_id = p_tienda_id;
  if not found then
    raise exception 'Pedido no encontrado' using errcode = 'P0002';
  end if;
  if v_order.status = 'recibido' then
    return v_order;  -- idempotente: no se suma el stock dos veces
  end if;
  if v_order.status = 'cancelado' then
    raise exception 'El pedido está cancelado y no se puede recibir'
      using errcode = '22023';
  end if;

  if p_adjust_stock then
    update public.products p
    set stock = p.stock + agg.qty
    from (
      select oi.product_id, sum(oi.quantity) as qty
      from public.order_items oi
      where oi.order_id = p_order_id and oi.product_id is not null and oi.status <> 'cancelado'
      group by oi.product_id
    ) agg
    where p.id = agg.product_id and p.tienda_id = p_tienda_id;
  end if;

  if p_update_cost then
    update public.products p
    set cost_price = agg.cost
    from (
      select oi.product_id, max(oi.unit_cost) as cost
      from public.order_items oi
      where oi.order_id = p_order_id and oi.product_id is not null and oi.unit_cost > 0 and oi.status <> 'cancelado'
      group by oi.product_id
    ) agg
    where p.id = agg.product_id and p.tienda_id = p_tienda_id;
  end if;

  update public.order_items
  set status = 'recibido'
  where order_id = p_order_id and status <> 'cancelado';

  update public.orders
  set status = 'recibido', received_at = now()
  where id = p_order_id
  returning * into v_order;

  return v_order;
end;
$$;

-- Cancela un pedido. Si ya estaba recibido, descuenta lo que había sumado
-- (solo lo no cancelado). Cancelar el pedido completo cancela también todas
-- sus líneas: nada de eso llegó.
create or replace function public.cancel_order(
  p_order_id     uuid,
  p_tienda_id    uuid,
  p_adjust_stock boolean default true
)
returns public.orders
language plpgsql
as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order_id and tienda_id = p_tienda_id;
  if not found then
    raise exception 'Pedido no encontrado' using errcode = 'P0002';
  end if;
  if v_order.status = 'cancelado' then
    return v_order;
  end if;

  if p_adjust_stock and v_order.status = 'recibido' then
    update public.products p
    set stock = p.stock - agg.qty
    from (
      select oi.product_id, sum(oi.quantity) as qty
      from public.order_items oi
      where oi.order_id = p_order_id and oi.product_id is not null and oi.status <> 'cancelado'
      group by oi.product_id
    ) agg
    where p.id = agg.product_id and p.tienda_id = p_tienda_id;
  end if;

  update public.order_items
  set status = 'cancelado'
  where order_id = p_order_id;

  update public.orders
  set status = 'cancelado', received_at = null
  where id = p_order_id
  returning * into v_order;

  return v_order;
end;
$$;

-- Agrega una línea a un pedido que sigue pendiente: permite ir sumando
-- productos a lo largo de varios días mientras se arma "lo que necesito
-- pedir", en vez de tener que saberlo todo el mismo día de crear el pedido.
create or replace function public.add_order_item(
  p_order_id     uuid,
  p_tienda_id    uuid,
  p_product_id   uuid,
  p_product_name text default null,
  p_quantity     numeric default null,
  p_unit_cost    numeric default null
)
returns public.orders
language plpgsql
as $$
declare
  v_order   public.orders;
  v_product public.products;
begin
  select * into v_order from public.orders where id = p_order_id and tienda_id = p_tienda_id;
  if not found then
    raise exception 'Pedido no encontrado' using errcode = 'P0002';
  end if;
  if v_order.status <> 'pendiente' then
    raise exception 'Solo se pueden agregar productos a un pedido pendiente'
      using errcode = '22023';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'La cantidad debe ser mayor que cero' using errcode = '22023';
  end if;

  if p_product_id is not null then
    select * into v_product from public.products where id = p_product_id and tienda_id = p_tienda_id;
  end if;

  insert into public.order_items (order_id, product_id, product_name, quantity, unit_cost, status)
  values (
    p_order_id,
    p_product_id,
    coalesce(nullif(btrim(coalesce(p_product_name, '')), ''), v_product.name, 'Producto sin registrar'),
    p_quantity,
    coalesce(p_unit_cost, v_product.cost_price, 0),
    'por_pedir'
  );

  update public.orders o
  set total_amount = t.total
  from (
    select coalesce(sum(oi.line_total), 0) as total
    from public.order_items oi
    where oi.order_id = p_order_id and oi.status <> 'cancelado'
  ) t
  where o.id = p_order_id
  returning o.* into v_order;

  return v_order;
end;
$$;

-- Mueve un producto de un pedido pendiente entre por_pedir/en_espera, o lo
-- cancela individualmente sin tocar el resto del pedido.
-- 'recibido' no es un valor permitido acá: se pone solo, junto para todas las
-- líneas, al recibir el pedido completo (receive_order de arriba), porque el
-- proveedor siempre entrega todo de una.
create or replace function public.update_order_item_status(
  p_order_item_id uuid,
  p_tienda_id     uuid,
  p_status        public.order_item_status
)
returns public.orders
language plpgsql
as $$
declare
  v_order    public.orders;
  v_order_id uuid;
begin
  if p_status = 'recibido' then
    raise exception 'El estado "recibido" se pone al recibir todo el pedido, no producto por producto'
      using errcode = '22023';
  end if;

  select oi.order_id into v_order_id
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where oi.id = p_order_item_id and o.tienda_id = p_tienda_id;

  if v_order_id is null then
    raise exception 'Producto del pedido no encontrado' using errcode = 'P0002';
  end if;

  select * into v_order from public.orders where id = v_order_id;
  if v_order.status <> 'pendiente' then
    raise exception 'El pedido ya está cerrado: no se puede cambiar el estado de sus productos'
      using errcode = '22023';
  end if;

  update public.order_items set status = p_status where id = p_order_item_id;

  update public.orders o
  set total_amount = t.total
  from (
    select coalesce(sum(oi.line_total), 0) as total
    from public.order_items oi
    where oi.order_id = v_order_id and oi.status <> 'cancelado'
  ) t
  where o.id = v_order_id
  returning o.* into v_order;

  return v_order;
end;
$$;

-- Todos los indicadores del tablero en una sola llamada.
-- Las ventas de daily_closes (histórico importado) y las de sales (vivas de
-- la app) van separadas a propósito: sumarlas sería contar el mismo dinero
-- dos veces si algún día llegara a tener las dos cosas.
create or replace function public.get_summary(
  p_tienda_id uuid,
  p_from      date default null,
  p_to        date default null
)
returns jsonb
language sql
stable
as $$
with rango as (
  select
    coalesce(p_from, (select min(dc.date) from public.daily_closes dc where dc.tienda_id = p_tienda_id), current_date - 29) as f,
    coalesce(p_to, greatest(current_date, (select max(dc.date) from public.daily_closes dc where dc.tienda_id = p_tienda_id))) as t
)
select jsonb_build_object(
  'range', (select jsonb_build_object('from', r.f, 'to', r.t) from rango r),

  'daily_closes', (
    select jsonb_build_object(
      'days',            count(*),
      'sales_total',     coalesce(sum(dc.sales_total), 0),
      'gain',            coalesce(sum(dc.gain), 0),
      'expenses_total',  coalesce(sum(dc.expenses_total), 0),
      'purchases_total', coalesce(sum(dc.purchases_total), 0),
      'cash_in',         coalesce(sum(dc.cash_in), 0),
      'cash_out',        coalesce(sum(dc.cash_out), 0)
    )
    from public.daily_closes dc, rango r
    where dc.tienda_id = p_tienda_id
      and dc.date between r.f and r.t
  ),

  'sales', (
    select jsonb_build_object(
      'count',        count(*),
      'total_amount', coalesce(sum(s.total_amount), 0),
      'gain',         coalesce(sum(s.gain), 0),
      'ticket_avg',   coalesce(round(avg(s.total_amount), 2), 0)
    )
    from public.sales s, rango r
    where not s.voided
      and s.tienda_id = p_tienda_id
      and (s.sale_date at time zone 'America/Bogota')::date between r.f and r.t
  ),

  'sales_by_payment_method', (
    select coalesce(jsonb_object_agg(x.payment_method, x.total), '{}'::jsonb)
    from (
      select s.payment_method::text as payment_method, coalesce(sum(s.total_amount), 0) as total
      from public.sales s, rango r
      where not s.voided
        and s.tienda_id = p_tienda_id
        and (s.sale_date at time zone 'America/Bogota')::date between r.f and r.t
      group by 1
    ) x
  ),

  'expenses', (
    select coalesce(jsonb_object_agg(x.kind, x.total), '{}'::jsonb)
    from (
      select e.kind::text as kind, coalesce(sum(e.amount), 0) as total
      from public.expenses e, rango r
      where e.tienda_id = p_tienda_id
        and e.date between r.f and r.t
      group by 1
    ) x
  ),

  'orders', (
    select jsonb_build_object(
      'total',           count(*),
      'pendientes',      count(*) filter (where o.status = 'pendiente'),
      'recibidos',       count(*) filter (where o.status = 'recibido'),
      'cancelados',      count(*) filter (where o.status = 'cancelado'),
      'monto_pendiente', coalesce(sum(o.total_amount) filter (where o.status = 'pendiente'), 0),
      'atrasados',       count(*) filter (
        where o.status = 'pendiente'
          and o.expected_delivery is not null
          and o.expected_delivery < current_date
      )
    )
    from public.orders o, rango r
    where o.tienda_id = p_tienda_id
      and (o.order_date at time zone 'America/Bogota')::date between r.f and r.t
  ),

  'inventory', (
    select jsonb_build_object(
      'products',          count(*),
      'sin_stock',         count(*) filter (where p.stock <= 0),
      'stock_bajo',        count(*) filter (where p.stock > 0 and p.stock <= 10),
      'valor_costo',       coalesce(sum(p.stock * p.cost_price), 0),
      'valor_venta',       coalesce(sum(p.stock * p.price), 0)
    )
    from public.products p
    where p.tienda_id = p_tienda_id
  ),

  'monthly', (
    select coalesce(jsonb_agg(to_jsonb(m) order by m.month), '[]'::jsonb)
    from public.v_monthly_summary m, rango r
    where m.tienda_id = p_tienda_id
      and m.month between to_char(r.f, 'YYYY-MM') and to_char(r.t, 'YYYY-MM')
  ),

  'top_products', (
    select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb)
    from (
      select
        si.product_id,
        si.product_name,
        sum(si.quantity)   as quantity,
        sum(si.line_total) as total
      from public.sale_items si
      join public.sales s on s.id = si.sale_id, rango r
      where not s.voided
        and s.tienda_id = p_tienda_id
        and (s.sale_date at time zone 'America/Bogota')::date between r.f and r.t
      group by si.product_id, si.product_name
      order by 3 desc
      limit 5
    ) x
  )
);
$$;

-- ========================================================= search_path ======
-- Cada función de public corre con search_path fijo. Sin esto, quien pueda
-- crear objetos en otro esquema del search_path podría tapar una tabla con
-- la suya y la función la usaría sin saberlo. Se aplica a todas las funciones
-- de public que no sean de una extensión, también a las que se agreguen.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and not exists (
        select 1 from pg_depend d
        where d.objid = p.oid and d.deptype = 'e'
      )
  loop
    execute format('alter function %s set search_path = public', f.sig);
  end loop;
end $$;

-- ================================================================= RLS ======
-- Activo y SIN políticas en todas: nadie con la anon key (o sea, nadie desde
-- el navegador) puede leer ni escribir. Todo pasa por /api, que se conecta
-- con la service_role key desde el servidor y salta RLS.
--
-- Si en algún momento se quiere consultar Supabase directo desde el
-- navegador mientras se desarrolla, correr supabase/sql/05_policies_dev.sql.
-- Leer antes las advertencias de ese archivo.
alter table public.login_attempts enable row level security;
alter table public.tiendas       enable row level security;
alter table public.products      enable row level security;
alter table public.categories    enable row level security;
alter table public.brands        enable row level security;
alter table public.sales         enable row level security;
alter table public.sale_items    enable row level security;
alter table public.orders        enable row level security;
alter table public.order_items   enable row level security;
alter table public.expenses      enable row level security;
alter table public.daily_closes  enable row level security;
alter table public.suppliers     enable row level security;
alter table public.fiado_payments enable row level security;

-- Además de RLS, anon y authenticated no tienen ningún permiso sobre public:
-- ni siquiera aparecen las tablas en la API GraphQL de Supabase. Segunda
-- capa por si alguna vez una tabla nueva queda sin RLS. Los "default
-- privileges" hacen lo mismo con lo que se cree después.
-- (05_policies_dev.sql devuelve los permisos si se necesitan para desarrollar.)
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from public, anon, authenticated;
grant execute on all functions in schema public to service_role;

-- =============================================================== STORAGE ====
-- Bucket público para las fotos que la propia tienda sube o toma con la
-- cámara del celular al crear un producto (distinto de "photo" cuando viene
-- de un catálogo público, que ya es una URL externa). Público de lectura
-- porque son fotos de producto, no datos sensibles; la escritura solo pasa
-- por /api/products/photo con la service_role, así que no hace falta
-- política de insert/update/delete: RLS de storage.objects no aplica a esa
-- clave.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-photos', 'product-photos', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
