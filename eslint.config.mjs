import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Disable the "no-explicit-any" TypeScript rule
      "@typescript-eslint/no-explicit-any": "off",
      // Disable unused variables rule (will be handled manually)
      "@typescript-eslint/no-unused-vars": "off",
      // Disable prefer-const rule (will be handled manually)
      "prefer-const": "off",
      // Disable unescaped entities rule (will be handled manually)
      "react/no-unescaped-entities": "off",
      // Disable exhaustive deps rule (will be handled manually)
      "react-hooks/exhaustive-deps": "off",
    },
  },
];

export default eslintConfig;