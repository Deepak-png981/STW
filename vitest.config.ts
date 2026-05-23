import { resolve } from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "dashboard/src/**/*.test.ts",
      "dashboard/tests/**/*.test.ts",
      "extension/tests/**/*.test.ts",
      "shared/src/**/*.test.ts",
      "shared/tests/**/*.test.ts"
    ],
    exclude: ["**/node_modules/**", "**/dist/**"]
  },
  resolve: {
    alias: {
      "@shame-the-web/shared": resolve(__dirname, "shared/src/index.ts")
    }
  }
});
