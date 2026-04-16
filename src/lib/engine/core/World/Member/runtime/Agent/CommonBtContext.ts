import { CommonActionPool } from "./CommonActions";
import { CommonConditionPool } from "./CommonCondition";
import type { BtContext } from "./BtContext";
import { actionPoolToInvokers, conditionPoolToInvokers } from "./uitls";

type CommonBtContextTypeHint = BtContext & Record<string, any>;
const btContextTypeHint = {} as CommonBtContextTypeHint;
export const commonActions = actionPoolToInvokers(btContextTypeHint, CommonActionPool);
export const commonConditions = conditionPoolToInvokers(btContextTypeHint, CommonConditionPool);

/**
 * BT-private callable bundle shared by all members.
 * Purpose: keep generic BT invokers outside the public member.context contract.
 */
export const CommonBtBindings = {
	...commonActions,
	...commonConditions,
};
export type CommonBtContext = BtContext & typeof CommonBtBindings;
