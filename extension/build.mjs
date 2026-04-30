import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

import { build } from "esbuild";

const root = import.meta.dirname;
const dist = resolve(root, "dist");
const sharedAliasPlugin = {
  name: "shared-alias",
  setup(buildContext) {
    buildContext.onResolve({ filter: /^@shame-the-web\/shared$/ }, () => ({
      path: resolve(root, "../shared/src/index.ts")
    }));
  }
};

await rm(dist, { force: true, recursive: true });
await mkdir(dist, { recursive: true });
await cp(resolve(root, "public"), dist, { recursive: true });

await Promise.all([
  bundle("src/background/service-worker.ts", "assets/background.js", "esm"),
  bundle("src/content/toast-overlay.ts", "assets/content.js", "iife"),
  bundle("src/content/dashboard-bridge.ts", "assets/bridge.js", "iife"),
  bundle("src/popup/popup.ts", "assets/popup.js", "iife"),
  bundle("src/options/options.ts", "assets/options.js", "iife")
]);

async function bundle(entryPoint, outfile, format) {
  await build({
    bundle: true,
    entryPoints: [resolve(root, entryPoint)],
    format,
    outfile: resolve(dist, outfile),
    platform: "browser",
    plugins: [sharedAliasPlugin],
    sourcemap: false,
    target: "es2022"
  });
}
