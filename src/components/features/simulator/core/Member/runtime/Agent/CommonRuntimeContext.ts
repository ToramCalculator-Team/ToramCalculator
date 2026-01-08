import { CommonActionPool } from "./CommonActions";
import { CommonConditionPool } from "./CommonCondition";
import { CommonProperty } from "./CommonProperty";
import { actionPoolToInvokers, conditionPoolToInvokers } from "./uitls";

const commonActions = actionPoolToInvokers(CommonProperty,CommonActionPool);
const commonConditions = conditionPoolToInvokers(CommonProperty,CommonConditionPool);

export const CommonRuntimeContext = {
	...CommonProperty,
	...commonActions,
	...commonConditions,
};

export type CommonRuntimeContext = typeof CommonRuntimeContext;