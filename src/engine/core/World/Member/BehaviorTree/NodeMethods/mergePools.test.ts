import { describe, expect, it } from "vitest";
import { z } from "zod/v4";
import { State } from "~/lib/mistreevous";
import type { ControlBehaviorContext, MemberControlBehaviorCapabilities } from "../../ControlBehavior/Bindings";
import { defineAction, defineCondition } from "./MethodTypes";
import { assertDisjointPools, mergePools } from "./mergePools";

describe("行为树能力池合并", () => {
	it("合并无重复键的公共池和专属池", () => {
		const common = { selectTarget: "common" } as const;
		const specific = { castSkill: "specific" } as const;

		expect(mergePools(common, specific)).toEqual({
			selectTarget: "common",
			castSkill: "specific",
		});
	});

	it("编译期拒绝具体池的重复键", () => {
		const common = { shared: "common" } as const;
		const specific = { shared: "specific" } as const;

		const duplicateMergeTypeCheck = () => {
			// @ts-expect-error 能力池重复键不能依赖对象展开顺序覆盖。
			mergePools(common, specific);
		};
		void duplicateMergeTypeCheck;
	});

	it("运行时分别拒绝重复 action 和 condition 名称", () => {
		type Context = ControlBehaviorContext;
		type Capabilities = MemberControlBehaviorCapabilities;
		const schema = z.object({});
		const action = defineAction<typeof schema, Context, Capabilities>(schema, () => State.SUCCEEDED);
		const condition = defineCondition<typeof schema, Context, Capabilities>(schema, () => true);
		const commonAction = { sharedAction: action } as const;
		const specificAction = { sharedAction: action } as const;
		const commonCondition = { sharedCondition: condition } as const;
		const specificCondition = { sharedCondition: condition } as const;

		expect(() => assertDisjointPools(commonAction, specificAction)).toThrow("sharedAction");
		expect(() => assertDisjointPools(commonCondition, specificCondition)).toThrow("sharedCondition");
	});
});
