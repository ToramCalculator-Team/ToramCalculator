import type { ActionPool } from "../../../../BehaviorTree/NodeMethods/MethodTypes";
import type { ControlBehaviorContext, MemberControlBehaviorCapabilities } from "../../../../ControlBehavior/Bindings";

export const MobControlBehaviorActionPool = {} as const satisfies ActionPool<
	ControlBehaviorContext,
	MemberControlBehaviorCapabilities
>;

export type MobControlBehaviorActionPool = typeof MobControlBehaviorActionPool;
