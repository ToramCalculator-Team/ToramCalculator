import { z } from "zod/v4";
import type { ConditionPool } from "../../runtime/NodeMethods/MethodTypes";
import { defineCondition } from "../../runtime/NodeMethods/MethodTypes";
import type { BehaviorBtContext, MemberBehaviorCapabilities } from "../Bindings";

/** Member 控制树的通用条件；只读取成员共享运行时，不执行效果操作。 */
export const CommonBehaviorConditionPool = {
	isInCoweringState: defineCondition(z.object({}), (context) => context.statusTags.includes("cowering")),
	isInOverturnedState: defineCondition(z.object({}), (context) => context.statusTags.includes("overturned")),
	isInDizzyState: defineCondition(z.object({}), (context) => context.statusTags.includes("dizzy")),
	isInControlException: defineCondition(z.object({}), (context) =>
		["cowering", "overturned", "dizzy"].some((name) => context.statusTags.includes(name)),
	),
} as const satisfies ConditionPool<BehaviorBtContext, MemberBehaviorCapabilities>;

export type CommonBehaviorConditionPool = typeof CommonBehaviorConditionPool;
