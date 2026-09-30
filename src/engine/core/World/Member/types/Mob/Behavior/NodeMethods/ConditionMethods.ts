import type { BehaviorBtContext, MemberBehaviorCapabilities } from "../../../../Behavior/Bindings";
import type { ConditionPool } from "../../../../runtime/NodeMethods/MethodTypes";

export const MobBehaviorConditionPool = {} as const satisfies ConditionPool<BehaviorBtContext, MemberBehaviorCapabilities>;

export type MobConditionPool = typeof MobConditionPool;
