import { CommonRuntimeContext } from "../../../runtime/Agent/CommonRuntimeContext";
import { actionPoolToInvokers, conditionPoolToInvokers } from "../../../runtime/Agent/poolToInvokers";
import { MobActionPool } from "./Actions";
import { MobConditionPool } from "./Condition";
import { MobProperty } from "./Property";

const mobActions = actionPoolToInvokers(MobProperty,MobActionPool);
const mobConditions = conditionPoolToInvokers(MobProperty,MobConditionPool);

export const MobRuntimeContext = {
	...CommonRuntimeContext,
	...MobProperty,
	...mobActions,
	...mobConditions,
};

export type MobRuntimeContext = typeof MobRuntimeContext;	
