/** @type {import('tailwindcss').Config} */
import discussionsPreset from '@seer-pm/discussions/tailwind';

const sb = (name) => `rgb(var(--sb-${name}) / <alpha-value>)`;

export default {
  presets: [discussionsPreset],
  darkMode: ['selector', '[data-theme="dark"]'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './node_modules/@seer-pm/discussions/dist/**/*.{js,mjs}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Fraunces', '"Times New Roman"', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        italic: ['"Instrument Serif"', '"Times New Roman"', 'serif'],
      },
      colors: {
        wall: sb('bg'),
        plaque: sb('surface'),
        'plaque-edge': sb('border-2'),
        paper: sb('ink'),
        muted: sb('ink-4'),
        brand: sb('blue'),
        up: sb('blue-hover'),
        down: sb('neg'),
        'down-ink': sb('neg-text'),
        edge: sb('border'),
        'edge-strong': sb('border-strong'),
        'bg-2': sb('bg-2'),
        'bg-3': sb('bg-3'),
        'ink-2': sb('ink-2'),
        'ink-3': sb('ink-3'),
        'ink-5': sb('ink-5'),
        'blue-text': sb('blue-text'),
        'blue-soft': sb('blue-soft'),
        pos: sb('pos'),
        'pos-text': sb('pos-text'),
      },
      borderRadius: {
        panel: '12px',
        control: '8px',
        custom: '8px',
      },
      boxShadow: {
        panel: 'var(--sb-shadow-md)',
        lot: 'var(--sb-shadow)',
      },
      maxWidth: {
        shell: '1350px',
      },
    },
  },
  plugins: [],
};
