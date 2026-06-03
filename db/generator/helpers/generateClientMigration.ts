import { execFileSync } from "node:child_process";
import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { PATHS } from "../config";
import { writeFileSafely } from "../utils/writeFileSafely";
import { ClientSyncSqlFactory } from "./generateSQL";

type ClientBaselineMeta = {
	version: number;
	sqlChecksum: string;
	schemaChecksum: string;
	createdAt: string;
};

type ClientMigrationMeta = {
	id: string;
	fromVersion: number;
	toVersion: number;
	sqlChecksum: string;
	prismaDiffChecksum: string;
	generatedAt: string;
};

const rootDir = process.cwd();
const clientDir = path.join(rootDir, "db/client");
const baselineDir = path.join(clientDir, "baseline");
const baselineMetaPath = path.join(baselineDir, "meta.json");
const previousSchemaPath = path.join(clientDir, "previous-schema.prisma");
const migrationsDir = path.join(clientDir, "migrations");
const migrationsIndexPath = path.join(migrationsDir, "index.ts");
const versionSchemaPath = path.join(rootDir, "src/lib/version/schema.ts");
const tempPrismaConfigPath = path.join(PATHS.generatedFolder, "client-migration.prisma.config.ts");
const migrateDiffDatabaseUrlFallback = "postgresql://user:pass@localhost:5432/db?schema=public";

const checksum = (content: string): string => {
	let hash = 2166136261;
	for (let i = 0; i < content.length; i += 1) {
		hash ^= content.charCodeAt(i);
		hash = Math.imul(hash, 16777619);
	}
	return (hash >>> 0).toString(16);
};

const exists = async (filePath: string): Promise<boolean> =>
	stat(filePath)
		.then(() => true)
		.catch(() => false);

const readJson = async <T>(filePath: string): Promise<T> => JSON.parse(await readFile(filePath, "utf-8")) as T;

const toImportName = (id: string) => `migration_${id.replace(/[^a-zA-Z0-9_]/g, "_")}_Sql`;

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getDbSchemaVersion = async (): Promise<number> => {
	const content = await readFile(versionSchemaPath, "utf-8");
	const match = content.match(/export const DB_SCHEMA_VERSION = (\d+);/);
	if (!match) throw new Error("无法读取 DB_SCHEMA_VERSION");
	return Number(match[1]);
};

const updateDbSchemaVersion = async (version: number, minCompatibleVersion?: number) => {
	const content = await readFile(versionSchemaPath, "utf-8");
	let next = content.replace(/export const DB_SCHEMA_VERSION = \d+;/, `export const DB_SCHEMA_VERSION = ${version};`);
	if (typeof minCompatibleVersion === "number") {
		next = next.replace(
			/export const MIN_COMPATIBLE_DB_SCHEMA_VERSION = \d+;/,
			`export const MIN_COMPATIBLE_DB_SCHEMA_VERSION = ${minCompatibleVersion};`,
		);
	}
	await writeFileSafely(versionSchemaPath, next);
};

const splitDiffBlocks = (sql: string): string[] =>
	sql
		.split(/\n(?=-- )/g)
		.map((block) => block.trim())
		.filter(Boolean);

const stripLeadingComments = (block: string): string =>
	block
		.split("\n")
		.filter((line) => !line.trim().startsWith("--"))
		.join("\n")
		.trim();

const parseCreateTableName = (statement: string): string | undefined =>
	statement.match(/CREATE\s+TABLE\s+(?:"?[\w$]+"?\.)?"?([\w$]+)"?\s*\(/i)?.[1];

const parseDropTableName = (statement: string): string | undefined =>
	statement.match(/DROP\s+TABLE\s+(?:"?[\w$]+"?\.)?"?([\w$]+)"?/i)?.[1];

const parseAlterColumn = (statement: string, action: "ADD COLUMN" | "DROP COLUMN") => {
	const match = statement.match(
		new RegExp(`ALTER\\s+TABLE\\s+(?:"?[\\w$]+"?\\.)?"?([\\w$]+)"?\\s+${escapeRegExp(action)}\\s+([\\s\\S]+?);?$`, "i"),
	);
	if (!match) return;
	return {
		tableName: match[1],
		columnSql: match[2].trim(),
	};
};

const toLocalColumnSql = (columnSql: string) => {
	const [name, type] = columnSql.split(/\s+/, 2);
	if (!name || !type) return columnSql;
	return `${name} ${type}`;
};

const isSkippableServerOnlyBlock = (statement: string) =>
	/^CREATE\s+(UNIQUE\s+)?INDEX/i.test(statement) ||
	/^DROP\s+INDEX/i.test(statement) ||
	/ALTER\s+TABLE[\s\S]+FOREIGN\s+KEY/i.test(statement) ||
	/ALTER\s+TABLE[\s\S]+ADD\s+CONSTRAINT/i.test(statement);

export class ClientMigrationGenerator {
	private readonly syncSqlFactory = new ClientSyncSqlFactory();

	async generate(): Promise<void> {
		if (process.env.CLIENT_BASELINE_REFRESH === "1") {
			console.log("跳过客户端迁移生成：当前正在刷新客户端基线");
			return;
		}
		if (!(await exists(previousSchemaPath)) || !(await exists(baselineMetaPath))) {
			console.warn("跳过客户端迁移生成：未找到客户端基线，请先运行 pnpm db:client:baseline:refresh");
			return;
		}

		const previousSchema = await readFile(previousSchemaPath, "utf-8");
		const currentSchema = await readFile(PATHS.tempSchema, "utf-8");
		if (previousSchema === currentSchema) {
			await this.writeMigrationIndex();
			console.log("客户端 schema 无变化，跳过迁移生成");
			return;
		}

		const baselineMeta = await readJson<ClientBaselineMeta>(baselineMetaPath);
		const fromVersion = await this.getLatestMigrationVersion(baselineMeta.version);
		const toVersion = fromVersion + 1;
		const id = this.createMigrationId(fromVersion, toVersion);
		const prismaDiff = await this.generatePrismaDiff(previousSchemaPath);
		const clientSql = await this.convertPrismaDiffToClientSql(prismaDiff);
		const migrationDir = path.join(migrationsDir, id);

		await mkdir(migrationDir, { recursive: false });
		await writeFile(path.join(migrationDir, "prisma-diff.sql"), prismaDiff, "utf-8");
		await writeFile(path.join(migrationDir, "client.sql"), clientSql, "utf-8");

		const meta: ClientMigrationMeta = {
			id,
			fromVersion,
			toVersion,
			sqlChecksum: checksum(clientSql),
			prismaDiffChecksum: checksum(prismaDiff),
			generatedAt: new Date().toISOString(),
		};
		await writeFile(path.join(migrationDir, "meta.json"), `${JSON.stringify(meta, null, "\t")}\n`, "utf-8");
		await writeFileSafely(previousSchemaPath, currentSchema);
		await updateDbSchemaVersion(toVersion);
		await this.writeMigrationIndex();

		console.log(`已生成客户端数据库迁移: ${path.relative(rootDir, migrationDir)}`);
	}

	async writeMigrationIndex(): Promise<void> {
		const baselineMeta = (await exists(baselineMetaPath))
			? await readJson<ClientBaselineMeta>(baselineMetaPath)
			: {
					version: await getDbSchemaVersion(),
					sqlChecksum: "",
					schemaChecksum: "",
					createdAt: new Date().toISOString(),
				};
		const migrations = await this.readMigrationRecords();
		const imports = [
			'import baselineSql from "../baseline/client.sql?raw";',
			...migrations.map((migration) => `import ${toImportName(migration.id)} from "./${migration.id}/client.sql?raw";`),
		];
		const entries = migrations.map((migration) =>
			[
				"\t{",
				`\t\tid: ${JSON.stringify(migration.id)},`,
				`\t\tfromVersion: ${migration.fromVersion},`,
				`\t\ttoVersion: ${migration.toVersion},`,
				`\t\tchecksum: ${JSON.stringify(migration.sqlChecksum)},`,
				`\t\tsql: ${toImportName(migration.id)},`,
				"\t},",
			].join("\n"),
		);
		const migrationArray = entries.length > 0 ? `[\n${entries.join("\n")}\n]` : "[]";
		const content = `${imports.join("\n")}

export type ClientDbBaseline = {
\tid: string;
\tversion: number;
\tchecksum: string;
\tsql: string;
};

export type ClientDbMigration = {
\tid: string;
\tfromVersion: number;
\ttoVersion: number;
\tchecksum: string;
\tsql: string;
};

// 设计说明：本文件由 Prisma custom generator 维护。
// Vite 需要静态 raw import，因此迁移账本以生成的 TS 入口暴露给 PGlite Worker。
export const CLIENT_DB_BASELINE: ClientDbBaseline = {
\tid: "baseline",
\tversion: ${baselineMeta.version},
\tchecksum: ${JSON.stringify(baselineMeta.sqlChecksum)},
\tsql: baselineSql,
};

export const CLIENT_DB_MIGRATIONS: ClientDbMigration[] = ${migrationArray};
`;

		await mkdir(migrationsDir, { recursive: true });
		await writeFileSafely(migrationsIndexPath, content);
	}

	private async getLatestMigrationVersion(baselineVersion: number): Promise<number> {
		const migrations = await this.readMigrationRecords();
		return migrations.reduce((version, migration) => Math.max(version, migration.toVersion), baselineVersion);
	}

	private async readMigrationRecords(): Promise<ClientMigrationMeta[]> {
		if (!(await exists(migrationsDir))) return [];
		const entries = await readdir(migrationsDir, { withFileTypes: true });
		const records: ClientMigrationMeta[] = [];
		for (const entry of entries) {
			if (!entry.isDirectory()) continue;
			const metaPath = path.join(migrationsDir, entry.name, "meta.json");
			if (!(await exists(metaPath))) continue;
			records.push(await readJson<ClientMigrationMeta>(metaPath));
		}
		const sorted = records.sort((a, b) => a.fromVersion - b.fromVersion || a.toVersion - b.toVersion);
		let expectedFromVersion = (await readJson<ClientBaselineMeta>(baselineMetaPath)).version;
		for (const record of sorted) {
			if (record.fromVersion !== expectedFromVersion) {
				throw new Error(
					`客户端迁移版本链断裂: ${record.id} fromVersion=${record.fromVersion}, expected=${expectedFromVersion}`,
				);
			}
			expectedFromVersion = record.toVersion;
		}
		return sorted;
	}

	private createMigrationId(fromVersion: number, toVersion: number): string {
		const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "_");
		return `${timestamp}_v${fromVersion}_to_v${toVersion}`;
	}

	private async writeTempPrismaConfig(): Promise<void> {
		const content = `import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: ${JSON.stringify(PATHS.tempSchema)},
  datasource: {
    url: env("DATABASE_URL"),
  },
});
`;
		await writeFileSafely(tempPrismaConfigPath, content);
	}

	private async generatePrismaDiff(fromSchemaPath: string): Promise<string> {
		await this.writeTempPrismaConfig();
		try {
			return execFileSync(
				"pnpm",
				[
					"exec",
					"prisma",
					"migrate",
					"diff",
					"--from-schema",
					fromSchemaPath,
					"--to-schema",
					PATHS.tempSchema,
					"--script",
					"--config",
					tempPrismaConfigPath,
				],
				{
					cwd: rootDir,
					encoding: "utf-8",
					env: {
						...process.env,
						DATABASE_URL: process.env.DATABASE_URL || migrateDiffDatabaseUrlFallback,
					},
				},
			);
		} finally {
			await rm(tempPrismaConfigPath, { force: true });
		}
	}

	private async convertPrismaDiffToClientSql(prismaDiff: string): Promise<string> {
		const generatedClientSql = await readFile(PATHS.clientDBSQL, "utf-8");
		const output: string[] = [];

		for (const block of splitDiffBlocks(prismaDiff)) {
			const statement = stripLeadingComments(block);
			if (!statement) continue;
			if (/^CREATE\s+TYPE/i.test(statement) || /^ALTER\s+TYPE[\s\S]+ADD\s+VALUE/i.test(statement)) {
				output.push(block);
				continue;
			}
			if (/^CREATE\s+TABLE/i.test(statement)) {
				const tableName = parseCreateTableName(statement);
				if (!tableName) throw new Error(`无法解析 CREATE TABLE: ${block}`);
				output.push(`-- ${tableName}`);
				output.push(this.syncSqlFactory.extractTableBlock(generatedClientSql, tableName));
				continue;
			}
			if (/^DROP\s+TABLE/i.test(statement)) {
				const tableName = parseDropTableName(statement);
				if (!tableName) throw new Error(`无法解析 DROP TABLE: ${block}`);
				output.push(`-- Drop client sync objects for ${tableName}`);
				output.push(this.syncSqlFactory.generateDropClientTableObjects(tableName));
				continue;
			}

			const addColumn = parseAlterColumn(statement, "ADD COLUMN");
			if (addColumn) {
				output.push(`-- Add client column ${addColumn.tableName}.${addColumn.columnSql}`);
				output.push(`ALTER TABLE "${addColumn.tableName}_synced" ADD COLUMN ${addColumn.columnSql};`);
				output.push(`ALTER TABLE "${addColumn.tableName}_local" ADD COLUMN ${toLocalColumnSql(addColumn.columnSql)};`);
				output.push(this.syncSqlFactory.generateDropViewAndTriggers(addColumn.tableName));
				output.push(this.syncSqlFactory.extractViewAndTriggers(generatedClientSql, addColumn.tableName));
				continue;
			}

			const dropColumn = parseAlterColumn(statement, "DROP COLUMN");
			if (dropColumn) {
				output.push(`-- Drop client column ${dropColumn.tableName}.${dropColumn.columnSql}`);
				output.push(`ALTER TABLE "${dropColumn.tableName}_synced" DROP COLUMN ${dropColumn.columnSql};`);
				output.push(`ALTER TABLE "${dropColumn.tableName}_local" DROP COLUMN ${dropColumn.columnSql};`);
				output.push(this.syncSqlFactory.generateDropViewAndTriggers(dropColumn.tableName));
				output.push(this.syncSqlFactory.extractViewAndTriggers(generatedClientSql, dropColumn.tableName));
				continue;
			}

			if (isSkippableServerOnlyBlock(statement)) continue;
			throw new Error(`客户端迁移转换器暂不支持该 Prisma diff:\n${block}`);
		}

		if (output.length === 0) {
			throw new Error("Prisma diff 未生成可执行客户端迁移 SQL");
		}
		return `${output.join("\n\n")}\n`;
	}
}
