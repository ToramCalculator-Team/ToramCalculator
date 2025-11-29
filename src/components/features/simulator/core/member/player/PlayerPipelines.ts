import { z, ZodType } from "zod/v4";
import { createId } from "@paralleldrive/cuid2";
import { PlayerStateContext } from "./PlayerStateMachine";
import { PipeLineDef, StagePool, defineStage } from "../../pipeline/PipelineStageType";
import { ModifierType } from "../../dataSys/StatContainer";


const logLv = 0; // 0: 不输出日志, 1: 输出关键日志, 2: 输出所有日志

// 阈值描述函数
const maxMin = (min: number, value: number, max: number) => {
  return Math.max(min, Math.min(value, max));
}

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

const sendRenderCommand = (
  context: PlayerStateContext,
  actionName: string,
  params?: Record<string, unknown>,
) => {
  if (!context.engine.postRenderMessage) {
    console.warn(`⚠️ [${context.name}] 无法获取渲染消息接口，无法发送渲染指令: ${actionName}`);
    return;
  }
  const now = Date.now();
  const renderCmd = {
    type: "render:cmd" as const,
    cmd: {
      type: "action" as const,
      entityId: context.id,
      name: actionName,
      seq: now,
      ts: now,
      params,
    },
  };
  context.engine.postRenderMessage(renderCmd);
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
        logLv >= 1 && console.log(`👤 [${context.name}][Pip] 添加Buff`);

      const buff: any = {
        id: input.buffId,
        name: input.buffName,
        duration: input.duration,
        startTime: Date.now(),
        source: `skill.${context.currentSkill?.id || "unknown"}`,
        effects: input.effects || [],
        variables: {
          ...(input.variables || {}),
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
      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 移除Buff`);

      const chargeCounter = context.buffManager.getVariable(input.buffId, "chargeCounter");
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
      const chargeCounter = buffExists ? context.buffManager.getVariable(input.buffId, "chargeCounter") : undefined;
      return { buffExists, chargeCounter };
    },
  ),
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
      sendRenderCommand(context, "startup");
      return { startupAnimationStarted: true };
    },
  ),

  启动蓄力动画: defineStage(
    z.object({}),
    z.object({ chargingAnimationStarted: z.boolean() }),
    (context) => {
      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 启动蓄力动画`)
      sendRenderCommand(context, "charging");
      return { chargingAnimationStarted: true };
    },
  ),

  启动咏唱动画: defineStage(
    z.object({}),
    z.object({ chantingAnimationStarted: z.boolean() }),
    (context) => {
      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 启动咏唱动画`);
      sendRenderCommand(context, "chanting");
      return { chantingAnimationStarted: true };
    },
  ),

  启动发动动画: defineStage(
    z.object({}),
    z.object({ actionAnimationStarted: z.boolean() }),
    (context) => {
      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 启动发动动画`);
      sendRenderCommand(context, "action");
      return { actionAnimationStarted: true };
    },
  ),

  调度前摇结束事件: defineStage(
    z.object({}),
    z.object({ startupEventScheduled: z.boolean() }),
    (context) => {
      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 调度前摇结束事件`)
      scheduleFsmEvent(context, context.currentSkillStartupFrames, "收到前摇结束通知", "event.startup.schedule");
      return { startupEventScheduled: true };
    },
  ),

  调度蓄力结束事件: defineStage(
    z.object({}),
    z.object({ chargingEventScheduled: z.boolean() }),
    (context) => {
      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 调度蓄力结束事件`)
      scheduleFsmEvent(context, context.currentSkillChargingFrames, "收到蓄力结束通知", "event.charging.schedule");
      return { chargingEventScheduled: true };
    },
  ),

  调度咏唱结束事件: defineStage(
    z.object({}),
    z.object({ chantingEventScheduled: z.boolean() }),
    (context) => {
      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 调度咏唱结束事件`)
      scheduleFsmEvent(context, context.currentSkillChantingFrames, "收到咏唱结束通知", "event.chanting.schedule");
      return { chantingEventScheduled: true };
    },
  ),

  调度发动结束事件: defineStage(
    z.object({}),
    z.object({ actionEventScheduled: z.boolean() }),
    (context) => {
      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 调度发动结束事件`)
      scheduleFsmEvent(context, context.currentSkillActionFrames, "收到发动结束通知", "event.action.schedule");
      return { actionEventScheduled: true };
    },
  ),

  // ============ 伤害相关阶段（施法者侧）============
  构造伤害请求: defineStage(
    z.object({
      damageFormula: z.string(),
      extraVars: z.record(z.string(), z.any()).optional(),
      targetId: z.string().optional(),
    }),
    z.object({
      damageRequest: z.object({
        sourceId: z.string(),
        targetId: z.string(),
        skillId: z.string(),
        damageFormula: z.string(),
        extraVars: z.record(z.string(), z.any()).optional(),
        sourceSnapshot: z.any().optional(),
      }),
    }),
    (context, input) => {
      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 构造伤害请求`);
      
      const sourceId = context.id;
      const targetId = input.targetId || context.targetId;
      if (!targetId) {
        throw new Error(`🎮 [${context.name}] 当前没有目标，无法构造伤害请求`);
      }

      const skillId = context.currentSkill?.id ?? "unknown_skill";

      // 获取施法者快照（可选，用于调试或后续扩展）
      const sourceSnapshot = context.engine.getMemberData(sourceId);

      const damageRequest = {
        sourceId,
        targetId,
        skillId,
        damageFormula: input.damageFormula,
        extraVars: input.extraVars,
        sourceSnapshot,
      };

      return { damageRequest };
    },
  ),

  发送伤害请求事件: defineStage(
    z.object({
      damageRequest: z.object({
        sourceId: z.string(),
        targetId: z.string(),
        skillId: z.string(),
        damageFormula: z.string(),
        extraVars: z.record(z.string(), z.any()).optional(),
        sourceSnapshot: z.any().optional(),
      }),
    }),
    z.object({ attackEventSent: z.boolean() }),
    (context, input) => {
      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 发送攻击事件给目标`);

      const { damageRequest } = input;
      const targetMember = context.engine.getMember(damageRequest.targetId);
      if (!targetMember) {
        console.warn(`⚠️ [${context.name}] 目标成员不存在，无法发送攻击事件: ${damageRequest.targetId}`);
        return { attackEventSent: false };
      }

      // 直接向目标成员的状态机发送“受到攻击”事件
      targetMember.actor.send({
        type: "受到攻击",
        data: {
          origin: damageRequest.sourceId,
          skillId: damageRequest.skillId,
          damageRequest,
        },
      });

      return { attackEventSent: true };
    },
  ),

  // ============ 命中相关阶段（施法者侧）============
  获取命中值: defineStage(
    z.object({}),
    z.object({ accuracyValue: z.number() }),
    (context, input) => {
      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 获取命中值`);
      const accuracyValue = context.statContainer.getValue("accuracy");
      return { accuracyValue };
    },
  ),

  // ============ 伤害相关阶段（受击者侧）============
  获取回避值: defineStage(
    z.object({}),
    z.object({ avoidValue: z.number() }),
    (context, input) => {
      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 获取回避值`);
      const avoidValue = context.statContainer.getValue("avoid");
      return { avoidValue };
    },
  ),

  获取格挡率: defineStage(
    z.object({}),
    z.object({ guardRate: z.number() }),
    (context, input) => {
      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 获取格挡率`);
      const guardRate = context.statContainer.getValue("guardRate");
      return { guardRate };
    },
  ),

  获取闪躲率: defineStage(
    z.object({}),
    z.object({ dodgeRate: z.number() }),
    (context, input) => {
      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 获取闪躲率`);
      const dodgeRate = context.statContainer.getValue("dodgeRate");
      return { dodgeRate };
    },
  ),

  闪躲判定: defineStage(
    z.object({}),
    z.object({ dodgeResult: z.boolean() }),
    (context, input) => {
      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 闪躲判定`);
      const dodgeRate = context.statContainer.getValue("dodgeRate");
      const dodgeResult = dodgeRate > (Math.random() * 100);
      return { dodgeResult };
    },
  ),

  计算命中判定: defineStage(
    z.object({
      accuracyValue: z.number(),
      avoidValue: z.number(),
    }),
    z.object({ hitResult: z.boolean() }),
    (context, input) => {
      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 计算命中判定`);
      const hitRate = maxMin(0, 100 - ((input.avoidValue - input.accuracyValue) / 3), 100);
      const hitResult = hitRate > (Math.random() * 100);
      return { hitResult };
    },
  ),

  格挡判定: defineStage(
    z.object({}),
    z.object({ guardResult: z.boolean() }),
    (context, input) => {
      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 格挡判定`);
      const guardRate = context.statContainer.getValue("guardRate");
      const guardResult = guardRate > (Math.random() * 100);
      return { guardResult };
    },
  ),

  解析伤害请求: defineStage(
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
      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 解析伤害请求`);
      
      const damageRequest = (context as any).currentDamageRequest;
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

  执行伤害表达式: defineStage(
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
      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 执行伤害表达式`);
      
      const { damageExpression, damageExpressionContext } = input;

      // 构造表达式执行上下文
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

  应用伤害结果: defineStage(
    z.object({ damageValue: z.number() }),
    z.object({
      finalDamage: z.number(),
      targetHpAfter: z.number().optional(),
    }),
    (context, input) => {
      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 应用伤害结果`);
      
      const { damageValue } = input;
      const finalDamage = Math.max(0, Math.floor(damageValue));

      // 获取当前HP并扣除伤害
      const currentHp = context.statContainer.getValue("hp.current");
      const newHp = Math.max(0, currentHp - finalDamage);
      
      // 更新HP（使用 addModifier 或直接 setValue，根据你的 StatContainer 实现）
      context.statContainer.addModifier("hp.current", ModifierType.STATIC_FIXED, -finalDamage, {
        id: `damage_${context.currentFrame}_${createId()}`,
        name: "damage",
        type: "system",
      });

      logLv >= 1 && console.log(`💔 [${context.name}] 受到伤害: ${finalDamage}, HP: ${currentHp} -> ${newHp}`);

      // 如果HP归零，可以在这里调度死亡事件（后续扩展）
      // if (newHp <= 0) {
      //   scheduleFsmEvent(context, 0, "死亡", "combat.damage");
      // }

      return { finalDamage, targetHpAfter: newHp };
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
  "combat.damage.calculate": [
    "解析伤害请求",
    "执行伤害表达式",
    "应用伤害结果",
  ],
  "combat.damage.request": [
    "构造伤害请求",
    "发送伤害请求事件",
  ],

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

