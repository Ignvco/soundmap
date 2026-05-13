const { defineConfig } = require('eslint/config')
const expoConfig = require('eslint-config-expo/flat')

module.exports = defineConfig([
  expoConfig,
  {
    rules: {
      'prefer-const': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
])
