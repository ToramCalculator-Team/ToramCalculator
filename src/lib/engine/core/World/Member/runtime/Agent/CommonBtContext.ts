import type { EventObject } from "xstate";
import type { BtContext, MemberBtCapabilities } from "../BehaviourTree/BtManagerEnv";
import type { MemberFSMEvent } from "../StateMachine/types";
import { CommonActionPool } from "./CommonActions";
import { CommonConditionPool } from "./CommonCondition";
import { actionPoolToInvokers, conditionPoolToInvokers } from "./uitls";

type CommonBtContextTypeHint<TExtraAttrKey extends string = string> = BtContext<TExtraAttrKey> &
	Record<string, unknown>;
const btContextTypeHint = {} as CommonBtContextTypeHint;

/**
 * BT-private callable bundle shared by all members.
 * Purpose: keep generic BT invokers outside the public member.context contract.
 */
export const createCommonBtBindings = <TExtraAttrKey extends string, TSpecificEvent extends EventObject>(
	capabilities: MemberBtCapabilities<TExtraAttrKey, MemberFSMEvent<TSpecificEvent>>,
) => {
	// common action/condition 定义是静态的；实例能力由调用方传入，并通过闭包绑定到 invoker。
	const commonContextTypeHint = btContextTypeHint as CommonBtContextTypeHint<TExtraAttrKey>;
	const commonActions = actionPoolToInvokers(commonContextTypeHint, CommonActionPool, capabilities);
	const commonConditions = conditionPoolToInvokers(commonContextTypeHint, CommonConditionPool, capabilities);
	return {
		...commonActions,
		...commonConditions,
	};
};
export type CommonBtBindings = ReturnType<typeof createCommonBtBindings>;
export type CommonBtContext = BtContext & CommonBtBindings;
