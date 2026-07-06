/**
 * @file localFirstConvergence.test.ts
 * @description local-first 写链路收敛性验证(ADR 0017 B-1 / 0018)
 *
 * 用真实生成产物 db/generated/client.sql 在 PGlite 中跑通完整写链路:
 *   视图写入 → <t>_local 乐观覆盖 + changes 日志 → 模拟 Electric 回灌 <t>_synced → 清理触发器收敛
 *
 * 修复前(见 git 历史)本文件复现的是缺陷:服务端表无 write_id → 回灌 write_id=NULL →
 * 清理触发器永不命中 → local 永不清理、服务端更新被永久遮蔽。
 *
 * 修复后(B-1)服务端每张业务表持有 write_id、/api/changes 落库写入它、Electric 回灌带回,
 * 于是回灌行携带正确 write_id → 客户端已有的清理触发器自然生效。本文件现在验证这一收敛闭合:
 *   - server.sql 每张业务表都带 write_id 列(生成器半边)
 *   - 回灌携带 write_id 时 local 立即清理、视图反映 synced(收敛半边)
 *   - 收敛后服务端后续更新不再被遮蔽(写后读一致)
 *
 * 载体选用 sync_heartbeat(3 列、TEXT 主键),结构最小但生成模式与所有业务表一致。
 */
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const CLIENT_SQL_URL = new URL("../../../db/generated/client.sql", import.meta.url);
const SERVER_SQL_URL = new URL("../../../db/generated/server.sql", import.meta.url);

let db: PGlite;

beforeAll(async () => {
	db = new PGlite();
	await db.exec(readFileSync(CLIENT_SQL_URL, "utf-8"));
}, 120_000);

afterAll(async () => {
	await db.close();
});

describe("收敛环生成器半边:server.sql 持有 write_id(B-1)", () => {
	it("服务端每张业务表都带 write_id 列(修复前为 0)", () => {
		const serverSql = readFileSync(SERVER_SQL_URL, "utf-8");
		const tableCount = (serverSql.match(/^CREATE TABLE /gm) ?? []).length;
		const writeIdCount = (serverSql.match(/"write_id" UUID/g) ?? []).length;

		expect(tableCount).toBeGreaterThan(0);
		// 每张业务表恰好一列 write_id;无遗漏(含无主键约束的 verification_token)
		expect(writeIdCount).toBe(tableCount);
	});
});

describe("local-first 写链路收敛(基于生成的 client.sql)", () => {
	it("基线:通过视图 INSERT 写入 _local 覆盖行并记录 changes 日志", async () => {
		await db.query(`INSERT INTO "sync_heartbeat" ("id", "seq", "emitted_at") VALUES ('hb-a', 1, NOW())`);

		const local = await db.query<{ id: string; write_id: string }>(
			`SELECT id, write_id::text FROM "sync_heartbeat_local" WHERE id = 'hb-a'`,
		);
		expect(local.rows).toHaveLength(1);
		expect(local.rows[0].write_id).toBeTruthy();

		const changes = await db.query<{ operation: string; write_id: string; value: Record<string, unknown> }>(
			`SELECT operation, write_id::text, value FROM changes WHERE table_name = 'sync_heartbeat'`,
		);
		expect(changes.rows).toHaveLength(1);
		expect(changes.rows[0].operation).toBe("insert");
		// changes.write_id 是独立列(非 value 内),上行时随整行 POST,服务端据此落库(B-1)
		expect(changes.rows[0].write_id).toBe(local.rows[0].write_id);
		// value 快照只含业务列
		expect(Object.keys(changes.rows[0].value).sort()).toEqual(["emitted_at", "id", "seq"]);
	});

	it("收敛:回灌行携带 write_id(修复后服务端会持久化回传)时,_local 立即被清、视图反映 synced", async () => {
		const local = await db.query<{ write_id: string }>(
			`SELECT write_id::text FROM "sync_heartbeat_local" WHERE id = 'hb-a'`,
		);
		const writeId = local.rows[0].write_id;

		// 模拟 Electric 从服务端回灌:服务端已持久化 write_id(B-1),故回灌行带上它
		await db.query(
			`INSERT INTO "sync_heartbeat_synced" ("id", "seq", "emitted_at", "write_id") VALUES ('hb-a', 1, NOW(), $1)`,
			[writeId],
		);

		// 清理触发器 `write_id = NEW.write_id` 命中 → local 覆盖行被删除
		const localAfter = await db.query(`SELECT id FROM "sync_heartbeat_local" WHERE id = 'hb-a'`);
		expect(localAfter.rows).toHaveLength(0);
	});

	it("写后读一致:收敛后服务端(其它设备)的后续更新不再被 _local 遮蔽", async () => {
		// 另一台设备把 seq 改成 999 并经服务端同步回来
		await db.query(`UPDATE "sync_heartbeat_synced" SET "seq" = 999 WHERE "id" = 'hb-a'`);

		// local 已清,视图直接反映 synced 的最新值
		const view = await db.query<{ seq: string }>(`SELECT seq::text FROM "sync_heartbeat" WHERE id = 'hb-a'`);
		expect(view.rows[0].seq).toBe("999");
	});

	it("回归对照:回灌 write_id=NULL(修复前的服务端现状)仍无法清理 —— 证明缺口确实在服务端持久化", async () => {
		await db.query(`INSERT INTO "sync_heartbeat" ("id", "seq", "emitted_at") VALUES ('hb-c', 5, NOW())`);
		// write_id=NULL 模拟"服务端没持久化 write_id"的旧行为
		await db.query(
			`INSERT INTO "sync_heartbeat_synced" ("id", "seq", "emitted_at", "write_id") VALUES ('hb-c', 5, NOW(), NULL)`,
		);
		// 清理条件含 `write_id IS NOT NULL`,NULL 不命中 → local 残留(印证 B-1 修复的必要性)
		const local = await db.query(`SELECT id FROM "sync_heartbeat_local" WHERE id = 'hb-c'`);
		expect(local.rows).toHaveLength(1);
	});

	it("视图 DELETE 产生 operation='delete' 上行变更(服务端现已接受,见 B-2)", async () => {
		await db.query(`INSERT INTO "sync_heartbeat" ("id", "seq", "emitted_at") VALUES ('hb-d', 7, NOW())`);
		await db.query(`DELETE FROM "sync_heartbeat" WHERE "id" = 'hb-d'`);

		const changes = await db.query<{ operation: string }>(
			`SELECT operation FROM changes WHERE table_name = 'sync_heartbeat' ORDER BY id`,
		);
		expect(changes.rows.map((r) => r.operation)).toContain("delete");
	});
});
