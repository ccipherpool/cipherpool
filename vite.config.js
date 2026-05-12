import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  build: {
    target: "esnext",
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Core React runtime — loaded first, cached longest
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/") || id.includes("node_modules/react-router-dom/")) {
            return "vendor-react";
          }
          // Heavy animation libs — only needed on pages that use them
          if (id.includes("node_modules/framer-motion/")) {
            return "vendor-motion";
          }
          // gsap + three only used on Home page via FlowArt — isolated chunk
          if (id.includes("node_modules/gsap/") || id.includes("node_modules/@gsap/") || id.includes("node_modules/three/")) {
            return "vendor-gsap-three";
          }
          // Supabase client
          if (id.includes("node_modules/@supabase/")) {
            return "vendor-supabase";
          }
          // Charts — only used on stats pages
          if (id.includes("node_modules/recharts/")) {
            return "vendor-charts";
          }
          // Shader library — only used on specific components
          if (id.includes("node_modules/@paper-design/")) {
            return "vendor-shaders";
          }
          // All other node_modules
          if (id.includes("node_modules/")) {
            return "vendor-misc";
          }
        },
      },
    },
  },

  server: {
    port: 5173,
    open: false,
  },
});
