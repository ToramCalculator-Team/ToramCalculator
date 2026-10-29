import { createEffectBindings } from "../../../EffectBehavior/Bindings";
import type { EffectBtRuntime, EffectBtRuntimeServices } from "../../../EffectBehavior/types";
import type { MobAttrNestedSchema } from "../MobAttrSchema";
import { MobEffectActionPool } from "./NodeMethods/ActionMethods";
import { MobEffectConditionPool } from "./NodeMethods/ConditionMethods";

const context = {} as EffectBtRuntime;

export const createMobEffectBindings = (capabilities: EffectBtRuntimeServices<MobAttrNestedSchema>) =>
	createEffectBindings(context, MobEffectActionPool, MobEffectConditionPool, capabilities);
