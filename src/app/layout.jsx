import { Atkinson_Hyperlegible } from "next/font/google";

import "@/index.css";
import AppShell from "@/components/layout/AppShell";
import SWRProvider from "@/components/providers/SWRProvider";

// Atkinson Hyperlegible: diseñada para personas con baja visión. Distingue
// bien 1/l/I, 0/O y 5/S, que es justo lo que importa al leer precios y
// vueltos con gafas o de reojo mientras se atiende.
const sans = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata = {
  title: "Boxes · Tu tienda en una sola caja",
  description: "Boxes: ventas, fiados, inventario y cierre del día para tu tienda de barrio",
  icons: {
    icon: "/Boxes_logo_vectorizado.svg",
    shortcut: "/Boxes_logo.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es-CO" className={sans.variable}>
      <body className="bg-slate-50 font-sans text-slate-900 antialiased">
        <SWRProvider>
          <AppShell>{children}</AppShell>
        </SWRProvider>
      </body>
    </html>
  );
}
