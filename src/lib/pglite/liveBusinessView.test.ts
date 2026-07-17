/**
 * @file liveBusinessView.test.ts
 * @description 验证 CharacterLiveModel 依赖的 PGlite live 基础语义。
 *
 * 这些测试刻意使用真实生成的 local-first business view，并额外覆盖相关子查询聚合。
 * CharacterLiveModel 只有在本地写、Electric 风格 synced 回灌、rollback 和子表更新都能触发
 * 同一 live 订阅时，才能把 business view 作为唯一响应式读源。
 */
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { live, type PGliteWithLive } from "@electric-sql/pglite/live";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const CLIENT_SQL_URL = new URL("../../../db/generated/client.sql", import.meta.url);

let db: PGliteWithLive;

beforeAll(async () => {
	db = await PGlite.create({ extensions: { live } });
	await db.exec(readFileSync(CLIENT_SQL_URL, "utf-8"));
}, 120_000);

afterAll(async () => {
	await db.close();
});

function waitFor<T>(read: () => T | undefined, timeoutMs = 5_000): Promise<T> {
	const current = read();
	if (current !== undefined) return Promise.resolve(current);

	return new Promise((resolve, reject) => {
		const startedAt = performance.now();
		const timer = setInterval(() => {
			const value = read();
			if (value !== undefined) {
				clearInterval(timer);
				resolve(value);
				return;
			}
			if (performance.now() - startedAt >= timeoutMs) {
				clearInterval(timer);
				reject(new Error(`等待 live query 回调超时: ${timeoutMs}ms`));
			}
		}, 10);
	});
}

describe("local-first business view 的 live 回流", () => {
	it("覆盖本地写、synced 回灌、后续远端更新和 local rollback", async () => {
		const snapshots: Array<Array<{ id: string; seq: string }>> = [];
		const subscription = await db.live.query<{ id: string; seq: string }>(
			`SELECT id, seq::text AS seq FROM sync_heartbeat WHERE id = $1`,
			["live-business-view"],
			(result) => snapshots.push(result.rows),
		);

		await db.query(`INSERT INTO sync_heartbeat (id, seq, emitted_at) VALUES ($1, 1, NOW())`, ["live-business-view"]);
		await waitFor(() => snapshots.find((rows) => rows[0]?.seq === "1"));

		const local = await db.query<{ write_id: string }>(
			`SELECT write_id::text FROM sync_heartbeat_local WHERE id = $1`,
			["live-business-view"],
		);
		const syncedSnapshotStart = snapshots.length;
		await db.query(`INSERT INTO sync_heartbeat_synced (id, seq, emitted_at, write_id) VALUES ($1, 1, NOW(), $2)`, [
			"live-business-view",
			local.rows[0].write_id,
		]);
		await waitFor(() => (snapshots.length > syncedSnapshotStart ? snapshots.at(-1) : undefined));
		expect(snapshots.at(-1)?.[0]?.seq).toBe("1");

		await db.query(`UPDATE sync_heartbeat_synced SET seq = 2 WHERE id = $1`, ["live-business-view"]);
		await waitFor(() => snapshots.find((rows) => rows[0]?.seq === "2"));

		await db.query(`UPDATE sync_heartbeat SET seq = 3 WHERE id = $1`, ["live-business-view"]);
		await waitFor(() => snapshots.find((rows) => rows[0]?.seq === "3"));

		// 模拟服务端拒绝后同步层清理 local 覆盖，business view 应回到 synced=2。
		const rollbackSnapshotStart = snapshots.length;
		await db.query(`DELETE FROM sync_heartbeat_local WHERE id = $1`, ["live-business-view"]);
		await waitFor(() => snapshots.slice(rollbackSnapshotStart).find((rows) => rows[0]?.seq === "2"));

		expect(snapshots.at(-1)).toEqual([{ id: "live-business-view", seq: "2" }]);
		await subscription.unsubscribe();
	});
});

describe("单条聚合 live query 的依赖追踪", () => {
	it("相关子表变化会刷新 JSON 聚合快照", async () => {
		await db.exec(`
			CREATE TABLE live_parent (id TEXT PRIMARY KEY);
			CREATE TABLE live_child (id TEXT PRIMARY KEY, parent_id TEXT NOT NULL, value INTEGER NOT NULL);
			INSERT INTO live_parent (id) VALUES ('parent-a');
		`);

		const snapshots: Array<Array<{ id: string; children: Array<{ id: string; value: number }> }>> = [];
		const subscription = await db.live.query<{
			id: string;
			children: Array<{ id: string; value: number }>;
		}>(
			`
				SELECT parent.id,
					COALESCE(
						(
							SELECT json_agg(json_build_object('id', child.id, 'value', child.value) ORDER BY child.id)
							FROM live_child AS child
							WHERE child.parent_id = parent.id
						),
						'[]'::json
					) AS children
				FROM live_parent AS parent
				WHERE parent.id = $1
			`,
			["parent-a"],
			(result) => snapshots.push(result.rows),
		);

		await db.query(`INSERT INTO live_child (id, parent_id, value) VALUES ('child-a', 'parent-a', 1)`);
		await waitFor(() => snapshots.find((rows) => rows[0]?.children[0]?.value === 1));

		await db.query(`UPDATE live_child SET value = 2 WHERE id = 'child-a'`);
		await waitFor(() => snapshots.find((rows) => rows[0]?.children[0]?.value === 2));

		expect(snapshots.at(-1)?.[0]).toEqual({
			id: "parent-a",
			children: [{ id: "child-a", value: 2 }],
		});
		await subscription.unsubscribe();
	});
});
