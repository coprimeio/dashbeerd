const plugin = require('tailwindcss/plugin')

const baseFontSize = 10

module.exports = {
  content: [
    './app/**/*.{html,js,jsx,ts,tsx}',
    './components/**/*.{html,js,jsx,ts,tsx}',
    './pages/**/*.{html,js,jsx,ts,tsx}',
    './utils/**/*.{html,js,jsx,ts,tsx}',
    './config/**/*.{html,js,jsx,ts,tsx}',
    '../../packages/**/*.{html,js,jsx,ts,tsx}'
  ],
  theme: {
    borderRadius: {
      'none': '0',
      'sm': '2px',
      DEFAULT: '4px',
      'md': '6px',
      'lg': '8px',
      'xl': '10px',
      '2xl': '12px',
      '3xl': '16px',
      'full': '9999px',
    },
    extend: {
      spacing: () => ({
        13: '3.25rem',
        15: '3.75rem',
        18: '4.5rem',
        22: '5.5rem',
        68: '17rem',
        76: '19rem',
        84: '21rem',
        88: '22rem',
        92: '23rem',
        100: '25rem',
        '3px': '0.375rem',
        '5px': '0.625rem',
        ...Array.from({ length: 96 }, (_, index) => index * 0.5)
          .filter(i => i)
          .reduce((acc, i) => ({ ...acc, [i]: `${i / (baseFontSize / 4)}rem` }), {}),
      }),
    },
  },
  plugins: [
    plugin(function({ addVariant, e }) {
      addVariant('h', ({ modifySelectors, separator }) => {
        modifySelectors(({ className }) => {
          return `.${e(`h${separator}${className}`)}:hover`
        })
      })
    }),
    plugin(function({ addVariant, e }) {
      addVariant('fv', ({ modifySelectors, separator }) => {
        modifySelectors(({ className }) => {
          return `.${e(`fv${separator}${className}`)}:focus-visible`
        })
      })
    })
  ],
  breakpoints: {
    sm: '768',
    md: '1024',
    lg: '1280',
    xl: '1536',
  },
}
