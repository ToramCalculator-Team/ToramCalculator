import { createEffectBindings } from "../../../EffectBehavior/Bindings";
import type { EffectBtCapabilities, EffectBtContext } from "../../../EffectBehavior/EffectBtTypes";
import type { PlayerAttrNestedSchema } from "../PlayerAttrSchema";
import { PlayerEffectActionPool } from "./NodeMethods/ActionMethods";
import { PlayerEffectConditionPool } from "./NodeMethods/ConditionMethods";

const context = {} as EffectBtContext<PlayerAttrNestedSchema>;

export const createPlayerEffectBindings = (capabilities: EffectBtCapabilities<PlayerAttrNestedSchema>) =>
	createEffectBindings(context, PlayerEffectActionPool, PlayerEffectConditionPool, capabilities);
