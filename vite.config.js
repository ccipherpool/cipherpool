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
        // Static object — Rollup resolves inter-chunk deps automatically
        manualChunks: {
          "vendor-react":     ["react", "react-dom", "react-router-dom"],
          "vendor-motion":    ["framer-motion"],
          "vendor-supabase":  ["@supabase/supabase-js"],
          "vendor-gsap-three": ["gsap", "@gsap/react", "three"],
          "vendor-charts":    ["recharts"],
        },
      },
    },
  },

  server: {
    port: 5173,
    open: false,
  },
});
