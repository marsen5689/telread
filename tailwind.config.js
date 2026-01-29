/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Liquid Glass primary palette
        liquid: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        // Prismatic accent colors
        prism: {
          cyan: '#22d3ee',
          blue: '#3b82f6',
          violet: '#8b5cf6',
          pink: '#ec4899',
          orange: '#f97316',
        },
        // Surface colors
        surface: {
          light: 'rgba(255, 255, 255, 0.85)',
          dark: 'rgba(15, 23, 42, 0.85)',
        }
      },
      fontFamily: {
        // Display: Elegant, distinctive serif for headers
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        // Sans: Clean geometric sans for body
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        // Mono: For code/technical elements
        mono: ['"JetBrains Mono"', 'Consolas', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      backdropBlur: {
        xs: '2px',
        '2xl': '40px',
        '3xl': '64px',
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
        'glass-lg': '0 16px 48px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
        'glass-dark': '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        'glass-dark-lg': '0 16px 48px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        'glow': '0 0 20px rgba(14, 165, 233, 0.3)',
        'glow-lg': '0 0 40px rgba(14, 165, 233, 0.4)',
        'prism': '0 0 30px rgba(139, 92, 246, 0.2), 0 0 60px rgba(14, 165, 233, 0.1)',
      },
      backgroundImage: {
        // Mesh gradients for backgrounds
        'mesh-light': `
          radial-gradient(at 20% 30%, rgba(14, 165, 233, 0.12) 0%, transparent 50%),
          radial-gradient(at 80% 20%, rgba(139, 92, 246, 0.08) 0%, transparent 50%),
          radial-gradient(at 40% 80%, rgba(236, 72, 153, 0.06) 0%, transparent 50%)
        `,
        'mesh-dark': `
          radial-gradient(at 20% 30%, rgba(14, 165, 233, 0.2) 0%, transparent 50%),
          radial-gradient(at 80% 20%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
          radial-gradient(at 40% 80%, rgba(236, 72, 153, 0.1) 0%, transparent 50%)
        `,
        // Prismatic border gradient
        'prism-border': 'linear-gradient(135deg, rgba(34, 211, 238, 0.5), rgba(139, 92, 246, 0.5), rgba(236, 72, 153, 0.5))',
        // Subtle noise texture
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slide-down 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fade-in 0.3s ease-out',
        'scale-in': 'scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'ripple': 'ripple 0.6s linear',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(14, 165, 233, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(14, 165, 233, 0.5)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        ripple: {
          '0%': { transform: 'scale(0)', opacity: '0.5' },
          '100%': { transform: 'scale(4)', opacity: '0' },
        },
      },
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    // Custom glass utilities plugin
    function({ addUtilities, addComponents }) {
      addUtilities({
        '.glass': {
          'background': 'rgba(255, 255, 255, 0.1)',
          'backdrop-filter': 'blur(20px)',
          '-webkit-backdrop-filter': 'blur(20px)',
          'border': '1px solid rgba(255, 255, 255, 0.15)',
        },
        '.glass-solid': {
          'background': 'rgba(255, 255, 255, 0.85)',
          'backdrop-filter': 'blur(20px)',
          '-webkit-backdrop-filter': 'blur(20px)',
          'border': '1px solid rgba(0, 0, 0, 0.08)',
        },
        '.dark .glass': {
          'background': 'rgba(255, 255, 255, 0.05)',
          'border-color': 'rgba(255, 255, 255, 0.08)',
        },
        '.dark .glass-solid': {
          'background': 'rgba(15, 23, 42, 0.85)',
          'border-color': 'rgba(255, 255, 255, 0.08)',
        },
        '.glass-border': {
          'position': 'relative',
        },
        '.glass-border::before': {
          'content': '""',
          'position': 'absolute',
          'inset': '0',
          'border-radius': 'inherit',
          'padding': '1px',
          'background': 'linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.05))',
          '-webkit-mask': 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          '-webkit-mask-composite': 'xor',
          'mask-composite': 'exclude',
          'pointer-events': 'none',
        },
        '.text-gradient': {
          'background': 'linear-gradient(135deg, #0ea5e9, #8b5cf6)',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text',
        },
        '.scrollbar-thin': {
          'scrollbar-width': 'thin',
          'scrollbar-color': 'rgba(255, 255, 255, 0.2) transparent',
        },
        '.scrollbar-thin::-webkit-scrollbar': {
          'width': '6px',
          'height': '6px',
        },
        '.scrollbar-thin::-webkit-scrollbar-track': {
          'background': 'transparent',
        },
        '.scrollbar-thin::-webkit-scrollbar-thumb': {
          'background': 'rgba(255, 255, 255, 0.2)',
          'border-radius': '3px',
        },
        '.scrollbar-thin::-webkit-scrollbar-thumb:hover': {
          'background': 'rgba(255, 255, 255, 0.3)',
        },
      })

      addComponents({
        '.glass-card': {
          'background': 'rgba(255, 255, 255, 0.1)',
          'backdrop-filter': 'blur(20px)',
          '-webkit-backdrop-filter': 'blur(20px)',
          'border': '1px solid rgba(255, 255, 255, 0.15)',
          'border-radius': '1rem',
          'box-shadow': '0 8px 32px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
          'transition': 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        },
        '.dark .glass-card': {
          'background': 'rgba(255, 255, 255, 0.05)',
          'border-color': 'rgba(255, 255, 255, 0.08)',
          'box-shadow': '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        },
        '.glass-card:hover': {
          'background': 'rgba(255, 255, 255, 0.15)',
          'border-color': 'rgba(255, 255, 255, 0.2)',
          'box-shadow': '0 12px 40px rgba(0, 0, 0, 0.1), 0 0 30px rgba(14, 165, 233, 0.1)',
        },
        '.dark .glass-card:hover': {
          'background': 'rgba(255, 255, 255, 0.08)',
          'border-color': 'rgba(255, 255, 255, 0.12)',
          'box-shadow': '0 12px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(14, 165, 233, 0.15)',
        },
      })
    },
  ],
}
