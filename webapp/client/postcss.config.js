export default {
  plugins: {
    '@tailwindcss/postcss': {},
    'postcss-preset-env': {
      features: {
        'oklab-function': true, // Abilita esplicitamente il fallback per oklab e oklch
        'color-function': true  // Altre funzioni colori moderne
      },
      // Forziamo il polyfill per browser più vecchi in modo che generi l'RGB equivalente
      browsers: 'last 5 versions',
      // Generiamo SEMPRE il fallback RGB, anche se il browser supporta oklch, per proteggere html2canvas
      preserve: false 
    }
  }
}
