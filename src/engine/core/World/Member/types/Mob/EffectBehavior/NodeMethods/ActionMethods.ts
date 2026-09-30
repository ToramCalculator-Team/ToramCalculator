import type { EffectBtContext } from "../../../../EffectBehavior/Bindings";
import type { MemberBtCapabilities } from "../../../../EffectBehavior/EffectBtManagerEnv";
import type { ActionPool } from "../../../../runtime/NodeMethods/MethodTypes";
import type { MobAttrKey } from "../../MobAttrSchema";

export const MobEffectActionPool = {} as const satisfies ActionPool<
	EffectBtContext<MobAttrKey>,
	MemberBtCapabilities<MobAttrKey>
>;

export type MobEffectActionPool = typeof MobEffectActionPool;
