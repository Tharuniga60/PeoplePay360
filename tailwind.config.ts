import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        // PeoplePay360 Dark Design System
        sidebar: {
          DEFAULT: '#0d0f14',
          hover: '#1a1d26',
          active: '#1e2235',
          border: '#1e2235',
        },
        surface: {
          DEFAULT: '#111318',
          card: '#1a1d26',
          elevated: '#1e2235',
          input: '#1a1d26',
        },
        border: {
          DEFAULT: '#2a2d3e',
          subtle: '#1e2235',
        },
        accent: {
          DEFAULT: '#3b6ef0',
          hover: '#2d5ce8',
          foreground: '#ffffff',
        },
        muted: {
          DEFAULT: '#6b7280',
          foreground: '#9ca3af',
        },
        success: {
          DEFAULT: '#10b981',
          foreground: '#ffffff',
          subtle: 'rgba(16,185,129,0.12)',
        },
        warning: {
          DEFAULT: '#f59e0b',
          foreground: '#000000',
          subtle: 'rgba(245,158,11,0.12)',
        },
        danger: {
          DEFAULT: '#ef4444',
          foreground: '#ffffff',
          subtle: 'rgba(239,68,68,0.12)',
        },
        info: {
          DEFAULT: '#3b82f6',
          subtle: 'rgba(59,130,246,0.12)',
        },
        // shadcn compatibility
        background: '#111318',
        foreground: '#f1f5f9',
        card: {
          DEFAULT: '#1a1d26',
          foreground: '#f1f5f9',
        },
        popover: {
          DEFAULT: '#1a1d26',
          foreground: '#f1f5f9',
        },
        primary: {
          DEFAULT: '#3b6ef0',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#1e2235',
          foreground: '#f1f5f9',
        },
        destructive: {
          DEFAULT: '#ef4444',
          foreground: '#ffffff',
        },
        input: '#2a2d3e',
        ring: '#3b6ef0',
      },
      borderRadius: {
        lg: '0.625rem',
        md: '0.5rem',
        sm: '0.375rem',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        shimmer: 'shimmer 2s infinite',
      },
    },
  },
  plugins: [],
};

export default config;
