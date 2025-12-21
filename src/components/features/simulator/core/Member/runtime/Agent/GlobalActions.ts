import { z } from "zod/v4";
import { createId } from "@paralleldrive/cuid2";
import { ModifierType } from "../StatContainer/StatContainer";
import type { RuntimeContext } from "./AgentContext";
import { ActionPool, defineAction } from "./type";

export const logLv = 1; // 0: 不输出日志, 1: 输出关键日志, 2: 输出所有日志

const maxMin = (min: number, value: number, max: number) => {
  return Math.max(min, Math.min(value, max));
};

/**
 * 通用战斗动作池（命中 / 伤害相关）
 * 约定：
 * - context 至少满足 ActionContext
 * - 受击者侧通过 context.currentDamageRequest 提供本次伤害请求
 * - 命中结果写回 context.lastHitResult，供状态机或后续动作使用
 */
export const CommonActions = {
  moveTo: defineAction(z.object({
    target: z.object({
      x: z.number(),
      y: z.number(),
      z: z.number(),
    }),
  }), z.object({}), (context, input) => {
    console.log("moveTo",  input );
    return {};
  }),
} as const satisfies ActionPool<RuntimeContext>;

export type CommonActionPool = typeof CommonActions;
