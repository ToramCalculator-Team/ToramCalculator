import { defineConfig } from "@solidjs/start/config";

export default defineConfig({
  // middleware: "src/middleware.ts",
  ssr: false,
  vite: {
    cacheDir: '',
    build: {
      sourcemap: true,
      rollupOptions: {
        external: ['solid-js'],
      }
    },
    ssr: { external: ["drizzle-orm"] },
    optimizeDeps: {
      exclude: ['@electric-sql/pglite'],
    },
  },
});
