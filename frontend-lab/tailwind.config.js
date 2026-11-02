/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Palet "SAP-rasa" sederhana. Diperhalus setelah UX review iterasi 1.
        navy:    '#0b2545',
        seafoam: '#8ecae6',
        emas:    '#f4a261',
      },
      borderRadius: {
        control: '8px',
      },
    },
  },
  plugins: [],
};
