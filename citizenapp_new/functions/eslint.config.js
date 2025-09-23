const {configs} = require("@eslint/js");
const typescript = require("@typescript-eslint/parser");
const globals = require("globals");
const eslintPluginTypescript = require("@typescript-eslint/eslint-plugin");

module.exports = [
  // UPDATE: This line tells ESLint to ignore the entire 'lib' folder.
  {
    ignores: ["lib/**"],
  },
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: typescript,
      parserOptions: {
        project: "tsconfig.json",
      },
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      "@typescript-eslint": eslintPluginTypescript,
    },
    rules: {
      ...configs.recommended.rules,
      ...eslintPluginTypescript.configs.recommended.rules,
      "quotes": ["error", "double"],
      "import/no-unresolved": 0,
      "indent": ["error", 2],
      "object-curly-spacing": ["error", "never"],
      "max-len": ["error", {"code": 80}],
      "no-var": "error",
    },
  },
];