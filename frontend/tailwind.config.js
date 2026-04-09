/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        base:            '#DDE2E8',
        surface:         '#EDF0F4',
        elevated:        '#F4F6F8',
        border:          '#C4CBD6',
        'border-subtle': '#D4DAE3',
        accent:          '#2563EB',
        'accent-dim':    '#DBEAFE',
        'text-primary':  '#111827',
        'text-secondary':'#374151',
        'text-muted':    '#6B7280',
      },
      animation: {
        'slide-in-right': 'slideInRight 0.2s ease-out',
        'fade-in':        'fadeIn 0.15s ease-out',
      },
      keyframes: {
        slideInRight: {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to:   { transform: 'translateX(0)',    opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
