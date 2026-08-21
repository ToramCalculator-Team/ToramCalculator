import { describe, expect, it, vi } from "vitest";
import type { MemberBtCapabilities } from "../BehaviourTree/BtManagerEnv";
import type { MemberSharedRuntime } from "../types";
import { CommonActionPool } from "./CommonActions";
import { actionPoolToInvokers } from "./uitls";

describe("CommonActions.animation", () => {
	it("把状态名称传给成员能力", () => {
		const declareState = vi.fn();
		// 本测试只验证 animation 动作的参数映射，其余成员能力不会被调用。
		const capabilities = { declareState } as unknown as MemberBtCapabilities<string>;
		// invoker 只读取 name 生成日志，其余 BT 黑板字段不参与该动作。
		const context = { name: "测试成员" } as unknown as MemberSharedRuntime;
		const invokers = actionPoolToInvokers(context, CommonActionPool, capabilities);

		invokers.animation.call(context, "skill.chanting");

		expect(declareState).toHaveBeenCalledWith("skill.chanting");
	});
});

describe("CommonActions.singleAttack", () => {
	it("频次单体伤害只注册一个无轨迹区域", () => {
		const executeInstantDamage = vi.fn();
		const capabilities = {
			services: {
				getCurrentTimeMs: () => 1000,
				targetResolver: () => "target-1",
				expressionEvaluator: (expression: string) => {
					if (expression === "skillLv + 1") return 3;
					if (expression === "500") return 500;
					return 0;
				},
				executeInstantDamage,
				createDamageArea: vi.fn(),
			},
			attributeContainer: {
				getValue: () => 1,
				getBaseValue: () => 1,
			},
			hasParallelBt: () => false,
		} as unknown as MemberBtCapabilities<string>;
		const context = {
			name: "测试成员",
			memberId: "caster-1",
			campId: "player",
			teamId: "team-1",
			deltaTimeMs: 16,
			currentTimeMs: 1000,
			tickIndex: 0,
			targetId: "target-1",
			skill: { id: "skill-1", lv: 5 },
		} as unknown as MemberSharedRuntime;
		const invokers = actionPoolToInvokers(context, CommonActionPool, capabilities);

		invokers.singleAttack.call(context, "target-1", "magic", "magic", "self.atk.m", "skillLv + 1", [], [], true, "500");

		expect(executeInstantDamage).toHaveBeenCalledOnce();
		expect(executeInstantDamage).toHaveBeenCalledWith(
			expect.objectContaining({
				attackSemantics: expect.objectContaining({ damageCount: 3, damageIntervalMs: 500 }),
				identity: expect.objectContaining({ sourceTeamId: "team-1" }),
			}),
		);
	});
});
