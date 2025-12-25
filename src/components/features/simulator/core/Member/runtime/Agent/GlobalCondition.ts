import z from "zod/v4";
import type { RuntimeContext } from "./AgentContext";
import { type ConditionPool, defineCondition } from "./type";

export const GlobalCondition = {
	hasBuff: defineCondition(
		z.object({
			treeName: z.string(),
		}),
		(context, input) => {
			return context.owner?.btManager.hasBuff(input.treeName) ?? false;
		},
	),
} as const satisfies ConditionPool<RuntimeContext>;

export type GlobalConditionPool = typeof GlobalCondition;
