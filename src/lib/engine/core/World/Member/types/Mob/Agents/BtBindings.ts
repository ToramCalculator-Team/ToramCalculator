import { createCommonBtBindings } from "../../../runtime/Agent/CommonBtContext";
import { actionPoolToInvokers, conditionPoolToInvokers } from "../../../runtime/Agent/uitls";
import type { BtContext, MemberBtCapabilities } from "../../../runtime/BehaviourTree/BtManagerEnv";
import type { MobAttrKey } from "../MobAttrSchema";
import type { MobFSMEvent } from "../MobStateMachine";
import { MobActionPool } from "./Actions";
import { MobConditionPool } from "./Condition";

export type MobBtContext = BtContext<MobAttrKey> & Record<string, unknown>;

const btContextTypeHint = {} as MobBtContext;

export const createMobBtBindings = (capabilities: MemberBtCapabilities<MobAttrKey, MobFSMEvent>) => {
	const mobActions = actionPoolToInvokers(btContextTypeHint, MobActionPool, capabilities);
	const mobConditions = conditionPoolToInvokers(btContextTypeHint, MobConditionPool, capabilities);
	return {
		...createCommonBtBindings(capabilities),
		...mobActions,
		...mobConditions,
	};
};
