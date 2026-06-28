import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    // Tokens de categoría — Tailwind JIT no siempre resuelve correctamente
    // colores con tres niveles de anidamiento (cat.X.bg/text/bar) desde el scanner
    { pattern: /^(bg|text)-cat-/ },
    { pattern: /^bg-cat-/, variants: ['hover', 'group-hover'] },

    // Tokens estructurales cuyos nombres coinciden con prefijos de utilidad
    // (bg, text, border) — el scanner puede fallar al hacer el lookup
    { pattern: /^bg-(bg|primary)(-\w+)?$/ },
    { pattern: /^text-(text|primary)(-\w+)?$/, variants: ['hover'] },
    { pattern: /^border-border(-strong)?$/, variants: ['disabled'] },
    { pattern: /^divide-border(-strong)?$/ },
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary:   'var(--color-bg-primary)',
          secondary: 'var(--color-bg-secondary)',
          card:      'var(--color-bg-card)',
        },
        text: {
          primary:   'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted:     'var(--color-text-muted)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          strong:  'var(--color-border-strong)',
        },
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover:   'var(--color-primary-hover)',
          light:   'var(--color-primary-light)',
          muted:   'var(--color-primary-muted)',
          bar:     'var(--color-primary-bar)',
        },
        cat: {
          transporte:     { bg: 'var(--color-cat-transporte-bg)',     text: 'var(--color-cat-transporte-text)',     bar: 'var(--color-cat-transporte-bar)'     },
          restaurantes:   { bg: 'var(--color-cat-restaurantes-bg)',   text: 'var(--color-cat-restaurantes-text)',   bar: 'var(--color-cat-restaurantes-bar)'   },
          comida:         { bg: 'var(--color-cat-comida-bg)',         text: 'var(--color-cat-comida-text)',         bar: 'var(--color-cat-comida-bar)'         },
          salud:          { bg: 'var(--color-cat-salud-bg)',          text: 'var(--color-cat-salud-text)',          bar: 'var(--color-cat-salud-bar)'          },
          supermercado:   { bg: 'var(--color-cat-supermercado-bg)',   text: 'var(--color-cat-supermercado-text)',   bar: 'var(--color-cat-supermercado-bar)'   },
          entretenimiento:{ bg: 'var(--color-cat-entretenimiento-bg)',text: 'var(--color-cat-entretenimiento-text)',bar: 'var(--color-cat-entretenimiento-bar)' },
          suscripciones:  { bg: 'var(--color-cat-suscripciones-bg)',  text: 'var(--color-cat-suscripciones-text)',  bar: 'var(--color-cat-suscripciones-bar)'  },
          otros:          { bg: 'var(--color-cat-otros-bg)',          text: 'var(--color-cat-otros-text)',          bar: 'var(--color-cat-otros-bar)'          },
          compras:        { bg: 'var(--color-cat-compras-bg)',        text: 'var(--color-cat-compras-text)',        bar: 'var(--color-cat-compras-bar)'        },
        },
      },
    },
  },
  plugins: [],
};
export default config;
