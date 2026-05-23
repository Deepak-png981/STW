import { cp, mkdir, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const extensionRoot = resolve(scriptDir, "..");
const distDir = resolve(extensionRoot, "offscreen-dist");
const repoRoot = resolve(extensionRoot, "..");

await mkdir(distDir, { recursive: true });

await build({
  entryPoints: [resolve(extensionRoot, "offscreen.ts")],
  outfile: resolve(distDir, "offscreen.js"),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  alias: {
    "@huggingface/transformers": resolve(
      repoRoot,
      "node_modules/@huggingface/transformers/dist/transformers.web.js"
    ),
    sharp: resolve(extensionRoot, "src/lib/stubs/node-only.ts"),
    "onnxruntime-node": resolve(extensionRoot, "src/lib/stubs/node-only.ts"),
    url: resolve(extensionRoot, "src/lib/stubs/node-url.ts")
  }
});

const { writeFile } = await import("node:fs/promises");
const offscreenHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Shame The Web Offscreen AI</title>
  </head>
  <body>
    <script type="module" src="./offscreen.js"></script>
  </body>
</html>
`;
await writeFile(resolve(distDir, "offscreen.html"), offscreenHtml, "utf8");

const buildRoots = await listBuildRoots(resolve(extensionRoot, "build"));
await Promise.all(
  buildRoots.map(async (buildRoot) => {
    const assetsDir = resolve(buildRoot, "assets");
    await mkdir(assetsDir, { recursive: true });
    await cp(resolve(distDir, "offscreen.js"), resolve(assetsDir, "offscreen.js"));
    await cp(resolve(distDir, "offscreen.html"), resolve(assetsDir, "offscreen.html"));
  })
);

console.log(`[STW] built offscreen AI bundle (${buildRoots.length} build target(s) updated)`);

async function listBuildRoots(buildDir) {
  try {
    const entries = await readdir(buildDir, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => resolve(buildDir, entry.name));
  } catch {
    return [];
  }
}
