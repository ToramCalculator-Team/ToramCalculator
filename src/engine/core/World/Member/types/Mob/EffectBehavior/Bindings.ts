import { createEffectBindings } from "../../../EffectBehavior/Bindings";
import type { EffectBtCapabilities, EffectBtContext } from "../../../EffectBehavior/EffectBtTypes";
import type { MobAttrNestedSchema } from "../MobAttrSchema";
import { MobEffectActionPool } from "./NodeMethods/ActionMethods";
import { MobEffectConditionPool } from "./NodeMethods/ConditionMethods";

const context = {} as EffectBtContext<MobAttrNestedSchema>;

export const createMobEffectBindings = (capabilities: EffectBtCapabilities<MobAttrNestedSchema>) =>
	createEffectBindings(context, MobEffectActionPool, MobEffectConditionPool, capabilities);
