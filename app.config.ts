import { defineConfig } from "@solidjs/start/config";

export default defineConfig({
  // middleware: "src/middleware.ts",
  vite: {
    cacheDir: '',
    build: {
      sourcemap: true,
    },
    ssr: { external: ["drizzle-orm"] },
    optimizeDeps: {
      exclude: ['@electric-sql/pglite'],
    }
  },
});
