import fs from "node:fs";
import path from "node:path";
import { build } from "esbuild";

// 从 src/store.ts 读取 version（数字），作为 SW 版本；开发容错
function readStoreVersion() {
	try {
		const content = fs.readFileSync(path.resolve("src/store.ts"), "utf8");
		const m = content.match(/version:\s*(\d+)/);
		return m ? String(parseInt(m[1], 10)) : "dev";
	} catch {
		return "dev";
	}
}

const SW_VERSION = readStoreVersion();
const SW_BUILD_TS = Date.now();

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
