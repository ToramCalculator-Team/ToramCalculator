import type { ActionPool } from "../../../../BehaviorTree/NodeMethods/MethodTypes";
import type { EffectBtCapabilities, EffectBtContext } from "../../../../EffectBehavior/EffectBtTypes";
import type { MobAttrNestedSchema } from "../../MobAttrSchema";

export const MobEffectActionPool = {} as const satisfies ActionPool<
	EffectBtContext<MobAttrNestedSchema>,
	EffectBtCapabilities<MobAttrNestedSchema>
>;

export type MobEffectActionPool = typeof MobEffectActionPool;
