import type { EffectBtContext } from "../../../../EffectBehavior/Bindings";
import type { MemberBtCapabilities } from "../../../../EffectBehavior/EffectBtManagerEnv";
import type { ActionPool } from "../../../../runtime/NodeMethods/MethodTypes";
import type { PlayerAttrKey } from "../../PlayerAttrSchema";

export const PlayerEffectActionPool = {} as const satisfies ActionPool<
	EffectBtContext<PlayerAttrKey>,
	MemberBtCapabilities<PlayerAttrKey>
>;

export type PlayerEffectActionPool = typeof PlayerEffectActionPool;
