import type { ConditionPool } from "../../../../BehaviorTree/NodeMethods/MethodTypes";
import type { EffectBtContext } from "../../../../EffectBehavior/Bindings";
import type { MemberBtCapabilities } from "../../../../EffectBehavior/EffectBtManagerEnv";
import type { PlayerAttrKey } from "../../PlayerAttrSchema";

export const PlayerEffectConditionPool = {} as const satisfies ConditionPool<
	EffectBtContext<PlayerAttrKey>,
	MemberBtCapabilities<PlayerAttrKey>
>;

export type PlayerEffectConditionPool = typeof PlayerEffectConditionPool;
