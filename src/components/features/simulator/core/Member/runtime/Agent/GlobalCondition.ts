import z from "zod/v4";
import type { RuntimeContext } from "./AgentContext";
import { type ConditionPool, defineCondition } from "./type";

export const GlobalCondition = {
	/** 是否拥有指定名称的buff 
	 *  @param treeName - 技能树名称
	 *  @returns 是否拥有指定名称的buff
	*/
	hasBuff: defineCondition(
		z.object({
			treeName: z.string(),
		}),
		(context, input) => {
			return context.owner?.btManager.hasBuff(input.treeName) ?? false;
		},
	),

	/** 是否处于胆怯状态 */
	isInCoweringState: defineCondition(
		z.object({}),
		(context) => {
			return context.owner?.runtimeContext.statusTags.includes("cowering") ?? false;
		},
	),

	/** 是否处于翻覆状态 */
	isInOverturnedState: defineCondition(
		z.object({}),
		(context) => {
			return context.owner?.runtimeContext.statusTags.includes("overturned") ?? false;
		},
	),

	/** 是否处于昏厥状态 */
	isInDizzyState: defineCondition(
		z.object({}),
		(context) => {
			return context.owner?.runtimeContext.statusTags.includes("dizzy") ?? false;
		},
	),

	/** 是否处于控制类异常中 */
	isInControlException: defineCondition(
		z.object({}),
		(context) => {
			const exceptionNames = ["cowering", "overturned", "dizzy"];
			return exceptionNames.some(name => context.owner?.runtimeContext.statusTags.includes(name)) ?? false;
		},
	),
} as const satisfies ConditionPool<RuntimeContext>;

export type GlobalConditionPool = typeof GlobalCondition;
