/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Depth layers */
        'cp-base':      '#020617',
        'cp-s1':        '#07091a',
        'cp-s2':        '#0d1220',
        'cp-s3':        '#121929',
        'cp-s4':        '#1a2235',

        /* Legacy compat */
        'obsidian': {
          DEFAULT: '#07091a',
          light:   '#0d1220',
          lighter: '#121929',
          deep:    '#020617',
        },

        /* Accents */
        'mint': {
          DEFAULT: '#10b981',
          dark:    '#059669',
          light:   '#34d399',
          glow:    'rgba(16,185,129,0.35)',
        },
        'cp-indigo': {
          DEFAULT: '#6366f1',
          dark:    '#4f46e5',
          light:   '#818cf8',
          glow:    'rgba(99,102,241,0.35)',
        },
        'cyber-gold': {
          DEFAULT: '#f59e0b',
          dark:    '#d97706',
          light:   '#fbbf24',
          glow:    'rgba(245,158,11,0.35)',
        },
        'cp-violet': '#a78bfa',
        'cp-red':    '#ef4444',

        /* ── LIGHT / SaaS DESIGN SYSTEM ── */
        'cp-surface': {
          DEFAULT: '#FFFFFF',
          subtle:  '#F8FAFC',
          muted:   '#F1F5F9',
          accent:  '#EEF2FF',
        },
        'cp-border': {
          DEFAULT: '#E2E8F0',
          strong:  '#CBD5E1',
          subtle:  '#F1F5F9',
        },
        'cp-text': {
          DEFAULT: '#0F172A',
          mid:     '#334155',
          muted:   '#64748B',
          faint:   '#94A3B8',
        },
        'cp-sidebar-bg': '#0F172A',
        'cp-primary':    '#4F46E5',
        'cp-accent-cyan': '#06B6D4',

        /* ── CYBER LUXURY PALETTE (new) ── */
        'cyber': {
          DEFAULT: '#8B5CF6',
          50:      '#F5F3FF',
          100:     '#EDE9FE',
          400:     '#A78BFA',
          500:     '#8B5CF6',
          600:     '#7C3AED',
          700:     '#6D28D9',
          glow:    'rgba(139,92,246,0.45)',
          dim:     'rgba(139,92,246,0.10)',
          border:  'rgba(139,92,246,0.20)',
        },
        'neon': {
          cyan:   '#06B6D4',
          violet: '#8B5CF6',
          green:  '#22C55E',
          red:    '#EF4444',
          gold:   '#F59E0B',
        },
        'glass': {
          '0':  'rgba(255,255,255,0)',
          '4':  'rgba(255,255,255,0.04)',
          '6':  'rgba(255,255,255,0.06)',
          '8':  'rgba(255,255,255,0.08)',
          '10': 'rgba(255,255,255,0.10)',
        },
      },

      fontFamily: {
        'heading': ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
        'sans':    ['Satoshi', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        'mono':    ['JetBrains Mono', 'monospace'],
        'display': ['Space Grotesk', 'system-ui', 'sans-serif'],
      },

      borderRadius: {
        'cp-sm': '10px',
        'cp':    '16px',
        'cp-md': '20px',
        'cp-lg': '24px',
        'cp-xl': '32px',
      },

      boxShadow: {
        'cp-sm':        '0 2px 8px rgba(0,0,0,0.4)',
        'cp':           '0 8px 32px rgba(0,0,0,0.5)',
        'cp-lg':        '0 20px 60px rgba(0,0,0,0.6)',
        'cp-mint':      '0 0 20px rgba(16,185,129,0.25), 0 0 60px rgba(16,185,129,0.1)',
        'cp-indigo':    '0 0 20px rgba(99,102,241,0.25), 0 0 60px rgba(99,102,241,0.1)',
        'cp-gold':      '0 0 20px rgba(245,158,11,0.25), 0 0 60px rgba(245,158,11,0.1)',
        'neon-mint':    '0 0 15px rgba(16,185,129,0.3), 0 0 30px rgba(16,185,129,0.1)',
        'neon-indigo':  '0 0 15px rgba(99,102,241,0.3), 0 0 30px rgba(99,102,241,0.1)',
        'neon-gold':    '0 0 15px rgba(245,158,11,0.3), 0 0 30px rgba(245,158,11,0.1)',
        'neon-cyber':   '0 0 20px rgba(139,92,246,0.5), 0 0 60px rgba(139,92,246,0.2)',
        'neon-cyan':    '0 0 20px rgba(6,182,212,0.5), 0 0 60px rgba(6,182,212,0.2)',
        'glass':        '0 8px 32px rgba(0,0,0,0.37)',
        'inner-top':    'inset 0 1px 0 rgba(255,255,255,0.08)',
        'luxury':       '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
        'tournament':   '0 20px 60px rgba(139,92,246,0.2), 0 0 0 1px rgba(139,92,246,0.15)',
      },

      backdropBlur: {
        'cp-sm': '8px',
        'cp':    '16px',
        'cp-lg': '24px',
        'cp-xl': '40px',
      },

      transitionTimingFunction: {
        'cp-out':    'cubic-bezier(0.16, 1, 0.3, 1)',
        'cp-spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'cp-smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },

      transitionDuration: {
        'cp-fast': '120ms',
        'cp':      '220ms',
        'cp-slow': '380ms',
      },

      backgroundImage: {
        'cyber-radial':  'radial-gradient(circle at top, rgba(139,92,246,0.25), transparent 40%)',
        'cyan-glow':     'radial-gradient(circle at center, rgba(6,182,212,0.18), transparent 45%)',
        'gold-glow':     'radial-gradient(circle at center, rgba(245,158,11,0.15), transparent 45%)',
        'luxury-panel':  'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
        'cp-surface':    'linear-gradient(135deg, #07091a 0%, #0d1220 100%)',
        'cp-hero':       'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(6,182,212,0.08) 100%)',
        'cyber-grid-sm': 'repeating-linear-gradient(0deg,rgba(139,92,246,0.06) 0,transparent 1px,transparent 40px,rgba(139,92,246,0.06) 40px),repeating-linear-gradient(90deg,rgba(139,92,246,0.06) 0,transparent 1px,transparent 40px,rgba(139,92,246,0.06) 40px)',
      },

      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-top':    'env(safe-area-inset-top)',
      },

      animation: {
        'cp-fade-up':    'cp-fade-up 380ms cubic-bezier(0.16,1,0.3,1) both',
        'cp-fade-in':    'cp-fade-in 220ms cubic-bezier(0.16,1,0.3,1) both',
        'cp-scale-in':   'cp-scale-in 220ms cubic-bezier(0.34,1.56,0.64,1) both',
        'cp-float':      'cp-float 4s ease-in-out infinite',
        'cp-shimmer':    'cp-shimmer 1.6s linear infinite',
        'cp-pulse-glow': 'cp-pulse-glow 2.5s ease-in-out infinite',
        'cp-orbit':      'cp-orbit 3s linear infinite',
        'cp-flicker':    'cp-flicker 8s ease-in-out infinite',
        'cp-ticker':     'cp-ticker 30s linear infinite',
        'cp-ping-dot':   'cp-ping-dot 1.5s ease-out infinite',
        /* Cyber Luxury */
        'cyber-border':  'cyber-border 3s linear infinite',
        'cyber-scan':    'cyber-scan 2.5s linear infinite',
        'glow-pulse':    'glow-pulse 2s ease-in-out infinite',
        'count-up':      'count-up 0.6s cubic-bezier(0.34,1.56,0.64,1) both',
        'slide-up-fade': 'slide-up-fade 0.45s cubic-bezier(0.16,1,0.3,1) both',
        'neon-flicker':  'neon-flicker 4s ease-in-out infinite',
        'tilt-3d':       'tilt-3d 8s ease-in-out infinite',
        /* Legacy */
        'fade-in':   'cp-fade-in 0.5s ease-out forwards',
        'slide-up':  'cp-fade-up 0.5s ease-out forwards',
        'float':     'cp-float 6s ease-in-out infinite',
        'shimmer':   'cp-shimmer 2s linear infinite',
      },

      keyframes: {
        'cp-fade-up':    { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'cp-fade-in':    { from: { opacity: '0' }, to: { opacity: '1' } },
        'cp-scale-in':   { from: { opacity: '0', transform: 'scale(0.95)' }, to: { opacity: '1', transform: 'scale(1)' } },
        'cp-float':      { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        'cp-shimmer':    { '0%': { backgroundPosition: '-200% center' }, '100%': { backgroundPosition: '200% center' } },
        'cp-pulse-glow': { '0%,100%': { opacity: '0.4' }, '50%': { opacity: '0.9' } },
        'cp-orbit':      { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } },
        'cp-flicker':    { '0%,95%,100%': { opacity: '1' }, '96%': { opacity: '0.8' }, '97%': { opacity: '1' }, '98%': { opacity: '0.6' } },
        'cp-ticker':     { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        'cp-ping-dot':   { '0%': { transform: 'scale(1)', opacity: '1' }, '100%': { transform: 'scale(2.5)', opacity: '0' } },
        /* Cyber Luxury */
        'cyber-border':  { '0%,100%': { backgroundPosition: '0% 50%' }, '50%': { backgroundPosition: '100% 50%' } },
        'glow-pulse':    { '0%,100%': { boxShadow: '0 0 20px rgba(139,92,246,0.3), 0 0 40px rgba(139,92,246,0.1)' }, '50%': { boxShadow: '0 0 40px rgba(139,92,246,0.7), 0 0 80px rgba(139,92,246,0.3)' } },
        'count-up':      { from: { transform: 'translateY(20px) scale(0.9)', opacity: '0' }, to: { transform: 'translateY(0) scale(1)', opacity: '1' } },
        'slide-up-fade': { from: { opacity: '0', transform: 'translateY(24px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'neon-flicker':  { '0%,90%,100%': { opacity: '1', filter: 'brightness(1)' }, '92%': { opacity: '0.7', filter: 'brightness(1.4)' }, '94%': { opacity: '1', filter: 'brightness(1)' }, '96%': { opacity: '0.5', filter: 'brightness(1.6)' } },
        'cyber-scan':    { '0%': { transform: 'translateY(-100%)', opacity: '0' }, '10%,90%': { opacity: '0.6' }, '100%': { transform: 'translateY(100vh)', opacity: '0' } },
        'tilt-3d':       { '0%,100%': { transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg)' }, '25%': { transform: 'perspective(1000px) rotateX(2deg) rotateY(-1deg)' }, '75%': { transform: 'perspective(1000px) rotateX(-1deg) rotateY(2deg)' } },
        /* Legacy */
        fadeIn:   { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp:  { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
