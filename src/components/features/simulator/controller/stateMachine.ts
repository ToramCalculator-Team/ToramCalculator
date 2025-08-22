/**
 * 实时控制器状态机模块
 * 
 * 功能：
 * - 状态机相关的类型定义
 * - XState 状态机配置
 * - 状态机事件处理逻辑
 */

import { setup, assign } from "xstate";
import { createId } from "@paralleldrive/cuid2";
import { realtimeSimulatorPool } from "../core/thread/SimulatorPool";
import type { IntentMessage } from "../core/thread/messages";
import type { MemberSerializeData } from "../core/member/Member";
import type { EngineStats } from "../core/GameEngine";

// ============================== 状态机类型定义 ==============================

export interface ControllerContext {
  selectedEngineMemberId: string | null;
  members: MemberSerializeData[];
  engineStats: EngineStats;
  logs: string[];
  isLogPanelOpen: boolean;
  error: string | null;
}

export type ControllerEvent =
  | { type: "WORKER_READY" }
  | { type: "WORKER_ERROR"; error: string }
  | { type: "ENGINE_STATE_UPDATE"; stats: EngineStats; members: MemberSerializeData[] }
  | { type: "START_SIMULATION" }
  | { type: "STOP_SIMULATION" }
  | { type: "PAUSE_SIMULATION" }
  | { type: "RESUME_SIMULATION" }
  | { type: "SELECT_MEMBER"; memberId: string }
  | { type: "SEND_INTENT"; intent: Omit<IntentMessage, "id" | "timestamp"> }
  | { type: "TOGGLE_LOG_PANEL" }
  | { type: "ADD_LOG"; message: string }
  | { type: "CLEAR_ERROR" };

// ============================== 事件处理类型 ==============================

export interface EngineStateChangeEvent {
  workerId: string;
  event: {
    type: "engine_state_update";
    engineView?: { 
      frameNumber: number; 
      runTime: number; 
      frameLoop: any; 
      eventQueue: any 
    };
    engineState?: EngineStats;
  };
}

export interface EngineStatsFullEvent {
  workerId: string;
  event: EngineStats;
}

export interface MemberStateUpdateEvent {
  workerId: string;
  event: { memberId: string; value: string };
}

export interface RenderCommandEvent {
  workerId: string;
  type: string;
  cmd?: any;
  cmds?: any[];
}

// ============================== 事件处理函数 ==============================

/**
 * 处理引擎状态变化事件
 */
export function handleEngineStateChange(
  data: EngineStateChangeEvent,
  currentStats: EngineStats,
  currentMembers: MemberSerializeData[]
): { stats: EngineStats; members: MemberSerializeData[] } | null {
  const { event } = data;

  if (event.type === "engine_state_update") {
    try {
      // 轻量 EngineView：仅用于进度/KPI 展示
      if (event.engineView) {
        const stats: EngineStats = {
          ...currentStats,
          currentFrame: event.engineView.frameNumber,
          runTime: event.engineView.runTime,
          frameLoopStats: {
            ...currentStats.frameLoopStats,
            averageFPS: event.engineView.frameLoop.averageFPS,
            averageFrameTime: event.engineView.frameLoop.averageFrameTime,
            totalFrames: event.engineView.frameLoop.totalFrames,
            totalRunTime: event.engineView.frameLoop.totalRunTime,
            clockKind: event.engineView.frameLoop.clockKind,
            skippedFrames: event.engineView.frameLoop.skippedFrames,
            frameBudgetMs: event.engineView.frameLoop.frameBudgetMs,
          },
          eventQueueStats: {
            ...currentStats.eventQueueStats,
            currentSize: event.engineView.eventQueue.currentSize,
            totalProcessed: event.engineView.eventQueue.totalProcessed,
            totalInserted: event.engineView.eventQueue.totalInserted,
            overflowCount: event.engineView.eventQueue.overflowCount,
          },
        };
        return { stats, members: currentMembers };
      } else if (event.engineState) {
        // 兼容旧通道（全量 EngineStats）
        const stats = event.engineState as EngineStats;
        return { stats, members: stats.members || currentMembers };
      }
    } catch (error) {
      console.error("RealtimeController: 更新引擎状态失败:", error);
    }
  }
  
  return null;
}

/**
 * 处理引擎统计全量事件
 */
export function handleEngineStatsFull(
  data: EngineStatsFullEvent,
  currentMembers: MemberSerializeData[]
): { stats: EngineStats; members: MemberSerializeData[] } | null {
  try {
    const stats = data.event as EngineStats;
    if (stats && typeof stats.currentFrame === "number") {
      return { stats, members: currentMembers };
    }
  } catch (error) {
    console.error("RealtimeController: 处理引擎统计失败:", error);
  }
  
  return null;
}

/**
 * 处理成员状态更新事件
 */
export function handleMemberStateUpdate(
  data: MemberStateUpdateEvent,
  selectedMemberId: string | null
): string | null {
  const { event } = data;
  if (event && event.memberId && event.memberId === selectedMemberId) {
    return event.value || null;
  }
  return null;
}

/**
 * 处理渲染指令事件
 */
export function handleRenderCommand(msg: RenderCommandEvent): void {
  try {
    const fn = (globalThis as any).__SIM_RENDER__;
    if (typeof fn === "function") {
      if (msg.type === "render:cmds") {
        fn({ type: msg.type, cmds: msg.cmds });
      } else {
        fn({ type: msg.type, cmd: msg.cmd });
      }
    }
  } catch (e) {
    console.warn("转发渲染指令失败", e);
  }
}

// ============================== 状态机定义 ==============================

export const controllerMachine = setup({
  types: {
    context: {} as ControllerContext,
    events: {} as ControllerEvent,
  },
  actions: {
    sendIntent: async ({ context, event }) => {
      if (event.type === "SEND_INTENT") {
        try {
          await realtimeSimulatorPool.sendIntent({
            ...event.intent,
            id: createId(),
            timestamp: Date.now(),
          });
        } catch (error) {
          console.error("发送意图失败:", error);
        }
      }
    },
  },
}).createMachine({
  id: "realtimeController",
  initial: "initializing",
  context: {
    selectedEngineMemberId: null,
    members: [],
    engineStats: {
      state: "initialized",
      currentFrame: 0,
      runTime: 0,
      members: [],
      eventQueueStats: {
        currentSize: 0,
        totalProcessed: 0,
        totalInserted: 0,
        averageProcessingTime: 0,
        overflowCount: 0,
        lastProcessedTime: 0,
      },
      frameLoopStats: {
        averageFPS: 0,
        averageFrameTime: 0,
        totalFrames: 0,
        totalRunTime: 0,
        fpsHistory: [],
        frameTimeHistory: [],
        eventStats: {
          totalEventsProcessed: 0,
          averageEventsPerFrame: 0,
          maxEventsPerFrame: 0,
        },
      },
      messageRouterStats: {
        totalMessagesProcessed: 0,
        successfulMessages: 0,
        failedMessages: 0,
        lastProcessedTimestamp: 0,
        successRate: "",
      },
    },
    logs: [],
    isLogPanelOpen: false,
    error: null,
  },
  states: {
    initializing: {
      entry: assign(() => ({ error: null })),
      on: {
        WORKER_READY: "ready",
        WORKER_ERROR: {
          target: "error",
          actions: assign(({ event }) => ({ error: (event as any)?.error ?? "Worker错误" })),
        },
      },
      after: {
        10000: {
          target: "error",
          actions: assign(() => ({ error: "Worker初始化超时" })),
        },
      },
    },
    ready: {
      entry: assign(() => ({ error: null })),
      on: {
        START_SIMULATION: "starting",
        WORKER_ERROR: {
          target: "error",
          actions: assign(({ event }) => ({ error: (event as any)?.error ?? "Worker错误" })),
        },
      },
    },
    starting: {
      entry: assign(() => ({ error: null })),
      on: {
        ENGINE_STATE_UPDATE: {
          target: "running",
          actions: assign(({ context, event }) => {
            const e = event;
            return {
              engineStats: e.stats ?? context.engineStats,
              members: e.members ?? context.members,
            };
          }),
        },
        WORKER_ERROR: {
          target: "error",
          actions: assign(({ event }) => ({ error: (event as any)?.error ?? "Worker错误" })),
        },
      },
      after: {
        5000: {
          target: "error",
          actions: assign(() => ({ error: "启动模拟超时" })),
        },
      },
    },
    running: {
      on: {
        ENGINE_STATE_UPDATE: {
          actions: assign(({ context, event }) => {
            const e = event;
            return {
              engineStats: e.stats ?? context.engineStats,
              members: e.members ?? context.members,
            };
          }),
        },
        SELECT_MEMBER: {
          actions: [
            assign(({ event }) => ({ selectedEngineMemberId: event?.memberId ?? null })),
            ({ context, event }) => {
              const prev = context.selectedEngineMemberId as string | null;
              const next = event?.memberId as string | undefined;
              if (prev && next && prev !== next) {
                realtimeSimulatorPool.unwatchMember(prev);
              }
              if (next) {
                realtimeSimulatorPool.watchMember(next);
              }
            },
          ],
        },
        STOP_SIMULATION: "stopping",
        PAUSE_SIMULATION: "paused",
        SEND_INTENT: {
          actions: "sendIntent",
        },
        TOGGLE_LOG_PANEL: {
          actions: assign(({ context }) => ({
            isLogPanelOpen: !context.isLogPanelOpen,
          })),
        },
        ADD_LOG: {
          actions: assign(({ context, event }) => ({
            logs: [...context.logs, (event as any)?.message ?? ""],
          })),
        },
        WORKER_ERROR: {
          target: "error",
          actions: assign((_, event) => ({ error: (event as any)?.error ?? "Worker错误" })),
        },
      },
    },
    paused: {
      on: {
        ENGINE_STATE_UPDATE: {
          actions: assign(({ context, event }) => {
            const e = event;
            return {
              engineStats: e.stats ?? context.engineStats,
              members: e.members ?? context.members,
            };
          }),
        },
        RESUME_SIMULATION: "running",
        STOP_SIMULATION: "stopping",
        SELECT_MEMBER: {
          actions: assign((_, event) => ({ selectedEngineMemberId: (event as any)?.memberId })),
        },
        SEND_INTENT: {
          actions: "sendIntent",
        },
        TOGGLE_LOG_PANEL: {
          actions: assign(({ context }) => ({
            isLogPanelOpen: !context.isLogPanelOpen,
          })),
        },
        ADD_LOG: {
          actions: assign(({ context, event }) => ({
            logs: [...context.logs, event.message],
          })),
        },
        WORKER_ERROR: {
          target: "error",
          actions: assign((_, event) => ({ error: (event as any)?.error ?? "Worker错误" })),
        },
      },
    },
    stopping: {
      entry: assign({ error: null }),
      on: {
        ENGINE_STATE_UPDATE: {
          target: "ready",
          actions: assign(({ context, event }) => {
            const e = event;
            return {
              engineStats: e.stats ?? context.engineStats,
              members: e.members ?? context.members,
            };
          }),
        },
        WORKER_ERROR: {
          target: "error",
          actions: assign({ error: (_: any, event: any) => event?.error ?? "Worker错误" }),
        },
      },
      after: {
        3000: {
          target: "error",
          actions: assign({ error: "停止模拟超时" }),
        },
      },
    },
    error: {
      on: {
        CLEAR_ERROR: {
          target: "ready",
          actions: assign({ error: null }),
        },
        WORKER_READY: "ready",
      },
    },
  },
});
