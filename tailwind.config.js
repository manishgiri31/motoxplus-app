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
          foreground: 'rgb(var(--primary-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'rgb(var(--secondary) / <alpha-value>)',
          foreground: 'rgb(var(--secondary-foreground) / <alpha-value>)',
        },
        success: 'rgb(var(--success) / <alpha-value>)',
        warning: 'rgb(var(--warning) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',

        // --- Redesign tokens (src/theme), prefixed `theme-*` so they sit
        // alongside the semantic tokens above without colliding with them
        // (e.g. `muted` and `card` already exist above with different,
        // dark-mode-aware values). Keep these in sync with src/theme by hand
        // — the redesign is light-only, so unlike the tokens above these do
        // NOT change under `.dark:root`.
        'theme-paper': '#FBFAF8',
        'theme-card': '#FFFFFF',
        'theme-ink': '#17181A',
        'theme-muted': '#6B6E73',
        'theme-line': '#E7E5E1',
        'theme-red': '#D01F25',
        'theme-red-pressed': '#B5181E',
        'theme-red-soft': '#FCEFEF',
        'theme-dark': '#212226',
        'theme-dark-border': '#33353A',
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
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '20px',

        // src/theme's radii — deliberately different numbers from the sm/md/lg
        // above, hence the separate `theme-*` names rather than overriding them.
        'theme-sm': '10px',
        'theme-md': '14px',
        'theme-lg': '20px',
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

        // Matches src/theme's typography scale.
        'theme-h1': ['32px', { lineHeight: '38px' }],
        'theme-h2': ['24px', { lineHeight: '30px' }],
        'theme-h3': ['18px', { lineHeight: '24px' }],
        'theme-body': ['15.5px', { lineHeight: '22px' }],
        'theme-body-semibold': ['15.5px', { lineHeight: '22px' }],
        'theme-caption': ['13.5px', { lineHeight: '18px' }],
        'theme-mono': ['12px', { lineHeight: '16px' }],
        'theme-eyebrow': ['11px', { lineHeight: '14px' }],
      },
      fontFamily: {
        // Prefixed like the other theme-* tokens so nothing outside the
        // redesign can accidentally pick these up via generic `font-sans`.
        'theme-display': ['SchibstedGrotesk_700Bold'],
        'theme-display-medium': ['SchibstedGrotesk_500Medium'],
        'theme-display-bold': ['SchibstedGrotesk_700Bold'],
        'theme-display-extrabold': ['SchibstedGrotesk_800ExtraBold'],
        'theme-sans': ['Inter_400Regular'],
        'theme-sans-medium': ['Inter_500Medium'],
        'theme-sans-semibold': ['Inter_600SemiBold'],
        'theme-mono': ['IBMPlexMono_400Regular'],
        'theme-mono-medium': ['IBMPlexMono_500Medium'],
      },
    },
  },
  plugins: [],
};
