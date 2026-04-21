import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  build: {
    // Raise warning threshold (589KB is acceptable for this app)
    chunkSizeWarningLimit: 700,

    rollupOptions: {
      output: {
        manualChunks: {
          // Core vendor: react + router
          "vendor-react":  ["react", "react-dom", "react-router-dom"],
          // Animation
          "vendor-motion": ["framer-motion"],
          // Supabase
          "vendor-supa":   ["@supabase/supabase-js"],
          // React Query
          "vendor-query":  ["@tanstack/react-query"],
        },
      },
    },
  },

  server: {
    port: 5173,
    open: false,
  },
});
