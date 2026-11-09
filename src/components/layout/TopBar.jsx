// TopBar.jsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, Menu, Settings } from "lucide-react";
import SimulationChip from "@/components/simulation/SimulationChip";
import { useSession } from "@/hooks/useSession";

const TopBar = ({ sidebarExpanded, onToggleSidebar }) => {
  const router = useRouter();
  // useSession ya se encarga de no mostrar la sesión cacheada hasta montar
  // (ver useIsClient), así que tienda es seguro de pintar directo: coincide
  // con el servidor en el primer render y no dispara un desajuste de
  // hidratación.
  const { tienda, logout } = useSession();
  const [userOpen, setUserOpen] = useState(false);
  const userMenuRef = useRef(null);
  const initial = (tienda?.dueno ?? "?").trim().charAt(0).toUpperCase();

  // Clic afuera o Escape cierran el menú: sin esto se queda abierto tapando
  // el resto del topbar hasta el próximo clic en el botón.
  useEffect(() => {
    if (!userOpen) return;
    const onPointerDown = (e) => {
      if (!userMenuRef.current?.contains(e.target)) setUserOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setUserOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [userOpen]);



  return (
    <header className="sticky top-0 z-40 h-16 border-b border-slate-200 bg-white">
      <div className="flex h-full items-center gap-3 px-4 md:px-6">
        {/* Solo en escritorio: en móvil la navegación es BottomNav, no un
            cajón que colapsar, así que no hace falta el botón de menú ahí. */}
        <button
          onClick={onToggleSidebar}
          aria-label={sidebarExpanded ? "Colapsar menú" : "Expandir menú"}
          aria-expanded={sidebarExpanded}
          className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 md:flex"
        >
          <Menu className="h-5 w-5" />
        </button>

        <button
          onClick={() => router.push("/dashboard")}
          className="flex min-w-0 shrink-0 items-center gap-2.5 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Ir al inicio"
        >
          <img
            src="/Boxes_logo.png"
            alt="Boxes"
            className="h-9 w-9 shrink-0 rounded-full object-cover"
          />
          <span className="hidden truncate text-sm font-semibold text-slate-800 sm:inline">
            Boxes
          </span>
        </button>

        <div className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" />

        {/* El nombre de la tienda no es el título de la pantalla (cada página
            trae su propio h1); se recorta para no empujar los botones. */}
        <p className="min-w-0 truncate text-lg font-bold text-slate-900">
          {tienda?.nombre ?? ""}
        </p>

        <div className="flex-1" />

        {/* Derecha: acciones */}
        <div className="flex shrink-0 items-center gap-2">
          <SimulationChip />
          {/* <SupabaseStatusChip />*/}

          {/* Búsqueda 
          <form
            onSubmit={handleSearchSubmit}
            className="hidden w-56 md:block xl:w-72"
          >
            <label htmlFor="top-search" className="sr-only">
              Buscar
            </label>
            <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-200">
              <Search className="h-4 w-4 text-slate-500" />
              <input
                id="top-search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar un producto"
                className="w-full text-sm outline-none placeholder:text-slate-500"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  className="px-1 text-xs text-slate-500 hover:text-slate-600"
                >
                  Limpiar
                </button>
              )}
            </div>
          </form>*/}

          <div className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" />

          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserOpen((s) => !s)}
              className="flex items-center gap-2 rounded-md py-1 pl-1 pr-2 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-haspopup="menu"
              aria-expanded={userOpen}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                {initial}
              </span>
              <div className="hidden text-left sm:block">
                <div className="text-xs font-medium text-slate-700">
                  {tienda?.dueno ?? "..."}
                </div>
                <div className="text-[11px] text-slate-500">
                  {tienda?.nombre ?? ""}
                </div>
              </div>
              <ChevronDown
                className={`hidden h-3.5 w-3.5 text-slate-500 transition-transform sm:block ${userOpen ? "rotate-180" : ""}`}
              />
            </button>

            {userOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
              >
                <div className="border-b border-slate-100 px-3.5 py-3">
                  <div className="truncate text-sm font-semibold text-slate-800">
                    {tienda?.dueno ?? "..."}
                  </div>
                  <div className="truncate text-xs text-slate-500">
                    {tienda?.nombre ?? ""}
                  </div>
                  <div className="mt-1 truncate text-xs text-slate-500">
                    {tienda?.email ?? ""}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setUserOpen(false);
                    router.push("/settings");
                  }}
                  className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Settings className="h-4 w-4" /> Configuración
                </button>
                <button
                  onClick={() => {
                    setUserOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-2 border-t border-slate-100 px-3.5 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" /> Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
