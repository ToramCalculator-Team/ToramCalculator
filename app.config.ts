import { defineConfig } from "@solidjs/start/config";
import topLevelAwait from "vite-plugin-top-level-await";
import tailwindcss from "@tailwindcss/vite";
import { writeFileSync, copyFileSync, mkdirSync } from "fs";
import path, { join, dirname } from "path";

export default defineConfig({
  // middleware: "src/middleware.ts",
  ssr: false,
  vite: {
    cacheDir: "",
    resolve: {
      alias: {
        '@db': '/db',
      }
    },
    build: {
      sourcemap: true,
      // 启用Vite的manifest生成
      manifest: true,
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
      // 添加chunk清单生成插件
      {
        name: "chunk-manifest-generator",
        apply: "build",
        generateBundle(options, bundle) {
          // 辅助函数定义
          const isCoreChunk = (fileName: string): boolean => {
            return (
              fileName.includes("main-") ||
              (fileName.includes("index-") && !fileName.includes("(character)")) ||
              fileName.includes("app-")
            );
          };

          const isRouteChunk = (fileName: string): boolean => {
            return (
              fileName.includes("(character)") ||
              fileName.includes("search-") ||
              fileName.includes("evaluate-") ||
              fileName.includes("profile-")
            );
          };

          const isWorkerChunk = (fileName: string): boolean => {
            return fileName.includes("worker-") || fileName.includes(".worker");
          };

          const isVendorChunk = (fileName: string): boolean => {
            return fileName.includes("babylon") || fileName.includes("three") || fileName.includes("vendor");
          };

          const isImageAsset = (fileName: string): boolean => {
            return /\.(png|jpg|jpeg|gif|svg|ico|webp)$/i.test(fileName);
          };

          const isFontAsset = (fileName: string): boolean => {
            return /\.(woff|woff2|ttf|eot)$/i.test(fileName);
          };

          const extractRouteName = (fileName: string): string => {
            if (fileName.includes("(character)")) return "character";
            if (fileName.includes("search-")) return "search";
            if (fileName.includes("evaluate-")) return "evaluate";
            if (fileName.includes("profile-")) return "profile";
            return "unknown";
          };

          const extractFeatureName = (fileName: string): string => {
            if (fileName.includes("store-")) return "store";
            if (fileName.includes("i18n-")) return "i18n";
            if (fileName.includes("pglite-")) return "pglite";
            if (fileName.includes("postgres-")) return "postgres";
            return "other";
          };

          const chunkManifest: any = {
            version: "1.0.0",
            buildTime: new Date().toISOString(),
            chunks: {
              core: [],
              routes: {},
              features: {},
              vendors: [],
              workers: [],
            },
            assets: {
              images: [],
              fonts: [],
              others: [],
            },
            // 保存完整的bundle信息用于调试
            bundleInfo: {},
          };

          // 分析所有chunk文件
          for (const [fileName, chunk] of Object.entries(bundle)) {
            if (chunk.type === "chunk") {
              const chunkInfo = {
                fileName,
                size: chunk.code?.length || 0,
                isEntry: chunk.isEntry,
                imports: chunk.imports || [],
                dynamicImports: chunk.dynamicImports || [],
              };

              // 分类chunk
              if (isCoreChunk(fileName)) {
                chunkManifest.chunks.core.push(chunkInfo);
              } else if (isRouteChunk(fileName)) {
                const routeName = extractRouteName(fileName);
                if (!chunkManifest.chunks.routes[routeName]) {
                  chunkManifest.chunks.routes[routeName] = [];
                }
                chunkManifest.chunks.routes[routeName].push(chunkInfo);
              } else if (isWorkerChunk(fileName)) {
                chunkManifest.chunks.workers.push(chunkInfo);
              } else if (isVendorChunk(fileName)) {
                chunkManifest.chunks.vendors.push(chunkInfo);
              } else {
                // 其他功能chunk
                const featureName = extractFeatureName(fileName);
                if (!chunkManifest.chunks.features[featureName]) {
                  chunkManifest.chunks.features[featureName] = [];
                }
                chunkManifest.chunks.features[featureName].push(chunkInfo);
              }

              // 保存完整信息
              chunkManifest.bundleInfo[fileName] = chunkInfo;
            } else if (chunk.type === "asset") {
              // 分类资源文件
              if (isImageAsset(fileName)) {
                chunkManifest.assets.images.push(fileName);
              } else if (isFontAsset(fileName)) {
                chunkManifest.assets.fonts.push(fileName);
              } else {
                chunkManifest.assets.others.push(fileName);
              }
            }
          }

          // === 生成到 public 目录，让 Vite 自动处理复制 ===
          const publicDir = join(process.cwd(), 'public');
          const manifestPath = join(publicDir, 'chunk-manifest.json');
          mkdirSync(dirname(manifestPath), { recursive: true }); // 确保目录存在
          writeFileSync(manifestPath, JSON.stringify(chunkManifest, null, 2));
          // console.log('📦 Chunk清单已生成到 public 目录:', manifestPath);

          // console.log("📊 Chunk统计:", {
          //   core: chunkManifest.chunks.core.length,
          //   routes: Object.keys(chunkManifest.chunks.routes).length,
          //   features: Object.keys(chunkManifest.chunks.features).length,
          //   workers: chunkManifest.chunks.workers.length,
          //   vendors: chunkManifest.chunks.vendors.length,
          //   assets:
          //     chunkManifest.assets.images.length +
          //     chunkManifest.assets.fonts.length +
          //     chunkManifest.assets.others.length,
          // });
        },
      },
    ],
  },
});
