import type { ActionPool } from "../../../../BehaviorTree/NodeMethods/MethodTypes";
import type { EffectBtCapabilities, EffectBtContext } from "../../../../EffectBehavior/EffectBtTypes";
import type { PlayerAttrNestedSchema } from "../../PlayerAttrSchema";

export const PlayerEffectActionPool = {} as const satisfies ActionPool<
	EffectBtContext<PlayerAttrNestedSchema>,
	EffectBtCapabilities<PlayerAttrNestedSchema>
>;

export type PlayerEffectActionPool = typeof PlayerEffectActionPool;
