/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent:  { DEFAULT: "#FF4F00", light: "#FF6B35", dark: "#D94000" },
        violet:  { DEFAULT: "#7C3AED", light: "#A78BFA", dark: "#6D28D9" },
        surface: { 0: "#FFFFFF", 1: "#F8FAFC", 2: "#F1F5F9", 3: "#E2E8F0" },
        ink:     { 1: "#111827", 2: "#374151", 3: "#6B7280", 4: "#9CA3AF" },
      },
      boxShadow: {
        card: "0 1px 4px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)",
        "card-hover": "0 8px 24px rgba(0,0,0,0.10), 0 16px 40px rgba(0,0,0,0.06)",
        "accent-glow": "0 0 20px rgba(255,79,0,0.15)",
      },
    },
  },
  plugins: [],
}