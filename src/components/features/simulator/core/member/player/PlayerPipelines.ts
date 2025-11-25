import { z, ZodType } from "zod/v4";
import { PlayerStateContext } from "./PlayerStateMachine";
import { PipeLineDef, PipelineStage, StagePool, defineStage } from "../../pipeline/PipelineStageType";

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
 * 玩家可用的管线阶段池
 */
export const PlayerPipelineStages = {
  技能HP消耗计算: defineStage(
    z.object({}),
    z.object({ skillHpCostResult: z.number() }),
    (context, input) => {
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
      return { skillHpCostResult: hpCost };
    },
  ),

  技能MP消耗计算: defineStage(
    z.object({}),
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
    },
  ),

  仇恨值计算: defineStage(
    z.object({ skillMpCostResult: z.number() }),
    z.object({ aggroResult: z.number() }),
    (context, input) => {
      const aggro = input.skillMpCostResult * context.statContainer.getValue("aggro.rate");
      return { aggroResult: aggro };
    },
  ),

  技能固定动作时长计算: defineStage(
    z.object({}),
    z.object({ skillFixedMotionResult: z.number() }),
    (context, input) => {
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
  ),

  技能可变动作时长计算: defineStage(
    z.object({ skillFixedMotionResult: z.number() }),
    z.object({ skillModifiedMotionResult: z.number() }),
    (context, input) => {
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
  ),

  行动速度计算: defineStage(
    z.object({}),
    z.object({ mspdResult: z.number() }),
    (context, input) => {
      const mspd = context.statContainer.getValue("mspd");
      return {
        mspdResult: mspd,
      };
    },
  ),

  前摇比例计算: defineStage(
    z.object({}),
    z.object({ startupProportion: z.number() }),
    (context, input) => {
      const startupProportion = 0.5;
      console.log(`👤 [${context.name}] 当前技能效果的启动比例：`, startupProportion);
      if (!startupProportion) {
        throw new Error(`🎮 [${context.name}] 的当前技能前摇比例数据不存在`);
      }
      return {
        startupProportion: startupProportion,
      };
    },
  ),

  前摇帧数计算: defineStage(
    z.object({
      skillFixedMotionResult: z.number(),
      skillModifiedMotionResult: z.number(),
      mspdResult: z.number(),
      startupProportion: z.number(),
    }),
    z.object({ startupFramesResult: z.number() }),
    (context, input) => {
      const startupFrames =
        (input.skillFixedMotionResult + input.skillModifiedMotionResult * input.mspdResult) *
        input.startupProportion;
      return {
        startupFramesResult: startupFrames,
      };
    },
  ),

  技能冷却初始化: defineStage(
    z.object({}),
    z.object({ skillCooldownResult: z.array(z.number()) }),
    (context, stageInput) => {
      return {
        skillCooldownResult: context.skillList.map((s) => 0),
      };
    },
  ),
} as const satisfies StagePool<PlayerStateContext>;

export type PlayerStagePool = typeof PlayerPipelineStages;

/**
 * 管线定义
 * 每个管线包含一系列阶段名称
 */
export const playerPipDef = {
  // ============ 技能相关管线 ============
  "skill.cost.calculate": [
    "技能HP消耗计算",
    "技能MP消耗计算",
    "仇恨值计算",
  ],
  "skill.motion.calculate": [
    "技能固定动作时长计算",
    "技能可变动作时长计算",
    "行动速度计算",
    "前摇比例计算",
    "前摇帧数计算",
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
  "skillCooldown.init": ["技能冷却初始化"],
  "state.update": [],
  "state.revive": [],
  "state.interrupt": [],
  "state.control.reset": [],
  "state.target.change": [],
  "state.skill.add": [],
  "state.skill.clear": [],
  "state.hit.process": [],
} as const satisfies PipeLineDef<PlayerStagePool>;

export type PlayerPipelineDef = typeof playerPipDef;
