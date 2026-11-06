import type { ConditionPool } from "../../../../BehaviorTree/NodeMethods/MethodTypes";
import type { EffectBtRuntime, EffectBtRuntimeServices } from "../../../../EffectBehavior/types";
import type { PlayerAttrNestedSchema } from "../../PlayerAttrSchema";

export const PlayerEffectConditionPool = {} as const satisfies ConditionPool<
	EffectBtRuntime<PlayerAttrNestedSchema>,
	EffectBtRuntimeServices<PlayerAttrNestedSchema>
>;

export type PlayerEffectConditionPool = typeof PlayerEffectConditionPool;
