import type { BtContext, MemberBtCapabilities } from "../../../runtime/BehaviourTree/BtManagerEnv";
import { createCommonBtBindings } from "../../../runtime/Agent/CommonBtContext";
import { actionPoolToInvokers, conditionPoolToInvokers } from "../../../runtime/Agent/uitls";
import { PlayerActionPool } from "./Actions";
import { PlayerConditionPool } from "./Condition";

export type PlayerBtContext = BtContext & Record<string, unknown>;

const btContextTypeHint = {} as PlayerBtContext;

export const createPlayerBtBindings = (capabilities: MemberBtCapabilities) => {
	const playerActions = actionPoolToInvokers(btContextTypeHint, PlayerActionPool, capabilities);
	const playerConditions = conditionPoolToInvokers(btContextTypeHint, PlayerConditionPool, capabilities);
	return {
		...createCommonBtBindings(capabilities),
		...playerActions,
		...playerConditions,
	};
};
