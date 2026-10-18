const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier/flat');

module.exports = defineConfig([
  { ignores: ['dist/**', 'android/**', 'ios/**', 'coverage/**', 'node_modules/**'] },
  expoConfig,
  prettierConfig,
]);
