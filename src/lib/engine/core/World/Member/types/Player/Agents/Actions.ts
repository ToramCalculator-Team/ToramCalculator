import { z } from "zod/v4";
import { State } from "~/lib/mistreevous/State";
import { memberFlowInputId } from "../../../memberFlowInput";
import type { ActionPool } from "../../../runtime/Agent/type";
import { defineAction } from "../../../runtime/Agent/type";
import type { PlayerAttrKey } from "../PlayerAttrSchema";
import type { PlayerFSMEvent } from "../PlayerStateMachine";
import type { PlayerBtContext } from "./BtBindings";

const castSkillInputSchema = z.object({
	skillId: z.string(),
	inputKey: z.string().min(1).optional(),
});

const selectTargetInputSchema = z.object({
	targetId: z.string().min(1),
	inputKey: z.string().min(1).optional(),
});

const waitUntilActionSettledInputSchema = z.object({});

/** Player 成员流程动作只发送语义事件，技能合法性和接纳仍由 Player FSM 唯一裁决。 */
export const PlayerActionPool = {
	selectTarget: defineAction<typeof selectTargetInputSchema, PlayerBtContext, PlayerAttrKey, PlayerFSMEvent>(
		selectTargetInputSchema,
		(context, input, capabilities) => {
			capabilities.submitControlInput({
				id: memberFlowInputId(context.memberId, input.inputKey ?? `${context.tickIndex}:target:${input.targetId}`),
				type: "切换目标",
				data: { targetId: input.targetId },
			});
			return State.SUCCEEDED;
		},
	),
	castSkill: defineAction<typeof castSkillInputSchema, PlayerBtContext, PlayerAttrKey, PlayerFSMEvent>(
		castSkillInputSchema,
		(context, input, capabilities) => {
			const inputKey = input.inputKey ?? `${context.tickIndex}:${input.skillId}`;
			const inputId = memberFlowInputId(context.memberId, inputKey);
			capabilities.submitControlInput({
				id: inputId,
				type: "使用技能",
				data: { skillId: input.skillId },
			});
			return State.SUCCEEDED;
		},
	),
	waitUntilActionSettled: defineAction<
		typeof waitUntilActionSettledInputSchema,
		PlayerBtContext,
		PlayerAttrKey,
		PlayerFSMEvent
	>(waitUntilActionSettledInputSchema, (context) => (context.currentSkill === null ? State.SUCCEEDED : State.RUNNING)),
} as const satisfies ActionPool<PlayerBtContext, PlayerAttrKey, PlayerFSMEvent>;
