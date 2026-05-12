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
    sourcemap: false,
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react":    ["react", "react-dom", "react-router-dom"],
          "vendor-motion":   ["framer-motion"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-gsap":     ["gsap", "@gsap/react"],
          "vendor-three":    ["three"],
          "vendor-charts":   ["recharts"],
          "vendor-icons":    ["lucide-react"],
          "vendor-query":    ["@tanstack/react-query"],
        },
      },
    },
  },

  server: {
    port: 5173,
    open: false,
  },
});
