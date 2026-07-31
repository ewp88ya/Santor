import js from "@eslint/js";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.turbo/**",
      "**/coverage/**",
      "apps/**",
      "services/**",
      "packages/**",
    ],
  },

  js.configs.recommended,
]);
