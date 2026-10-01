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
          950: '#070b14',
          900: '#0a101d',
          800: '#0f172a',
          700: '#1e293b',
          600: '#334155',
        },
        mediblue: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },
        medigreen: {
          500: '#10b981',
          600: '#059669',
        },
        mediwarning: {
          500: '#f59e0b',
          600: '#d97706',
        },
        medidanger: {
          500: '#ef4444',
          600: '#dc2626',
        }
      },
    },
  },
  plugins: [],
}
