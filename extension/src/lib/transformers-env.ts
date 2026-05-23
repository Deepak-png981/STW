type TransformersModule = {
  env: {
    backends: {
      onnx: {
        wasm: {
          wasmPaths: string;
          proxy: boolean;
        };
      };
    };
    useBrowserCache: boolean;
  };
};

export function configureTransformersEnv(module: TransformersModule): void {
  const ortBase = chrome.runtime.getURL("assets/ort/");
  module.env.backends.onnx.wasm.wasmPaths = ortBase;
  module.env.backends.onnx.wasm.proxy = false;
  module.env.useBrowserCache = true;
}
