import type { ConditionPool } from "../../../../BehaviorTree/NodeMethods/MethodTypes";
import type { EffectBtContext } from "../../../../EffectBehavior/Bindings";
import type { MemberBtCapabilities } from "../../../../EffectBehavior/EffectBtManagerEnv";
import type { MobAttrKey } from "../../MobAttrSchema";

export const MobEffectConditionPool = {} as const satisfies ConditionPool<
	EffectBtContext<MobAttrKey>,
	MemberBtCapabilities<MobAttrKey>
>;

export type MobEffectConditionPool = typeof MobEffectConditionPool;
