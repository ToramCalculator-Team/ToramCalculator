import { build } from 'esbuild';

await build({
  entryPoints: ['src/worker/sw/main.ts'],
  bundle: true,
  minify: true,
  platform: 'browser',
  outfile: 'public/service.worker.js',
  format: 'esm',
  target: ['es2020'],
});

console.log('✅ Service Worker 已输出到 public/service.worker.js'); 