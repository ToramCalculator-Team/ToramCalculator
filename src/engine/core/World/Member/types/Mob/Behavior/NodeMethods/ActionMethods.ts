import type { BehaviorBtContext, MemberBehaviorCapabilities } from "../../../../Behavior/Bindings";
import type { ActionPool } from "../../../../runtime/NodeMethods/MethodTypes";

export const MobBehaviorActionPool = {} as const satisfies ActionPool<BehaviorBtContext, MemberBehaviorCapabilities>;

export type MobActionPool = typeof MobActionPool;
