import { solidStart } from "@solidjs/start/config";
import { nitroV2Plugin } from "@solidjs/vite-plugin-nitro-2";
import tailwindcss from "@tailwindcss/vite";
import type { Plugin } from "vite";
import { defineConfig } from "vite";
import topLevelAwait from "vite-plugin-top-level-await";

function createChunkManifestPlugin(): Plugin {
	return {
		name: "chunk-manifest-generator",
		apply: "build",
		generateBundle(_options, bundle) {
			// 在环境 API 下通过 this.environment 判断是否为客户端构建
			if (this.environment?.name !== "client") {
				return;
			}

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

			for (const [fileName, output] of Object.entries(bundle)) {
				if (output.type === "chunk") {
					if (output.isEntry || (output.isDynamicEntry && !output.facadeModuleId?.includes("(character)"))) {
						chunkManifest.chunks.core.push({ fileName });
					}
					continue;
				}

				if (/\.(png|jpg|jpeg|gif|svg|ico|webp)$/i.test(fileName)) {
					chunkManifest.assets.images.push({ fileName });
				} else if (/\.(woff|woff2|ttf|eot)$/i.test(fileName)) {
					chunkManifest.assets.fonts.push({ fileName });
				} else {
					chunkManifest.assets.others.push({ fileName });
				}
			}

			// 通过 emitFile 将 manifest 纳入构建管线，自动输出到正确的 outDir
			this.emitFile({
				type: "asset",
				fileName: "chunk-manifest.json",
				source: JSON.stringify(chunkManifest),
			});
		},
	};
}

export default defineConfig(() => {
	return {
		resolve: {
			alias: {
				"@db": "/db",
			},
		},
		build: {
			// Keep this explicit because vite-plugin-top-level-await reads the raw
			// config before Vite resolves "baseline-widely-available"; its fallback
			// includes Safari 14, which makes esbuild try to downlevel destructuring.
			target: ["chrome107", "edge107", "firefox104", "safari16"],
			// 默认关闭 sourcemap（显著降低构建内存占用）；需要时用 VITE_SOURCEMAP=true 开启
			sourcemap: false,
			// 启用Vite的manifest生成
			manifest: true,
			rollupOptions: {
				output: {
					// Keep Babylon in its own synchronous vendor chunk so it does not share
					// initialization order with application chunks rewritten by top-level-await.
					manualChunks(id: string) {
						if (id.includes("@babylonjs/")) {
							return "babylon";
						}
						if (id.includes("@electric-sql/pglite")) {
							return "pglite";
						}
					},
				},
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
			format: "es" as const,
		},
		optimizeDeps: {
			exclude: ["@electric-sql/pglite", "@babylonjs/inspector"],
		},
		plugins: [
			// SPA 模式用于避免 SSR 在 Node 里加载 monaco-editor 链上的 .css
			solidStart({ ssr: false }),
			nitroV2Plugin(),
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
	};
});
