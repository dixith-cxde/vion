import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettierConfig from "eslint-config-prettier/flat";

export default defineConfig([
  ...nextVitals,
  ...nextTs,

  {
    rules: {
      /*
       * Empty lines
       */
      "no-multiple-empty-lines": [
        "error",
        {
          max: 1,
          maxEOF: 0,
          maxBOF: 0,
        },
      ],

      /*
       * Remove padding inside blocks
       */
      "padded-blocks": ["error", "never"],

      /*
       * Allow single-line statements without braces
       */
      curly: ["error", "multi-line"],

      /*
       * Keep single-line statements beside condition
       */
      "nonblock-statement-body-position": ["error", "beside"],

      /*
       * Compact arrow functions
       */
      "arrow-body-style": ["error", "as-needed"],

      /*
       * Spacing consistency
       */
      "object-curly-spacing": ["error", "always"],
      "block-spacing": ["error", "always"],

      /*
       * Optional cleanup
       */
      "no-trailing-spaces": "error",
      "eol-last": ["error", "always"],
    },
  },

  // Override default ignores of eslint-config-next
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "lib/generated/**"]),

  // Disable style rules that conflict with Prettier
  prettierConfig,
]);
