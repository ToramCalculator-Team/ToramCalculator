import {
	type ControlBehaviorContext,
	createControlBehaviorBindings,
	type MemberControlBehaviorCapabilities,
} from "../../../ControlBehavior/Bindings";
import { DefaultMemberRuntime } from "../../../types";
import { MobControlBehaviorActionPool } from "./NodeMethods/ActionMethods";
import { MobControlBehaviorConditionPool } from "./NodeMethods/ConditionMethods";

export type MobControlBehaviorContext = ControlBehaviorContext;

const controlBehaviorContextTypeHint = {
	...DefaultMemberRuntime,
};

export const createMobControlBehaviorBindings = (
	capabilities: MemberControlBehaviorCapabilities,
): Record<string, unknown> =>
	createControlBehaviorBindings(
		controlBehaviorContextTypeHint,
		MobControlBehaviorActionPool,
		MobControlBehaviorConditionPool,
		capabilities,
	);
