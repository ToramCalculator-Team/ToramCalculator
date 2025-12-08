import { z } from "zod/v4";
import { createId } from "@paralleldrive/cuid2";
import { PlayerStateContext } from "./PlayerStateMachine";
import { PipeLineDef, StagePool, defineStage } from "../../runtime/Pipeline/PipelineStageType";
import { ModifierType } from "../../runtime/StatContainer/StatContainer";
import { CommonStages, CommonPipelineDef } from "../../runtime/Pipeline/CommonPipelines";
import { BuffInstance } from "../../runtime/Buff/BuffManager";

const logLv = 1; // 0: 不输出日志, 1: 输出关键日志, 2: 输出所有日志

// 阈值描述函数
const maxMin = (min: number, value: number, max: number) => {
  return Math.max(min, Math.min(value, max));
};

const schedulePipeline = (
  context: PlayerStateContext,
  delayFrames: number,
  pipelineName: keyof PlayerPipelineDef,
  params?: Record<string, unknown>,
  source?: string,
) => {
  const engineQueue = context.engine.getEventQueue?.();
  if (!engineQueue) {
    console.warn(`⚠️ [${context.name}] 无法获取事件队列，无法调度管线 ${pipelineName}`);
    return;
  }
  const executeFrame = context.currentFrame + Math.max(1, delayFrames);
  engineQueue.insert({
    id: createId(),
    type: "member_pipeline_event",
    executeFrame,
    insertFrame: context.currentFrame,
    processed: false,
    payload: {
      targetMemberId: context.id,
      pipelineName,
      params,
      skillId: context.currentSkill?.id ?? "unknown_skill",
      source: source ?? "schedulePipeline",
    },
  });
};

const sendRenderCommand = (context: PlayerStateContext, actionName: string, params?: Record<string, unknown>) => {
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
  ...CommonStages,
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

      const buff: BuffInstance = {
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
  技能HP消耗: defineStage(z.object({}), z.object({ skillHpCostResult: z.number() }), (context, input) => {
    logLv >= 1 && console.log(`👤 [${context.name}][Pip] 技能HP消耗计算`);
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
  }),

  技能MP消耗: defineStage(z.object({}), z.object({ skillMpCostResult: z.number() }), (context, input) => {
    logLv >= 1 && console.log(`👤 [${context.name}][Pip] 技能MP消耗计算`);
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
  }),

  技能消耗扣除: defineStage(
    z.object({
      mpCost: z.number(),
      hpCost: z.number(),
    }),
    z.object({}),
    (context, input) => {
      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 技能消耗扣除`);
      if (input.mpCost > 0) {
        context.statContainer.addModifier("mp.current", ModifierType.STATIC_FIXED, -input.mpCost, {
          id: `skill_cost_${context.currentSkill?.template?.name ?? "unknown"}_${context.currentFrame}`,
          name: "skill_mp_cost",
          type: "skill",
        });
      }
      if (input.hpCost > 0) {
        context.statContainer.addModifier("hp.current", ModifierType.STATIC_FIXED, -input.hpCost, {
          id: `skill_cost_${context.currentSkill?.template?.name ?? "unknown"}_${context.currentFrame}`,
          name: "skill_hp_cost",
          type: "skill",
        });
      }
      return {};
    },
  ),

  仇恨值计算: defineStage(
    z.object({ skillMpCostResult: z.number() }),
    z.object({ aggroResult: z.number() }),
    (context, input) => {
      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 仇恨值计算`);
      const aggro = input.skillMpCostResult * context.statContainer.getValue("aggro.rate");
      return { aggroResult: aggro };
    },
  ),

  技能固定动作时长计算: defineStage(
    z.object({}),
    z.object({ skillFixedMotionResult: z.number() }),
    (context, input) => {
      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 技能固定动作时长计算`);
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
      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 技能可变动作时长计算`);
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

  行动速度计算: defineStage(z.object({}), z.object({ mspdResult: z.number() }), (context, input) => {
    logLv >= 1 && console.log(`👤 [${context.name}][Pip] 行动速度计算`);
    const mspd = context.statContainer.getValue("mspd");
    return {
      mspdResult: mspd,
    };
  }),

  前摇比例计算: defineStage(z.object({}), z.object({ startupProportion: z.number() }), (context, input) => {
    logLv >= 1 && console.log(`👤 [${context.name}][Pip] 前摇比例计算`);
    const startupProportion = 0.5;
    if (!startupProportion) {
      throw new Error(`🎮 [${context.name}] 的当前技能前摇比例数据不存在`);
    }
    return {
      startupProportion: startupProportion,
    };
  }),

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
      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 前摇帧数计算`);
      const startupFrames =
        (input.skillFixedMotionResult + input.skillModifiedMotionResult * input.mspdResult) * input.startupProportion;
      return {
        startupFramesResult: startupFrames,
        currentSkillStartupFrames: startupFrames,
      };
    },
  ),

  技能效果应用: defineStage(z.object({}), z.object({ skillEffectApplied: z.boolean() }), (context, input) => {
    logLv >= 1 && console.log(`👤 [${context.name}][Pip] 技能效果应用`);
    return {
      skillEffectApplied: true,
    };
  }),

  启动前摇动画: defineStage(z.object({}), z.object({ startupAnimationStarted: z.boolean() }), (context) => {
    logLv >= 1 && console.log(`👤 [${context.name}][Pip] 启动前摇动画`);
    sendRenderCommand(context, "startup");
    return { startupAnimationStarted: true };
  }),

  启动蓄力动画: defineStage(z.object({}), z.object({ chargingAnimationStarted: z.boolean() }), (context) => {
    logLv >= 1 && console.log(`👤 [${context.name}][Pip] 启动蓄力动画`);
    sendRenderCommand(context, "charging");
    return { chargingAnimationStarted: true };
  }),

  启动咏唱动画: defineStage(z.object({}), z.object({ chantingAnimationStarted: z.boolean() }), (context) => {
    logLv >= 1 && console.log(`👤 [${context.name}][Pip] 启动咏唱动画`);
    sendRenderCommand(context, "chanting");
    return { chantingAnimationStarted: true };
  }),

  启动发动动画: defineStage(z.object({}), z.object({ actionAnimationStarted: z.boolean() }), (context) => {
    logLv >= 1 && console.log(`👤 [${context.name}][Pip] 启动发动动画`);
    sendRenderCommand(context, "action");
    return { actionAnimationStarted: true };
  }),

  调度前摇结束事件: defineStage(z.object({}), z.object({ startupEventScheduled: z.boolean() }), (context) => {
    logLv >= 1 && console.log(`👤 [${context.name}][Pip] 调度前摇结束事件`);
    schedulePipeline(
      context,
      context.currentSkillStartupFrames,
      "前摇",
      undefined,
      context.currentSkill?.template?.name ?? "unknown",
    );
    return { startupEventScheduled: true };
  }),

  调度蓄力结束事件: defineStage(z.object({}), z.object({ chargingEventScheduled: z.boolean() }), (context) => {
    logLv >= 1 && console.log(`👤 [${context.name}][Pip] 调度蓄力结束事件`);
    schedulePipeline(
      context,
      context.currentSkillChargingFrames,
      "蓄力",
      undefined,
      context.currentSkill?.template?.name ?? "unknown",
    );
    return { chargingEventScheduled: true };
  }),

  调度咏唱结束事件: defineStage(z.object({}), z.object({ chantingEventScheduled: z.boolean() }), (context) => {
    logLv >= 1 && console.log(`👤 [${context.name}][Pip] 调度咏唱结束事件`);
    schedulePipeline(
      context,
      context.currentSkillChantingFrames,
      "咏唱",
      undefined,
      context.currentSkill?.template?.name ?? "unknown",
    );
    return { chantingEventScheduled: true };
  }),

  调度发动结束事件: defineStage(z.object({}), z.object({ actionEventScheduled: z.boolean() }), (context) => {
    logLv >= 1 && console.log(`👤 [${context.name}][Pip] 调度发动结束事件`);
    schedulePipeline(
      context,
      context.currentSkillActionFrames,
      "发动",
      undefined,
      context.currentSkill?.template?.name ?? "unknown",
    );
    return { actionEventScheduled: true };
  }),

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
        damageType: z.enum(["physical", "magic"]),
        canBeDodged: z.boolean(),
        canBeGuarded: z.boolean(),
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

      // TODO: 根据技能/武器类型区分物理与魔法，这里暂时默认物理伤害
      const damageType = "physical" as const;
      const canBeDodged = damageType === "physical";
      const canBeGuarded = true;

      const damageRequest = {
        sourceId,
        targetId,
        skillId,
        damageType,
        canBeDodged,
        canBeGuarded,
        damageFormula: input.damageFormula,
        extraVars: input.extraVars,
        sourceSnapshot,
      };
      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 构造伤害请求:`, damageRequest);
      return { damageRequest };
    },
  ),

  发送伤害请求事件: defineStage(
    z.object({
      sourceId: z.string(),
      targetId: z.string(),
      skillId: z.string(),
      damageType: z.enum(["physical", "magic"]),
      canBeDodged: z.boolean(),
      canBeGuarded: z.boolean(),
      damageFormula: z.string(),
      extraVars: z.record(z.string(), z.any()).optional(),
      sourceSnapshot: z.any().optional(),
    }),
    z.object({ attackEventSent: z.boolean() }),
    (context, input) => {
      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 发送攻击事件给目标`);

      const memberManager = context.engine.getMemberManager();
      const targetMember = memberManager.getMember(input.targetId);

      if (!targetMember) {
        console.warn(`⚠️ [${context.name}][Pip] 找不到目标成员 ${input.targetId}，无法发送伤害事件`);
        return { attackEventSent: false };
      }

      // 即时事件：直接发送到目标 Actor，而不是通过 EventQueue / dispatchMemberEvent
      targetMember.actor.send({
        type: "受到攻击",
        data: {
          origin: context.id,
          skillId: input.skillId,
          damageRequest: input,
        },
      });

      return { attackEventSent: true };
    },
  ),
} as const satisfies StagePool<PlayerStateContext>;

export type PlayerStagePool = typeof PlayerPipelineStages;

/**
 * 管线定义
 * 每个管线包含一系列阶段名称
 */
export const PlayerPipelineDef = {
  ...CommonPipelineDef,
  前摇: ["技能消耗扣除", "启动前摇动画"],
  蓄力: ["启动蓄力动画"],
  咏唱: ["启动咏唱动画"],
  发动: ["启动发动动画"],
} as const satisfies PipeLineDef<PlayerStagePool>;

export type PlayerPipelineDef = typeof PlayerPipelineDef;
