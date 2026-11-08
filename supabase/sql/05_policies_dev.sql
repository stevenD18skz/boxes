-- =============================================================================
-- OPCIONAL · Políticas abiertas para desarrollo
-- =============================================================================
-- NO correr esto si no hace falta.
--
-- El esquema deja RLS activo y sin políticas: las tablas solo se pueden tocar
-- desde el servidor con la service_role key, que es como trabajan las rutas de
-- /api. Ese es el modo seguro y es el que la app usa.
--
-- Este archivo abre lectura y escritura a la anon key, o sea a cualquiera que
-- tenga la URL del proyecto y la clave pública que va en el bundle del
-- navegador. Sirve solo para dos cosas:
--   1. probar consultas rápido desde el navegador mientras se desarrolla;
--   2. que el front funcione sin haber configurado todavía SUPABASE_SERVICE_ROLE_KEY.
--
-- Con esto activo, cualquiera que abra la app puede leer los precios, ver las
-- ventas del negocio y borrar tablas enteras desde la consola del navegador.
-- Antes de publicar la aplicación hay que revertirlo con el bloque comentado
-- del final de este mismo archivo.
--
-- `tiendas` NO está en la lista a propósito: guarda los hash de las contraseñas
-- y no se abre ni para desarrollar. El login pasa por /api como todo lo demás.
--
-- Estado actual de la base del proyecto: CERRADA. Estas políticas se aplicaron
-- mientras no había service_role configurada y se quitaron el 2026-07-27, ya
-- con SUPABASE_SERVICE_ROLE_KEY en su sitio.
-- =============================================================================

-- 01_schema.sql le quita a anon y authenticated todos los permisos sobre
-- public, así que además de la política hay que devolverles el permiso.
do $$
declare t text;
begin
  foreach t in array array[
    'products', 'categories', 'brands', 'sales', 'sale_items', 'orders',
    'order_items', 'expenses', 'daily_closes', 'suppliers'
  ] loop
    execute format('grant select, insert, update, delete on public.%I to anon, authenticated', t);
    execute format('drop policy if exists dev_all_access on public.%I', t);
    execute format(
      'create policy dev_all_access on public.%I for all to anon, authenticated using (true) with check (true)',
      t
    );
  end loop;
end $$;

-- Para volver al modo seguro, descomentar esto y correrlo. Lleva `tiendas` de
-- más por si alguna vez se abrió a mano: borrar una política que no existe no
-- hace nada.
--
-- do $$
-- declare t text;
-- begin
--   foreach t in array array[
--     'products', 'categories', 'brands', 'sales', 'sale_items', 'orders',
--     'order_items', 'expenses', 'daily_closes', 'suppliers', 'tiendas'
--   ] loop
--     execute format('revoke all on public.%I from anon, authenticated', t);
--     execute format('drop policy if exists dev_all_access on public.%I', t);
--     execute format('alter table public.%I enable row level security', t);
--   end loop;
-- end $$;
