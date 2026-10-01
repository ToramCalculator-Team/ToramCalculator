import type { ConditionPool } from "../../../../BehaviorTree/NodeMethods/MethodTypes";
import type { ControlBehaviorContext, MemberControlBehaviorCapabilities } from "../../../../ControlBehavior/Bindings";

export const PlayerControlBehaviorConditionPool = {} as const satisfies ConditionPool<
	ControlBehaviorContext,
	MemberControlBehaviorCapabilities
>;

export type PlayerControlBehaviorConditionPool = typeof PlayerControlBehaviorConditionPool;
