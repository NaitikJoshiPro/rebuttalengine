import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#060F18',
          900: '#0C1D2B',
          800: '#112436',
          700: '#1A3A4F',
          600: '#22506A',
          500: '#2A6080',
          400: '#4A7A9F',
        },
        gold: {
          700: '#7A5A10',
          600: '#9A7520',
          500: '#B8953A',
          400: '#D4AF60',
          300: '#E8CC80',
          200: '#F0E4B8',
          100: '#FBF8F2',
          50:  '#FDFCF8',
        },
        cream:     '#FAFAF8',
        parchment: '#F2EFE9',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      fontWeight: {
        '800': '800',
        '900': '900',
      },
      borderRadius: {
        // Only 'none', 'sm', 'full' are permitted. lg/xl/2xl are not extended.
        DEFAULT: '0px',
        sm: '2px',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.7s cubic-bezier(0.22,1,0.36,1) both',
        'fade-in':    'fadeIn 0.6s cubic-bezier(0.22,1,0.36,1) both',
        'slide-left': 'slideInLeft 0.7s cubic-bezier(0.22,1,0.36,1) both',
        'scale-in':   'scaleIn 0.5s cubic-bezier(0.22,1,0.36,1) both',
        'count-up':   'countUp 0.45s ease-out both',
        'pulse-dot':  'pulseDot 2.5s ease-in-out infinite',
      },
      keyframes: {
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideInLeft: {
          from: { opacity: '0', transform: 'translateX(-20px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        countUp: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.5' },
        },
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.22,1,0.36,1)',
      },
    },
  },
  plugins: [],
};

export default config;
