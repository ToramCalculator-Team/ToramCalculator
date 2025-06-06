import { defineConfig } from "@solidjs/start/config";
import topLevelAwait from "vite-plugin-top-level-await";
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // middleware: "src/middleware.ts",
  ssr: false,
  vite: {
    cacheDir: "",
    build: {
      sourcemap: true,
      rollupOptions: {
        external: [
          "cloudflare:sockets",
          "@babylonjs/core",
          "@babylonjs/inspector",
          "@babylonjs/loaders",
          "@babylonjs/materials",
          "@babylonjs/inspector",
        ],
        output: {
          paths: {
            "@babylonjs/loaders": "https://cdn.babylonjs.com/loaders/babylonjs.loaders.min.js",
            "@babylonjs/inspector": "https://cdn.babylonjs.com/inspector/babylon.inspector.bundle.js",
            "@babylonjs/core": "https://cdn.babylonjs.com/babylon.js",
            "@babylonjs/materials": "https://cdn.babylonjs.com/materialsLibrary/babylonjs.materials.min.js",
          },
        },
      },
    },
    worker: {
      format: "es",
    },
    ssr: { external: [] },
    optimizeDeps: {
      exclude: ["@electric-sql/pglite"],
    },
    plugins: [
      topLevelAwait({
        // The export name of top-level await promise for each chunk module
        promiseExportName: "__tla",
        // The function to generate import names of top-level await promise in each chunk module
        promiseImportName: (i) => `__tla_${i}`,
      }),
      tailwindcss(),
    ],
  },
});
