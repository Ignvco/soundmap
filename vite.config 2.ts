import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: true,
    hmr: {
      overlay: false,
    },
    watch: {
      ignored: [
        "**/node_modules/**",
        "**/.pnpm-store/**",
        "**/dist/**",
        "**/android/**",
        "**/.git/**",
      ],
    },
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@/convex": path.resolve(__dirname, "./convex"),
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
    ],
  },
  build: {
    chunkSizeWarningLimit: 900,
    // Sin `manualChunks` a propósito: la forma de objeto convierte esos chunks
    // en dependencias ESTÁTICAS del entry (Rollup les emite un modulepreload en
    // el index.html), así que three/jspdf/recharts volvían a bajarse en el
    // arranque y anulaban el lazy loading de las rutas. El split automático de
    // Rollup ya respeta los límites de los `import()` dinámicos.
  },
});