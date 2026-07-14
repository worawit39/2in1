const globals = require("globals");

module.exports = [
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        ...globals.node,
        ...globals.jest
      }
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "error",
      "no-console": "off",
      semi: ["warn", "always"],
      quotes: ["warn", "single", { avoidEscape: true }]
    }
  },
  {
    ignores: ["node_modules/**", "coverage/**"]
  }
];
