// eslint.config.js - ESLint v9 flat config (ตามที่ใช้ใน Week 5)
const globals = require('globals');

module.exports = [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'off',
      semi: ['error', 'always'],
      quotes: ['warn', 'single', { avoidEscape: true }],
      eqeqeq: 'warn',
    },
  },
  {
    ignores: ['node_modules/', 'coverage/'],
  },
];
