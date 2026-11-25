/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          500: '#627d98',
          600: '#486581',
          700: '#334e68',
          800: '#102a43',
          900: '#0a192f',
          950: '#06101e',
        },
        clinic: {
          primary: '#102a43',     // Deep Navy Blue
          secondary: '#1d3557',   // Classic Navy
          accent: '#0284c7',      // Medical Blue
          success: '#059669',     // Emerald Green
          warning: '#d97706',     // Amber
          danger: '#dc2626',      // Crimson
          surface: '#ffffff',
          background: '#f8fafc',  // Crisp Light Grey
        }
      },
    },
  },
  plugins: [],
}

