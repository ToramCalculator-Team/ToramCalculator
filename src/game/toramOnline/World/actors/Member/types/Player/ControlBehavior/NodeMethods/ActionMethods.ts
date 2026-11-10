import type { ActionPool } from "../../../../BehaviorTree/NodeMethods/MethodTypes";
import type { ControlBehaviorContext, MemberControlBehaviorCapabilities } from "../../../../ControlBehavior/Bindings";

/** Player 控制树专属动作；公共控制动作由 Member 层提供。 */
export const PlayerControlBehaviorActionPool = {} as const satisfies ActionPool<
	ControlBehaviorContext,
	MemberControlBehaviorCapabilities
>;
