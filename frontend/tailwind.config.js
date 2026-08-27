/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef8ff',
          100: '#d8eeff',
          200: '#b9e0ff',
          300: '#89ccff',
          400: '#52adff',
          500: '#2b8aff',
          600: '#1469f5',
          700: '#0e52e1',
          800: '#1242b6',
          900: '#153c8f',
          950: '#112557',
        },
      },
    },
  },
  plugins: [],
};
