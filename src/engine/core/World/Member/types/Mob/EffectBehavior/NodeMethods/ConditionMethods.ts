import type { ConditionPool } from "../../../../BehaviorTree/NodeMethods/MethodTypes";
import type { EffectBtCapabilities, EffectBtContext } from "../../../../EffectBehavior/EffectBtTypes";
import type { MobAttrNestedSchema } from "../../MobAttrSchema";

export const MobEffectConditionPool = {} as const satisfies ConditionPool<
	EffectBtContext<MobAttrNestedSchema>,
	EffectBtCapabilities<MobAttrNestedSchema>
>;

export type MobEffectConditionPool = typeof MobEffectConditionPool;
