import type { ActionPool } from "../../../../BehaviorTree/NodeMethods/MethodTypes";
import type { EffectBtRuntime, EffectBtRuntimeServices } from "../../../../EffectBehavior/types";
import type { MobAttrNestedSchema } from "../../MobAttrSchema";

export const MobEffectActionPool = {} as const satisfies ActionPool<
	EffectBtRuntime,
	EffectBtRuntimeServices<MobAttrNestedSchema>
>;

export type MobEffectActionPool = typeof MobEffectActionPool;
