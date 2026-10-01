import { z } from "zod/v4";
import { State } from "~/lib/mistreevous/State";
import type { ActionPool } from "../../BehaviorTree/NodeMethods/MethodTypes";
import { defineAction } from "../../BehaviorTree/NodeMethods/MethodTypes";
import { memberControlInputId } from "../../memberControlInput";
import type { ControlBehaviorContext, MemberControlBehaviorCapabilities } from "../Bindings";

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
export const CommonControlBehaviorActionPool = {
	selectTarget: defineAction<typeof selectTargetInputSchema, ControlBehaviorContext, MemberControlBehaviorCapabilities>(
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
	castSkill: defineAction<typeof castSkillInputSchema, ControlBehaviorContext, MemberControlBehaviorCapabilities>(
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
	jump: defineAction<typeof jumpInputSchema, ControlBehaviorContext, MemberControlBehaviorCapabilities>(
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
		ControlBehaviorContext,
		MemberControlBehaviorCapabilities
	>(waitUntilActionSettledInputSchema, (context) => (context.currentSkill === null ? State.SUCCEEDED : State.RUNNING)),
} as const satisfies ActionPool<ControlBehaviorContext, MemberControlBehaviorCapabilities>;

export type CommonControlBehaviorActionPool = typeof CommonControlBehaviorActionPool;
