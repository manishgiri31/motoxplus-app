/** @type {import('tailwindcss').Config} */
// Color/spacing/radius values are kept in sync by hand with constants/colors.ts,
// constants/spacing.ts (NativeWind classNames need these here; native color props
// like <Icon color="..."/> need the JS values there — see comments in those files).
//
// darkMode: 'class' is required — not optional — because nativewind's
// colorScheme.set()/useColorScheme().setColorScheme() (used for the manual
// theme override in Settings) throws at runtime under the default 'media'
// strategy. See node_modules/nativewind/dist/stylesheet.js.
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Static brand colors — same in both themes, safe to hardcode.
        brandred: {
          50: '#FFF1F1',
          100: '#FFDCDC',
          200: '#FFB3B3',
          300: '#FF8080',
          400: '#F94D4D',
          500: '#E4111A',
          600: '#C10D16',
          700: '#9A0A11',
          800: '#73070D',
          900: '#4D0509',
        },
        // Static gray ramp — still available for one-off cases, but prefer
        // the semantic tokens below (background/surface/border/text/muted)
        // in screens/components so dark mode is automatic.
        graytone: {
          50: '#FAFAFA',
          100: '#F2F2F2',
          200: '#E4E4E4',
          300: '#CBCBCB',
          400: '#A3A3A3',
          500: '#737373',
          600: '#525252',
          700: '#3A3A3A',
          800: '#242424',
          900: '#141414',
        },
        // Semantic tokens — resolve to CSS variables defined per-theme in
        // global.css (:root for light, .dark:root for dark). These are what
        // screens/components should actually use: bg-background, text-text,
        // bg-surface, bg-card, border-border, text-muted, bg-primary,
        // bg-secondary, text-success/warning/danger, etc.
        background: 'rgb(var(--background) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        card: 'rgb(var(--card) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        text: 'rgb(var(--text) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        primary: {
          DEFAULT: 'rgb(var(--primary) / <alpha-value>)',
          hover: 'rgb(var(--primary-hover) / <alpha-value>)',
          active: 'rgb(var(--primary-active) / <alpha-value>)',
          foreground: 'rgb(var(--primary-foreground) / <alpha-value>)',
        },
        link: {
          DEFAULT: 'rgb(var(--link) / <alpha-value>)',
          'on-dark': 'rgb(var(--link-on-dark) / <alpha-value>)',
        },
        'border-soft': 'rgb(var(--border-soft) / <alpha-value>)',
        subtle: 'rgb(var(--subtle) / <alpha-value>)',
        secondary: {
          DEFAULT: 'rgb(var(--secondary) / <alpha-value>)',
          foreground: 'rgb(var(--secondary-foreground) / <alpha-value>)',
        },
        success: 'rgb(var(--success) / <alpha-value>)',
        warning: 'rgb(var(--warning) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',

        // --- Redesign tokens (src/theme), prefixed `theme-*` so they sit
        // alongside the semantic tokens above without colliding with them.
        // Keep these in sync with src/theme by hand. The app is light-only.
        'theme-paper': '#FFFFFF',
        'theme-card': '#F5F5F7',
        'theme-ink': '#1D1D1F',
        'theme-muted': '#6E6E73',
        'theme-subtle': '#86868B',
        'theme-line': '#D2D2D7',
        'theme-line-soft': '#E8E8ED',
        'theme-accent': '#0071E3',
        'theme-accent-hover': '#0077ED',
        'theme-accent-active': '#006EDB',
        'theme-link': '#0066CC',
        'theme-link-on-dark': '#2997FF',
        'theme-red': '#D70015',
        'theme-red-pressed': '#B8000F',
        'theme-red-soft': '#FFF0F1',
        'theme-black': '#000000',
        'theme-dark': '#161617',
        'theme-dark-border': '#333336',
      },
      spacing: {
        xxs: '2px',
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '24px',
        '3xl': '32px',
        '4xl': '40px',
        '5xl': '48px',

        // src/theme's spacing scale: [4, 8, 12, 16, 24, 32, 48, 64].
        'theme-xs': '4px',
        'theme-sm': '8px',
        'theme-md': '12px',
        'theme-lg': '16px',
        'theme-xl': '24px',
        'theme-2xl': '32px',
        'theme-3xl': '48px',
        'theme-4xl': '64px',
      },
      borderRadius: {
        sm: '8px',
        md: '12px', // inputs, buttons (legacy components/ui)
        lg: '18px', // cards
        xl: '20px',

        // src/theme's radii — deliberately different numbers from the sm/md/lg
        // above, hence the separate `theme-*` names rather than overriding them.
        'theme-sm': '12px',
        'theme-md': '18px',
        'theme-lg': '20px',
        'theme-input': '12px',
        'theme-card': '18px',
        'theme-pill': '999px',
      },
      fontSize: {
        // Matches constants/typography.ts's typeScale — [fontSize, { lineHeight }].
        display: ['34px', { lineHeight: '40px' }],
        h1: ['28px', { lineHeight: '34px' }],
        h2: ['22px', { lineHeight: '28px' }],
        h3: ['18px', { lineHeight: '24px' }],
        'body-lg': ['17px', { lineHeight: '24px' }],
        body: ['15px', { lineHeight: '22px' }],
        'body-sm': ['13px', { lineHeight: '18px' }],
        label: ['13px', { lineHeight: '16px' }],
        caption: ['11px', { lineHeight: '14px' }],
        price: ['20px', { lineHeight: '24px' }],

        // Matches src/theme's type scale: 12, 14, 17, 21, 28, 40, 56, 80.
        'theme-caption': ['12px', { lineHeight: '16px', letterSpacing: '-0.12px' }],
        'theme-small': ['14px', { lineHeight: '20px', letterSpacing: '-0.224px' }],
        'theme-body': ['17px', { lineHeight: '25px', letterSpacing: '-0.374px' }],
        'theme-h3': ['21px', { lineHeight: '23px', letterSpacing: '-0.315px' }],
        'theme-h2': ['28px', { lineHeight: '30px', letterSpacing: '-0.42px' }],
        'theme-h1': ['40px', { lineHeight: '42px', letterSpacing: '-0.6px' }],
        'theme-display': ['56px', { lineHeight: '59px', letterSpacing: '-0.84px' }],
        'theme-jumbo': ['80px', { lineHeight: '84px', letterSpacing: '-1.2px' }],
      },
      fontFamily: {
        // Inter everywhere; display/mono keys kept as aliases for older classNames.
        'theme-display': ['Inter_600SemiBold'],
        'theme-display-medium': ['Inter_500Medium'],
        'theme-display-bold': ['Inter_600SemiBold'],
        'theme-display-extrabold': ['Inter_700Bold'],
        'theme-sans': ['Inter_400Regular'],
        'theme-sans-medium': ['Inter_500Medium'],
        'theme-sans-semibold': ['Inter_600SemiBold'],
        'theme-mono': ['Inter_400Regular'],
        'theme-mono-medium': ['Inter_500Medium'],
      },
    },
  },
  plugins: [],
};
