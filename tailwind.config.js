/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        muted: {
          DEFAULT: '#64748b',
          foreground: '#475569',
        },
        accent: {
          DEFAULT: 'rgba(16, 185, 129, 0.12)',
          foreground: '#047857',
        },
        primary: {
          DEFAULT: '#059669',
          light: '#10B981',
          lighter: '#34D399',
          dark: '#047857',
          darker: '#065F46',
        },
        emerald: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
          800: '#065F46',
          900: '#064E3B',
        },
      },
      boxShadow: {
        'emerald': '0 4px 14px 0 rgba(5, 150, 105, 0.15)',
        'emerald-lg': '0 10px 40px -10px rgba(5, 150, 105, 0.2)',
        'landing-card': '0 1px 2px rgba(15,23,42,0.04), 0 2px 8px rgba(15,23,42,0.04)',
        'landing-dashboard': '0 8px 20px rgba(15,23,42,0.03), 0 18px 48px rgba(0,0,0,0.06)',
        'landing-phone': '0 20px 40px rgba(15,23,42,0.14), 0 40px 80px rgba(15,23,42,0.1)',
        'landing-btn': '0 4px 14px rgba(15,143,104,0.18)',
        'landing-btn-hover': '0 8px 24px rgba(15,143,104,0.28)',
      },
    },
  },
  plugins: [],
};
