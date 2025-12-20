import { z } from "zod/v4";
import { createId } from "@paralleldrive/cuid2";
import { defineAction, PipelineDef, ActionPool } from "../../runtime/Action/type";
import { ModifierType, StatContainer } from "../../runtime/StatContainer/StatContainer";
import { CommonActions, logLv } from "../../runtime/Action/CommonActions";
import type { RuntimeContext } from "../../runtime/Action/ActionContext";
import type { SkillEffectWithRelations } from "@db/generated/repositories/skill_effect";
import type { CharacterSkillWithRelations } from "@db/generated/repositories/character_skill";
import type { CharacterWithRelations } from "@db/generated/repositories/character";
import { Player, PlayerAttrType } from "./Player";
import { PipelineManager } from "../../runtime/Action/PipelineManager";
import { MemberWithRelations } from "@db/generated/repositories/member";
import GameEngine from "../../../GameEngine";

/**
 * PlayerRuntimeContext
 * Player 专用的运行时上下文，扩展 RuntimeContext
 */
export interface PlayerRuntimeContext extends RuntimeContext {
  /** 技能列表 */
  skillList: CharacterSkillWithRelations[];
  /** 技能冷却 */
  skillCooldowns: number[];
  /** 正在施放的技能序号 */
  currentSkillIndex: number;
  /** 技能开始帧 */
  skillStartFrame: number;
  /** 技能结束帧 */
  skillEndFrame: number;
  /** 前摇长度帧 */
  currentSkillStartupFrames: number;
  /** 蓄力长度帧 */
  currentSkillChargingFrames: number;
  /** 咏唱长度帧 */
  currentSkillChantingFrames: number;
  /** 发动长度帧 */
  currentSkillActionFrames: number;
  /** 当前技能行为树实例ID */
  currentSkillTreeId: string;
  /** 机体配置信息 */
  character: CharacterWithRelations;

  /**
   * 预编译的技能效果逻辑缓存（effectId -> string）
   * - 用于把 workspaceJson 的编译从“施放时”前移到“角色创建时”
   */
  compiledSkillEffectLogicByEffectId?: Record<string, string>;
}

// 阈值描述函数
const maxMin = (min: number, value: number, max: number) => {
  return Math.max(min, Math.min(value, max));
};

const getPathValue = (obj: any, path: string | undefined) => {
  if (!obj || !path) return undefined;
  return path.split(".").reduce((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return (acc as any)[key];
    }
    return undefined;
  }, obj);
};

const setPathValue = (obj: any, path: string, value: any) => {
  if (!path) return obj;
  const parts = path.split(".");
  let cursor = obj as any;
  for (let i = 0; i < parts.length; i++) {
    const key = parts[i];
    if (i === parts.length - 1) {
      cursor[key] = value;
      return obj;
    }
    if (!cursor[key] || typeof cursor[key] !== "object") {
      cursor[key] = {};
    }
    cursor = cursor[key];
  }
  return obj;
};

// 注意：不再支持通过 EventQueue 延迟"执行动作组"。
// 跨帧逻辑应由行为树（Wait/WaitForEvent）或引擎的 dispatchMemberEvent（member_fsm_event）完成。

const sendRenderCommand = (context: PlayerRuntimeContext, actionName: string, params?: Record<string, unknown>) => {
  if (!context.owner?.engine.postRenderMessage) {
    console.warn(`⚠️ [${context.owner?.name}] 无法获取渲染消息接口，无法发送渲染指令: ${actionName}`);
    return;
  }
  const now = Date.now();
  const renderCmd = {
    type: "render:cmd" as const,
    cmd: {
      type: "action" as const,
      entityId: context.owner?.id,
      name: actionName,
      seq: now,
      ts: now,
      params,
    },
  };
  context.owner?.engine.postRenderMessage(renderCmd);
};

/**
 * ==================== 玩家管线定义 ====================
 *
 * 设计理念：
 * 1. 管线定义独立于状态机
 * 2. 使用语义化的管线名称（点分命名）
 * 3. 管线只与数据结构（PlayerRuntimeContext）关联
 * 4. 可被状态机和技能逻辑共享调用
 */

/**
 * 玩家可用的管线阶段池
 */
export const PlayerActionPool = {
  ...CommonActions,

  addBuff: defineAction(
    z.object({
      id: z.string(),
      definition: z.string(),
    }),
    z.object({}),
    (context, input) => {
      logLv >= 1 && console.log(`👤 [${context.owner?.name}][Pip] 添加Buff`);
      context.owner?.btManager.registerBuffBt(input.id, input.definition);
      return {};
    },
  ),

  removeBuff: defineAction(
    z.object({
      id: z.string(),
    }),
    z.object({}),
    (context, input) => {
      logLv >= 1 && console.log(`👤 [${context.owner?.name}][Pip] 移除Buff`);
      context.owner?.btManager.unregisterBuffBt(input.id);
      return {};
    },
  ),

  checkBuffExists: defineAction(
    z.object({
      id: z.string(),
    }),
    z.object({ buffExists: z.boolean() }),
    (context, input) => {
      const buffExists = context.owner?.btManager.getBuffBt(input.id) !== undefined;
      return { buffExists };
    },
  ),

  // 应用数值表达式: defineAction(
  //   z.object({
  //     targetPath: z.string(),
  //     expression: z.string(),
  //     vars: z.record(z.string(), z.any()).optional(),
  //   }),
  //   z.object({ newValue: z.union([z.number(), z.boolean()]).optional() }),
  //   (context, input) => {
  //     const { targetPath, expression, vars } = input;
  //     // 特殊路径：buffVar.<buffId>.<varName> —— 直接读写 BuffManager.variables（UI 也从这里读）
  //     if (targetPath.startsWith("buffVar.")) {
  //       const [, buffId, varName] = targetPath.split(".");
  //       if (!buffId || !varName) {
  //         console.error(`❌ [${context.name}][Pip] 应用数值表达式失败: buffVar 路径不合法: ${targetPath}`);
  //         return { newValue: undefined };
  //       }
  //       const currentValue = context.buffManager.getVariable(buffId, varName, 0);
  //       try {
  //         const evalCtx = {
  //           currentFrame: context.currentFrame,
  //           casterId: context.id,
  //           x: currentValue,
  //           ctx: context,
  //           ...vars,
  //         };
  //         const newValue = context.engine.evaluateExpression(expression, evalCtx);
  //         context.buffManager.setVariable(buffId, varName, newValue);
  //         return { newValue };
  //       } catch (error) {
  //         console.error(`❌ [${context.name}][Pip] 应用数值表达式失败:`, error);
  //         return { newValue: currentValue };
  //       }
  //     }

  //     const currentValue = getPathValue(context, targetPath);
  //     try {
  //       const evalCtx = {
  //         currentFrame: context.currentFrame,
  //         casterId: context.id,
  //         x: currentValue,
  //         ctx: context,
  //         ...vars,
  //       };
  //       const newValue = context.engine.evaluateExpression(expression, evalCtx);
  //       setPathValue(context, targetPath, newValue);
  //       return { newValue };
  //     } catch (error) {
  //       console.error(`❌ [${context.name}][Pip] 应用数值表达式失败:`, error);
  //       return { newValue: currentValue };
  //     }
  //   },
  // ),

  // 技能HP消耗计算: defineAction(z.object({}), z.object({ skillHpCost: z.number() }), (context, input) => {
  //   logLv >= 1 && console.log(`👤 [${context.name}][Pip] 技能HP消耗计算`);
  //   const hpCostExpression = context.currentSkillEffect?.hpCost;
  //   if (!hpCostExpression) {
  //     throw new Error(`🎮 [${context.name}] 的当前技能效果不存在`);
  //   }
  //   const hpCost = context.engine.evaluateExpression(hpCostExpression, {
  //     currentFrame: context.currentFrame,
  //     casterId: context.id,
  //     skillLv: context.currentSkill?.lv ?? 0,
  //   });
  //   return { skillHpCost: hpCost };
  // }),

  // 技能MP消耗计算: defineAction(z.object({}), z.object({ skillMpCost: z.number() }), (context, input) => {
  //   logLv >= 1 && console.log(`👤 [${context.name}][Pip] 技能MP消耗计算`);
  //   const mpCostExpression = context.currentSkillEffect?.mpCost;
  //   if (!mpCostExpression) {
  //     throw new Error(`技能效果不存在`);
  //   }
  //   const mpCost = context.engine.evaluateExpression(mpCostExpression, {
  //     currentFrame: context.currentFrame,
  //     casterId: context.id,
  //     skillLv: context.currentSkill?.lv ?? 0,
  //   });
  //   return { skillMpCost: mpCost };
  // }),

  // 技能消耗扣除: defineAction(
  //   z.object({
  //     skillMpCost: z.number(),
  //     skillHpCost: z.number(),
  //   }),
  //   z.object({}),
  //   (context, input) => {
  //     logLv >= 1 && console.log(`👤 [${context.name}][Pip] 技能消耗扣除`);
  //     if (input.skillMpCost > 0) {
  //       context.statContainer.addModifier("mp.current", ModifierType.STATIC_FIXED, -input.skillMpCost, {
  //         id: `skill_cost_${context.currentSkill?.template?.name ?? "unknown"}_${context.currentFrame}`,
  //         name: "skill_mp_cost",
  //         type: "skill",
  //       });
  //     }
  //     if (input.skillHpCost > 0) {
  //       context.statContainer.addModifier("hp.current", ModifierType.STATIC_FIXED, -input.skillHpCost, {
  //         id: `skill_cost_${context.currentSkill?.template?.name ?? "unknown"}_${context.currentFrame}`,
  //         name: "skill_hp_cost",
  //         type: "skill",
  //       });
  //     }
  //     return {};
  //   },
  // ),

  // 前摇帧数计算: defineAction(
  //   z.object({}),
  //   z.object({
  //     currentSkillStartupFrames: z.number(),
  //   }),
  //   (context, input) => {
  //     logLv >= 1 && console.log(`👤 [${context.name}][Pip] 前摇帧数计算`);
  //     const fixedMotionExpression = context.currentSkillEffect?.motionFixed;
  //     const modifiedMotionExpression = context.currentSkillEffect?.motionModified;
  //     const skill = context.currentSkill;
  //     if (!skill || !fixedMotionExpression || !modifiedMotionExpression) {
  //       console.error(`🎮 [${context.name}] 的当前技能不存在`);
  //       throw new Error(`🎮 [${context.name}] 的当前技能不存在`);
  //     }
  //     const fixedMotion = context.engine.evaluateExpression(fixedMotionExpression, {
  //       currentFrame: context.currentFrame,
  //       casterId: context.id,
  //       skillLv: skill.lv ?? 0,
  //     });
  //     const modifiedMotion = context.engine.evaluateExpression(modifiedMotionExpression, {
  //       currentFrame: context.currentFrame,
  //       casterId: context.id,
  //       skillLv: skill.lv ?? 0,
  //     });
  //     const currentSkillStartupFrames = (fixedMotion + modifiedMotion * context.statContainer.getValue("mspd")) * 0.4;
  //     console.log(`👤 [${context.name}][Pip] 前摇帧数: ${currentSkillStartupFrames}`);
  //     return {
  //       currentSkillStartupFrames,
  //     };
  //   },
  // ),

  // 启动前摇动画: defineAction(z.object({}), z.object({}), (context) => {
  //   logLv >= 1 && console.log(`👤 [${context.name}][Pip] 启动前摇动画`);
  //   sendRenderCommand(context, "startup");
  //   return {};
  // }),

  // 调度前摇结束事件: defineAction(
  //   z.object({
  //     startupFrames: z.number().optional(),
  //   }),
  //   z.object({}),
  //   (context, input) => {
  //     const delay = Math.max(1, Math.round(input.startupFrames ?? (context as any).startupFrames ?? 0));
  //     context.engine.dispatchMemberEvent(
  //       context.id,
  //       "收到前摇结束通知",
  //       {},
  //       delay,
  //       context.currentSkill?.id ?? "unknown_skill",
  //       { source: "actionGroup.event.startup" },
  //     );
  //     return {};
  //   },
  // ),

  // 蓄力帧数计算: defineAction(z.object({}), z.object({ currentSkillChargingFrames: z.number() }), (context, input) => {
  //   logLv >= 1 && console.log(`👤 [${context.name}][Pip] 蓄力帧数计算`);
  //   const mspd = context.statContainer.getValue("mspd");
  //   const reservoirFixedExpression = context.currentSkillEffect?.reservoirFixed;
  //   const reservoirModifiedExpression = context.currentSkillEffect?.reservoirModified;
  //   if (!reservoirFixedExpression || !reservoirModifiedExpression) {
  //     console.error(`🎮 [${context.name}] 的当前技能不存在`);
  //     throw new Error(`🎮 [${context.name}] 的当前技能不存在`);
  //   }
  //   const reservoirFixed = context.engine.evaluateExpression(reservoirFixedExpression, {
  //     currentFrame: context.currentFrame,
  //     casterId: context.id,
  //   });
  //   const reservoirModified = context.engine.evaluateExpression(reservoirModifiedExpression, {
  //     currentFrame: context.currentFrame,
  //     casterId: context.id,
  //   });
  //   const currentSkillChargingFrames = reservoirFixed + reservoirModified * mspd;
  //   console.log(`👤 [${context.name}][Pip] 蓄力帧数: ${currentSkillChargingFrames}`);
  //   return { currentSkillChargingFrames };
  // }),

  // 启动蓄力动画: defineAction(z.object({}), z.object({}), (context) => {
  //   logLv >= 1 && console.log(`👤 [${context.name}][Pip] 启动蓄力动画`);
  //   sendRenderCommand(context, "charging");
  //   return {};
  // }),

  // 调度蓄力结束事件: defineAction(
  //   z.object({
  //     chargeFrames: z.number().optional(),
  //   }),
  //   z.object({}),
  //   (context, input) => {
  //     const delay = Math.max(1, Math.round(input.chargeFrames ?? (context as any).chargeFrames ?? 0));
  //     context.engine.dispatchMemberEvent(
  //       context.id,
  //       "收到蓄力结束通知",
  //       {},
  //       delay,
  //       context.currentSkill?.id ?? "unknown_skill",
  //       { source: "actionGroup.event.charging" },
  //     );
  //     return {};
  //   },
  // ),

  // 咏唱帧数计算: defineAction(z.object({}), z.object({ currentSkillChantingFrames: z.number() }), (context, input) => {
  //   logLv >= 1 && console.log(`👤 [${context.name}][Pip] 咏唱帧数计算`);
  //   const cspd = context.statContainer.getValue("cspd");
  //   if (!cspd) {
  //     throw new Error(`🎮 [${context.name}] 的咏唱速度不存在`);
  //   }
  //   const chantingFixedExpression = context.currentSkillEffect?.chantingFixed;
  //   const chantingModifiedExpression = context.currentSkillEffect?.chantingModified;
  //   if (!chantingFixedExpression || !chantingModifiedExpression) {
  //     console.error(`🎮 [${context.name}] 的当前技能不存在`);
  //     throw new Error(`🎮 [${context.name}] 的当前技能不存在`);
  //   }
  //   const chantingFixed = context.engine.evaluateExpression(chantingFixedExpression, {
  //     currentFrame: context.currentFrame,
  //     casterId: context.id,
  //   });
  //   const chantingModified = context.engine.evaluateExpression(chantingModifiedExpression, {
  //     currentFrame: context.currentFrame,
  //     casterId: context.id,
  //   });
  //   const currentSkillChantingFrames = chantingFixed + chantingModified * cspd;
  //   console.log(`👤 [${context.name}][Pip] 咏唱帧数: ${currentSkillChantingFrames}`);
  //   return { currentSkillChantingFrames };
  // }),

  // 启动咏唱动画: defineAction(z.object({}), z.object({}), (context) => {
  //   logLv >= 1 && console.log(`👤 [${context.name}][Pip] 启动咏唱动画`);
  //   sendRenderCommand(context, "chanting");
  //   return {};
  // }),

  // 调度咏唱结束事件: defineAction(
  //   z.object({
  //     chantingFrames: z.number().optional(),
  //   }),
  //   z.object({}),
  //   (context, input) => {
  //     const delay = Math.max(1, Math.round(input.chantingFrames ?? (context as any).chantingFrames ?? 0));
  //     context.engine.dispatchMemberEvent(
  //       context.id,
  //       "收到咏唱结束事件",
  //       {},
  //       delay,
  //       context.currentSkill?.id ?? "unknown_skill",
  //       { source: "actionGroup.event.chanting" },
  //     );
  //     return {};
  //   },
  // ),

  // 发动帧数计算: defineAction(z.object({}), z.object({ currentSkillActionFrames: z.number() }), (context, input) => {
  //   logLv >= 1 && console.log(`👤 [${context.name}][Pip] 发动帧数计算`);
  //   const fixedMotionExpression = context.currentSkillEffect?.motionFixed;
  //   const modifiedMotionExpression = context.currentSkillEffect?.motionModified;
  //   const skill = context.currentSkill;
  //   if (!skill || !fixedMotionExpression || !modifiedMotionExpression) {
  //     console.error(`🎮 [${context.name}] 的当前技能不存在`);
  //     throw new Error(`🎮 [${context.name}] 的当前技能不存在`);
  //   }
  //   const fixedMotion = context.engine.evaluateExpression(fixedMotionExpression, {
  //     currentFrame: context.currentFrame,
  //     casterId: context.id,
  //     skillLv: skill.lv ?? 0,
  //   });
  //   const modifiedMotion = context.engine.evaluateExpression(modifiedMotionExpression, {
  //     currentFrame: context.currentFrame,
  //     casterId: context.id,
  //     skillLv: skill.lv ?? 0,
  //   });
  //   // 前摇0.4比例，后摇0.6比例
  //   const currentSkillActionFrames = (fixedMotion + modifiedMotion * context.statContainer.getValue("mspd")) * 0.6;
  //   console.log(`👤 [${context.name}][Pip] 发动帧数: ${currentSkillActionFrames}`);
  //   return { currentSkillActionFrames };
  // }),

  // 启动发动动画: defineAction(z.object({}), z.object({}), (context) => {
  //   logLv >= 1 && console.log(`👤 [${context.name}][Pip] 启动发动动画`);
  //   sendRenderCommand(context, "action");
  //   return {};
  // }),

  // 调度发动结束事件: defineAction(
  //   z.object({
  //     actionFrames: z.number().optional(),
  //   }),
  //   z.object({}),
  //   (context, input) => {
  //     const delay = Math.max(1, Math.round(input.actionFrames ?? (context as any).actionFrames ?? 0));
  //     context.engine.dispatchMemberEvent(
  //       context.id,
  //       "收到发动结束通知",
  //       {},
  //       delay,
  //       context.currentSkill?.id ?? "unknown_skill",
  //       { source: "actionGroup.event.action" },
  //     );
  //     return {};
  //   },
  // ),

  // 应用当前技能效果: defineAction(z.object({}), z.object({}), (context) => {
  //   logLv >= 1 && console.log(`👤 [${context.name}][Pip] 应用当前技能效果 (占位)`);
  //   // TODO: 在正式实现时，调用具体的技能效果终端管线
  //   return {};
  // }),

  // ============ 伤害相关阶段（施法者侧）============
  // 对目标造成伤害: defineAction(
  //   z.object({
  //     damageFormula: z.string(),
  //     extraVars: z.record(z.string(), z.any()).optional(),
  //   }),
  //   z.object({}),
  //   (context, input) => {
  //     logLv >= 1 && console.log(`👤 [${context.name}][Pip] 对目标造成伤害`);

  //     const sourceId = context.id;
  //     const targetId = context.targetId;
  //     if (!targetId) {
  //       throw new Error(`🎮 [${context.name}] 当前没有目标，无法构造伤害请求`);
  //     }

  //     const skillId = context.currentSkill?.id ?? "unknown_skill";

  //     // 获取施法者快照（可选，用于调试或后续扩展）
  //     const sourceSnapshot = context.engine.getMemberData(sourceId);

  //     // TODO: 根据技能/武器类型区分物理与魔法，这里暂时默认物理伤害
  //     const damageType = "physical" as const;
  //     const canBeDodged = damageType === "physical";
  //     const canBeGuarded = true;

  //     const damageRequest = {
  //       sourceId,
  //       targetId,
  //       skillId,
  //       damageType,
  //       canBeDodged,
  //       canBeGuarded,
  //       damageFormula: input.damageFormula,
  //       extraVars: input.extraVars,
  //       sourceSnapshot,
  //     };

  //     logLv >= 1 && console.log(`👤 [${context.name}][Pip] 构造伤害请求:`, damageRequest);

  //     const memberManager = context.engine.getMemberManager();
  //     const targetMember = memberManager.getMember(targetId);

  //     if (!targetMember) {
  //       console.warn(`⚠️ [${context.name}][Pip] 找不到目标成员 ${targetId}，无法发送伤害事件`);
  //       return {};
  //     }

  //     // 即时事件：直接发送到目标 Actor，而不是通过 EventQueue / dispatchMemberEvent
  //     targetMember.actor.send({
  //       type: "受到攻击",
  //       data: {
  //         origin: sourceId,
  //         skillId,
  //         damageRequest,
  //       },
  //     });

  //     return {};
  //   },
  // ),
} as const satisfies ActionPool<PlayerRuntimeContext>;

export type PlayerActionPool = typeof PlayerActionPool;

export type PlayerActionDef = PipelineDef<PlayerActionPool>;
