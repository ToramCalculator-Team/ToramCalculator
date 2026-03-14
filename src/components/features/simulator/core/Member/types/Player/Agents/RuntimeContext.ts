import { commonActions, commonConditions } from "../../../runtime/Agent/CommonBoard";
import { CommonContext } from "../../../runtime/Agent/CommonContext";
import { actionPoolToInvokers, conditionPoolToInvokers } from "../../../runtime/Agent/uitls";
import { PlayerActionPool } from "./Actions";
import { PlayerConditionPool } from "./Condition";
import { PlayerRuntimeStateDefaults } from "./Property";

const playerActions = actionPoolToInvokers(PlayerRuntimeStateDefaults, PlayerActionPool);
const playerConditions = conditionPoolToInvokers(PlayerRuntimeStateDefaults, PlayerConditionPool);

/** 行为树访问视图 = CommonContext + 公共 callables + 成员专属 runtime state/actions/conditions */
export const PlayerRuntimeContext = {
	...CommonContext,
	...commonActions,
	...commonConditions,
	...PlayerRuntimeStateDefaults,
	...playerActions,
	...playerConditions,
};

export type PlayerRuntimeContext = typeof PlayerRuntimeContext;
