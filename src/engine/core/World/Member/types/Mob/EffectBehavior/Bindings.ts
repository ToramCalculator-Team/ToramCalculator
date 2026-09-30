import { createEffectBindings, type EffectBtContext } from "../../../EffectBehavior/Bindings";
import type { MemberBtCapabilities } from "../../../EffectBehavior/EffectBtManagerEnv";
import type { MobAttrKey } from "../MobAttrSchema";
import { MobEffectActionPool } from "./NodeMethods/ActionMethods";
import { MobEffectConditionPool } from "./NodeMethods/ConditionMethods";

const context = {} as EffectBtContext<MobAttrKey>;

export const createMobEffectBindings = (capabilities: MemberBtCapabilities<MobAttrKey>): Record<string, unknown> =>
	createEffectBindings(context, MobEffectActionPool, MobEffectConditionPool, capabilities);
