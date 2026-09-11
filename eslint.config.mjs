import js from "@eslint/js";
import ts from "typescript-eslint";
import next from "eslint-config-next";

const NAME = "Dutch Book";

export default [
  { ignores: [".next/**", "node_modules/**", "coverage/**"] },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...next,
  {
    // The engine and content layers carry the correctness of the product (D35).
    files: ["lib/engine/**/*.ts", "lib/content/**/*.ts"],
    rules: { "@typescript-eslint/no-explicit-any": "error" },
  },
  {
    // Determinism: every run must replay from its seed (D18).
    files: ["lib/**/*.ts"],
    rules: {
      "no-restricted-properties": [
        "error",
        { object: "Math", property: "random", message: "Use the seeded Rng (D18)." },
      ],
    },
  },
  {
    // The product name lives only in lib/brand.ts (D41).
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "lib/**/*.ts"],
    ignores: ["lib/brand.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: `Literal[value=/${NAME}/]`,
          message: "Import PRODUCT_NAME from lib/brand instead (D41).",
        },
      ],
    },
  },
  {
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "lib/**/*.ts"],
    rules: { "no-console": ["error", { allow: ["warn", "error"] }] },
  },
  {
    files: ["**/*.test.{ts,tsx}"],
    rules: { "@typescript-eslint/no-non-null-assertion": "off" },
  },
];
