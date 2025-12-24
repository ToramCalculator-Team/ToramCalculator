import { defineConfig } from "@solidjs/start/config";
import topLevelAwait from "vite-plugin-top-level-await";
import tailwindcss from "@tailwindcss/vite";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";

type ViteResolvedConfigLike = {
  build?: {
    ssr?: boolean | string;
  };
};

type OutputChunkLike = {
  type: "chunk";
  isEntry?: boolean;
};

type OutputAssetLike = {
  type: "asset";
};

type OutputLike = OutputChunkLike | OutputAssetLike;
type OutputBundleLike = Record<string, OutputLike>;

function createChunkManifestPlugin() {
  let isSsrBuild = false;

  return {
    name: "chunk-manifest-generator",
    apply: "build",
    configResolved(config: unknown) {
      // 只在客户端（非 SSR）构建生成 chunk-manifest.json
      // 否则会把 ssr/server-fns 的 bundle 信息写进 public，导致 SW 预缓存错误、文件体积暴涨
      const resolved = config as ViteResolvedConfigLike;
      isSsrBuild = !!resolved.build?.ssr;
    },
    generateBundle(_options: unknown, bundle: OutputBundleLike) {
      if (isSsrBuild) {
        return;
      }

      // 辅助函数定义
      const isCoreChunk = (fileName: string): boolean => {
        return (
          fileName.includes("main-") ||
          (fileName.includes("index-") && !fileName.includes("(character)")) ||
          fileName.includes("app-")
        );
      };

      const isImageAsset = (fileName: string): boolean => {
        return /\.(png|jpg|jpeg|gif|svg|ico|webp)$/i.test(fileName);
      };

      const isFontAsset = (fileName: string): boolean => {
        return /\.(woff|woff2|ttf|eot)$/i.test(fileName);
      };

      type ManifestEntry = { fileName: string };

      const chunkManifest = {
        version: "1.0.0",
        buildTime: Date.now(),
        buildTimeISO: new Date().toISOString(),
        chunks: {
          core: [] as ManifestEntry[],
        },
        assets: {
          images: [] as ManifestEntry[],
          fonts: [] as ManifestEntry[],
          others: [] as ManifestEntry[],
        },
      };

      // 分析所有chunk文件
      for (const [fileName, output] of Object.entries(bundle)) {
        if (output.type === "chunk") {
          // 只保留 SW 预缓存真正需要的最小信息：核心入口 JS
          if (output.isEntry || isCoreChunk(fileName)) {
            chunkManifest.chunks.core.push({ fileName });
          }
          continue;
        }

        if (isImageAsset(fileName)) {
          chunkManifest.assets.images.push({ fileName });
        } else if (isFontAsset(fileName)) {
          chunkManifest.assets.fonts.push({ fileName });
        } else {
          chunkManifest.assets.others.push({ fileName });
        }
      }

      // === 生成到 public 目录，让 Vite 自动处理复制 ===
      const publicDir = join(process.cwd(), "public");
      const manifestPath = join(publicDir, "chunk-manifest.json");
      mkdirSync(dirname(manifestPath), { recursive: true }); // 确保目录存在

      // 生产使用紧凑 JSON，减小体积；需要可读性时可通过 MANIFEST_PRETTY=true 开启
      const pretty = process.env.MANIFEST_PRETTY === "true";
      writeFileSync(manifestPath, JSON.stringify(chunkManifest, null, pretty ? 2 : 0));
    },
  };
}

export default defineConfig({
  // middleware: "src/middleware.ts",
  ssr: false,
  vite: {
    // 为空字符串会让 Vite 缓存行为变得不可控，建议固定目录
    cacheDir: ".vinxi/cache/vite",
    resolve: {
      alias: {
        '@db': '/db',
      }
    },
    build: {
      // 默认关闭 sourcemap（显著降低构建内存占用）；需要时用 VITE_SOURCEMAP=true 开启
      sourcemap: process.env.VITE_SOURCEMAP === "true",
      // 启用Vite的manifest生成
      manifest: true,
      rollupOptions: {
        // external: [
        //   "cloudflare:sockets",
        //   "@babylonjs/core",
        //   "@babylonjs/inspector",
        //   "@babylonjs/loaders",
        //   "@babylonjs/materials",
        //   "@babylonjs/inspector",
        // ],
        // output: {
        //   paths: {
        //     "@babylonjs/loaders": "https://cdn.babylonjs.com/loaders/babylonjs.loaders.min.js",
        //     "@babylonjs/inspector": "https://cdn.babylonjs.com/inspector/babylon.inspector.bundle.js",
        //     "@babylonjs/core": "https://cdn.babylonjs.com/babylon.js",
        //     "@babylonjs/materials": "https://cdn.babylonjs.com/materialsLibrary/babylonjs.materials.min.js",
        //   },
        // },
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
      createChunkManifestPlugin(),
    ],
  },
});
