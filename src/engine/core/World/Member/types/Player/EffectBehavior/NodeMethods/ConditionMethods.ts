import type { ConditionPool } from "../../../../BehaviorTree/NodeMethods/MethodTypes";
import type { EffectBtCapabilities, EffectBtContext } from "../../../../EffectBehavior/EffectBtTypes";
import type { PlayerAttrNestedSchema } from "../../PlayerAttrSchema";

export const PlayerEffectConditionPool = {} as const satisfies ConditionPool<
	EffectBtContext<PlayerAttrNestedSchema>,
	EffectBtCapabilities<PlayerAttrNestedSchema>
>;

export type PlayerEffectConditionPool = typeof PlayerEffectConditionPool;
