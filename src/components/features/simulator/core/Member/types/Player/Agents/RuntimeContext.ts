import { commonActions, commonConditions } from "../../../runtime/Agent/CommonBoard";
import { CommonContext } from "../../../runtime/Agent/CommonContext";
import { actionPoolToInvokers, conditionPoolToInvokers } from "../../../runtime/Agent/uitls";
import { PlayerActionPool } from "./Actions";
import { PlayerConditionPool } from "./Condition";
import { PlayerProperty } from "./Property";

const playerActions = actionPoolToInvokers(PlayerProperty, PlayerActionPool);
const playerConditions = conditionPoolToInvokers(PlayerProperty, PlayerConditionPool);

/** 行为树黑板 = CommonContext + 公共 callables + 成员专属 property/actions/conditions */
export const PlayerRuntimeContext = {
	...CommonContext,
	...commonActions,
	...commonConditions,
	...PlayerProperty,
	...playerActions,
	...playerConditions,
};

export type PlayerRuntimeContext = typeof PlayerRuntimeContext;
