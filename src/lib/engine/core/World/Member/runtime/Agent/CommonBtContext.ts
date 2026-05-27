import { CommonActionPool } from "./CommonActions";
import { CommonConditionPool } from "./CommonCondition";
import type { BtContext, MemberBtCapabilities } from "../BehaviourTree/BtManagerEnv";
import { actionPoolToInvokers, conditionPoolToInvokers } from "./uitls";

type CommonBtContextTypeHint = BtContext & Record<string, any>;
const btContextTypeHint = {} as CommonBtContextTypeHint;

/**
 * BT-private callable bundle shared by all members.
 * Purpose: keep generic BT invokers outside the public member.context contract.
 */
export const createCommonBtBindings = (capabilities: MemberBtCapabilities) => {
	const commonActions = actionPoolToInvokers(btContextTypeHint, CommonActionPool, capabilities);
	const commonConditions = conditionPoolToInvokers(btContextTypeHint, CommonConditionPool, capabilities);
	return {
		...commonActions,
		...commonConditions,
	};
};
export type CommonBtBindings = ReturnType<typeof createCommonBtBindings>;
export type CommonBtContext = BtContext & CommonBtBindings;
