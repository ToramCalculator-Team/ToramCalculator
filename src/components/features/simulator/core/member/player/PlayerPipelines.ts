import { z, ZodType } from "zod/v4";
import { createId } from "@paralleldrive/cuid2";
import { PlayerStateContext } from "./PlayerStateMachine";
import { PipeLineDef, StagePool, defineStage } from "../../pipeline/PipelineStageType";
import { PlayerBehaviorContext } from "./PlayerBehaviorContext";
import { Tree, type TreeData } from "~/lib/behavior3/tree";
import skillExecutionTemplate from "./behaviorTree/skillExecutionTemplate.json";


const logLv = 0; // 0: 不输出日志, 1: 输出关键日志, 2: 输出所有日志

const scheduleFsmEvent = (
  context: PlayerStateContext,
  delayFrames: number,
  eventType: string,
  source: string,
) => {
  const engineQueue = context.engine.getEventQueue?.();
  if (!engineQueue) {
    console.warn(`⚠️ [${context.name}] 无法获取事件队列，无法调度 ${eventType}`);
    return;
  }
  const executeFrame = context.currentFrame + Math.max(1, delayFrames);
  engineQueue.insert({
    id: createId(),
    type: "member_fsm_event",
    executeFrame,
    priority: "high",
    payload: {
      targetMemberId: context.id,
      fsmEventType: eventType,
      skillId: context.currentSkill?.id ?? "unknown_skill",
      source,
    },
  });
};

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
      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 技能HP消耗计算`)
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
      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 技能MP消耗计算`)
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
      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 仇恨值计算`)
      const aggro = input.skillMpCostResult * context.statContainer.getValue("aggro.rate");
      return { aggroResult: aggro };
    },
  ),

  添加Buff: defineStage(
    z.object({
      buffId: z.string(),
      buffName: z.string(),
      duration: z.number(),
      variables: z.record(z.string(), z.number()).optional(),
      effects: z.array(z.any()).optional(),
    }),
    z.object({ buffAdded: z.boolean() }),
    (context, input) => {
      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 添加Buff: ${input.buffName}`);
      
      const buff: any = {
        id: input.buffId,
        name: input.buffName,
        duration: input.duration,
        startTime: Date.now(),
        source: `skill.${context.currentSkill?.id || 'unknown'}`,
        effects: input.effects || [],
        variables: {
          ...(input.variables || {}),
          // 如果变量中没有 initialFrame，初始化为当前帧数（用于 frame.update 效果的帧数检查）
          initialFrame: input.variables?.initialFrame ?? context.currentFrame,
        },
      };
      
      context.buffManager.addBuff(buff);
      return { buffAdded: true };
    },
  ),

  移除Buff: defineStage(
    z.object({
      buffId: z.string(),
    }),
    z.object({ buffRemoved: z.boolean(), chargeCounter: z.number().optional() }),
    (context, input) => {
      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 移除Buff: ${input.buffId}`);
      
      const chargeCounter = context.buffManager.getVariable(input.buffId, 'chargeCounter');
      context.buffManager.removeBuff(input.buffId);
      return { buffRemoved: true, chargeCounter };
    },
  ),

  检查Buff: defineStage(
    z.object({
      buffId: z.string(),
    }),
    z.object({ buffExists: z.boolean(), chargeCounter: z.number().optional() }),
    (context, input) => {
      const buffExists = context.buffManager.hasBuff(input.buffId);
      const chargeCounter = buffExists ? context.buffManager.getVariable(input.buffId, 'chargeCounter') : undefined;
      return { buffExists, chargeCounter };
    },
  ),

  技能固定动作时长计算: defineStage(
    z.object({}),
    z.object({ skillFixedMotionResult: z.number() }),
    (context, input) => {
      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 技能固定动作时长计算`)
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
      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 技能可变动作时长计算`)
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
      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 行动速度计算`)
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
      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 前摇比例计算`)
      const startupProportion = 0.5;
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
    z.object({
      startupFramesResult: z.number(),
      currentSkillStartupFrames: z.number(),
    }),
    (context, input) => {
      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 前摇帧数计算`)
      const startupFrames =
        (input.skillFixedMotionResult + input.skillModifiedMotionResult * input.mspdResult) *
        input.startupProportion;
      return {
        startupFramesResult: startupFrames,
        currentSkillStartupFrames: startupFrames,
      };
    },
  ),

  技能效果应用: defineStage(
    z.object({}),
    z.object({ skillEffectApplied: z.boolean() }),
    (context, input) => {
      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 技能效果应用`)


      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 技能效果应用阶段完成（标记为已应用）`);
      return {
        skillEffectApplied: true,
      };
    },
  ),

  启动前摇动画: defineStage(
    z.object({}),
    z.object({ startupAnimationStarted: z.boolean() }),
    (context) => {
      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 启动前摇动画`);
      return { startupAnimationStarted: true };
    },
  ),

  启动蓄力动画: defineStage(
    z.object({}),
    z.object({ chargingAnimationStarted: z.boolean() }),
    (context) => {
      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 启动蓄力动画`)
      return { chargingAnimationStarted: true };
    },
  ),

  启动咏唱动画: defineStage(
    z.object({}),
    z.object({ chantingAnimationStarted: z.boolean() }),
    (context) => {
      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 启动咏唱动画`);
      return { chantingAnimationStarted: true };
    },
  ),

  启动发动动画: defineStage(
    z.object({}),
    z.object({ actionAnimationStarted: z.boolean() }),
    (context) => {
      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 启动发动动画`);
      return { actionAnimationStarted: true };
    },
  ),

  调度前摇结束事件: defineStage(
    z.object({}),
    z.object({ startupEventScheduled: z.boolean() }),
    (context) => {
      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 调度前摇结束事件`)
      const frames = Math.max(1, Math.ceil(context.currentSkillStartupFrames ?? 0));
      scheduleFsmEvent(context, frames, "收到前摇结束通知", "event.startup.schedule");
      return { startupEventScheduled: true };
    },
  ),

  调度蓄力结束事件: defineStage(
    z.object({}),
    z.object({ chargingEventScheduled: z.boolean() }),
    (context) => {
      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 调度蓄力结束事件`)
      const frames = Math.max(1, Math.ceil(context.currentSkillChargingFrames ?? 0));
      scheduleFsmEvent(context, frames, "收到蓄力结束通知", "event.charging.schedule");
      return { chargingEventScheduled: true };
    },
  ),

  调度咏唱结束事件: defineStage(
    z.object({}),
    z.object({ chantingEventScheduled: z.boolean() }),
    (context) => {
      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 调度咏唱结束事件`)
      const frames = Math.max(1, Math.ceil(context.currentSkillChantingFrames ?? 0));
      scheduleFsmEvent(context, frames, "收到咏唱结束通知", "event.chanting.schedule");
      return { chantingEventScheduled: true };
    },
  ),

  调度发动结束事件: defineStage(
    z.object({}),
    z.object({ actionEventScheduled: z.boolean() }),
    (context) => {
      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 调度发动结束事件`)
      const frames = Math.max(1, Math.ceil(context.currentSkillActionFrames ?? 0));
      scheduleFsmEvent(context, frames, "收到发动结束通知", "event.action.schedule");
      return { actionEventScheduled: true };
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
  "skill.effect.apply": ["技能效果应用"],

  // ============ Buff 相关管线 ============
  "buff.add": ["添加Buff"],
  "buff.remove": ["移除Buff"],
  "buff.check": ["检查Buff"],

  // ============ 战斗相关管线 ============
  "combat.hit.calculate": [],
  "combat.control.calculate": [],
  "combat.damage.calculate": [],

  // ============ 动画和状态管理（无阶段，纯副作用）============
  "animation.idle.start": [],
  "animation.move.start": [],
  "animation.startup.start": ["启动前摇动画"],
  "animation.charging.start": ["启动蓄力动画"],
  "animation.chanting.start": ["启动咏唱动画"],
  "animation.action.start": ["启动发动动画"],
  "animation.controlled.start": [],

  // ============ 事件和通知管理 ============
  "event.warning.show": [],
  "event.warning.schedule": [],
  "event.startup.schedule": ["调度前摇结束事件"],
  "event.charging.schedule": ["调度蓄力结束事件"],
  "event.chanting.schedule": ["调度咏唱结束事件"],
  "event.action.schedule": ["调度发动结束事件"],
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
