/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // ✅ REQUIRED for .dark selectors to work
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-primary': '#fca311',      // Orange
        'brand-secondary': '#e8920a',    // Darker Orange for hover
        'brand-accent': '#fca311',       // Orange for accents
        'base-100': '#000000',           // Black - Main background
        'base-200': '#14213d',           // Dark Blue - Sidebar, cards
        'base-300': '#2c3a5a',           // Lighter Dark Blue - Inputs, hovers
        'text-primary': '#ffffff',       // White
        'text-secondary': '#e5e5e5',     // Light Grey for subtitles
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-10px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(10px)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        }
      },
      animation: {
        shake: 'shake 0.82s cubic-bezier(.36,.07,.19,.97) both',
        'fade-in': 'fade-in 0.5s ease-out forwards',
      }
    },
  },
  plugins: [],
}
