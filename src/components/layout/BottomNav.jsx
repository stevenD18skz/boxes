// BottomNav.jsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Home,
  Box,
  ShoppingCart,
  ClipboardList,
  Wallet,
  BarChart3,
  BookOpen,
  RotateCcw,
  LogOut,
  MoreHorizontal,
  X,
} from "lucide-react";

import { useSimulation } from "@/hooks/useSimulation";
import { useSession } from "@/hooks/useSession";
import { restartSimulation, stopSimulation } from "@/lib/simulation/store";

// Solo cuatro secciones caben cómodas junto al botón "Más" sin apretar los
// objetivos táctiles (bottom-nav-limit: máximo 5 en total). En la barra van
// las del día a día -Inicio, Ventas, Fiados, Productos-; pedidos, gastos,
// reportes y las acciones de sesión viven detrás de "Más", que abre una hoja
// desde abajo en vez de competir por el mismo espacio.
const PRIMARY_ITEMS = [
  { path: "/dashboard", label: "Inicio", icon: Home },
  { path: "/sales", label: "Ventas", icon: ShoppingCart },
  { path: "/fiados", label: "Fiados", icon: BookOpen },
  { path: "/products", label: "Productos", icon: Box },
];

const MORE_ITEMS = [
  { path: "/orders", label: "Pedidos", icon: ClipboardList },
  { path: "/expenses", label: "Gastos y caja", icon: Wallet },
  { path: "/summary", label: "Reportes", icon: BarChart3 },
];

// Navegación principal en celular/tablet (< md): reemplaza al cajón lateral,
// que ahí solo tapaba pantalla para mostrar seis iconos. En escritorio esta
// barra no se pinta -SideBar sigue siendo la navegación- así que nunca hay
// las dos a la vez (avoid-mixed-patterns).
const BottomNav = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { active: isSimulating } = useSimulation();
  const { tienda, logout } = useSession();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (path) =>
    pathname === path || (path !== "/" && pathname.startsWith(path));
  const moreActive = MORE_ITEMS.some((it) => isActive(it.path));

  const go = (path) => {
    setMoreOpen(false);
    router.push(path);
  };

  const handleRestart = () => {
    setMoreOpen(false);
    restartSimulation();
    window.location.reload();
  };

  const handleExit = () => {
    setMoreOpen(false);
    if (tienda) {
      logout();
      return;
    }
    if (isSimulating) stopSimulation();
    router.push("/");
  };

  // Escape y bloqueo del scroll de fondo, igual que cualquier hoja/modal.
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  useEffect(() => {
    if (!moreOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [moreOpen]);

  return (
    <>
      {moreOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setMoreOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/40 md:hidden"
        />
      )}

      {moreOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Más opciones"
          className="fixed inset-x-0 bottom-16 z-50 max-h-[70dvh] overflow-y-auto rounded-t-2xl border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl md:hidden"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="text-sm font-semibold text-slate-800">
              Más opciones
            </span>
            <button
              type="button"
              onClick={() => setMoreOpen(false)}
              aria-label="Cerrar"
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="p-2" aria-label="Secciones adicionales">
            {MORE_ITEMS.map((it) => {
              const active = isActive(it.path);
              return (
                <button
                  key={it.path}
                  onClick={() => go(it.path)}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-[48px] w-full items-center gap-3 rounded-lg px-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    active
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <it.icon
                    className={`h-5 w-5 shrink-0 ${active ? "text-blue-600" : "text-slate-500"}`}
                  />
                  <span className="text-sm font-medium">{it.label}</span>
                </button>
              );
            })}

            {isSimulating && (
              <button
                type="button"
                onClick={handleRestart}
                className="flex min-h-[48px] w-full items-center gap-3 rounded-lg px-3 text-left text-amber-800 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <RotateCcw className="h-5 w-5 shrink-0 text-amber-600" />
                <span className="text-sm font-medium">Reiniciar datos</span>
              </button>
            )}
          </nav>

          {/* Separada del resto -destructive-nav-separation-: salir de la
              sesión no es una sección más. */}
          <div className="border-t border-slate-100 p-2">
            <button
              type="button"
              onClick={handleExit}
              className={`flex min-h-[48px] w-full items-center gap-3 rounded-lg px-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                isSimulating
                  ? "text-amber-800 hover:bg-amber-50"
                  : "text-red-600 hover:bg-red-50"
              }`}
            >
              <LogOut className="h-5 w-5 shrink-0" />
              <span className="text-sm font-medium">
                {isSimulating ? "Salir de la simulación" : "Cerrar sesión"}
              </span>
            </button>
          </div>
        </div>
      )}

      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-nav-up md:hidden"
      >
        {PRIMARY_ITEMS.map((it) => {
          const active = isActive(it.path);
          return (
            <button
              key={it.path}
              onClick={() => go(it.path)}
              aria-current={active ? "page" : undefined}
              className="flex min-h-[56px] flex-col items-center justify-center gap-0.5 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
            >
              <it.icon
                className={`h-5 w-5 ${active ? "text-blue-600" : "text-slate-500"}`}
              />
              <span
                className={`text-[11px] font-medium ${active ? "text-blue-600" : "text-slate-500"}`}
              >
                {it.label}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setMoreOpen((s) => !s)}
          aria-expanded={moreOpen}
          aria-current={moreActive ? "page" : undefined}
          className="flex min-h-[56px] flex-col items-center justify-center gap-0.5 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
        >
          <MoreHorizontal
            className={`h-5 w-5 ${moreActive || moreOpen ? "text-blue-600" : "text-slate-500"}`}
          />
          <span
            className={`text-[11px] font-medium ${moreActive || moreOpen ? "text-blue-600" : "text-slate-500"}`}
          >
            Más
          </span>
        </button>
      </nav>
    </>
  );
};

export default BottomNav;
