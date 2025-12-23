import { z } from "zod/v4";
import { createId } from "@paralleldrive/cuid2";
import { ModifierType } from "../StatContainer/StatContainer";
import type { RuntimeContext } from "./AgentContext";
import { ActionPool, defineAction } from "./type";
import State from "~/lib/mistreevous/State";

export const logLv = 1; // 0: 不输出日志, 1: 输出关键日志, 2: 输出所有日志



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

const sendRenderCommand = (context: RuntimeContext, actionName: string, params?: Record<string, unknown>) => {
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
 * 通用战斗动作池（命中 / 伤害相关）
 * 约定：
 * - context 至少满足 ActionContext
 * - 受击者侧通过 context.currentDamageRequest 提供本次伤害请求
 * - 命中结果写回 context.lastHitResult，供状态机或后续动作使用
 */
export const CommonActions = {
  moveTo: defineAction(
    z.object({
      target: z.object({
        x: z.number(),
        y: z.number(),
        z: z.number(),
      }),
    }),
    (context, input) => {
      console.log("moveTo", input);
      return State.SUCCEEDED;
    },
  ),

  animation: defineAction(
    z.object({
      name: z.string(),
    }),
    (context, input) => {
      console.log("animation", input);
      sendRenderCommand(context, input.name);
      return State.SUCCEEDED;
    },
  ),

  buildDamageRequest: defineAction(z.object({
    sourceId: z.string(),
    targetId: z.string(),
    skillId: z.string(),
    damageType: z.enum(["physical", "magic"]),
    damageValue: z.number(),
  }), (context, input) => {
    // 解析伤害表达式，将所需的self变量放入参数列表

    // 将伤害表达式和伤害区域数据移交给区域管理器处理,区域管理器将负责代替发送伤害事件

    return State.SUCCEEDED;
  }),

  addBuff: defineAction(z.object({
    id: z.string(),
    treeName: z.string(),
  }), (context, input) => {
    console.log("addBuff", input);
    // buff逻辑所需的定义应该会被加载到上下文中，找到他并注册即可
    context.currentSkillLogic
    return State.SUCCEEDED;
  }),
} as const satisfies ActionPool<RuntimeContext>;

export type CommonActionPool = typeof CommonActions;
