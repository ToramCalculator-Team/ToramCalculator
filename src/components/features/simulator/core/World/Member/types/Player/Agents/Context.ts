import { CommonBtBindings } from "../../../runtime/Agent/CommonBtContext";
import { MemberContext } from "../../../MemberContext";
import { actionPoolToInvokers, conditionPoolToInvokers } from "../../../runtime/Agent/uitls";
import { PlayerActionPool } from "./Actions";
import { PlayerConditionPool } from "./Condition";
import { PlayerRuntimeStateDefaults } from "./RuntimeState";

const playerActions = actionPoolToInvokers(PlayerRuntimeStateDefaults, PlayerActionPool);
const playerConditions = conditionPoolToInvokers(PlayerRuntimeStateDefaults, PlayerConditionPool);

/**
 * Shared runtime surface for a player member.
 * Purpose: this is the public data/services contract seen by FSM, pipeline, and BT.
 * It intentionally excludes BT-only callable bindings.
 */
export const PlayerContext = {
	...MemberContext,
	...PlayerRuntimeStateDefaults,
};

export type PlayerContext = typeof PlayerContext;

/**
 * BT-only player bindings layered on top of member.context for each tree instance.
 * Purpose: keep BT actions / conditions private so changing BT APIs does not change the member contract.
 */
export const PlayerBtBindings = {
	...CommonBtBindings,
	...playerActions,
	...playerConditions,
};

export type PlayerBtContext = PlayerContext & typeof PlayerBtBindings;
