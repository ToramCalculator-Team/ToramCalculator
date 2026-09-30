import { describe, expect, it } from "vitest";
import { BehaviourTree, State } from "./index";

describe("BehaviourTree checkpoint", () => {
	it("恢复 wait 的运行时间", () => {
		let currentTimeMs = 0;
		const calls: number[] = [];
		const definition = "root { sequence { wait [100] action [mark] } }";
		const createTree = () =>
			new BehaviourTree(
				definition,
				{
					mark: () => {
						calls.push(currentTimeMs);
						return State.SUCCEEDED;
					},
				},
				{ getCurrentTimeMs: () => currentTimeMs },
			);

		const source = createTree();
		source.step();
		currentTimeMs = 40;
		source.step();
		const checkpoint = source.captureCheckpoint();

		const restored = createTree();
		restored.restoreCheckpoint(checkpoint);
		currentTimeMs = 99;
		restored.step();
		expect(restored.getState()).toBe(State.RUNNING);
		currentTimeMs = 100;
		restored.step();
		expect(restored.getState()).toBe(State.SUCCEEDED);
		expect(calls).toEqual([100]);
	});

	it("恢复 repeat 的迭代计数而不重新执行已完成迭代", () => {
		let calls = 0;
		const definition = "root { repeat [3] { action [count] } }";
		const createTree = () =>
			new BehaviourTree(definition, {
				count: () => {
					calls += 1;
					return State.SUCCEEDED;
				},
			});

		const source = createTree();
		source.step();
		expect(calls).toBe(1);
		const checkpoint = source.captureCheckpoint();

		const restored = createTree();
		restored.restoreCheckpoint(checkpoint);
		restored.step();
		restored.step();
		restored.step();
		expect(calls).toBe(3);
		expect(restored.getState()).toBe(State.SUCCEEDED);
	});

	it("恢复 retry 的尝试计数", () => {
		let calls = 0;
		const definition = "root { retry [2] { action [fail] } }";
		const createTree = () =>
			new BehaviourTree(definition, {
				fail: () => {
					calls += 1;
					return State.FAILED;
				},
			});

		const source = createTree();
		source.step();
		expect(calls).toBe(1);
		const checkpoint = source.captureCheckpoint();

		const restored = createTree();
		restored.restoreCheckpoint(checkpoint);
		restored.step();
		restored.step();
		expect(calls).toBe(2);
		expect(restored.getState()).toBe(State.FAILED);
	});

	it("恢复 lotto 已选中的子节点", () => {
		let firstCalls = 0;
		let secondCalls = 0;
		const definition = {
			type: "root" as const,
			child: {
				type: "lotto" as const,
				weights: [1, 1],
				children: [
					{ type: "action" as const, call: "first" },
					{ type: "action" as const, call: "second" },
				],
			},
		};
		const createTree = () =>
			new BehaviourTree(
				definition,
				{
					first: () => {
						firstCalls += 1;
						return State.RUNNING;
					},
					second: () => {
						secondCalls += 1;
						return State.RUNNING;
					},
				},
				{ random: () => 0 },
			);

		const source = createTree();
		source.step();
		const checkpoint = source.captureCheckpoint();
		const restored = createTree();
		restored.restoreCheckpoint(checkpoint);
		restored.step();
		expect(firstCalls).toBe(2);
		expect(secondCalls).toBe(0);
	});

	it("恢复 parallel 的多个运行分支", () => {
		let leftCalls = 0;
		let rightCalls = 0;
		const definition = "root { parallel { action [left] action [right] } }";
		const createTree = () =>
			new BehaviourTree(definition, {
				left: () => {
					leftCalls += 1;
					return State.RUNNING;
				},
				right: () => {
					rightCalls += 1;
					return State.RUNNING;
				},
			});

		const source = createTree();
		source.step();
		const checkpoint = source.captureCheckpoint();
		const restored = createTree();
		restored.restoreCheckpoint(checkpoint);
		restored.step();
		expect(leftCalls).toBe(2);
		expect(rightCalls).toBe(2);
	});

	it("在定义不匹配时拒绝恢复且不修改当前树", () => {
		const source = new BehaviourTree("root { action [run] }", { run: () => State.RUNNING });
		source.step();
		const checkpoint = source.captureCheckpoint();
		const target = new BehaviourTree("root { action [other] }", { other: () => State.RUNNING });

		expect(() => target.restoreCheckpoint(checkpoint)).toThrow(/definition mismatch/);
		expect(target.getState()).toBe(State.READY);
	});

	it("拒绝捕获等待中的 Promise action", () => {
		const tree = new BehaviourTree("root { action [asyncAction] }", {
			asyncAction: () => new Promise<State>(() => undefined),
		});
		tree.step();
		expect(() => tree.captureCheckpoint()).toThrow(/waiting for a Promise/);
	});

	it("拒绝覆盖目标树中等待中的 Promise action", () => {
		const definition = "root { action [run] }";
		const source = new BehaviourTree(definition, { run: () => State.RUNNING });
		source.step();
		const checkpoint = source.captureCheckpoint();
		const target = new BehaviourTree(definition, {
			run: () => new Promise<State>(() => undefined),
		});
		target.step();

		expect(() => target.restoreCheckpoint(checkpoint)).toThrow(/waiting for a Promise/);
	});
});
