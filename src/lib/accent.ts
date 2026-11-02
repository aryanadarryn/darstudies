// App colour themes. The UI is written with Tailwind's `violet-*` classes; index.css re-points those shades at the
// chosen palette (html[data-accent=…]), so every button, tab and highlight follows the choice.
export const ACCENTS = {
  purple: { en: 'Purple', bm: 'Ungu', hex: '#6d28d9' },
  pink: { en: 'Pink', bm: 'Merah jambu', hex: '#be185d' },
  red: { en: 'Red', bm: 'Merah', hex: '#b91c1c' },
  orange: { en: 'Orange', bm: 'Oren', hex: '#c2410c' },
  green: { en: 'Green', bm: 'Hijau', hex: '#15803d' },
  teal: { en: 'Teal', bm: 'Hijau kebiruan', hex: '#0f766e' },
  blue: { en: 'Blue', bm: 'Biru', hex: '#1d4ed8' },
} as const

export type Accent = keyof typeof ACCENTS

/** The accent colour as a CSS value, for inline styles and SVG. */
export const ACCENT_VAR = 'var(--color-violet-700)'
