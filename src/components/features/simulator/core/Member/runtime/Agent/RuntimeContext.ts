import { CommonActionPool } from "./GlobalActions";
import { CommonConditionPool } from "./GlobalCondition";
import { CommonProperty } from "./GlobalProperty";

export const DefaultRuntimeContext = {
	...CommonProperty,
	...CommonActionPool,
	...CommonConditionPool,
};

export type RuntimeContext = typeof DefaultRuntimeContext;