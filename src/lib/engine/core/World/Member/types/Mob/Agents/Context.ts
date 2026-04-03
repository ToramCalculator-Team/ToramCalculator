import { CommonBtBindings } from "../../../runtime/Agent/CommonBtContext";
import { MemberContext } from "../../../MemberContext";
import { actionPoolToInvokers, conditionPoolToInvokers } from "../../../runtime/Agent/uitls";
import { MobActionPool } from "./Actions";
import { MobConditionPool } from "./Condition";
import { MobRuntimeStateDefaults } from "./RuntimeState";

const mobActions = actionPoolToInvokers(MobRuntimeStateDefaults, MobActionPool);
const mobConditions = conditionPoolToInvokers(MobRuntimeStateDefaults, MobConditionPool);

/**
 * Shared runtime surface for a mob member.
 * Purpose: this is the public data/services contract seen by FSM, pipeline, and BT.
 * It intentionally excludes BT-only callable bindings.
 */
export const MobContext = {
	...MemberContext,
	...MobRuntimeStateDefaults,
};

export type MobContext = typeof MobContext;

/**
 * BT-only mob bindings layered on top of member.context for each tree instance.
 * Purpose: keep BT actions / conditions private so changing BT APIs does not change the member contract.
 */
export const MobBtBindings = {
	...CommonBtBindings,
	...mobActions,
	...mobConditions,
};

export type MobBtContext = MobContext & typeof MobBtBindings;
