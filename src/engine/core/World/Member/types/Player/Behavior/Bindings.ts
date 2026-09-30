import {
	type BehaviorBtContext,
	createBehaviorBindings,
	type MemberBehaviorCapabilities,
} from "../../../Behavior/Bindings";
import type { PlayerAttrKey } from "../PlayerAttrSchema";
import type { PlayerFSMEvent } from "../PlayerStateMachine";
import { PlayerBehaviorActionPool } from "./NodeMethods/ActionMethods";
import { PlayerBehaviorConditionPool } from "./NodeMethods/ConditionMethods";

export type PlayerBtContext = BehaviorBtContext<PlayerAttrKey>;

const btContextTypeHint = {} as PlayerBtContext;

export const createPlayerBehaviorBindings = (
	capabilities: MemberBehaviorCapabilities,
): Record<string, unknown> =>
	createBehaviorBindings(btContextTypeHint, PlayerBehaviorActionPool, PlayerBehaviorConditionPool, capabilities);
