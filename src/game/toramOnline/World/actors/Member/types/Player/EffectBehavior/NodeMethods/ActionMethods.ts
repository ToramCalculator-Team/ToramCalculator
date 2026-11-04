import type { ActionPool } from "~/engine/core/BehaviorTree/NodeMethods/MethodTypes";
import type { EffectBtRuntime, EffectBtRuntimeServices } from "../../../../EffectBehavior/types";
import type { PlayerAttrNestedSchema } from "../../PlayerAttrSchema";

export const PlayerEffectActionPool = {} as const satisfies ActionPool<
	EffectBtRuntime<PlayerAttrNestedSchema>,
	EffectBtRuntimeServices<PlayerAttrNestedSchema>
>;

export type PlayerEffectActionPool = typeof PlayerEffectActionPool;
