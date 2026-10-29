import { z } from "zod/v4";
import { State } from "~/lib/mistreevous/State";
import type { ActionPool } from "../../BehaviorTree/NodeMethods/MethodTypes";
import { defineAction } from "../../BehaviorTree/NodeMethods/MethodTypes";
import type { ControlBehaviorContext, MemberControlBehaviorCapabilities } from "../Bindings";

const selectTargetInputSchema = z.object({
	targetId: z.string().min(1),
	inputKey: z.string().min(1).optional(),
});

const waitUntilActionSettledInputSchema = z.object({});

/** Member 控制树的通用动作；动作只提交控制事件，最终由成员 FSM 裁决。 */
export const CommonControlBehaviorActionPool = {
	selectTarget: defineAction<typeof selectTargetInputSchema, ControlBehaviorContext, MemberControlBehaviorCapabilities>(
		selectTargetInputSchema,
		(context, input, capabilities) => {
			capabilities.submitControlInput({
				id: input.inputKey ?? "未知输入id",
				type: "切换目标",
				data: { targetId: input.targetId },
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
