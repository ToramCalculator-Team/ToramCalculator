import { z } from "zod/v4";
import { State } from "~/lib/mistreevous/State";
import { memberControlInputId } from "../../memberControlInput";
import type { ActionPool } from "../../runtime/NodeMethods/MethodTypes";
import { defineAction } from "../../runtime/NodeMethods/MethodTypes";
import type { BehaviorBtContext, MemberBehaviorCapabilities } from "../Bindings";

const castSkillInputSchema = z.object({
	skillId: z.string(),
	inputKey: z.string().min(1).optional(),
});

const selectTargetInputSchema = z.object({
	targetId: z.string().min(1),
	inputKey: z.string().min(1).optional(),
});

const jumpInputSchema = z.object({
	inputKey: z.string().min(1).optional(),
});

const waitUntilActionSettledInputSchema = z.object({});

/** Member 控制树的通用动作；动作只提交控制事件，最终由成员 FSM 裁决。 */
export const CommonBehaviorActionPool = {
	selectTarget: defineAction<typeof selectTargetInputSchema, BehaviorBtContext, MemberBehaviorCapabilities>(
		selectTargetInputSchema,
		(context, input, capabilities) => {
			capabilities.submitControlInput({
				id: memberControlInputId(context.memberId, input.inputKey ?? `${context.tickIndex}:target:${input.targetId}`),
				type: "切换目标",
				data: { targetId: input.targetId },
			});
			return State.SUCCEEDED;
		},
	),
	castSkill: defineAction<typeof castSkillInputSchema, BehaviorBtContext, MemberBehaviorCapabilities>(
		castSkillInputSchema,
		(context, input, capabilities) => {
			const inputKey = input.inputKey ?? `${context.tickIndex}:${input.skillId}`;
			capabilities.submitControlInput({
				id: memberControlInputId(context.memberId, inputKey),
				type: "使用技能",
				data: { skillId: input.skillId },
			});
			return State.SUCCEEDED;
		},
	),
	jump: defineAction<typeof jumpInputSchema, BehaviorBtContext, MemberBehaviorCapabilities>(
		jumpInputSchema,
		(context, input, capabilities) => {
			capabilities.submitControlInput({
				id: memberControlInputId(context.memberId, input.inputKey ?? `${context.tickIndex}:jump`),
				type: "跳跃",
				data: {},
			});
			return State.SUCCEEDED;
		},
	),
	waitUntilActionSettled: defineAction<
		typeof waitUntilActionSettledInputSchema,
		BehaviorBtContext,
		MemberBehaviorCapabilities
	>(waitUntilActionSettledInputSchema, (context) =>
		context.currentSkill === null ? State.SUCCEEDED : State.RUNNING,
	),
} as const satisfies ActionPool<BehaviorBtContext, MemberBehaviorCapabilities>;

export type CommonBehaviorActionPool = typeof CommonBehaviorActionPool;
