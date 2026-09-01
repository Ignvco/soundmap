import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

// El config anterior importaba `@usehercules/eslint-plugin` de forma estática,
// pero ese paquete no está en package.json (es del entorno de Emergent, no está
// publicado). Resultado: `npm run lint` reventaba con ERR_MODULE_NOT_FOUND en
// cualquier máquina que no fuera esa. Ahora se carga si existe y se ignora si
// no, así el lint corre en local, en CI y allá.
let herculesConfigs = [];
try {
  const mod = await import("@usehercules/eslint-plugin");
  const plugin = mod.default ?? mod;
  if (plugin?.configs?.recommended) herculesConfigs = [plugin.configs.recommended];
} catch {
  // Plugin opcional ausente — se sigue sin él.
}

export default defineConfig([
  globalIgnores([
    "dist",
    "android",
    "**/_generated/*",
    "public/sw.js",
  ]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs["recommended-latest"],
      reactRefresh.configs.vite,
      ...herculesConfigs,
    ],
    rules: {
      "@typescript-eslint/ban-ts-comment": [
        "error",
        { "ts-ignore": true, "ts-expect-error": true, "ts-nocheck": true },
      ],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],
      "prefer-const": "off",
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
]);
