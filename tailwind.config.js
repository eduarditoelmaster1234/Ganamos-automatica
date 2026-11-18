/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          void: '#0D061A',
          elevated: '#160C2B',
        },
        surface: {
          DEFAULT: '#1B1030',
          strong: '#24143D',
        },
        primary: {
          DEFAULT: '#8B5CF6',
          strong: '#7C3AED',
          soft: '#C084FC',
        },
        success: {
          DEFAULT: '#16A34A',
          bright: '#22C55E',
        },
        ink: {
          primary: '#F8F5FF',
          muted: '#B8A9CC',
          subtle: '#9383AA',
        },
        danger: '#EF4444',
        warning: '#F59E0B',
        gold: '#EAB308',
        borderSubtle: 'rgba(168, 85, 247, 0.25)',
        borderFocus: '#C084FC',
        wa: {
          header: '#075E54',
          avatar: '#128C7E',
          cream: '#EFEAE2',
          banner: '#D9EDF7',
          bannerText: '#3B5360',
          incoming: '#FFFFFF',
          outgoing: '#D9FDD3',
          subcard: '#F5F6F6',
          action: '#15803D',
          text: '#111B21',
          secondary: '#667781',
          composer: '#F0F2F5',
          divider: '#E9EDEF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: [
          '"Plus Jakarta Sans"',
          'Inter',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
      },
      boxShadow: {
        glow: '0 12px 32px -8px rgba(139, 92, 246, 0.55)',
        glowGreen: '0 12px 32px -8px rgba(22, 163, 74, 0.55)',
        floating: '0 18px 46px -12px rgba(0, 0, 0, 0.7)',
        emblem: '0 16px 36px -10px rgba(139, 92, 246, 0.5)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.86)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(18px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'sheet-up': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
        'loading-slide': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(300%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 180ms ease-out both',
        'pop-in': 'pop-in 260ms cubic-bezier(0.2, 0.9, 0.3, 1.3) both',
        'slide-up': 'slide-up 220ms ease-out both',
        'sheet-up': 'sheet-up 240ms cubic-bezier(0.22, 0.8, 0.35, 1) both',
        'pulse-soft': 'pulse-soft 1.4s ease-in-out infinite',
        'loading-slide': 'loading-slide 1.1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
