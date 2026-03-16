/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        mine: {
          bg: '#0f172a',
          surface: '#1e293b',
          border: '#334155',
          accent: '#f59e0b',
          'accent-dark': '#d97706',
          text: '#f1f5f9',
          muted: '#94a3b8',
        },
      },
    },
  },
  plugins: [],
}

