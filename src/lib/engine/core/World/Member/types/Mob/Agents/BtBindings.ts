import type { BtContext } from "../../../runtime/Agent/BtContext";
import { CommonBtBindings } from "../../../runtime/Agent/CommonBtContext";
import { actionPoolToInvokers, conditionPoolToInvokers } from "../../../runtime/Agent/uitls";
import { MobActionPool } from "./Actions";
import { MobConditionPool } from "./Condition";

export type MobBtContext = BtContext & Record<string, unknown>;

const btContextTypeHint = {} as MobBtContext;
const mobActions = actionPoolToInvokers(btContextTypeHint, MobActionPool);
const mobConditions = conditionPoolToInvokers(btContextTypeHint, MobConditionPool);

export const MobBtBindings = {
	...CommonBtBindings,
	...mobActions,
	...mobConditions,
};
