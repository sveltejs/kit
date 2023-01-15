// Linting on this Kit package is enabled only for browsers compatibity validation, using `eslint-plugin-compat`.

// A list of basic core-js that all modern browsers should support.
const coreJSLegacyPolyfills = [
  'URL',
  'URLSearchParams'
]

const browserLegacyPolyfills = [
  'Promise',
  'fetch'
]

const browserSharedPolyfills = [
  'AbortController',
  'IntersectionObserver'
]

module.exports = {
  extends: ['plugin:compat/recommended'],
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2020
  },
  env: {
    browser: true,
    es2017: true,
    node: true
  },
  settings: {
    polyfills: [
      ...coreJSLegacyPolyfills,
      ...browserLegacyPolyfills,
      ...browserSharedPolyfills
    ]
  }
};
