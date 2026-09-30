import { createEffectBindings, type EffectBtContext } from "../../../EffectBehavior/Bindings";
import type { MemberBtCapabilities } from "../../../EffectBehavior/EffectBtManagerEnv";
import type { PlayerAttrKey } from "../PlayerAttrSchema";
import { PlayerEffectActionPool } from "./NodeMethods/ActionMethods";
import { PlayerEffectConditionPool } from "./NodeMethods/ConditionMethods";

const context = {} as EffectBtContext<PlayerAttrKey>;

export const createPlayerEffectBindings = (
	capabilities: MemberBtCapabilities<PlayerAttrKey>,
): Record<string, unknown> =>
	createEffectBindings(context, PlayerEffectActionPool, PlayerEffectConditionPool, capabilities);
