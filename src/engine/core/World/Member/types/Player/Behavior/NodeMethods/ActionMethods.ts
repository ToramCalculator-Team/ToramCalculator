import type { BehaviorBtContext, MemberBehaviorCapabilities } from "../../../../Behavior/Bindings";
import type { ActionPool } from "../../../../runtime/NodeMethods/MethodTypes";

/** Player 控制树专属动作；公共控制动作由 Member 层提供。 */
export const PlayerBehaviorActionPool = {} as const satisfies ActionPool<
	BehaviorBtContext,
	MemberBehaviorCapabilities
>;
