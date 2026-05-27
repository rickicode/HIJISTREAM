/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0F0F0F',
        surface: '#1A1A1A',
        'surface-elevated': '#262626',
        border: '#2E2E2E',
        'border-hover': '#404040',
        'text-primary': '#FFFFFF',
        'text-secondary': '#A1A1A1',
        'text-muted': '#6B6B6B',
        primary: '#6366F1',
        'primary-hover': '#818CF8',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        rating: '#FBBF24',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
      },
      animation: {
        shimmer: 'shimmer 2s infinite linear',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
