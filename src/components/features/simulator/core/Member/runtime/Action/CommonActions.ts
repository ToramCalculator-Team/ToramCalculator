import { z } from "zod/v4";
import { createId } from "@paralleldrive/cuid2";
import { ModifierType } from "../StatContainer/StatContainer";
import type { ActionContext } from "./ActionContext";
import { ActionPool, defineAction } from "./type";

const logLv = 1; // 0: 不输出日志, 1: 输出关键日志, 2: 输出所有日志

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
  计算命中判定: defineAction(
    z.object({}),
    z.object({
      hitResult: z.boolean(),
      dodgeResult: z.boolean(),
      guardResult: z.boolean(),
    }),
    (context) => {
      logLv >= 1 && console.log(`⚔️ [${context.name}][Combat] 计算命中/闪躲/格挡结果`);

      const damageRequest = context.currentDamageRequest as
        | {
            sourceId: string;
            damageType: "physical" | "magic";
            canBeDodged: boolean;
            canBeGuarded: boolean;
          }
        | undefined;

      if (!damageRequest) {
        console.warn(`⚠️ [${context.name}] 当前没有 damageRequest，视为未命中`);
        const result = {
          hitResult: false,
          dodgeResult: false,
          guardResult: false,
        };
        context.lastHitResult = {
          hit: false,
          dodge: false,
          guard: false,
        };
        return result;
      }

      const { sourceId, damageType, canBeDodged, canBeGuarded } = damageRequest;

      const memberManager = context.engine.getMemberManager();
      const caster = memberManager.getMember(sourceId);

      const accuracyValue = (caster?.statContainer.getValue("accuracy") as number | undefined) ?? 0;
      const avoidValue = context.statContainer.getValue("avoid") as number;
      const dodgeRate = context.statContainer.getValue("dodgeRate") as number;
      const guardRate = context.statContainer.getValue("guardRate") as number;

      let hitResult = true;
      let dodgeResult = false;
      let guardResult = false;

      if (damageType === "physical") {
        const hitRate = maxMin(0, 100 - (avoidValue - accuracyValue) / 3, 100);
        hitResult = hitRate > Math.random() * 100;

        if (hitResult && canBeDodged) {
          dodgeResult = dodgeRate > Math.random() * 100;
        }

        if (hitResult && !dodgeResult && canBeGuarded) {
          guardResult = guardRate > Math.random() * 100;
        }
      } else {
        // 魔法伤害：必定命中，但仍然可以格挡
        hitResult = true;
        if (canBeGuarded) {
          guardResult = guardRate > Math.random() * 100;
        }
      }

      const result = { hitResult, dodgeResult, guardResult };
      context.lastHitResult = {
        hit: hitResult,
        dodge: dodgeResult,
        guard: guardResult,
      };

      return result;
    },
  ),

  解析伤害请求: defineAction(
    z.object({}),
    z.object({
      damageExpression: z.string(),
      damageExpressionContext: z.object({
        casterId: z.string(),
        targetId: z.string(),
        extraVars: z.record(z.string(), z.any()).optional(),
      }),
    }),
    (context) => {
      logLv >= 1 && console.log(`⚔️ [${context.name}][Common] 解析伤害请求`);

      const damageRequest = context.currentDamageRequest as
        | {
            sourceId: string;
            targetId: string;
            damageFormula: string;
            extraVars?: Record<string, any>;
          }
        | undefined;

      if (!damageRequest) {
        throw new Error(`🎮 [${context.name}] 当前没有 damageRequest`);
      }

      const damageExpression = damageRequest.damageFormula;
      const damageExpressionContext = {
        casterId: damageRequest.sourceId,
        targetId: context.id,
        extraVars: damageRequest.extraVars,
      };

      return { damageExpression, damageExpressionContext };
    },
  ),

  执行伤害表达式: defineAction(
    z.object({
      damageExpression: z.string(),
      damageExpressionContext: z.object({
        casterId: z.string(),
        targetId: z.string(),
        extraVars: z.record(z.string(), z.any()).optional(),
      }),
    }),
    z.object({ damageValue: z.number() }),
    (context, input) => {
      logLv >= 1 && console.log(`⚔️ [${context.name}][Common] 执行伤害表达式`);

      const { damageExpression, damageExpressionContext } = input;

      const exprCtx = {
        currentFrame: context.currentFrame,
        casterId: damageExpressionContext.casterId,
        targetId: damageExpressionContext.targetId,
        ...(damageExpressionContext.extraVars || {}),
      };

      const damageValue = context.engine.evaluateExpression(damageExpression, exprCtx);

      return { damageValue };
    },
  ),

  应用伤害结果: defineAction(
    z.object({ damageValue: z.number() }),
    z.object({
      finalDamage: z.number(),
      targetHpAfter: z.number().optional(),
    }),
    (context, input) => {
      logLv >= 1 && console.log(`⚔️ [${context.name}][Common] 应用伤害结果`);

      const { damageValue } = input;
      const lastHit = context.lastHitResult as
        | {
            hit: boolean;
            dodge: boolean;
            guard: boolean;
          }
        | undefined;

      let finalDamage = Math.max(0, Math.floor(damageValue));

      if (lastHit?.guard) {
        finalDamage = Math.floor(finalDamage * 0.5);
      }

      const currentHp = context.statContainer.getValue("hp.current");
      const newHp = Math.max(0, currentHp - finalDamage);

      context.statContainer.addModifier("hp.current", ModifierType.STATIC_FIXED, -finalDamage, {
        id: `damage_${context.currentFrame}_${createId()}`,
        name: "damage",
        type: "system",
      });

      logLv >= 1 &&
        console.log(
          `💔 [${context.name}] 受到伤害: ${finalDamage}（格挡: ${
            lastHit?.guard ? "是" : "否"
          }）, HP: ${currentHp} -> ${newHp}`,
        );

      return { finalDamage, targetHpAfter: newHp };
    },
  ),
} as const satisfies ActionPool<ActionContext>;

export type CommonActionPool = typeof CommonActions;
