import type { EffectBtContext } from "../../../../EffectBehavior/Bindings";
import type { MemberBtCapabilities } from "../../../../EffectBehavior/EffectBtManagerEnv";
import type { ConditionPool } from "../../../../runtime/NodeMethods/MethodTypes";
import type { MobAttrKey } from "../../MobAttrSchema";

export const MobEffectConditionPool = {} as const satisfies ConditionPool<
	EffectBtContext<MobAttrKey>,
	MemberBtCapabilities<MobAttrKey>
>;

export type MobEffectConditionPool = typeof MobEffectConditionPool;
