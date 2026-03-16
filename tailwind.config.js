/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        mine: {
          bg: '#f1f5f9',
          surface: '#ffffff',
          border: '#e2e8f0',
          accent: '#2563eb',
          'accent-dark': '#1d4ed8',
          text: '#0f172a',
          muted: '#64748b',
        },
      },
    },
  },
  plugins: [],
}

