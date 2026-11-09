"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

import SideBar from "./SideBar";
import BottomNav from "./BottomNav";
import Footer from "./Footer";
import TopBar from "./TopBar";

// Rutas que se muestran sin el marco de la aplicación (sin barra lateral ni
// barra superior): la página pública, el manual y las pantallas de inicio de
// sesión / simulación.
const BARE_ROUTES = ["/", "/simulacion", "/login", "/signup", "/manual"];

// El celular emparejado como lector (/scan y /scan/<id>) va sin marco y por
// prefijo, no por igualdad: el identificador del emparejamiento va en la
// dirección. Ahí la pantalla entera es la cámara, y una barra lateral de
// navegación solo quitaría sitio a lo único que se hace en esa página.
const BARE_PREFIXES = ["/scan"];

const isBare = (pathname) =>
  BARE_ROUTES.includes(pathname) ||
  BARE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

// La barra lateral solo existe de `md` para arriba, donde sobra el ancho y lo
// único que cambia con `sidebarExpanded` es si se ven las etiquetas o solo
// los iconos. Por debajo de `md` la navegación es BottomNav, fija abajo, así
// que el contenido necesita su propio padding inferior para que la última
// fila no quede tapada por la barra.
const AppShell = ({ children }) => {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const pathname = usePathname();

  if (isBare(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen">
      <TopBar
        sidebarExpanded={sidebarExpanded}
        onToggleSidebar={() => setSidebarExpanded((s) => !s)}
      />

      <div className="flex">
        <SideBar isExpanded={sidebarExpanded} />

        {/* Sin padding lateral en móvil: ahí no hay barra que le quite sitio.
            pb-20 reserva el alto de BottomNav (56px + su borde) más un poco
            de aire antes del pie; en escritorio no hace falta. */}
        <div
          className={`flex min-h-lvh flex-1 flex-col pb-20 transition-[padding] duration-300 md:pb-0 ${
            sidebarExpanded ? "md:pl-48" : "md:pl-16"
          }`}
        >
          <main className="flex-1 bg-slate-50 px-4 py-6 md:px-8">
            {children}
          </main>
          <Footer />
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default AppShell;
