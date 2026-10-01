import {
	type ControlBehaviorContext,
	createControlBehaviorBindings,
	type MemberControlBehaviorCapabilities,
} from "../../../ControlBehavior/Bindings";
import type { MobAttrKey } from "../MobAttrSchema";
import { MobControlBehaviorActionPool } from "./NodeMethods/ActionMethods";
import { MobControlBehaviorConditionPool } from "./NodeMethods/ConditionMethods";

export type MobControlBehaviorContext = ControlBehaviorContext<MobAttrKey>;

const controlBehaviorContextTypeHint = {} as MobControlBehaviorContext;

export const createMobControlBehaviorBindings = (
	capabilities: MemberControlBehaviorCapabilities,
): Record<string, unknown> =>
	createControlBehaviorBindings(
		controlBehaviorContextTypeHint,
		MobControlBehaviorActionPool,
		MobControlBehaviorConditionPool,
		capabilities,
	);
