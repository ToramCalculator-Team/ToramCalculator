import { z, ZodType } from "zod/v4";
import { PlayerStateContext } from "./PlayerStateMachine";
import { PipeLineDef, PipeStageFunDef } from "../../pipeline/PipelineStageType";
import { ModifierType, StatContainer } from "../../dataSys/StatContainer";
import { ExpressionContext } from "../../GameEngine";
import { PlayerAttrType } from "./Player";
import { SkillEffectSchema } from "@db/generated/zod";

/**
 * ==================== 玩家管线定义 ====================
 * 
 * 设计理念：
 * 1. 管线定义独立于状态机
 * 2. 使用语义化的管线名称（点分命名）
 * 3. 管线只与数据结构（PlayerStateContext）关联
 * 4. 可被状态机和行为树共享调用
 */

/**
 * 管线阶段定义
 * [输入Schema, 输出Schema, 实现函数]
 */
export type PipelineStage<
  TInput extends ZodType, 
  TOutput extends ZodType, 
  TContext extends Record<string, any>
> = readonly [
  TInput, 
  TOutput, 
  (context: TContext, stageInput: z.output<TInput>) => z.output<TOutput>
];

/**
 * 辅助函数：创建类型安全的管线阶段
 */
const defineStage = <TInput extends ZodType, TOutput extends ZodType>(
  inputSchema: TInput,
  outputSchema: TOutput,
  impl: (context: PlayerStateContext, stageInput: z.output<TInput>) => z.output<TOutput>
): PipelineStage<TInput, TOutput, PlayerStateContext> => {
  return [inputSchema, outputSchema, impl] as const;
};

/**
 * 玩家可用的管线阶段池
 */
export const PlayerPipelineStages = {
  技能HP消耗计算: defineStage(
    z.object({ skillEffectId: z.string() }),
    z.object({ skillHpCostResult: z.number() }),
    (context, input) => {
      const hpCostExpression = context.currentSkillEffect?.hpCost;
      if (!hpCostExpression) {
        throw new Error(`技能效果不存在`);
      }
      const hpCost = context.engine.evaluateExpression(hpCostExpression, {
        currentFrame: context.currentFrame,
        casterId: context.id,
        skillLv: context.currentSkill?.lv ?? 0,
      });
      return { skillHpCostResult: hpCost };
    }
  ),
  
  技能MP消耗计算: defineStage(
    z.object({ skillHpCostResult: z.number() }),
    z.object({ skillMpCostResult: z.number() }),
    (context, input) => {
      const mpCostExpression = context.currentSkillEffect?.mpCost;
      if (!mpCostExpression) {
        throw new Error(`技能效果不存在`);
      }
      const mpCost = context.engine.evaluateExpression(mpCostExpression, {
        currentFrame: context.currentFrame,
        casterId: context.id,
        skillLv: context.currentSkill?.lv ?? 0,
      });
      return { skillMpCostResult: mpCost };
    }
  ),
  
  仇恨值计算: defineStage(
    z.object({ skillMpCostResult: z.number() }),
    z.object({ aggroResult: z.number() }),
    (context, input) => {
      const aggro = input.skillMpCostResult * context.statContainer.getValue("aggro.rate");
      return { aggroResult: aggro };
    }
  ),
} as const;

/**
 * 管线定义
 * 每个管线包含一系列阶段，每个阶段定义为三元组：[阶段名称, 输入Schema, 输出Schema]
 */
export const playerPipDef = {
  // ============ 技能相关管线 ============
  "skill.cost.calculate": [
    ["技能HP消耗计算", z.object({}), z.object({ skillHpCostResult: z.number() })],
    ["技能MP消耗计算", z.object({ skillHpCostResult: z.number() }), z.object({ skillMpCostResult: z.number() })],
    ["仇恨值计算", z.object({ skillMpCostResult: z.number() }), z.object({ aggroResult: z.number() })],
  ],
  "skill.motion.calculate": [
    ["技能固定动作时长计算", z.object({}), z.object({ skillFixedMotionResult: z.number() })],
    ["技能可变动作时长计算", z.object({ skillFixedMotionResult: z.number() }), z.object({ skillModifiedMotionResult: z.number() })],
    ["行动速度计算", z.object({ skillModifiedMotionResult: z.number() }), z.object({ mspdResult: z.number() })],
    ["前摇比例计算", z.object({ mspdResult: z.number() }), z.object({ startupProportion: z.number() })],
    ["前摇帧数计算", z.object({ startupProportion: z.number() }), z.object({ startupFramesResult: z.number() })],
  ],
  "skill.effect.apply": [],
  
  // ============ 战斗相关管线 ============
  "combat.hit.calculate": [],
  "combat.control.calculate": [],
  "combat.damage.calculate": [],
  
  // ============ 动画和状态管理（无阶段，纯副作用）============
  "animation.idle.start": [],
  "animation.move.start": [],
  "animation.startup.start": [],
  "animation.charging.start": [],
  "animation.chanting.start": [],
  "animation.action.start": [],
  "animation.controlled.start": [],
  
  // ============ 事件和通知管理 ============
  "event.warning.show": [],
  "event.warning.schedule": [],
  "event.startup.schedule": [],
  "event.charging.schedule": [],
  "event.chanting.schedule": [],
  "event.action.schedule": [],
  "event.snapshot.request": [],
  "event.snapshot.respond": [],
  "event.hit.notify": [],
  "event.hit.feedback": [],
  "event.control.notify": [],
  "event.control.feedback": [],
  "event.damage.notify": [],
  "event.damage.feedback": [],
  "event.attr.modify": [],
  "event.buff.modify": [],
  
  // ============ 状态管理 ============
  "skillCooldown.init": [
    ["技能冷却初始化", z.object({}), z.object({ skillCooldownResult: z.array(z.number()) })],
  ],
  "state.update": [],
  "state.revive": [],
  "state.interrupt": [],
  "state.control.reset": [],
  "state.target.change": [],
  "state.skill.add": [],
  "state.skill.clear": [],
  "state.hit.process": [],
} as const satisfies PipeLineDef;

export type PlayerPipelineDef = typeof playerPipDef;

/**
 * 管线阶段函数定义
 * 实现每个管线中各阶段的具体计算逻辑
 */
export const playerPipFunDef: PipeStageFunDef<PlayerPipelineDef, PlayerStateContext> = {
  "skill.cost.calculate": {
    技能HP消耗计算: (context, stageInput) => {
      console.log(`👤 [${context.name}] 技能HP消耗计算`);
      const hpCostExpression = context.currentSkillEffect?.hpCost;
      if (!hpCostExpression) {
        throw new Error(`🎮 [${context.name}] 的当前技能效果不存在`);
      }
      const hpCost = context.engine.evaluateExpression(hpCostExpression, {
        currentFrame: context.currentFrame,
        casterId: context.id,
        skillLv: context.currentSkill?.lv ?? 0,
      });
      return {
        skillHpCostResult: hpCost,
      };
    },
    技能MP消耗计算: (context, stageInput) => {
      const mpCostExpression = context.currentSkillEffect?.mpCost;
      if (!mpCostExpression) {
        throw new Error(`🎮 [${context.name}] 的当前技能效果不存在`);
      }
      const mpCost = context.engine.evaluateExpression(mpCostExpression, {
        currentFrame: context.currentFrame,
        casterId: context.id,
        skillLv: context.currentSkill?.lv ?? 0,
      });
      return {
        skillMpCostResult: mpCost,
      };
    },
    仇恨值计算: (context, stageInput) => {
      const aggro = context.skillMpCostResult * context.statContainer.getValue("aggro.rate");
      return {
        aggroResult: aggro,
      };
    },
  },
  "skill.motion.calculate": {
    技能固定动作时长计算: (context, stageInput) => {
      const fixedMotionExpression = context.currentSkillEffect?.motionFixed;
      const skill = context.currentSkill;
      if (!skill || !fixedMotionExpression) {
        throw new Error(`🎮 [${context.name}] 的当前技能不存在`);
      }
      const fixedMotion = context.engine.evaluateExpression(fixedMotionExpression, {
        currentFrame: context.currentFrame,
        casterId: context.id,
        skillLv: skill.lv ?? 0,
      });
      return {
        skillFixedMotionResult: fixedMotion,
      };
    },
    技能可变动作时长计算: (context, stageInput) => {
      const modifiedMotionExpression = context.currentSkillEffect?.motionModified;
      const skill = context.currentSkill;
      if (!skill || !modifiedMotionExpression) {
        throw new Error(`🎮 [${context.name}] 的当前技能不存在`);
      }
      const modifiedMotion = context.engine.evaluateExpression(modifiedMotionExpression, {
        currentFrame: context.currentFrame,
        casterId: context.id,
        skillLv: skill.lv ?? 0,
      });
      return {
        skillModifiedMotionResult: modifiedMotion,
      };
    },
    行动速度计算: (context, stageInput) => {
      const mspd = context.statContainer.getValue("mspd");
      return {
        mspdResult: mspd,
      };
    },
    前摇比例计算: (context, stageInput) => {
      const startupProportion = 0.5;
      console.log(`👤 [${context.name}] 当前技能效果的启动比例：`, startupProportion);
      if (!startupProportion) {
        throw new Error(`🎮 [${context.name}] 的当前技能前摇比例数据不存在`);
      }
      return {
        startupProportion: startupProportion,
      };
    },
    前摇帧数计算: (context, stageInput) => {
      const startupFrames = (context.skillFixedMotionResult + context.skillModifiedMotionResult * context.mspdResult) * context.startupProportion;
      return {
        startupFramesResult: startupFrames,
      };
    },
  },
  "skill.effect.apply": {},
  "combat.hit.calculate": {},
  "combat.control.calculate": {},
  "combat.damage.calculate": {},
  "animation.idle.start": {},
  "animation.move.start": {},
  "animation.startup.start": {},
  "animation.charging.start": {},
  "animation.chanting.start": {},
  "animation.action.start": {},
  "animation.controlled.start": {},
  "event.warning.show": {},
  "event.warning.schedule": {},
  "event.startup.schedule": {},
  "event.charging.schedule": {},
  "event.chanting.schedule": {},
  "event.action.schedule": {},
  "event.snapshot.request": {},
  "event.snapshot.respond": {},
  "event.hit.notify": {},
  "event.hit.feedback": {},
  "event.control.notify": {},
  "event.control.feedback": {},
  "event.damage.notify": {},
  "event.damage.feedback": {},
  "event.attr.modify": {},
  "event.buff.modify": {},
  "skillCooldown.init": {
    技能冷却初始化: (context, stageInput) => {
      return {
        skillCooldownResult: context.skillList.map((s) => 0),
      };
    },
  },
  "state.update": {},
  "state.revive": {},
  "state.interrupt": {},
  "state.control.reset": {},
  "state.target.change": {},
  "state.skill.add": {},
  "state.skill.clear": {},
  "state.hit.process": {},
};