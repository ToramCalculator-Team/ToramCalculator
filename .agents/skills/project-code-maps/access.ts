/**
 * Code Map 访问计数 sidecar。
 *
 * 只维护 .pi/code-maps/.access.json 的读取与自增写入（原子替换）；
 * 不修改 record 本身，避免只读操作污染 .md 文件与 Git 状态。
 */
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";

export interface CodeMapAccessStore {
	load(): Promise<Record<string, number>>;
	record(id: string): Promise<void>;
}

/** 访问计数文件路径：.pi/code-maps/.access.json */
export function accessCountPath(projectRoot: string, configDirName = ".pi"): string {
	return join(resolve(projectRoot), configDirName, "code-maps", ".access.json");
}

export function createAccessStore(projectRoot: string, configDirName = ".pi"): CodeMapAccessStore {
	const path = accessCountPath(projectRoot, configDirName);
	return {
		async load() {
			return readAccessCounts(path);
		},
		async record(id: string) {
			try {
				const counts = await readAccessCounts(path);
				counts[id] = (counts[id] ?? 0) + 1;
				await atomicWrite(path, JSON.stringify(counts, null, 2));
			} catch {
				// 计数是尽力而为的排序信号，失败不应影响读取流程。
			}
		},
	};
}

/** 记录一次访问（自增计数，尽力而为，失败静默）。 */
export async function recordCodeMapAccess(projectRoot: string, id: string, configDirName = ".pi"): Promise<void> {
	await createAccessStore(projectRoot, configDirName).record(id);
}

async function readAccessCounts(path: string): Promise<Record<string, number>> {
	try {
		const parsed = JSON.parse(await readFile(path, "utf8"));
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
		const counts: Record<string, number> = {};
		for (const [id, count] of Object.entries(parsed)) {
			if (typeof count === "number" && Number.isFinite(count) && count >= 0) counts[id] = count;
		}
		return counts;
	} catch {
		// 文件缺失或损坏时按零访问处理，不阻塞列表与排序。
		return {};
	}
}

async function atomicWrite(path: string, content: string): Promise<void> {
	const directory = resolve(path, "..");
	await mkdir(directory, { recursive: true });
	const tempPath = join(directory, `.${basename(path)}.${process.pid}.${Date.now()}.tmp`);
	await writeFile(tempPath, content, "utf8");
	await rename(tempPath, path);
}
