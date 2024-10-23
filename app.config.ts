import { defineConfig } from "@solidjs/start/config";

export default defineConfig({
  // middleware: "src/middleware.ts",
  ssr: false,
  vite: {
    cacheDir: "",
    build: {
      sourcemap: true,
      rollupOptions: {
        external: [
          'babylonjs',
          'babylonjs-loaders',
          'babylonjs/serializers',
          'babylonjs/gui-editor',
          'babylonjs/gui',
          'babylonjs/materials',
          // 'babylonjs/inspector'
        ],
        output: {
          paths: {
            'babylonjs-loaders': 'https://cdn.babylonjs.com/loaders/babylonjs.loaders.min.js',
            // 'babylonjs-inspector': 'https://cdn.babylonjs.com/inspector/babylon.inspector.bundle.js',
            'babylonjs': 'https://cdn.babylonjs.com/babylon.js'
          }
        }
      },
    },
    worker: {
      format: "es",
    },
    ssr: { external: [] },
    optimizeDeps: {
      exclude: ["@electric-sql/pglite"],
    },
  },
});
