import {
	type BehaviorBtContext,
	createBehaviorBindings,
	type MemberBehaviorCapabilities,
} from "../../../Behavior/Bindings";
import type { MobAttrKey } from "../MobAttrSchema";
import type { MobFSMEvent } from "../MobStateMachine";
import { MobBehaviorActionPool } from "./NodeMethods/ActionMethods";
import { MobBehaviorConditionPool } from "./NodeMethods/ConditionMethods";

export type MobBtContext = BehaviorBtContext<MobAttrKey>;

const btContextTypeHint = {} as MobBtContext;

export const createMobBehaviorBindings = (
	capabilities: MemberBehaviorCapabilities,
): Record<string, unknown> => createBehaviorBindings(btContextTypeHint, MobBehaviorActionPool, MobBehaviorConditionPool, capabilities);
