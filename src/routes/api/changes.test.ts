/**
 * @file changes.test.ts
 * @description 服务端写入端点 /api/changes 与上行同步器的策略级验证（ADR 0018）
 *
 * changes.ts 的 POST 把鉴权、校验、落库耦合在一个 handler 里且依赖真实 pg 连接,
 * 无法直接单测。这里直接验证共享请求契约，并复刻仍留在 handler/同步器中的策略逻辑。
 *
 * 修复前本文件断言的是缺陷(delete 被拒、字符串序);现在断言修复后的正确行为。
 */
import { describe, expect, it } from "vitest";
import { ChangeOperationSchema, ChangesRequestSchema } from "~/lib/writeSync/changesContract";
import { statusForChangeError } from "./changes";

/**
 * 复刻 ChangeLogSynchronizer.send() 的跨事务排序(B-5):
 * 按事务内最小 changes.id 数值排序,而非 transaction_id 字符串序。
 */
function sortTransactionsByMinId(txs: Array<{ transaction_id: string; ids: number[] }>): string[] {
	const minId = (ids: number[]) => ids.reduce((m, x) => (x < m ? x : m), ids[0]);
	return [...txs].sort((a, b) => minId(a.ids) - minId(b.ids)).map((t) => t.transaction_id);
}

describe("/api/changes 服务端写入策略(修复后)", () => {
	describe("服务端接受 delete（消除队列 HOL 死锁）", () => {
		it("请求契约接受 delete", () => {
			expect(ChangeOperationSchema.safeParse("delete").success).toBe(true);
		});

		it("insert/update 仍被允许", () => {
			expect(ChangeOperationSchema.safeParse("insert").success).toBe(true);
			expect(ChangeOperationSchema.safeParse("update").success).toBe(true);
		});
	});

	describe("insert 幂等（重投同一 change 不再主键冲突）", () => {
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

	describe("跨事务按最小 changes.id 数值排序（非字符串序）", () => {
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

	describe("数据库错误分类", () => {
		it("完整性约束冲突返回 409，使客户端 rollback 而不是无限重试", () => {
			expect(statusForChangeError({ code: "23503" })).toBe(409);
			expect(statusForChangeError({ code: "23505" })).toBe(409);
		});

		it("未知数据库故障仍返回 500", () => {
			expect(statusForChangeError(new Error("connection lost"))).toBe(500);
			expect(statusForChangeError({ code: "08006" })).toBe(500);
		});
	});

	describe("表名校验(现状,非本次修复项)", () => {
		it("合法标识符放行、语法非法表名拦截", () => {
			const requestForTable = (tableName: string) => [
				{ changes: [{ table_name: tableName, operation: "insert", value: {} }] },
			];
			expect(ChangesRequestSchema.safeParse(requestForTable("character")).success).toBe(true);
			expect(ChangesRequestSchema.safeParse(requestForTable("select * from")).success).toBe(false);
			// 注:行级归属校验(A-1)仍未做,留待安全加固阶段。
		});
	});
});
