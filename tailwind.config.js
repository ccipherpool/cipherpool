/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cp-dark': '#050508',
        'cp-card': 'rgba(13, 13, 20, 0.8)',
        'cp-primary': '#a855f7',
        'cp-secondary': '#00d4ff',
        'cp-accent': '#22c55e',
      },
      backgroundImage: {
        'mesh-gradient': "radial-gradient(at 0% 0%, rgba(168, 85, 247, 0.15) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(0, 212, 255, 0.1) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(34, 197, 94, 0.05) 0px, transparent 50%), radial-gradient(at 0% 100%, rgba(168, 85, 247, 0.1) 0px, transparent 50%)",
      },
      boxShadow: {
        'neon-purple': '0 0 15px rgba(168, 85, 247, 0.4)',
        'neon-cyan': '0 0 15px rgba(0, 212, 255, 0.4)',
        'glass': 'inset 0 0 0 1px rgba(255, 255, 255, 0.05)',
      },
      animation: {
        'slow-spin': 'spin 20s linear infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        }
      }
    },
  },
  plugins: [],
}
