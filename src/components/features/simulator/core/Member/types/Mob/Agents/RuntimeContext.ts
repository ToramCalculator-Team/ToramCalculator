import { commonActions, commonConditions } from "../../../runtime/Agent/CommonBoard";
import { CommonContext } from "../../../runtime/Agent/CommonContext";
import { actionPoolToInvokers, conditionPoolToInvokers } from "../../../runtime/Agent/uitls";
import { MobActionPool } from "./Actions";
import { MobConditionPool } from "./Condition";
import { MobProperty } from "./Property";

const mobActions = actionPoolToInvokers(MobProperty, MobActionPool);
const mobConditions = conditionPoolToInvokers(MobProperty, MobConditionPool);

/** 行为树黑板 = CommonContext + 公共 callables + 成员专属 property/actions/conditions */
export const MobRuntimeContext = {
	...CommonContext,
	...commonActions,
	...commonConditions,
	...MobProperty,
	...mobActions,
	...mobConditions,
};

export type MobRuntimeContext = typeof MobRuntimeContext;	
