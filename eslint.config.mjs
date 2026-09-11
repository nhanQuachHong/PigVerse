import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores([
    "**/.next/**",
    "**/artifacts/**",
    "**/cache/**",
    "**/coverage/**",
    "**/dist/**",
    "**/node_modules/**",
    "public/assets/**",
  ]),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...nextVitals,
  {
    rules: {
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  {
    files: ["scripts/**/*.mjs", "**/*.config.{js,mjs}"],
    languageOptions: {
      globals: globals.node,
    },
  },
]);
