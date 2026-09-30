import type { EffectBtContext } from "../../../../EffectBehavior/Bindings";
import type { MemberBtCapabilities } from "../../../../EffectBehavior/EffectBtManagerEnv";
import type { ConditionPool } from "../../../../runtime/NodeMethods/MethodTypes";
import type { PlayerAttrKey } from "../../PlayerAttrSchema";

export const PlayerEffectConditionPool = {} as const satisfies ConditionPool<
	EffectBtContext<PlayerAttrKey>,
	MemberBtCapabilities<PlayerAttrKey>
>;

export type PlayerEffectConditionPool = typeof PlayerEffectConditionPool;
