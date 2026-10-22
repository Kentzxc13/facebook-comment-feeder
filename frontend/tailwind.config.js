/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff5f2',
          100: '#ffe8e2',
          500: '#ff5733',
          600: '#ff4d30',
          700: '#e03d22',
        },
        fb: {
          DEFAULT: '#1877F2',
          subtle: '#E7F3FF',
        },
        background: '#090d16',
        surface: '#111726',
        'surface-hover': '#1a2236',
        'surface-border': 'rgba(255, 255, 255, 0.08)',
        primary: {
          DEFAULT: '#ff5733',
          hover: '#ff4d30',
          light: '#ffe8e2',
          muted: 'rgba(255, 87, 51, 0.12)'
        },
        success: {
          DEFAULT: '#10b981',
          hover: '#059669',
          muted: 'rgba(16, 185, 129, 0.12)'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        subtle: '0 4px 20px -2px rgba(0, 0, 0, 0.3)',
        card: '0 10px 30px -4px rgba(0, 0, 0, 0.4)',
        glow: '0 0 25px -5px rgba(99, 102, 241, 0.25)',
      }
    },
  },
  plugins: [],
}
