/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#090a0f',
        card: '#12141c',
        'card-border': 'rgba(255, 255, 255, 0.08)',
        neon: {
          purple: '#9333ea',
          violet: '#8b5cf6',
          pink: '#ec4899',
          cyan: '#06b6d4',
          gold: '#f59e0b',
          emerald: '#10b981',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '1', filter: 'drop-shadow(0 0 15px rgba(147, 51, 234, 0.6))' },
          '50%': { opacity: '.6', filter: 'drop-shadow(0 0 5px rgba(147, 51, 234, 0.2))' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        }
      }
    },
  },
  plugins: [],
}
