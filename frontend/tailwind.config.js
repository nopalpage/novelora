/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx,html}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Fraunces"', 'Georgia', 'serif'],
        sans:  ['"Outfit"', 'system-ui', 'sans-serif'],
      },
      colors: {
        paper:  { DEFAULT: '#faf8f4', 2: '#f2efe8', 3: '#e8e4d8' },
        ink:    { DEFAULT: '#191917', 2: '#4a4a46', 3: '#9a9a94', 4: '#c8c8c0' },
        line:   '#e4e0d4',
        accent: { DEFAULT: '#b84c2a', 2: '#d4673e' },
        cover:  {
          1:'#2d1b3d', 2:'#1b2d3d', 3:'#3d2b1b',
          4:'#1b3d28', 5:'#3d1b2d', 6:'#2d3d1b',
          7:'#3d3520', 8:'#1b2838', 9:'#38201b', 10:'#203835',
        },
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            color: theme('colors.ink.2'),
            lineHeight: '1.85',
            fontSize:   '17px',
            'h1,h2,h3': { color: theme('colors.ink.DEFAULT'), fontFamily: theme('fontFamily.serif').join(', ') },
            a: { color: theme('colors.accent.DEFAULT') },
            '--tw-prose-body': theme('colors.ink.2'),
            '--tw-prose-headings': theme('colors.ink.DEFAULT'),
          },
        },
      }),
      animation: {
        'fade-up': 'fadeUp .4s ease both',
        'skeleton': 'skeleton 1.4s infinite',
        'pulse-dot': 'pulseDot 2s infinite',
      },
      keyframes: {
        fadeUp:    { from:{ opacity:'0',transform:'translateY(12px)' }, to:{ opacity:'1',transform:'none' } },
        skeleton:  { '0%,100%':{ opacity:'1' }, '50%':{ opacity:'.4' } },
        pulseDot:  { '0%,100%':{ transform:'scale(1)' }, '50%':{ transform:'scale(1.4)' } },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
  ],
}
