import { cp, mkdir, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const extensionRoot = resolve(scriptDir, "..");
const extensionBuildRoot = resolve(extensionRoot, "build");
const ortSourceDir = resolve(extensionRoot, "../node_modules/onnxruntime-web/dist");
const ortDestDir = resolve(extensionRoot, "assets/ort");

const ortFiles = [
  "ort-wasm-simd-threaded.asyncify.mjs",
  "ort-wasm-simd-threaded.asyncify.wasm",
  "ort-wasm-simd-threaded.mjs",
  "ort-wasm-simd-threaded.wasm"
];

await mkdir(ortDestDir, { recursive: true });
await Promise.all(
  ortFiles.map((fileName) => cp(resolve(ortSourceDir, fileName), resolve(ortDestDir, fileName)))
);

const buildRoots = await listBuildRoots(extensionBuildRoot);
await Promise.all(
  buildRoots.map(async (buildRoot) => {
    const buildOrtDestDir = resolve(buildRoot, "assets/ort");
    await mkdir(buildOrtDestDir, { recursive: true });
    await Promise.all(
      ortFiles.map((fileName) => cp(resolve(ortSourceDir, fileName), resolve(buildOrtDestDir, fileName)))
    );
  })
);

console.log(`[STW] synced ${ortFiles.length} ONNX wasm assets to assets/ort/ (${buildRoots.length} build target(s) updated)`);

async function listBuildRoots(buildRoot) {
  try {
    const entries = await readdir(buildRoot, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => resolve(buildRoot, entry.name));
  } catch {
    return [];
  }
}
