import { createEffectBindings } from "../../../EffectBehavior/Bindings";
import type { EffectBtRuntime, EffectBtRuntimeServices } from "../../../EffectBehavior/types";
import type { PlayerAttrNestedSchema } from "../PlayerAttrSchema";
import { PlayerEffectActionPool } from "./NodeMethods/ActionMethods";
import { PlayerEffectConditionPool } from "./NodeMethods/ConditionMethods";

const context = {} as EffectBtRuntime<PlayerAttrNestedSchema>;

export const createPlayerEffectBindings = (capabilities: EffectBtRuntimeServices<PlayerAttrNestedSchema>) =>
	createEffectBindings(context, PlayerEffectActionPool, PlayerEffectConditionPool, capabilities);
