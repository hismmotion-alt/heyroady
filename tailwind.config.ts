import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        coral: '#D85A30',
        terra: '#993C1D',
        green: '#1D9E75',
        sky: '#378ADD',
        gold: '#EF9F27',
        sand: '#FDF6EE',
        navy: '#1B2D45',
      },
      fontFamily: { display: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};

export default config;
