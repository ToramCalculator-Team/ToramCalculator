/**
 * 实时模拟控制器
 *
 * 职责：
 * - 收集用户输入，转发为意图事件
 * - 逻辑判断、权限控制、技能条件判定
 * - 通过SimulatorPool与Worker通信
 * - UI状态管理和用户交互
 */

import {
  createSignal,
  createEffect,
  createMemo,
  onCleanup,
  createResource,
  Show,
  For,
  on,
  Switch,
  Match,
} from "solid-js";
import { setup, assign, createActor } from "xstate";
import { realtimeSimulatorPool } from "./core/thread/SimulatorPool";
import type { IntentMessage } from "./core/thread/messages";
import { findSimulatorWithRelations } from "@db/repositories/simulator";
import { Button } from "~/components/controls/button";
import { Select } from "~/components/controls/select";
import { MemberSerializeData } from "./core/member/MemberType";
import MemberStatusPanel from "./core/member/MemberStatusPanel";
import { EngineStats } from "./core/GameEngine";
import { createId } from "@paralleldrive/cuid2";
import { findPlayerWithRelations, PlayerWithRelations } from "@db/repositories/player";
import { findMemberWithRelations, MemberWithRelations } from "@db/repositories/member";
import { LoadingBar } from "~/components/controls/loadingBar";
import { BabylonBg } from "./core/render/BabylonGame";

// ============================== 类型定义 ==============================

interface ControllerContext {
  selectedEngineMemberId: string | null;
  members: MemberSerializeData[];
  engineStats: EngineStats;
  logs: string[];
  isLogPanelOpen: boolean;
  error: string | null;
}

type ControllerEvent =
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

// ============================== XState 状态机定义 ==============================

const controllerMachine = setup({
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

// ============================== 组件实现 ==============================

export default function RealtimeController() {
  // ==================== XState 状态机 ====================

  const actor = createActor(controllerMachine);
  const [state, setState] = createSignal(actor.getSnapshot());
  const [selectedEngineMemberFsm, setSelectedMemberFsm] = createSignal<string | null>(null);

  // 启动 actor 并订阅状态变化
  createEffect(() => {
    actor.subscribe((snapshot) => {
      setState(snapshot);
    });

    actor.start();

    // 清理函数
    onCleanup(() => {
      try {
        actor.stop();
      } catch {}
    });
  });

  // ==================== 数据资源 ====================

  // 获取真实的simulator数据
  const [simulator, { refetch: refetchSimulator }] = createResource(async () => {
    return findSimulatorWithRelations("defaultSimulatorId");
  });

  // ==================== 事件处理 ====================

  // 处理引擎状态变化事件
  const handleEngineStateChange = (data: {
    workerId: string;
    event: {
      type: "engine_state_update";
      engineView?: { frameNumber: number; runTime: number; frameLoop: any; eventQueue: any };
      engineState?: EngineStats;
    };
  }) => {
    const { event } = data;

    if (event.type === "engine_state_update") {
      try {
        // 轻量 EngineView：仅用于进度/KPI 展示
        if (event.engineView) {
          // 可以在此处合成最小 UI 状态（若需要）
          // 暂不改变 state.context 的结构，先不注入 members
          actor.send({
            type: "ENGINE_STATE_UPDATE",
            stats: {
              ...state().context.engineStats,
              currentFrame: event.engineView.frameNumber,
              runTime: event.engineView.runTime,
              frameLoopStats: {
                ...state().context.engineStats.frameLoopStats,
                averageFPS: event.engineView.frameLoop.averageFPS,
                averageFrameTime: event.engineView.frameLoop.averageFrameTime,
                totalFrames: event.engineView.frameLoop.totalFrames,
                totalRunTime: event.engineView.frameLoop.totalRunTime,
                clockKind: event.engineView.frameLoop.clockKind,
                skippedFrames: event.engineView.frameLoop.skippedFrames,
                frameBudgetMs: event.engineView.frameLoop.frameBudgetMs,
                // 保留历史数组引用，不在此高频事件里更新
              },
              eventQueueStats: {
                ...state().context.engineStats.eventQueueStats,
                currentSize: event.engineView.eventQueue.currentSize,
                totalProcessed: event.engineView.eventQueue.totalProcessed,
                totalInserted: event.engineView.eventQueue.totalInserted,
                overflowCount: event.engineView.eventQueue.overflowCount,
              },
            } as EngineStats,
            // members 字段在 ENGINE_STATE_UPDATE 中可选传入；避免 undefined 造成 assign 报错
            members: state().context.members,
          });
        } else if (event.engineState) {
          // 兼容旧通道（全量 EngineStats）
          const stats = event.engineState as EngineStats;
          actor.send({ type: "ENGINE_STATE_UPDATE", stats, members: stats.members || state().context.members });
        }
      } catch (error) {
        console.error("RealtimeController: 更新引擎状态失败:", error);
      }
    }
  };

  // 接收低频全量 EngineStats
  const handleEngineStatsFull = (data: { workerId: string; event: EngineStats }) => {
    try {
      // console.log("handleEngineStatsFull", data);
      const stats = data.event as EngineStats;
      if (stats && typeof stats.currentFrame === "number") {
        actor.send({ type: "ENGINE_STATE_UPDATE", stats, members: state().context.members });
      }
    } catch {}
  };

  // 处理选中成员 FSM 状态更新
  const handleMemberStateUpdate = (data: { workerId: string; event: { memberId: string; value: string } }) => {
    const { event } = data;
    if (event && event.memberId) {
      const memberId = event.memberId as string;
      const ctx = state().context;
      if (ctx.selectedEngineMemberId === memberId) {
        // 将选中成员的 FSM 状态同步到本地信号，用于即时展示
        setSelectedMemberFsm(event.value || null);
      }
    }
  };

  // ==================== 生命周期管理 ====================

  createEffect(() => {
    // 订阅引擎状态变化事件
    console.log("🔗 RealtimeController: 订阅引擎状态变化事件");
    realtimeSimulatorPool.on("engine_state_update", handleEngineStateChange);
    realtimeSimulatorPool.on("member_state_update", handleMemberStateUpdate);
    realtimeSimulatorPool.on("engine_stats_full", handleEngineStatsFull);
    // 渲染指令透传
    const handleRenderCmd = (msg: { workerId: string; type: string; cmd?: any; cmds?: any[] }) => {
      try {
        const fn = (globalThis as any).__SIM_RENDER__;
        if (typeof fn === "function") {
          if (msg.type === "render:cmds") fn({ type: msg.type, cmds: msg.cmds });
          else fn({ type: msg.type, cmd: msg.cmd });
        }
      } catch (e) {
        console.warn("转发渲染指令失败", e);
      }
    };
    realtimeSimulatorPool.on("render_cmd", handleRenderCmd);

    // 检查worker准备状态
    const checkWorkerReady = () => {
      try {
        const isReady = realtimeSimulatorPool.isReady();
        if (isReady) {
          actor.send({ type: "WORKER_READY" });
        }
      } catch (error) {
        actor.send({ type: "WORKER_ERROR", error: error instanceof Error ? error.message : "Worker错误" });
      }
    };

    // 初始检查：仅在 actor 未进入终态时检查一次
    try {
      if (!actor.getSnapshot().status || actor.getSnapshot().status !== "done") {
        checkWorkerReady();
      }
    } catch {}

    // 添加worker状态监控
    // 定时检查：若已进入非初始状态（ready/starting/running/paused/stopping/error），避免再发送 WORKER_READY
    const workerStatusInterval = setInterval(() => {
      const snap = actor.getSnapshot();
      if (
        snap.matches &&
        (snap.matches("ready") ||
          snap.matches("starting") ||
          snap.matches("running") ||
          snap.matches("paused") ||
          snap.matches("stopping") ||
          snap.matches("error"))
      ) {
        return; // 不再触发 WORKER_READY
      }
      checkWorkerReady();
    }, 500);

    // 清理函数
    onCleanup(() => {
      realtimeSimulatorPool.off("engine_state_update", handleEngineStateChange);
      realtimeSimulatorPool.off("member_state_update", handleMemberStateUpdate);
      realtimeSimulatorPool.off("engine_stats_full", handleEngineStatsFull);
      realtimeSimulatorPool.off("render_cmd", handleRenderCmd);
      clearInterval(workerStatusInterval);
      // 清理选中成员订阅
      const selectedId = actor.getSnapshot().context.selectedEngineMemberId;
      if (selectedId) {
        realtimeSimulatorPool.unwatchMember(selectedId);
      }
      try {
        actor.stop();
      } catch {}
    });
  });

  // ==================== FPS 输入聚合（主线程） ====================
  // 说明：仅采集 WASD 方向，作为高层意图发送给 Worker，由 FSM 产出渲染命令
  createEffect(() => {
    const active = new Set<string>();
    let rafId = 0 as number | undefined as any;
    let lastAxis = { x: 0, y: 0 };
    let lastSentNonZero = false;

    const onKeyDown = (e: KeyboardEvent) => {
      active.add(e.key.toLowerCase());
    };
    const onKeyUp = (e: KeyboardEvent) => {
      active.delete(e.key.toLowerCase());
    };

    const loop = () => {
      const axis = {
        x: (active.has("d") ? 1 : 0) + (active.has("a") ? -1 : 0),
        y: (active.has("w") ? 1 : 0) + (active.has("s") ? -1 : 0),
      };
      const norm = Math.hypot(axis.x, axis.y);
      if (norm > 0) {
        axis.x /= norm;
        axis.y /= norm;
      }

      const changed = axis.x !== lastAxis.x || axis.y !== lastAxis.y;
      const memberId = context().selectedEngineMemberId;
      if (memberId && changed) {
        // 非零：发送自定义意图 axis_move；零向量：发送 stop_move
        if (norm > 0) {
          sendIntent({
            type: "custom",
            targetMemberId: memberId,
            data: { kind: "axis_move", axis },
          });
          lastSentNonZero = true;
        } else if (lastSentNonZero) {
          sendIntent({ type: "stop_move", targetMemberId: memberId, data: {} });
          lastSentNonZero = false;
        }
        lastAxis = axis;
      }
      rafId = requestAnimationFrame(loop) as any;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    rafId = requestAnimationFrame(loop) as any;

    onCleanup(() => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      if (rafId) cancelAnimationFrame(rafId);
    });
  });

  // 当选中成员变化时，立即水合一次其 FSM 状态，保证“首帧有值”
  let lastSelectedId: string | null = null;
  createEffect(() => {
    const currentId = context().selectedEngineMemberId;
    if (!currentId || currentId === lastSelectedId) return;
    lastSelectedId = currentId;
    setSelectedMemberFsm(null);
    (async () => {
      try {
        const res = await realtimeSimulatorPool.getMemberState(currentId);
        // 只在当前仍为选中对象时应用结果，避免竞态
        if (actor.getSnapshot().context.selectedEngineMemberId === currentId && res.success) {
          setSelectedMemberFsm(res.value || null);
        }
      } catch {}
    })();
  });

  // ==================== 业务逻辑方法 ====================

  const startSimulation = async () => {
    try {
      actor.send({ type: "START_SIMULATION" });

      const simulatorData = simulator();
      if (!simulatorData) {
        throw new Error("无法获取模拟器数据");
      }

      const result = await realtimeSimulatorPool.startSimulation(simulatorData);
      if (!result.success) {
        throw new Error(result.error || "启动模拟失败");
      }

      console.log("✅ 模拟启动成功");

      // 启动成功后，主动拉取一次成员数据用于下拉框
      try {
        const members = await realtimeSimulatorPool.getMembers();
        // 更新成员数据
        actor.send({
          type: "ENGINE_STATE_UPDATE",
          stats: state().context.engineStats,
          members,
        });
      } catch (e) {
        console.warn("获取成员失败（可稍后手动重试）", e);
      }
    } catch (error) {
      console.error("❌ 启动模拟失败:", error);
      actor.send({
        type: "WORKER_ERROR",
        error: error instanceof Error ? error.message : "启动失败",
      });
    }
  };

  const stopSimulation = async () => {
    try {
      actor.send({ type: "STOP_SIMULATION" });

      const result = await realtimeSimulatorPool.stopSimulation();
      if (!result.success) {
        throw new Error(result.error || "停止模拟失败");
      }

      console.log("✅ 模拟停止成功");
    } catch (error) {
      console.error("❌ 停止模拟失败:", error);
      actor.send({
        type: "WORKER_ERROR",
        error: error instanceof Error ? error.message : "停止失败",
      });
    }
  };

  const pauseSimulation = async () => {
    try {
      const result = await realtimeSimulatorPool.pauseSimulation();
      if (!result.success) {
        throw new Error(result.error || "暂停模拟失败");
      }

      console.log("✅ 模拟暂停成功");
      // 成功后进入本地 paused 状态，保证按钮可用性正确
      actor.send({ type: "PAUSE_SIMULATION" });
    } catch (error) {
      console.error("❌ 暂停模拟失败:", error);
      actor.send({
        type: "WORKER_ERROR",
        error: error instanceof Error ? error.message : "暂停失败",
      });
    }
  };

  const resumeSimulation = async () => {
    try {
      const result = await realtimeSimulatorPool.resumeSimulation();
      if (!result.success) {
        throw new Error(result.error || "恢复模拟失败");
      }

      console.log("✅ 模拟恢复成功");
      // 成功后进入本地 running 状态
      actor.send({ type: "RESUME_SIMULATION" });
    } catch (error) {
      console.error("❌ 恢复模拟失败:", error);
      actor.send({
        type: "WORKER_ERROR",
        error: error instanceof Error ? error.message : "恢复失败",
      });
    }
  };

  const sendIntent = async (intent: Omit<IntentMessage, "id" | "timestamp">) => {
    try {
      const result = await realtimeSimulatorPool.sendIntent({
        ...intent,
        id: createId(),
        timestamp: Date.now(),
      });
      if (!result.success) {
        throw new Error(result.error || "发送意图失败");
      }

      console.log("✅ 意图发送成功:", intent.type);
    } catch (error) {
      console.error("❌ 发送意图失败:", error);
      actor.send({
        type: "WORKER_ERROR",
        error: error instanceof Error ? error.message : "发送意图失败",
      });
    }
  };

  const selectMember = (memberId: string) => {
    setSelectedMemberFsm(null);
    actor.send({ type: "SELECT_MEMBER", memberId });
  };

  const clearError = () => {
    actor.send({
      type: "CLEAR_ERROR",
    });
  };

  // ==================== 计算属性 ====================

  const currentState = createMemo(() => state());
  const context = createMemo(() => currentState().context);

  const isRunning = createMemo(() => currentState().matches("running") || currentState().matches("paused"));

  const isPaused = createMemo(() => currentState().matches("paused"));
  const isError = createMemo(() => currentState().matches("error"));
  const isLoading = createMemo(
    () =>
      currentState().matches("initializing") ||
      currentState().matches("starting") ||
      currentState().matches("stopping"),
  );

  // 只有当 Worker 就绪 且 模拟器数据已就绪 才允许启动
  const canStart = createMemo(() => currentState().matches("ready") && !!simulator());

  const selectedEngineMember = createMemo(() => {
    const memberId = context().selectedEngineMemberId;
    if (!memberId) return null;

    const engineMember = context().members.find((member) => member.id === memberId);
    if (engineMember) {
      return engineMember;
    }
    return null;
  });

  const [selectedMember, setSelectedMember] = createSignal<MemberWithRelations | null>(null);

  createEffect(
    on(
      () => selectedEngineMember(),
      async () => {
        const memberId = selectedEngineMember()?.id;
        if (!memberId) return null;
        const member = await findMemberWithRelations(memberId);
        setSelectedMember(member);
      },
      {
        defer: true,
      },
    ),
  );

  // ==================== 技能和动作方法 ====================

  const castSkill = (skillId: string, targetId?: string) => {
    const selectedEngineMemberId = context().selectedEngineMemberId;
    if (!selectedEngineMemberId) {
      console.log("⚠️ 请先选择成员");
      return;
    }

    sendIntent({
      // 直接发送 FSM 事件名
      type: "skill_press",
      targetMemberId: selectedEngineMemberId,
      data: { skillId },
    });
  };

  const move = (x: number, y: number) => {
    const selectedEngineMemberId = context().selectedEngineMemberId;
    if (!selectedEngineMemberId) {
      console.log("⚠️ 请先选择成员");
      return;
    }

    sendIntent({
      type: "move_command",
      targetMemberId: selectedEngineMemberId,
      data: { position: { x, y } },
    });
  };

  const stopAction = () => {
    const selectedEngineMemberId = context().selectedEngineMemberId;
    if (!selectedEngineMemberId) {
      console.log("⚠️ 请先选择成员");
      return;
    }

    sendIntent({
      type: "stop_move",
      targetMemberId: selectedEngineMemberId,
      data: {},
    });
  };

  // ==================== UI 渲染 ====================

  return (
    <div class="grid h-full auto-rows-min grid-cols-12 grid-rows-12 gap-4 overflow-y-auto p-4">
      {/* 状态栏（摘要 + 指标 + 操作） */}
      {/* <div class="bg-area-color col-span-12 flex h-[1fr] items-center justify-between rounded-lg p-4">
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium">状态:</span>
            <div
              class={`h-2 w-2 rounded-full ${
                isLoading()
                  ? "bg-brand-color-1st"
                  : isError()
                    ? "bg-brand-color-2nd"
                    : isRunning()
                      ? "bg-brand-color-3rd"
                      : "bg-brand-color-4th"
              }`}
            ></div>
            <span class="text-sm">
              {isLoading()
                ? "加载中..."
                : isError()
                  ? "错误"
                  : isRunning()
                    ? isPaused()
                      ? "已暂停"
                      : "运行中"
                    : "就绪"}
            </span>
          </div>
          <Show when={isRunning()}>
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium">帧数</span>
              <span class="text-sm">{context().engineStats.currentFrame}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium">FPS</span>
              <span class="text-sm">{context().engineStats.frameLoopStats.averageFPS.toFixed?.(1) ?? 0}</span>
            </div>
            <div class="flex items-center gap-2 portrait:hidden">
              <span class="text-sm font-medium">时钟</span>
              <span class="text-sm">{(context().engineStats.frameLoopStats ).clockKind || "raf"}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium">队列</span>
              <span class="text-sm">{context().engineStats.eventQueueStats.currentSize}</span>
            </div>
          </Show>
        </div>
      </div> */}
      {/* 画面布局 */}
      <div class="col-span-12 row-span-8 flex flex-col items-center gap-2 portrait:row-span-7">
        <div class="bg-area-color flex h-full w-full flex-col rounded overflow-hidden">
          <BabylonBg followEntityId={context().selectedEngineMemberId || undefined} />
        </div>
      </div>

      {/* 主内容：成员状态（居中 12列布局），技能与动作在其下方 */}
      <div class="col-span-12 row-span-1 flex flex-col items-center gap-2 portrait:row-span-1">
        <MemberStatusPanel member={selectedEngineMember} />
      </div>

      {/* 技能面板 */}
      <div class="bg-area-color col-span-6 row-span-2 flex flex-col rounded-lg p-3">
        <Show when={selectedMember()}>
          <h3 class="mb-2 text-lg font-semibold">技能</h3>
          <div class="grid flex-1 grid-cols-4 grid-rows-1 gap-2 overflow-y-auto">
            <Switch fallback={<div>暂无技能</div>}>
              <Match when={selectedMember()?.type === "Player"}>
                <For each={(selectedMember()?.player as PlayerWithRelations).character.skills ?? []}>
                  {(skill) => (
                    <Button
                      onClick={() => castSkill(skill.id)}
                      class="col-span-1 row-span-1 flex-col items-start"
                      size="sm"
                    >
                      <span class="text-sm">{skill.template?.name}</span>
                      <span class="text-xs text-gray-500">Lv.{skill.lv}</span>
                    </Button>
                  )}
                </For>
              </Match>
              <Match when={selectedMember()?.type === "Mob"}>
                <pre>{JSON.stringify(selectedMember()?.mob, null, 2)}</pre>
              </Match>
            </Switch>
          </div>
        </Show>
      </div>

      {/* 动作面板 */}
      <div class="bg-area-color col-span-6 row-span-2 rounded-lg p-3">
        <Show when={selectedEngineMember()}>
          <h3 class="mb-2 text-lg font-semibold">动作</h3>
          <div class="flex gap-2">
            {/* <Button onClick={() => move(100, 100)} class="bg-green-600 hover:bg-green-700" size="sm">
              移动到 (100, 100)
            </Button>
            <Button onClick={stopAction} class="bg-red-600 hover:bg-red-700" size="sm">
              停止动作
            </Button> */}
          </div>
        </Show>
      </div>

      {/* 控制栏（精简） + 成员选择 */}
      <div class="col-span-12 row-span-1 flex flex-wrap items-center gap-x-8 gap-y-2 portrait:row-span-2">
        <div class="ControlPanel flex gap-2">
          <Button
            onClick={() => {
              clearError();
              startSimulation();
            }}
            disabled={!canStart()}
            class="bg-green-600 hover:bg-green-700"
          >
            启动模拟
          </Button>
          <Button onClick={stopSimulation} disabled={isLoading() || !isRunning()} class="bg-red-600 hover:bg-red-700">
            停止模拟
          </Button>
          <Button
            onClick={pauseSimulation}
            disabled={!currentState().matches("running")}
            class="bg-brand-color-1st hover:brightness-110"
          >
            暂停
          </Button>
          <Button
            onClick={resumeSimulation}
            disabled={!currentState().matches("paused")}
            class="bg-blue-600 hover:bg-blue-700"
          >
            恢复
          </Button>
        </div>
        {/* 成员选择/获取 */}
        <div class="MemberSelect ml-auto flex flex-1 items-center gap-2">
          <Show
            when={context().members.length > 0}
            fallback={
              <div class="bg-area-color flex h-12 w-full items-center justify-center rounded">
                <LoadingBar />
              </div>
            }
          >
            <Select
              value={context().selectedEngineMemberId || ""}
              setValue={(v) => {
                if (!v && context().members.length > 0) return;
                selectMember(v);
              }}
              options={[
                ...context().members.map((member) => ({
                  label: `${member.name || member.id} (${member.type || "unknown"})`,
                  value: member.id,
                })),
              ]}
              placeholder="请选择成员"
              optionPosition="top"
            />
          </Show>
        </div>
      </div>
    </div>
  );
}
