// SideBar.jsx
"use client";

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
} from "lucide-react";

import { useSimulation } from "@/hooks/useSimulation";
import { useSession } from "@/hooks/useSession";
import { restartSimulation, stopSimulation } from "@/lib/simulation/store";

// Ordenadas por lo que más se usa en el día: vender y cobrar fiados primero,
// lo de vez en cuando (pedidos, gastos, reportes) después.
const menuItems = [
  { path: "/dashboard", label: "Inicio", icon: Home },
  { path: "/sales", label: "Ventas", icon: ShoppingCart },
  { path: "/fiados", label: "Fiados", icon: BookOpen },
  { path: "/products", label: "Productos", icon: Box },
  { path: "/orders", label: "Pedidos", icon: ClipboardList },
  { path: "/expenses", label: "Gastos y caja", icon: Wallet },
  { path: "/summary", label: "Reportes", icon: BarChart3 },
];

// El logo, el nombre y el botón de colapsar viven en el TopBar; este
// componente solo resuelve la navegación entre secciones.
//
// Solo existe de `md` para arriba: la barra siempre está y lo único que
// cambia es si se ven las etiquetas o solo los iconos (`isExpanded`). Por
// debajo de `md` la navegación es BottomNav, no esta barra -avoid-mixed-
// patterns, adaptive-navigation-.
const SideBar = ({ isExpanded }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { active: isSimulating } = useSimulation();
  const { tienda, logout } = useSession();

  const go = (path) => {
    router.push(path);
  };

  // Igual que en useSimulation.ts: se recarga la página a propósito para que
  // todas las pantallas queden viendo los mismos datos reiniciados.
  const handleRestart = () => {
    restartSimulation();
    window.location.reload();
  };

  // "Salir" tiene que cerrar lo que esté abierto de verdad: si hay sesión
  // real, cerrarla en el servidor (logout ya redirige a /login); si es
  // simulación, apagarla en la pestaña y volver al inicio.
  const handleExit = () => {
    if (tienda) {
      logout();
      return;
    }
    if (isSimulating) stopSimulation();
    router.push("/");
  };

  return (
    <aside
      className={`fixed left-0 top-16 z-30 hidden h-[calc(100dvh-4rem)] w-48 flex-col border-r border-slate-200 bg-white shadow-sm transition-[width] duration-300 md:flex ${
        isExpanded ? "md:w-48" : "md:w-16"
      }`}
      aria-label="Navegación principal"
    >
      <nav
        className="flex flex-1 flex-col gap-1 overflow-y-auto p-2"
        aria-label="Secciones"
      >
        {menuItems.map((it) => {
          const active =
            pathname === it.path ||
            (it.path !== "/" && pathname.startsWith(it.path));
          return (
            <button
              key={it.path}
              onClick={() => go(it.path)}
              title={!isExpanded ? it.label : undefined}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-[44px] items-center justify-start gap-3 rounded-lg border-l-[3px] px-3 py-2.5 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                active
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              } ${isExpanded ? "" : "md:justify-center"}`}
            >
              <it.icon
                className={`h-[18px] w-[18px] shrink-0 ${active ? "text-blue-600" : "text-slate-500"}`}
              />
              <span
                className={`truncate text-sm font-medium ${isExpanded ? "" : "md:hidden"}`}
              >
                {it.label}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="shrink-0 space-y-1 border-t border-slate-200 p-2">
        {isSimulating && (
          <button
            type="button"
            onClick={handleRestart}
            title={!isExpanded ? "Reiniciar datos" : undefined}
            className={`flex min-h-[44px] w-full items-center justify-start gap-3 rounded-lg px-3 py-2.5 text-left text-amber-800 transition-colors duration-150 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
              isExpanded ? "" : "md:justify-center"
            }`}
          >
            <RotateCcw className="h-[18px] w-[18px] shrink-0 text-amber-600" />
            <span
              className={`truncate text-sm font-medium ${isExpanded ? "" : "md:hidden"}`}
            >
              Reiniciar datos
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={handleExit}
          title={isSimulating ? "Salir de la simulación" : "Salir"}
          className={`flex min-h-[44px] w-full items-center justify-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
            isSimulating
              ? "text-amber-800 hover:bg-amber-50"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          } ${isExpanded ? "" : "md:justify-center"}`}
        >
          <LogOut
            className={`h-[18px] w-[18px] shrink-0 ${isSimulating ? "text-amber-600" : "text-slate-500"}`}
          />
          <span
            className={`truncate text-sm font-medium ${isExpanded ? "" : "md:hidden"}`}
          >
            Salir
          </span>
        </button>
      </div>
    </aside>
  );
};

export default SideBar;
