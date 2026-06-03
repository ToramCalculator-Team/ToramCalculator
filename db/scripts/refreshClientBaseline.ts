import { copyFile, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DB_SCHEMA_VERSION } from "../../src/lib/version/schema";
import { ClientMigrationGenerator } from "../generator/helpers/generateClientMigration";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sourcePath = path.join(rootDir, "db/generated/client.sql");
const generatedSchemaPath = path.join(rootDir, "db/generated/schema.prisma");
const baselineDir = path.join(rootDir, "db/client/baseline");
const targetPath = path.join(baselineDir, "client.sql");
const baselineMetaPath = path.join(baselineDir, "meta.json");
const migrationsDir = path.join(rootDir, "db/client/migrations");
const previousSchemaPath = path.join(rootDir, "db/client/previous-schema.prisma");
const versionSchemaPath = path.join(rootDir, "src/lib/version/schema.ts");

const checksum = (content: string): string => {
	let hash = 2166136261;
	for (let i = 0; i < content.length; i += 1) {
		hash ^= content.charCodeAt(i);
		hash = Math.imul(hash, 16777619);
	}
	return (hash >>> 0).toString(16);
};

const parseResetVersion = () => {
	const args = process.argv.slice(2);
	const resetVersionIndex = args.indexOf("--reset-version");
	if (resetVersionIndex < 0) return;
	const value = args[resetVersionIndex + 1];
	if (!value) throw new Error("缺少 --reset-version 参数值");
	const version = Number(value);
	if (!Number.isInteger(version) || version <= 0) {
		throw new Error(`非法 --reset-version 参数值: ${value}`);
	}
	return version;
};

const assertGeneratedClientSqlExists = async () => {
	try {
		await stat(sourcePath);
	} catch {
		throw new Error(`未找到 ${sourcePath}，请先运行 pnpm generate`);
	}
	try {
		await stat(generatedSchemaPath);
	} catch {
		throw new Error(`未找到 ${generatedSchemaPath}，请先运行 pnpm generate`);
	}
};

const updateDbSchemaVersion = async (version: number, minCompatibleVersion: number) => {
	const content = await readFile(versionSchemaPath, "utf-8");
	const next = content
		.replace(/export const DB_SCHEMA_VERSION = \d+;/, `export const DB_SCHEMA_VERSION = ${version};`)
		.replace(
			/export const MIN_COMPATIBLE_DB_SCHEMA_VERSION = \d+;/,
			`export const MIN_COMPATIBLE_DB_SCHEMA_VERSION = ${minCompatibleVersion};`,
		);
	await writeFile(versionSchemaPath, next, "utf-8");
};

const clearMigrationDirectories = async () => {
	await mkdir(migrationsDir, { recursive: true });
	const entries = await readdir(migrationsDir, { withFileTypes: true });
	for (const entry of entries) {
		if (!entry.isDirectory()) continue;
		const target = path.join(migrationsDir, entry.name);
		if (!target.startsWith(migrationsDir)) {
			throw new Error(`拒绝删除非迁移目录: ${target}`);
		}
		await rm(target, { recursive: true, force: true });
	}
};

// 设计说明：刷新客户端基线是受控重定基线动作，不能放入 setup。
// 日常 generate 只更新 db/generated/client.sql，避免改写已经发布给客户端的历史起点。
await assertGeneratedClientSqlExists();
const baselineVersion = parseResetVersion() ?? DB_SCHEMA_VERSION;
const clientSql = await readFile(sourcePath, "utf-8");
const schema = await readFile(generatedSchemaPath, "utf-8");

await mkdir(baselineDir, { recursive: true });
await copyFile(sourcePath, targetPath);
await copyFile(generatedSchemaPath, previousSchemaPath);
await clearMigrationDirectories();
await writeFile(
	baselineMetaPath,
	`${JSON.stringify(
		{
			version: baselineVersion,
			sqlChecksum: checksum(clientSql),
			schemaChecksum: checksum(schema),
			createdAt: new Date().toISOString(),
		},
		null,
		"\t",
	)}\n`,
	"utf-8",
);
await updateDbSchemaVersion(baselineVersion, baselineVersion);
await new ClientMigrationGenerator().writeMigrationIndex();

console.log("已刷新客户端数据库基线: db/client/baseline/client.sql");
console.log("已刷新客户端 Prisma schema 快照: db/client/previous-schema.prisma");
console.log(`已设置客户端 DB 基线版本: ${baselineVersion}`);
