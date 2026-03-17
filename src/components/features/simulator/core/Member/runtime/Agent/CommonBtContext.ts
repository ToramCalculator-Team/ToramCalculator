import { CommonActionPool } from "./CommonActions";
import { CommonConditionPool } from "./CommonCondition";
import { MemberContext } from "../../MemberContext";
import { actionPoolToInvokers, conditionPoolToInvokers } from "./uitls";

export const commonActions = actionPoolToInvokers(MemberContext, CommonActionPool);
export const commonConditions = conditionPoolToInvokers(MemberContext, CommonConditionPool);

/**
 * BT-private callable bundle shared by all members.
 * Purpose: keep generic BT invokers outside the public member.context contract.
 */
export const CommonBtBindings = {
	...commonActions,
	...commonConditions,
};

export type CommonBtContext = MemberContext & typeof CommonBtBindings;
