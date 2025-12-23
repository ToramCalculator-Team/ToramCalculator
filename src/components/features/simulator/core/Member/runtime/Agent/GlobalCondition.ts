import z from "zod/v4";
import { ConditionPool, defineCondition } from "./type";
import { RuntimeContext } from "./AgentContext";

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
