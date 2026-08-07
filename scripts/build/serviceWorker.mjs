import { build } from "esbuild";

// 设计说明：SW 版本跟随发布版本，而不是 store schema 版本。
// 同一次构建由 runBuild.mjs 注入相同 release id，避免 SW 与页面协议版本分裂。
const SW_VERSION = process.env.APP_SW_VERSION || process.env.APP_RELEASE_ID || "dev";
const SW_BUILD_TS = process.env.APP_GENERATED_AT ? Date.parse(process.env.APP_GENERATED_AT) : Date.now();

await build({
	entryPoints: ["src/worker/sw/main.ts"],
	bundle: true,
	minify: true,
	platform: "browser",
	outfile: "public/service.worker.js",
	format: "esm",
	target: ["es2020"],
	define: {
		__SW_VERSION__: JSON.stringify(SW_VERSION),
		__SW_BUILD_TS__: JSON.stringify(SW_BUILD_TS),
	},
});

console.log("✅ Service Worker 已输出到 public/service.worker.js");
