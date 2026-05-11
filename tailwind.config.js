/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'obsidian': {
          DEFAULT: '#0A0B0F',
          'light': '#12141C',
          'lighter': '#1A1D29',
          'deep': '#020617',
          'glow': 'rgba(10, 11, 15, 0.8)',
        },
        'mint': {
          DEFAULT: '#10B981',
          'dark': '#059669',
          'glow': 'rgba(16, 185, 129, 0.3)',
        },
        'cyber-gold': {
          DEFAULT: '#F5C518',
          'dark': '#D4A017',
          'glow': 'rgba(245, 197, 24, 0.3)',
        },
        'brand': {
          'primary': '#10B981',    // Moroccan Mint Green
          'secondary': '#F5C518',  // Cyber Gold
          'accent': '#6366f1',     // Indigo (keeping as secondary accent)
        },
      },
      fontFamily: {
        'heading': ['Unbounded', 'system-ui', 'sans-serif'],
        'impact': ['Bebas Neue', 'sans-serif'],
        'sans': ['Satoshi', 'Inter', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'neon-mint': '0 0 15px rgba(16, 185, 129, 0.3), 0 0 30px rgba(16, 185, 129, 0.1)',
        'neon-gold': '0 0 15px rgba(245, 197, 24, 0.3), 0 0 30px rgba(245, 197, 24, 0.1)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.5s ease-out forwards',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '1', filter: 'brightness(1)' },
          '50%': { opacity: '0.8', filter: 'brightness(1.5)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      }
    },
  },
  plugins: [],
}
