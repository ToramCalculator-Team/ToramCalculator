import {
	type ControlBehaviorContext,
	createControlBehaviorBindings,
	type MemberControlBehaviorCapabilities,
} from "../../../ControlBehavior/Bindings";
import type { PlayerAttrKey } from "../PlayerAttrSchema";
import { PlayerControlBehaviorActionPool } from "./NodeMethods/ActionMethods";
import { PlayerControlBehaviorConditionPool } from "./NodeMethods/ConditionMethods";

export type PlayerControlBehaviorContext = ControlBehaviorContext<PlayerAttrKey>;

const controlBehaviorContextTypeHint = {} as PlayerControlBehaviorContext;

export const createPlayerControlBehaviorBindings = (
	capabilities: MemberControlBehaviorCapabilities,
): Record<string, unknown> =>
	createControlBehaviorBindings(
		controlBehaviorContextTypeHint,
		PlayerControlBehaviorActionPool,
		PlayerControlBehaviorConditionPool,
		capabilities,
	);
