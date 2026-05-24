/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#165DFF',
        accent: '#0FC6C2',
        danger: '#F53F3F',
        textMain: '#1D2129',
        textSec: '#4E5969',
        textMuted: '#86909C',
        pageBg: '#F2F5FA',
        cardBg: '#FFFFFF',
        border: '#E5E6EB',
      },
      fontFamily: {
        sans: ['Inter', 'Microsoft YaHei', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '6px',
        lg: '10px',
      },
      boxShadow: {
        DEFAULT: '0 2px 12px rgba(0,0,0,0.06)',
      },
      fontSize: {
        h1: ['18px', { lineHeight: '1.3', fontWeight: '700' }],
        h2: ['16px', { lineHeight: '1.3', fontWeight: '600' }],
        body: ['14px', { lineHeight: '1.6', fontWeight: '400' }],
        note: ['12px', { lineHeight: '1.6', fontWeight: '400' }],
      },
      transitionDuration: {
        DEFAULT: '200ms',
      }
    },
  },
  plugins: [],
}
