import type { BtContext } from "../../../runtime/Agent/BtContext";
import { CommonBtBindings } from "../../../runtime/Agent/CommonBtContext";
import { actionPoolToInvokers, conditionPoolToInvokers } from "../../../runtime/Agent/uitls";
import { PlayerActionPool } from "./Actions";
import { PlayerConditionPool } from "./Condition";

export type PlayerBtContext = BtContext & Record<string, unknown>;

const btContextTypeHint = {} as PlayerBtContext;
const playerActions = actionPoolToInvokers(btContextTypeHint, PlayerActionPool);
const playerConditions = conditionPoolToInvokers(btContextTypeHint, PlayerConditionPool);

export const PlayerBtBindings = {
	...CommonBtBindings,
	...playerActions,
	...playerConditions,
};
