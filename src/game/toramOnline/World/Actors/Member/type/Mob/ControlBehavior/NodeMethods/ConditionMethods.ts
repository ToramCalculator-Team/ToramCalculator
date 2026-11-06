import type { ConditionPool } from "../../../../BehaviorTree/NodeMethods/MethodTypes";
import type { ControlBehaviorContext, MemberControlBehaviorCapabilities } from "../../../../ControlBehavior/Bindings";

export const MobControlBehaviorConditionPool = {} as const satisfies ConditionPool<
	ControlBehaviorContext,
	MemberControlBehaviorCapabilities
>;

export type MobControlBehaviorConditionPool = typeof MobControlBehaviorConditionPool;
