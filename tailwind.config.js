/** @type {import('tailwindcss').Config} */
import colors from "tailwindcss/colors";

// Paleta de Boxes: cálida, de tienda de barrio, y con UN solo color de marca.
//
// - Los neutros son grises tibios (la base "stone" de Tailwind) en vez del gris
//   azulado de "slate": se sienten a papel y madera, no a software de oficina.
// - "brand" es un verde petróleo profundo. Es el único acento de la app: la
//   acción principal, lo seleccionado, el foco. Su 600 da 6,3:1 con texto
//   blanco y su 700 da 8,3:1 sobre blanco.
// - Verde esmeralda queda para "plata que entró", ámbar para avisos y rojo para
//   lo peligroso. Nada más lleva color.
//
// slate, blue, teal, indigo, violet y sky se redirigen aquí a propósito: las
// pantallas se escribieron con cinco acentos distintos (azul en Productos,
// teal en Ventas, índigo en Pedidos…) y así todas quedan iguales sin tocar
// cada archivo. Lo nuevo debe usar `brand` y `slate` directamente.
const brand = {
  50: "#eef8f6",
  100: "#d4eee8",
  200: "#a9dcd2",
  300: "#74c2b5",
  400: "#3fa293",
  500: "#218577",
  600: "#156c61",
  700: "#13584f",
  800: "#134841",
  900: "#123c37",
  950: "#06221f",
};

export default {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand,
        slate: colors.stone,
        blue: brand,
        teal: brand,
        indigo: brand,
        violet: brand,
        sky: brand,
        cyan: brand,
      },
      // Sombras con desplazamiento y desenfoque, tintadas con la tinta tibia
      // o con la marca; nunca un halo de color sin desplazamiento.
      boxShadow: {
        brand: "0 10px 24px -10px rgb(21 108 97 / 0.6)",
        pop: "0 16px 32px -12px rgb(28 25 23 / 0.3)",
        dialog: "0 24px 48px -12px rgb(28 25 23 / 0.35)",
        "nav-up": "0 -1px 8px rgb(28 25 23 / 0.06)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      keyframes: {
        fadeSlideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        dropdownIn: {
          "0%": { opacity: "0", transform: "translateY(-4px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        "fade-slide-up": "fadeSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) both",
        "scale-in": "scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) both",
        "dropdown-in": "dropdownIn 0.15s cubic-bezier(0.16, 1, 0.3, 1) both",
      },
    },
  },
  plugins: [],
};
