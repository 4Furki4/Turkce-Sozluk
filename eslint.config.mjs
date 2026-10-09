import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import testingLibrary from "eslint-plugin-testing-library";
import unusedImports from "eslint-plugin-unused-imports";
import reactHooks from "eslint-plugin-react-hooks";

export default defineConfig([
  ...nextVitals,
  {
    ...testingLibrary.configs["flat/react"],
    files: ["src/**/__tests__/*.{ts,tsx}", "src/**/*.{test,spec}.{ts,tsx}"],
    // Existing test ergonomics stay advisory; async test misuse remains an error.
    rules: {
      ...testingLibrary.configs["flat/react"].rules,
      "testing-library/no-node-access": "warn",
      "testing-library/no-container": "warn",
      "testing-library/no-unnecessary-act": "warn",
      "testing-library/prefer-find-by": "warn",
      "testing-library/render-result-naming-convention": "warn",
      "react/display-name": "warn",
    },
  },
  {
    plugins: { "unused-imports": unusedImports, "react-hooks": reactHooks },
    rules: {
      "unused-imports/no-unused-imports": "warn",
      // This app does not enable React Compiler. Its migration advice is visible
      // without turning CI setup into a broad component rewrite. Rules of Hooks
      // and the remaining Core Web Vitals rules retain their error severity.
      "react-hooks/error-boundaries": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/static-components": "warn",
    },
  },
  globalIgnores([
    ".next/**", "out/**", "build/**", "coverage/**", "next-env.d.ts",
    "public/**", "_bmad/**", "_bmad-output/**", ".codex/**", ".agents/**",
    ".codebase-memory/**", ".pronunciation-cache/**", "jev/output/**",
    "playwright-report/**", "test-results/**",
  ]),
]);
