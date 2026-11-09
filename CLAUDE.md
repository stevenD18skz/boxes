# Boxes

App de gestión para tiendas de barrio: productos e inventario, ventas con cierre
diario, pedidos a proveedores, gastos y reportes. Multi-tienda: cada tienda entra
con su nombre y contraseña, y todo lo que ve está filtrado por su `tienda_id`.

Todo el producto (UI, mensajes de error, comentarios, docs) está **en español**.
Moneda en pesos colombianos y fechas en hora de Bogotá (`todayInBogota` en
`src/lib/api/query.ts`).

## Comandos

```bash
npm run dev           # Next 15 con Turbopack
npm run build
npm run lint          # ESLint 9 (flat config). No hay tests automatizados
npm run seed:tiendas  # crea las tiendas reales y la de demo (ver supabase/README.md)
```

Hay `package-lock.json` y `pnpm-lock.yaml`; los dos funcionan. Si agregas una
dependencia, actualiza ambos o pregunta cuál se mantiene.

## Stack

- Next.js 15 (App Router), React 18, JS y TS mezclados (`strict: false`). Lo
  nuevo en `lib/`, `hooks/`, `types/` y `api/` va en TS; muchos componentes y
  servicios siguen en `.jsx`/`.js`, y no hace falta migrarlos.
- Tailwind 3 con la paleta por defecto (slate/blue/teal). No hay tokens propios
  ni modo oscuro. Animaciones propias en `tailwind.config.js`
  (`animate-fade-slide-up`, `animate-scale-in`, `animate-dropdown-in`).
- Supabase (Postgres, Storage para fotos y Realtime para el lector del celular).
- SWR para pedir datos, `lucide-react` para íconos y `browser-image-compression`
  para las fotos.
- Alias `@/*` → `src/*`.

## Arquitectura

```
src/app/(auth)/        login, signup
src/app/(tienda)/      pantallas con sesión: dashboard, products, sales, orders,
                       orders/history, expenses, summary, settings
src/app/api/           rutas HTTP (servidor). Única puerta a la base
src/app/page.tsx       landing pública (componentes en components/landing)
src/app/manual/        manual de uso público
src/app/simulacion/    entrada al modo simulación
src/app/scan/          pantalla pública del celular que hace de lector
src/components/<área>/ componentes por pantalla; components/ui = compartidos
src/services/*.service.js  lo que llama el front (simulación o /api)
src/lib/api/           helpers de las rutas: http, errors, validate, query, mappers
src/types/             tipos de dominio (Product, Sale, Order…) y de la base
supabase/sql/          esquema completo en 01_schema.sql (fuente única)
docs/API.md            contrato de la API
```

### Flujo de datos

Componente → hook (`useProductsCatalog`, etc.) → `services/*.service.js` →
`/api/...` → Supabase con `service_role`.

- **El navegador nunca habla con la base.** La `service_role` solo vive en el
  servidor (`src/lib/supabase/server.ts`). La anon key se usa únicamente en el
  chip de estado y en Realtime del lector.
- **Sesión:** `src/middleware.ts` valida la cookie firmada (`SESSION_SECRET`) y
  pasa la tienda en el header `x-tienda-id`. Las rutas la leen con
  `requireTiendaId(request)` y **toda consulta debe filtrar por esa tienda.**
  Las páginas públicas están listadas en el middleware: si agregas una, va ahí.
- **Login:** responde lo mismo si falla el correo o la contraseña
  (`invalid_credentials`) y frena por correo e IP con la tabla `login_attempts`
  (`src/lib/auth/loginThrottle.ts`). Las contraseñas nuevas piden 8 caracteres.
- **Modo simulación:** cada servicio pregunta `isSimulationOn()`. Si está
  encendido, trabaja sobre datos de mentira en `sessionStorage`
  (`src/lib/simulation/`) y nunca llama a `/api`. **Cualquier función nueva de
  un servicio necesita las dos ramas**, la simulada y la real, y ambas deben
  devolver la misma forma (los tipos de `src/types`).

### Convenciones de la API

Lee `docs/API.md` antes de tocar una ruta. Resumen:

- Respuesta `{ data, meta? }` o `{ error: { message, code, details? } }`, siempre
  armada con `handle`/`ok`/`created`/`noContent` de `src/lib/api/http.ts`.
- `message` va en español y se muestra tal cual en pantalla.
- Validación con `Fields`/`readJson` (`src/lib/api/validate.ts`); los errores de
  formulario van campo por campo en `details` (422).
- Listados con `parseListQuery` (orden, paginación, rango de fechas, `q`).
- Filas de la base → tipos de dominio solo a través de `src/lib/api/mappers.ts`.
- Cada ruta declara `export const runtime = "nodejs"` y
  `export const dynamic = "force-dynamic"`.
- Si cambias la forma de una respuesta, actualiza `docs/API.md`, `src/types` y
  la rama de simulación del servicio.

### Base de datos

- El esquema completo está en `supabase/sql/01_schema.sql`. Los cambios de
  esquema se hacen ahí (idempotente) y se describen en `supabase/README.md`.
  Se corren a mano en el SQL Editor de Supabase; no hay migraciones.
- RLS activo y sin políticas en todas las tablas, y `anon`/`authenticated` sin
  permisos sobre `public`. Una tabla nueva necesita su línea en el bloque RLS
  de `01_schema.sql`. Las funciones nuevas toman `search_path = public` solas
  al volver a correr el archivo.
- `99_reset.sql` es destructivo: nunca lo ejecutes ni lo sugieras sin que se
  pida.
- Trampa conocida: los gastos de 2025 importados del Excel duplican
  `daily_closes.expenses_total`. Al sumar, usa una fuente o la otra (ver el
  comentario en `src/app/api/expenses/route.ts`).

## UI y UX

Quien usa Boxes es un tendero de barrio con conocimiento básico de
tecnología, que atiende clientes mientras usa la app y lo interrumpen a cada
rato. Lo primero es que sea obvio y rápido; lo bonito va después.

- **Lenguaje de la tienda, no de software:** "Te deben", "Vendiste",
  "Quedan pocos", "Código interno", "Le ganas". Nada de SKU, stock, KPI ni
  textos en inglés. Los errores dicen qué pasó y qué hacer.
- **Paleta (tailwind.config.js):** neutros tibios (`slate` apunta a `stone`) y
  un solo acento, `brand` (verde petróleo). `blue`, `teal`, `indigo`,
  `violet` y `sky` también apuntan a `brand` para que lo viejo quede parejo;
  lo nuevo usa `brand` y `slate` directo. Verde esmeralda = plata que entró,
  ámbar = aviso, rojo = peligro. Texto como mínimo `slate-500` (contraste AA).
- **Fuente:** Atkinson Hyperlegible (`app/layout.jsx`), hecha para baja visión.
- **Tamaños:** texto de cuerpo 16px (`text-base`), etiquetas como mínimo 14px,
  nada en mayúsculas diminutas. Todo lo que se toca mide 44px o más.
- **Una acción principal por pantalla** (botón `brand-600` grande) y lo demás
  secundario o agrupado (Ley de Hick).
- **No bloquear la venta:** se vende aunque el inventario diga 0 (solo se
  avisa); el carrito sobrevive a cambiar de pantalla (`sessionStorage`);
  cancelar se puede deshacer.
- **Montos siempre con `MoneyInput`** ("5.000", "$5.000" y "5000" valen lo
  mismo). Nunca `<input type="number">` para plata.
- **Búsquedas sin tildes:** `matchesText` / `normalizeText` de `src/lib/text.ts`.
- **Diálogos con `components/ui/Dialog.jsx`** (role, Escape, foco). Para
  confirmar, `ConfirmDialog`; para avisos, `ToastStack`/`useToasts` (aceptan
  una acción, p. ej. "Deshacer").
- Cada pantalla que carga datos tiene estado de carga, vacío (que diga qué
  hacer), error (con "Intentar otra vez") y lleno.
- Escritorio: tablas (`*Table.jsx`) y `SideBar`; celular: tarjetas
  (`*CardList.jsx`) y `BottomNav` con lo del día a día (Inicio, Ventas,
  Fiados, Productos).
- Lector de código de barras: con pistola USB (`useBarcodeScanner`), con la
  cámara (`useCameraScanner`) o con el celular vinculado por QR y Realtime
  (`usePhoneScanner`, `lib/phoneScanner.ts`). Compara solo dígitos y sin ceros
  a la izquierda.
- **Fiados** (`/fiados`, `src/lib/fiados.ts`): saldo por cliente = ventas
  fiadas sin anular − abonos (`fiado_payments`). Los abonos pueden ser
  parciales y no tocan el inventario.
- **Cierre del día** (`components/sales/DailyCloseMode.jsx` +
  `dayCloseUtils.js`): se calcula con las ventas, abonos y gastos del día; solo
  se pide contar el cajón.
- Para revisar diseño: skills `impeccable` (critique/audit) e `intent`; el
  detector es `impeccable detect src/app src/components`.

## Entorno

Copia `.env.example` a `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` y `SESSION_SECRET`.
Nunca subas `.env.local` ni pongas la `service_role` detrás de `NEXT_PUBLIC_`.
Se despliega en Vercel.

## Git

Commits en formato conventional (`feat:`, `fix:`, `feat(api):`), en inglés o
español.
