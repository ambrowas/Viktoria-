/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // ✅ REQUIRED for .dark selectors to work
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./screens/**/*.{js,ts,jsx,tsx}",
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
    },
  },
  plugins: [],
}
