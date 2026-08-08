import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import testingLibrary from "eslint-plugin-testing-library";
import unusedImports from "eslint-plugin-unused-imports";

export default defineConfig([
  ...nextVitals,
  testingLibrary.configs["flat/react"],
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      "unused-imports": unusedImports,
    },
    rules: {
      "unused-imports/no-unused-imports": "warn",
    },
  },
  globalIgnores([
    ".next/**",
    "coverage/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "public/sw*.js",
    "public/swe-worker*.js",
  ]),
]);
