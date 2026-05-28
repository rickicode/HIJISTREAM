/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#141414',
          elevated: '#1a1a1a',
          card: '#181818',
        },
        foreground: '#FFFFFF',
        muted: {
          DEFAULT: '#808080',
          foreground: '#b3b3b3',
        },
        primary: {
          DEFAULT: '#E50914',
          hover: '#F40612',
        },
        border: '#333333',
        ring: '#E50914',
        rating: '#46d369',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
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
