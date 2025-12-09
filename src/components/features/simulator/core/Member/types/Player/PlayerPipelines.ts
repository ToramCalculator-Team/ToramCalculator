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
 * 4. 可被状态机和技能逻辑共享调用
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
    z.object({}),
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
      return {};
    },
  ),

  移除Buff: defineStage(
    z.object({
      buffId: z.string(),
    }),
    z.object({}),
    (context, input) => {
      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 移除Buff`);
      context.buffManager.removeBuff(input.buffId);
      return {};
    },
  ),

  检查Buff是否存在: defineStage(
    z.object({
      buffId: z.string(),
    }),
    z.object({ buffExists: z.boolean() }),
    (context, input) => {
      const buffExists = context.buffManager.hasBuff(input.buffId);
      return { buffExists };
    },
  ),

  获取buff计数器值: defineStage(
    z.object({
      buffId: z.string(),
    }),
    z.object({ chargeCounter: z.number() }),
    (context, input) => {
      const chargeCounter = context.buffManager.getVariable(input.buffId, "chargeCounter");
      return { chargeCounter };
    },
  ),

  技能HP消耗计算: defineStage(z.object({}), z.object({ skillHpCost: z.number() }), (context, input) => {
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
    return { skillHpCost: hpCost };
  }),

  技能MP消耗计算: defineStage(z.object({}), z.object({ skillMpCost: z.number() }), (context, input) => {
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
    return { skillMpCost: mpCost };
  }),

  技能消耗扣除: defineStage(
    z.object({
      skillMpCost: z.number(),
      skillHpCost: z.number(),
    }),
    z.object({}),
    (context, input) => {
      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 技能消耗扣除`);
      if (input.skillMpCost > 0) {
        context.statContainer.addModifier("mp.current", ModifierType.STATIC_FIXED, -input.skillMpCost, {
          id: `skill_cost_${context.currentSkill?.template?.name ?? "unknown"}_${context.currentFrame}`,
          name: "skill_mp_cost",
          type: "skill",
        });
      }
      if (input.skillHpCost > 0) {
        context.statContainer.addModifier("hp.current", ModifierType.STATIC_FIXED, -input.skillHpCost, {
          id: `skill_cost_${context.currentSkill?.template?.name ?? "unknown"}_${context.currentFrame}`,
          name: "skill_hp_cost",
          type: "skill",
        });
      }
      return {};
    },
  ),

  前摇帧数计算: defineStage(
    z.object({}),
    z.object({
      startupFrames: z.number(),
    }),
    (context, input) => {
      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 前摇帧数计算`);
      const fixedMotionExpression = context.currentSkillEffect?.motionFixed;
      const modifiedMotionExpression = context.currentSkillEffect?.motionModified;
      const skill = context.currentSkill;
      if (!skill || !fixedMotionExpression || !modifiedMotionExpression) {
        throw new Error(`🎮 [${context.name}] 的当前技能不存在`);
      }
      const fixedMotion = context.engine.evaluateExpression(fixedMotionExpression, {
        currentFrame: context.currentFrame,
        casterId: context.id,
        skillLv: skill.lv ?? 0,
      });
      const modifiedMotion = context.engine.evaluateExpression(modifiedMotionExpression, {
        currentFrame: context.currentFrame,
        casterId: context.id,
        skillLv: skill.lv ?? 0,
      });
      const startupFrames = (fixedMotion + modifiedMotion * context.statContainer.getValue("mspd")) * 0.5;
      return {
        startupFrames,
      };
    },
  ),

  启动前摇动画: defineStage(z.object({}), z.object({}), (context) => {
    logLv >= 1 && console.log(`👤 [${context.name}][Pip] 启动前摇动画`);
    sendRenderCommand(context, "startup");
    return {};
  }),

  调度蓄力管线: defineStage(z.object({ startupFrames: z.number() }), z.object({}), (context, input) => {
    logLv >= 1 && console.log(`👤 [${context.name}][Pip] 调度蓄力管线`);
    schedulePipeline(context, input.startupFrames, "蓄力");
    return {};
  }),

  蓄力帧数计算: defineStage(
    z.object({ }),
    z.object({ chargeFrames: z.number() }),
    (context, input) => {
      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 蓄力帧数计算`);
      const mspd = context.statContainer.getValue("mspd");
      if (!mspd) {
        throw new Error(`🎮 [${context.name}] 的行动速度不存在`);
      }
      const reservoirFixedExpression = context.currentSkillEffect?.reservoirFixed;
      const reservoirModifiedExpression = context.currentSkillEffect?.reservoirModified;
      if (!reservoirFixedExpression || !reservoirModifiedExpression) {
        throw new Error(`🎮 [${context.name}] 的当前技能不存在`);
      }
      const reservoirFixed = context.engine.evaluateExpression(reservoirFixedExpression, {
        currentFrame: context.currentFrame,
        casterId: context.id,
      });
      const reservoirModified = context.engine.evaluateExpression(reservoirModifiedExpression, {
        currentFrame: context.currentFrame,
        casterId: context.id,
      });
      const chargeFrames = reservoirFixed + reservoirModified * mspd;
      return { chargeFrames: chargeFrames };
    },
  ),

  启动蓄力动画: defineStage(z.object({}), z.object({}), (context) => {
    logLv >= 1 && console.log(`👤 [${context.name}][Pip] 启动蓄力动画`);
    sendRenderCommand(context, "charging");
    return {};
  }),

  调度咏唱管线: defineStage(z.object({ chargeFrames: z.number() }), z.object({}), (context, input) => {
    logLv >= 1 && console.log(`👤 [${context.name}][Pip] 调度咏唱管线`);
    schedulePipeline(context, input.chargeFrames, "咏唱");
    return {};
  }),

  咏唱帧数计算: defineStage(
    z.object({ }),
    z.object({ chantingFrames: z.number() }),
    (context, input) => {
      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 咏唱帧数计算`);
      const cspd = context.statContainer.getValue("cspd");
      if (!cspd) {
        throw new Error(`🎮 [${context.name}] 的咏唱速度不存在`);
      }
      const chantingFixedExpression = context.currentSkillEffect?.chantingFixed;
      const chantingModifiedExpression = context.currentSkillEffect?.chantingModified;
      if (!chantingFixedExpression || !chantingModifiedExpression) {
        throw new Error(`🎮 [${context.name}] 的当前技能不存在`);
      }
      const chantingFixed = context.engine.evaluateExpression(chantingFixedExpression, {
        currentFrame: context.currentFrame,
        casterId: context.id,
      });
      const chantingModified = context.engine.evaluateExpression(chantingModifiedExpression, {
        currentFrame: context.currentFrame,
        casterId: context.id,
      });
      const chantingFrames = chantingFixed + chantingModified * cspd;
      return { chantingFrames: chantingFrames };
    },
  ),

  启动咏唱动画: defineStage(z.object({}), z.object({}), (context) => {
    logLv >= 1 && console.log(`👤 [${context.name}][Pip] 启动咏唱动画`);
    sendRenderCommand(context, "chanting");
    return {};
  }),

  调度发动管线: defineStage(z.object({ chantingFrames: z.number() }), z.object({}), (context, input) => {
    logLv >= 1 && console.log(`👤 [${context.name}][Pip] 调度发动管线`);
    schedulePipeline(context, input.chantingFrames, "发动");
    return {};
  }),

  启动发动动画: defineStage(z.object({}), z.object({}), (context) => {
    logLv >= 1 && console.log(`👤 [${context.name}][Pip] 启动发动动画`);
    sendRenderCommand(context, "action");
    return {};
  }),

  // ============ 伤害相关阶段（施法者侧）============
  对目标造成伤害: defineStage(
    z.object({
      damageFormula: z.string(),
      extraVars: z.record(z.string(), z.any()).optional(),
    }),
    z.object({}),
    (context, input) => {
      logLv >= 1 && console.log(`👤 [${context.name}][Pip] 对目标造成伤害`);

      const sourceId = context.id;
      const targetId = context.targetId;
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

      const memberManager = context.engine.getMemberManager();
      const targetMember = memberManager.getMember(targetId);

      if (!targetMember) {
        console.warn(`⚠️ [${context.name}][Pip] 找不到目标成员 ${targetId}，无法发送伤害事件`);
        return {};
      }

      // 即时事件：直接发送到目标 Actor，而不是通过 EventQueue / dispatchMemberEvent
      targetMember.actor.send({
        type: "受到攻击",
        data: {
          origin: sourceId,
          skillId,
          damageRequest,
        },
      });

      return {};
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
  前摇: ["技能HP消耗计算", "技能MP消耗计算", "技能消耗扣除", "前摇帧数计算", "启动前摇动画", "调度蓄力管线"],
  蓄力: ["蓄力帧数计算", "启动蓄力动画", "调度咏唱管线"],
  咏唱: ["咏唱帧数计算", "启动咏唱动画", "调度发动管线"],
  发动: ["启动发动动画", "对目标造成伤害"],
} as const satisfies PipeLineDef<PlayerStagePool>;

export type PlayerPipelineDef = typeof PlayerPipelineDef;
