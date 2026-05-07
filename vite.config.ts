import { solidStart } from "@solidjs/start/config";
import { nitroV2Plugin } from "@solidjs/vite-plugin-nitro-2";
import tailwindcss from "@tailwindcss/vite";
import type { Plugin } from "vite";
import { defineConfig } from "vite";

type ManifestEntry = {
	fileName: string;
	size: number;
	kind: "js" | "css" | "wasm" | "worker" | "image" | "font" | "data" | "other";
};

function createChunkManifestPlugin(): Plugin {
	const getKind = (fileName: string): ManifestEntry["kind"] => {
		const lower = fileName.toLowerCase();
		if (lower.includes("worker") && lower.endsWith(".js")) return "worker";
		if (lower.endsWith(".js")) return "js";
		if (lower.endsWith(".css")) return "css";
		if (lower.endsWith(".wasm")) return "wasm";
		if (/\.(png|jpg|jpeg|gif|svg|ico|webp)$/i.test(lower)) return "image";
		if (/\.(woff|woff2|ttf|eot)$/i.test(lower)) return "font";
		if (/\.(data|gz|tar)$/i.test(lower)) return "data";
		return "other";
	};

	const getOutputSize = (output: any): number => {
		if (output.type === "chunk") return Buffer.byteLength(output.code);
		return typeof output.source === "string" ? Buffer.byteLength(output.source) : output.source.byteLength;
	};

	const toEntry = (fileName: string, output: any): ManifestEntry => ({
		fileName,
		size: getOutputSize(output),
		kind: getKind(fileName),
	});

	return {
		name: "chunk-manifest-generator",
		apply: "build",
		generateBundle(_options, bundle) {
			// 在环境 API 下通过 this.environment 判断是否为客户端构建
			if (this.environment?.name !== "client") {
				return;
			}

			const chunkManifest = {
				version: "1.0.0",
				buildTime: Date.now(),
				buildTimeISO: new Date().toISOString(),
				startup: [] as ManifestEntry[],
				chunks: {
					core: [] as ManifestEntry[],
					warm: [] as ManifestEntry[],
				},
				assets: {
					core: [] as ManifestEntry[],
					warm: [] as ManifestEntry[],
				},
			};

			const chunks = new Map<string, Extract<(typeof bundle)[string], { type: "chunk" }>>();
			const coreFiles = new Set<string>();
			const startupFiles = new Set<string>();

			for (const [fileName, output] of Object.entries(bundle)) {
				if (output.type === "chunk") {
					chunks.set(fileName, output);
				}
			}

			const addChunkWithStaticDependencies = (fileName: string, targetFiles: Set<string>) => {
				if (targetFiles.has(fileName)) return;
				const chunk = chunks.get(fileName);
				if (!chunk) return;

				targetFiles.add(fileName);
				for (const importedFile of chunk.imports) {
					addChunkWithStaticDependencies(importedFile, targetFiles);
				}

				const metadata = chunk.viteMetadata;
				for (const cssFile of metadata?.importedCss ?? []) {
					targetFiles.add(cssFile);
				}
				for (const assetFile of metadata?.importedAssets ?? []) {
					targetFiles.add(assetFile);
				}
			};

			const isEntryClient = (facadeModuleId: string) => facadeModuleId.endsWith("/src/entry-client.tsx");
			const isStartupRoute = (facadeModuleId: string) =>
				facadeModuleId.includes("/src/routes/(app).tsx") ||
				facadeModuleId.includes("/src/routes/(app)/(index)/index.tsx");

			for (const [fileName, output] of chunks) {
				const facadeModuleId = output.facadeModuleId?.replace(/\\/g, "/") ?? "";
				if (isEntryClient(facadeModuleId)) {
					// core 只沿 entry-client 的静态依赖图收集，动态路由、worker、wasm/data 归入 warm。
					addChunkWithStaticDependencies(fileName, coreFiles);
				}
			}

			for (const fileName of coreFiles) {
				startupFiles.add(fileName);
			}

			for (const [fileName, output] of chunks) {
				const facadeModuleId = output.facadeModuleId?.replace(/\\/g, "/") ?? "";
				if (isStartupRoute(facadeModuleId)) {
					// startup 表示用户看到首页前浏览器需要下载的路由链资源，用于生产加载进度分母。
					addChunkWithStaticDependencies(fileName, startupFiles);
				}
			}

			for (const [fileName, output] of Object.entries(bundle)) {
				const entry = toEntry(fileName, output);
				if (startupFiles.has(fileName)) {
					chunkManifest.startup.push(entry);
				}

				if (output.type === "chunk") {
					if (coreFiles.has(fileName)) {
						chunkManifest.chunks.core.push(entry);
					} else {
						chunkManifest.chunks.warm.push(entry);
					}
					continue;
				}

				if (coreFiles.has(fileName) || fileName.startsWith("_build/assets/entry-client-")) {
					chunkManifest.assets.core.push(entry);
				} else {
					chunkManifest.assets.warm.push(entry);
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

export default defineConfig(({ mode }) => {
	const isDev = mode === "development";

	return {
		resolve: {
			alias: {
				"@db": "/db",
			},
		},
		build: {
			// 默认关闭 sourcemap（显著降低构建内存占用）；需要时用 VITE_SOURCEMAP=true 开启
			sourcemap: false,
			// 启用Vite的manifest生成
			// manifest 同时供 chunk-manifest-generator 判断入口依赖边界。
			manifest: true,
			rollupOptions: {
				output: {
					// Babylon runtime 保持独立 vendor chunk，避免首屏静态依赖和 3D 运行时互相污染。
					manualChunks(id: string) {
						// Vite preload helper 必须独立成小 chunk，否则可能落进 Babylon runtime 并把首屏入口拖大。
						if (id.includes("preload-helper")) {
							return "vite-runtime";
						}
						if (
							id.includes("@babylonjs/inspector") ||
							id.includes("@babylonjs/core/Debug/") ||
							id.includes("@fluentui/") ||
							id.includes("@griffel/") ||
							/[\\/]node_modules[\\/](react|react-dom)[\\/]/.test(id)
						) {
							return "babylon-debug";
						}
						if (id.includes("@babylonjs/")) {
							return "babylon-runtime";
						}
						if (id.includes("@electric-sql/pglite")) {
							return "pglite";
						}
					},
				},
			},
		},
		worker: {
			format: "es" as const,
		},
		optimizeDeps: {
			// Babylon Inspector 依赖 React/Fluent UI；预构建会补齐 CommonJS React 的 default 兼容层，避免浏览器直接加载原始 ESM 依赖。
			include: isDev ? ["@babylonjs/inspector", "@griffel/react", "react", "react-dom"] : [],
			exclude: ["@electric-sql/pglite"],
		},
		plugins: [
			// SPA 模式用于避免 SSR 在 Node 里加载 monaco-editor 链上的 .css
			solidStart({ ssr: false }),
			nitroV2Plugin(),
			tailwindcss(),
			// 添加chunk清单生成插件
			createChunkManifestPlugin(),
		],
	};
});
