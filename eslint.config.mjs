import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/modules/*/application/**",
                "@/modules/*/domain/**",
                "@/modules/*/infrastructure/**",
                "@/modules/*/presentation/**",
              ],
              message: "Importá únicamente contracts, server o ui del módulo.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next-e2e/**",
    "coverage/**",
    "out/**",
    "build/**",
    "test-results/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
