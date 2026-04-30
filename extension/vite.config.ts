import { resolve } from "node:path";

import { defineConfig } from "vite";

export default defineConfig({
  build: {
    emptyOutDir: true,
    outDir: "dist",
    rollupOptions: {
      input: {
        background: resolve(__dirname, "src/background/service-worker.ts"),
        content: resolve(__dirname, "src/content/toast-overlay.ts"),
        bridge: resolve(__dirname, "src/content/dashboard-bridge.ts"),
        popup: resolve(__dirname, "src/popup/popup.ts"),
        options: resolve(__dirname, "src/options/options.ts")
      },
      output: {
        entryFileNames: "assets/[name].js"
      }
    }
  },
  resolve: {
    alias: {
      "@shame-the-web/shared": resolve(__dirname, "../shared/src/index.ts")
    }
  }
});
