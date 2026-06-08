/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0a0a0c',
          soft: '#101015',
          panel: '#15151c',
          border: '#26262f',
        },
        gold: {
          DEFAULT: '#d4af37',
          bright: '#f5d76e',
          dim: '#8a7320',
        },
        status: {
          idle: '#5b5b6b',
          finding: '#4a9eff',
          working: '#d4af37',
          blocked: '#ff9d4a',
          error: '#ff5a5a',
          ok: '#4ade80',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 20px rgba(212, 175, 55, 0.15)',
        'glow-strong': '0 0 40px rgba(212, 175, 55, 0.25)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-up': 'fadeUp 0.5s ease-out forwards',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
