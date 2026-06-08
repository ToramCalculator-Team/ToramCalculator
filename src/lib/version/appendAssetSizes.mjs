import { gzipSync } from "node:zlib";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// 构建后处理：为 chunk-manifest 的每个条目补充 gzip 后字节数（gzipSize）。
// 设计目的：Nginx 反代默认以 gzip 下发，进度条需用压缩后字节作分母才准确。
// 未压缩 size 仍保留，供诊断与向后兼容。

const PUBLIC_DIRS = [".output/public", "dist/client"];
const MANIFEST_NAME = "chunk-manifest.json";

// gzipSize 用磁盘真实文件计算；缓存避免同名文件重复 gzip。
const gzipCache = new Map();

const computeGzipSize = (publicDir, fileName) => {
	if (gzipCache.has(fileName)) return gzipCache.get(fileName);
	const filePath = join(publicDir, fileName);
	if (!existsSync(filePath)) {
		gzipCache.set(fileName, undefined);
		return undefined;
	}
	try {
		const size = gzipSync(readFileSync(filePath)).byteLength;
		gzipCache.set(fileName, size);
		return size;
	} catch {
		gzipCache.set(fileName, undefined);
		return undefined;
	}
};

// 遍历 manifest 内所有条目数组，原地补充 gzipSize。
const enrichEntries = (entries, publicDir) => {
	if (!Array.isArray(entries)) return;
	for (const entry of entries) {
		if (!entry || typeof entry.fileName !== "string") continue;
		const gzipSize = computeGzipSize(publicDir, entry.fileName);
		if (typeof gzipSize === "number") entry.gzipSize = gzipSize;
	}
};

const enrichManifest = (manifest, publicDir) => {
	enrichEntries(manifest.startup, publicDir);
	enrichEntries(manifest.chunks?.core, publicDir);
	enrichEntries(manifest.chunks?.warm, publicDir);
	enrichEntries(manifest.assets?.core, publicDir);
	enrichEntries(manifest.assets?.warm, publicDir);
};

let processed = 0;
for (const publicDir of PUBLIC_DIRS) {
	const manifestPath = join(publicDir, MANIFEST_NAME);
	if (!existsSync(manifestPath)) continue;

	gzipCache.clear();
	const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
	enrichManifest(manifest, publicDir);
	writeFileSync(manifestPath, JSON.stringify(manifest));
	processed += 1;

	const startupTotal = (manifest.startup ?? []).reduce(
		(acc, e) => acc + (typeof e.gzipSize === "number" ? e.gzipSize : (e.size ?? 0)),
		0,
	);
	console.log(
		`[appendAssetSizes] ${manifestPath}: startup ${manifest.startup?.length ?? 0} 项, gzip 合计 ${(startupTotal / 1024).toFixed(0)} KB`,
	);
}

if (processed === 0) {
	console.warn("[appendAssetSizes] 未找到任何 chunk-manifest.json，跳过");
}
