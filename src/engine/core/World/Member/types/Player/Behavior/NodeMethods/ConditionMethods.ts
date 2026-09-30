import type { BehaviorBtContext, MemberBehaviorCapabilities } from "../../../../Behavior/Bindings";
import type { ConditionPool } from "../../../../runtime/NodeMethods/MethodTypes";

export const PlayerBehaviorConditionPool = {} as const satisfies ConditionPool<BehaviorBtContext, MemberBehaviorCapabilities>;

export type PlayerConditionPool = typeof PlayerConditionPool;
