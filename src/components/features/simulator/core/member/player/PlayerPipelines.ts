import { z } from "zod/v4";
import { PlayerStateContext } from "./PlayerStateMachine";
import { PipeLineDef, PipelineParams, PipeStageFunDef } from "../../pipeline/PipelineStageType";
import { ModifierType, StatContainer } from "../../dataSys/StatContainer";
import { ExpressionContext } from "../../GameEngine";
import { PlayerAttrType } from "./Player";

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
 * 管线定义
 * 每个管线包含一系列阶段，每个阶段有输出 Schema
 */
export const playerPipDef = {
  // ============ 技能相关管线 ============
  "skill.cost.calculate": [
    ["技能HP消耗计算", z.object({ skillHpCostResult: z.number() })],
    ["技能MP消耗计算", z.object({ skillMpCostResult: z.number() })],
    ["仇恨值计算", z.object({ aggroResult: z.number() })],
  ],
  "skill.motion.calculate": [
    ["技能固定动作时长计算", z.object({ skillFixedMotionResult: z.number() })],
    ["技能可变动作时长计算", z.object({ skillModifiedMotionResult: z.number() })],
    ["行动速度计算", z.object({ mspdResult: z.number() })],
    ["前摇比例计算", z.object({ startupProportion: z.number() })],
    ["前摇帧数计算", z.object({ startupFramesResult: z.number() })],
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
  "state.init": [],
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
 * 管线输入参数定义
 * 定义每个管线需要的输入参数类型
 */
export const playerPipelineParams = {
  "skill.cost.calculate": {} as {},
  "skill.motion.calculate": {} as {},
  "skill.effect.apply": {} as {},
  "combat.hit.calculate": {} as {},
  "combat.control.calculate": {} as {},
  "combat.damage.calculate": {} as {},
  "animation.idle.start": {} as {},
  "animation.move.start": {} as {},
  "animation.startup.start": {} as {},
  "animation.charging.start": {} as {},
  "animation.chanting.start": {} as {},
  "animation.action.start": {} as {},
  "animation.controlled.start": {} as {},
  "event.warning.show": {} as {},
  "event.warning.schedule": {} as {},
  "event.startup.schedule": {} as {},
  "event.charging.schedule": {} as {},
  "event.chanting.schedule": {} as {},
  "event.action.schedule": {} as {},
  "event.snapshot.request": {} as {},
  "event.snapshot.respond": {} as {},
  "event.hit.notify": {} as {},
  "event.hit.feedback": {} as {},
  "event.control.notify": {} as {},
  "event.control.feedback": {} as {},
  "event.damage.notify": {} as {},
  "event.damage.feedback": {} as {},
  "event.attr.modify": {} as {},
  "event.buff.modify": {} as {},
  "state.init": {} as {},
  "state.update": {} as {},
  "state.revive": {} as {},
  "state.interrupt": {} as {},
  "state.control.reset": {} as {},
  "state.target.change": {} as { targetId: string },
  "state.skill.add": {} as {},
  "state.skill.clear": {} as {},
  "state.hit.process": {} as {},
} as const satisfies PipelineParams;

export type PlayerPipelineParams = typeof playerPipelineParams;

/**
 * 管线阶段函数定义
 * 实现每个管线中各阶段的具体计算逻辑
 */
export const playerPipFunDef: PipeStageFunDef<PlayerPipelineDef, PlayerPipelineParams, PlayerStateContext> = {
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
      const startupProportion = context.currentSkillEffect?.startupProportion;
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
  "state.init": {},
  "state.update": {},
  "state.revive": {},
  "state.interrupt": {},
  "state.control.reset": {},
  "state.target.change": {},
  "state.skill.add": {},
  "state.skill.clear": {},
  "state.hit.process": {},
};