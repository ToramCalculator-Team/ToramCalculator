import { DefaultRuntimeContext } from "../../../runtime/Agent/RuntimeContext";
import { PlayerActionPool } from "./Actions";
import { PlayerConditionPool } from "./Condition";
import { PlayerRuntimeProperty } from "./Property";

export const DefaultPlayerRuntimeContext = {
	...DefaultRuntimeContext,
	...PlayerActionPool,
	...PlayerConditionPool,
	...PlayerRuntimeProperty,
};

export type PlayerRuntimeContext = typeof DefaultPlayerRuntimeContext;
