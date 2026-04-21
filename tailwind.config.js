/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Legacy colors
        accent:  { DEFAULT: "#FF4F00", light: "#FF6B35", dark: "#D94000" },
        violet:  { DEFAULT: "#7C3AED", light: "#A78BFA", dark: "#6D28D9" },
        surface: { 0: "#FFFFFF", 1: "#F8FAFC", 2: "#F1F5F9", 3: "#E2E8F0" },
        ink:     { 1: "#111827", 2: "#374151", 3: "#6B7280", 4: "#9CA3AF" },
        // Cosmic Night palette
        "cp-bg":           "#0B0B1A",
        "cp-bg-2":         "#131328",
        "cp-card":         "#1A1A35",
        "cp-muted":        "#1E1E3A",
        "cp-hover":        "#252550",
        "cp-text":         "#F0F0FA",
        "cp-text-2":       "#B8B8D8",
        "cp-text-3":       "#8B8BA7",
        "cp-text-4":       "#6B6B8A",
        "cp-orange":       "#FF6B35",
        "cp-orange-light": "#FF8F5E",
        "cp-orange-dark":  "#E55A2B",
        "cp-purple":       "#6E56CF",
        "cp-purple-light": "#9E8CFC",
        "cp-teal":         "#2DD4BF",
      },
      boxShadow: {
        card: "0 1px 4px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)",
        "card-hover": "0 8px 24px rgba(0,0,0,0.10), 0 16px 40px rgba(0,0,0,0.06)",
        "accent-glow": "0 0 20px rgba(255,79,0,0.15)",
        "cp-glow": "0 0 30px rgba(255,107,53,0.2)",
        "cp-purple-glow": "0 0 20px rgba(110,86,207,0.3)",
      },
      animation: {
        "fade-in-up":  "fadeInUp 0.6s ease forwards",
        "pulse-glow":  "pulseGlow 2.5s ease-in-out infinite",
        "float":       "float 3s ease-in-out infinite",
        "slide-in":    "slideInLeft 0.3s ease forwards",
      },
      keyframes: {
        fadeInUp: {
          "0%":   { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseGlow: {
          "0%,100%": { boxShadow: "0 0 20px rgba(255,107,53,0.2)" },
          "50%":     { boxShadow: "0 0 40px rgba(255,107,53,0.4)" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%":     { transform: "translateY(-8px)" },
        },
        slideInLeft: {
          "0%":   { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
      },
    },
  },
  plugins: [],
}