import { CommonRuntimeContext } from "../../../runtime/Agent/CommonRuntimeContext";
import { actionPoolToInvokers, conditionPoolToInvokers } from "../../../runtime/Agent/uitls";
import { PlayerActionPool } from "./Actions";
import { PlayerConditionPool } from "./Condition";
import { PlayerProperty } from "./Property";

const playerActions = actionPoolToInvokers(PlayerProperty,PlayerActionPool);
const playerConditions = conditionPoolToInvokers(PlayerProperty,PlayerConditionPool);

export const PlayerRuntimeContext = {
	...CommonRuntimeContext,
	...PlayerProperty,
	...playerActions,
	...playerConditions,
};

export type PlayerRuntimeContext = typeof PlayerRuntimeContext;
