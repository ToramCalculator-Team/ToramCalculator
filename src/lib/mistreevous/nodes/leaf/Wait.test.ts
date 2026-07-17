import { describe, expect, it } from "vitest";
import { BehaviourTree } from "../../BehaviourTree";
import { State } from "../../State";

describe("wait", () => {
	it("按权威模拟时刻完成，并在同一次树更新中执行后续节点", () => {
		let currentTimeMs = 1000;
		const calls: number[] = [];
		const tree = new BehaviourTree(
			"root { sequence { wait [2000] action [mark] } }",
			{
				mark: () => {
					calls.push(currentTimeMs);
					return State.SUCCEEDED;
				},
			},
			{ getCurrentTimeMs: () => currentTimeMs },
		);

		tree.step();
		currentTimeMs = 2999;
		tree.step();
		expect(calls).toEqual([]);
		currentTimeMs = 3000;
		tree.step();
		expect(calls).toEqual([3000]);
	});

	it("接受小数毫秒，并在第一个不早于目标的逻辑边界完成", () => {
		let currentTimeMs = 0;
		const tree = new BehaviourTree("root { wait [16.5] }", {}, { getCurrentTimeMs: () => currentTimeMs });

		tree.step();
		currentTimeMs = 16;
		tree.step();
		expect(tree.getState()).toBe(State.RUNNING);
		currentTimeMs = 16.6666666667;
		tree.step();
		expect(tree.getState()).toBe(State.SUCCEEDED);
	});

	it("只有 deltaTimeMs 时不在首次更新提前计入当前时间片", () => {
		const tree = new BehaviourTree("root { wait [10] }", {}, { getDeltaTimeMs: () => 10 });

		tree.step();
		expect(tree.getState()).toBe(State.RUNNING);
		tree.step();
		expect(tree.getState()).toBe(State.SUCCEEDED);
	});

	it("零时长等待在首次更新中完成", () => {
		const tree = new BehaviourTree("root { wait [0] }", {}, { getDeltaTimeMs: () => 10 });
		tree.step();
		expect(tree.getState()).toBe(State.SUCCEEDED);
	});
});
