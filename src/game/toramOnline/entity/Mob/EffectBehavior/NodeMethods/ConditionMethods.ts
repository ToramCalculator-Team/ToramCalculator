import type { ConditionPool } from "../../../../BehaviorTree/NodeMethods/MethodTypes";
import type { EffectBtRuntime, EffectBtRuntimeServices } from "../../../../EffectBehavior/types";
import type { MobAttrNestedSchema } from "../../MobAttrSchema";

export const MobEffectConditionPool = {} as const satisfies ConditionPool<
	EffectBtRuntime,
	EffectBtRuntimeServices<MobAttrNestedSchema>
>;

export type MobEffectConditionPool = typeof MobEffectConditionPool;
