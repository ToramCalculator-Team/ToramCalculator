import { beforeEach, describe, expect, it } from "vitest";
import { EventQueue } from "./EventQueue";
import type { QueueEvent } from "./types";

// 构造队列事件；executeAtMs 与 id 是最常被断言的字段。
const makeEvent = (id: string, executeAtMs: number, over: Partial<QueueEvent> = {}): QueueEvent => ({
	id,
	insertedAtMs: 0,
	executeAtMs,
	type: "member_fsm_event",
	processed: false,
	targetMemberId: "m1",
	fsmEvent: { type: "TICK" },
	source: "test",
	...over,
});

describe("EventQueue — 插入与大小一致性", () => {
	let q: EventQueue;
	beforeEach(() => {
		q = new EventQueue({}, () => 0);
	});

	it("空队列初始状态", () => {
		expect(q.size()).toBe(0);
		expect(q.isEmpty()).toBe(true);
		expect(q.getEarliestTimeMs()).toBe(Infinity);
		expect(q.getLatestTimeMs()).toBe(-Infinity);
	});

	it("插入成功后 size、stats、索引三者一致", () => {
		expect(q.insert(makeEvent("a", 100))).toBe(true);
		expect(q.size()).toBe(1);
		expect(q.isEmpty()).toBe(false);
		expect(q.get("a")?.id).toBe("a");
		expect(q.getStats().currentSize).toBe(1);
		expect(q.getStats().totalInserted).toBe(1);
	});

	it("相同 id 重复插入保持幂等（先移除旧的），size 不增长", () => {
		q.insert(makeEvent("a", 100, { fsmEvent: { type: "OLD" } }));
		q.insert(makeEvent("a", 200, { fsmEvent: { type: "NEW" } }));
		expect(q.size()).toBe(1);
		// 新事件覆盖旧事件，且改了执行时间桶。
		expect(q.get("a")?.fsmEvent.type).toBe("NEW");
		expect(q.get("a")?.executeAtMs).toBe(200);
		expect(q.getDue(300)).toHaveLength(1);
	});

	it("超过 maxQueueSize 拒绝插入并返回 false", () => {
		const small = new EventQueue({ maxQueueSize: 2 }, () => 0);
		expect(small.insert(makeEvent("a", 1))).toBe(true);
		expect(small.insert(makeEvent("b", 2))).toBe(true);
		expect(small.insert(makeEvent("c", 3))).toBe(false);
		expect(small.size()).toBe(2);
	});

	it("insertBatch 返回成功计数", () => {
		const n = q.insertBatch([makeEvent("a", 1), makeEvent("b", 2), makeEvent("c", 3)]);
		expect(n).toBe(3);
		expect(q.size()).toBe(3);
	});
});

describe("EventQueue — getDue 时间分桶与排序", () => {
	let q: EventQueue;
	beforeEach(() => {
		q = new EventQueue({}, () => 0);
	});

	it("只返回执行时间 <= currentTime 的事件", () => {
		q.insertBatch([makeEvent("a", 100), makeEvent("b", 200), makeEvent("c", 300)]);
		const due = q.getDue(200);
		expect(due.map((e) => e.id)).toEqual(["a", "b"]);
	});

	it("跨桶按执行时间升序返回", () => {
		// 乱序插入，getDue 应按 executeAtMs 升序。
		q.insertBatch([makeEvent("c", 300), makeEvent("a", 100), makeEvent("b", 200)]);
		expect(q.getDue(500).map((e) => e.id)).toEqual(["a", "b", "c"]);
	});

	it("同一时间桶内保持插入顺序", () => {
		q.insertBatch([makeEvent("x", 100), makeEvent("y", 100), makeEvent("z", 100)]);
		expect(q.getDue(100).map((e) => e.id)).toEqual(["x", "y", "z"]);
	});

	it("无到期事件返回空数组", () => {
		q.insert(makeEvent("a", 500));
		expect(q.getDue(100)).toEqual([]);
	});

	it("earliest / latest 反映桶的时间范围", () => {
		q.insertBatch([makeEvent("a", 300), makeEvent("b", 100), makeEvent("c", 200)]);
		expect(q.getEarliestTimeMs()).toBe(100);
		expect(q.getLatestTimeMs()).toBe(300);
	});
});

describe("EventQueue — remove 与 markAsProcessed", () => {
	let q: EventQueue;
	beforeEach(() => {
		q = new EventQueue({}, () => 0);
		q.insertBatch([makeEvent("a", 100), makeEvent("b", 100), makeEvent("c", 200)]);
	});

	it("移除事件后 size 递减且索引清除", () => {
		expect(q.remove("a")).toBe(true);
		expect(q.size()).toBe(2);
		expect(q.get("a")).toBeNull();
		// 同桶另一事件仍在。
		expect(q.get("b")?.id).toBe("b");
	});

	it("移除桶内最后一个事件时桶被删除（earliest 前移）", () => {
		q.remove("a");
		q.remove("b");
		expect(q.getEarliestTimeMs()).toBe(200);
	});

	it("移除不存在的 id 返回 false，不改 size", () => {
		expect(q.remove("nope")).toBe(false);
		expect(q.size()).toBe(3);
	});

	it("markAsProcessed 标记并累加 totalProcessed（幂等）", () => {
		q.markAsProcessed("a");
		expect(q.get("a")?.processed).toBe(true);
		expect(q.getStats().totalProcessed).toBe(1);
		// 重复标记不重复计数。
		q.markAsProcessed("a");
		expect(q.getStats().totalProcessed).toBe(1);
	});
});

describe("EventQueue — removeProcessedDue", () => {
	let q: EventQueue;
	beforeEach(() => {
		q = new EventQueue({}, () => 0);
		q.insertBatch([makeEvent("a", 100), makeEvent("b", 100), makeEvent("c", 200)]);
	});

	it("只清理 <= currentTime 且已处理的事件", () => {
		q.markAsProcessed("a"); // 100ms，已处理
		// b 未处理（100ms），c 未处理（200ms）
		q.removeProcessedDue(150);
		expect(q.get("a")).toBeNull();
		expect(q.get("b")?.id).toBe("b"); // 未处理，保留
		expect(q.get("c")?.id).toBe("c"); // 超时间窗，保留
		expect(q.size()).toBe(2);
	});

	it("未来时间的已处理事件不被清理", () => {
		q.markAsProcessed("c"); // 200ms，已处理但 > currentTime
		q.removeProcessedDue(100);
		expect(q.get("c")?.id).toBe("c");
	});

	it("桶内全部已处理则删除该桶", () => {
		q.markAsProcessed("a");
		q.markAsProcessed("b");
		q.removeProcessedDue(100);
		expect(q.getDue(100)).toEqual([]);
		expect(q.size()).toBe(1);
	});
});

describe("EventQueue — clear", () => {
	it("清空所有状态", () => {
		const q = new EventQueue({}, () => 0);
		q.insertBatch([makeEvent("a", 1), makeEvent("b", 2)]);
		q.clear();
		expect(q.size()).toBe(0);
		expect(q.isEmpty()).toBe(true);
		expect(q.get("a")).toBeNull();
		expect(q.getEarliestTimeMs()).toBe(Infinity);
	});
});

describe("EventQueue — checkpoint 往返", () => {
	it("captureCheckpoint / restoreCheckpoint 保持事件与统计", () => {
		const src = new EventQueue({}, () => 0);
		const damageEvent = { type: "受到攻击", data: { dmg: 10 } };
		src.insertBatch([makeEvent("a", 100, { fsmEvent: damageEvent }), makeEvent("b", 200), makeEvent("c", 100)]);
		src.markAsProcessed("a");

		const cp = src.captureCheckpoint();
		expect(cp.totalSize).toBe(3);
		expect(cp.stats.totalProcessed).toBe(1);

		const dst = new EventQueue({}, () => 0);
		dst.restoreCheckpoint(cp);

		expect(dst.size()).toBe(3);
		expect(dst.get("a")?.processed).toBe(true);
		expect(dst.get("a")?.fsmEvent).toEqual({ type: "受到攻击", data: { dmg: 10 } });
		expect(dst.getDue(500).map((e) => e.id)).toEqual(["a", "c", "b"]);
		expect(dst.getStats().totalProcessed).toBe(1);
	});

	it("checkpoint 的 events 按 executeAtMs 升序导出", () => {
		const src = new EventQueue({}, () => 0);
		src.insertBatch([makeEvent("late", 900), makeEvent("early", 100)]);
		const cp = src.captureCheckpoint();
		expect(cp.events.map((e) => e.id)).toEqual(["early", "late"]);
	});

	it("FSM 事件深拷贝隔离，修改源不影响 checkpoint", () => {
		const src = new EventQueue({}, () => 0);
		const fsmEvent = { type: "测试事件", data: { nested: { v: 1 } } };
		src.insert(makeEvent("a", 100, { fsmEvent }));
		const cp = src.captureCheckpoint();
		fsmEvent.data.nested.v = 999;
		expect((cp.events[0].fsmEvent as typeof fsmEvent).data.nested.v).toBe(1);
	});
});

describe("EventQueue — 快照(snapshot)", () => {
	it("createSnapshot 记录当前时间与事件（时间来自 timeGetter）", () => {
		let now = 0;
		const q = new EventQueue({}, () => now);
		q.insertBatch([makeEvent("a", 100), makeEvent("b", 50)]);
		now = 1234;
		q.createSnapshot();
		const snap = q.getSnapshot();
		expect(snap.currentTimeMs).toBe(1234);
		// 快照事件按 executeAtMs 升序。
		expect(snap.events.map((e) => e.id)).toEqual(["b", "a"]);
	});

	it("restoreSnapshot 按目标时间恢复", () => {
		let now = 0;
		const q = new EventQueue({}, () => now);
		q.insert(makeEvent("a", 100));
		now = 500;
		q.createSnapshot();

		q.insert(makeEvent("b", 200));
		expect(q.size()).toBe(2);

		expect(q.restoreSnapshot(500)).toBe(true);
		expect(q.size()).toBe(1);
		expect(q.get("a")?.id).toBe("a");
		expect(q.get("b")).toBeNull();
	});

	it("恢复不存在的快照时间返回 false", () => {
		const q = new EventQueue({}, () => 0);
		expect(q.restoreSnapshot(9999)).toBe(false);
	});
});
