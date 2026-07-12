import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

type MigrationMeta = {
	id: string;
	fromVersion: number;
	toVersion: number;
};

const clientDir = path.resolve(import.meta.dirname);
const migrationsDir = path.join(clientDir, "migrations");
let db: PGlite;

/**
 * 按迁移元数据而非目录时间排序，验证的执行顺序与浏览器迁移账本一致。
 */
const readMigrationChain = async () => {
	const entries = await readdir(migrationsDir, { withFileTypes: true });
	const migrations = await Promise.all(
		entries
			.filter((entry) => entry.isDirectory())
			.map(async (entry) => {
				const directory = path.join(migrationsDir, entry.name);
				const meta = JSON.parse(await readFile(path.join(directory, "meta.json"), "utf-8")) as MigrationMeta;
				return { meta, sql: await readFile(path.join(directory, "client.sql"), "utf-8") };
			}),
	);
	return migrations.sort((left, right) => left.meta.fromVersion - right.meta.fromVersion);
};

beforeAll(async () => {
	db = new PGlite();
	await db.exec(await readFile(path.join(clientDir, "baseline/client.sql"), "utf-8"));
	for (const migration of await readMigrationChain()) {
		await db.exec(migration.sql);
	}
}, 120_000);

afterAll(async () => {
	await db.close();
});

describe("客户端数据库迁移链", () => {
	it("可从 baseline 执行到当前 member schema", async () => {
		const columns = await db.query<{ column_name: string; is_nullable: "YES" | "NO"; table_name: string }>(`
      SELECT table_name, column_name, is_nullable
      FROM information_schema.columns
      WHERE table_name IN ('member_synced', 'member_local')
        AND column_name IN ('sequence', 'behavior', 'formationOrder')
      ORDER BY table_name, column_name;
    `);

		expect(columns.rows).toEqual([
			{ table_name: "member_local", column_name: "behavior", is_nullable: "YES" },
			{ table_name: "member_local", column_name: "formationOrder", is_nullable: "YES" },
			{ table_name: "member_synced", column_name: "behavior", is_nullable: "NO" },
			{ table_name: "member_synced", column_name: "formationOrder", is_nullable: "NO" },
		]);
	});
});
