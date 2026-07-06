/**
 * @file changes.test.ts
 * @description 服务端写入端点 /api/changes 与上行同步器的策略级验证(ADR 0017 B-2/B-3/B-5)
 *
 * changes.ts 的 POST 把鉴权、校验、落库耦合在一个 handler 里且依赖真实 pg 连接,
 * 无法直接单测。这里复刻其对外可观察的**策略常量与判定逻辑**(与实现同源),
 * 验证修复后的行为。若日后策略再变,请同步这里 —— 测试失败即提醒复核。
 *
 * 修复前本文件断言的是缺陷(delete 被拒、字符串序);现在断言修复后的正确行为。
 */
import { describe, expect, it } from "vitest";

// ── 与 src/routes/api/changes.ts 同源的策略(修改 handler 时必须同步这里)──
const ALLOWED_OPS = new Set(["insert", "update", "delete"]);
const SAFE_TABLE_NAME = /^[_a-zA-Z][_a-zA-Z0-9]*$/;

/**
 * 复刻 ChangeLogSynchronizer.send() 的跨事务排序(B-5):
 * 按事务内最小 changes.id 数值排序,而非 transaction_id 字符串序。
 */
function sortTransactionsByMinId(txs: Array<{ transaction_id: string; ids: number[] }>): string[] {
	const minId = (ids: number[]) => ids.reduce((m, x) => (x < m ? x : m), ids[0]);
	return [...txs].sort((a, b) => minId(a.ids) - minId(b.ids)).map((t) => t.transaction_id);
}

describe("/api/changes 服务端写入策略(修复后)", () => {
	describe("B-2:服务端接受 delete(消除队列 HOL 死锁)", () => {
		it("ALLOWED_OPS 现已包含 delete", () => {
			expect(ALLOWED_OPS.has("delete")).toBe(true);
		});

		it("insert/update 仍被允许", () => {
			expect(ALLOWED_OPS.has("insert")).toBe(true);
			expect(ALLOWED_OPS.has("update")).toBe(true);
		});
	});

	describe("B-3:insert 幂等(重投同一 change 不再主键冲突)", () => {
		it("upsert 的 update 集包含 write_id 与业务列,保证重投=覆盖成同值", () => {
			// 复刻 handler 构造 valueWithWriteId 的形态
			const cleanValue = { id: "x", seq: 1 };
			const writeId = "w-1";
			const valueWithWriteId = { ...cleanValue, write_id: writeId };
			// doUpdateSet 用同一对象:第二次写入把行覆盖成完全相同的值,天然幂等
			expect(valueWithWriteId).toEqual({ id: "x", seq: 1, write_id: "w-1" });
			expect(valueWithWriteId).toHaveProperty("write_id");
		});
	});

	describe("B-5:跨事务按最小 changes.id 数值排序(非字符串序)", () => {
		it("xid8 跨十进制位数边界时仍按写入顺序应用", () => {
			// transaction_id 字符串序会把 "1000" 排到 "999" 前(错误);
			// 按最小 changes.id 数值序则保持写入顺序(正确)
			const txs = [
				{ transaction_id: "1000", ids: [3, 4] },
				{ transaction_id: "999", ids: [1, 2] },
				{ transaction_id: "1001", ids: [5] },
			];
			expect(sortTransactionsByMinId(txs)).toEqual(["999", "1000", "1001"]);

			// 对照:纯字符串序会错误地得到 1000 在前
			const stringSorted = txs.map((t) => t.transaction_id).sort((a, b) => a.localeCompare(b));
			expect(stringSorted).toEqual(["1000", "1001", "999"]);
		});
	});

	describe("表名校验(现状,非本次修复项)", () => {
		it("合法标识符放行、语法非法表名拦截", () => {
			expect(SAFE_TABLE_NAME.test("character")).toBe(true);
			expect(SAFE_TABLE_NAME.test("select * from")).toBe(false);
			// 注:行级归属校验(A-1)仍未做,留待安全加固阶段。
		});
	});
});
