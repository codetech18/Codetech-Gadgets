/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'jakarta': ['"Plus Jakarta Sans"', 'sans-serif'],
        'fraunces': ['Fraunces', 'serif'],
      },
      colors: {
        blue: {
          950: '#0a1628',
        },
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-18px)' },
        },
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        modalIn: {
          from: { opacity: '0', transform: 'scale(0.95) translateY(12px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
      },
      animation: {
        float: 'float 3.5s ease-in-out infinite',
        slideDown: 'slideDown 0.25s ease',
        modalIn: 'modalIn 0.25s ease',
      },
      boxShadow: {
        'blue-sm': '0 1px 3px rgba(37,99,235,0.08)',
        'blue-md': '0 4px 20px rgba(37,99,235,0.12)',
        'blue-lg': '0 12px 40px rgba(37,99,235,0.18)',
      },
    },
  },
  plugins: [],
}
