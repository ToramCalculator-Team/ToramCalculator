import { commonActions, commonConditions } from "../../../runtime/Agent/CommonBoard";
import { CommonContext } from "../../../runtime/Agent/CommonContext";
import { actionPoolToInvokers, conditionPoolToInvokers } from "../../../runtime/Agent/uitls";
import { MobActionPool } from "./Actions";
import { MobConditionPool } from "./Condition";
import { MobRuntimeStateDefaults } from "./Property";

const mobActions = actionPoolToInvokers(MobRuntimeStateDefaults, MobActionPool);
const mobConditions = conditionPoolToInvokers(MobRuntimeStateDefaults, MobConditionPool);

/** 行为树访问视图 = CommonContext + 公共 callables + 成员专属 runtime state/actions/conditions */
export const MobRuntimeContext = {
	...CommonContext,
	...commonActions,
	...commonConditions,
	...MobRuntimeStateDefaults,
	...mobActions,
	...mobConditions,
};

export type MobRuntimeContext = typeof MobRuntimeContext;	
