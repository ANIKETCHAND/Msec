/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        swiss: {
          canvas: '#F5F6F8',
          surface: '#FFFFFF',
          surfaceMuted: '#F9FAFB',
          border: '#E5E7EB',
          borderSubtle: '#F3F4F6',
          textPrimary: '#171717',
          textSecondary: '#6B7280',
          textMuted: '#9CA3AF',
          blue: '#1677FF',
          blueLight: '#E6F4FF',
          blueHover: '#0958D9',
          success: '#10B981',
          successLight: '#ECFDF5',
          warning: '#F59E0B',
          warningLight: '#FFFBEB',
          critical: '#EF4444',
          criticalLight: '#FEF2F2',
        },
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
