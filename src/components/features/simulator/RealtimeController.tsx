/**
 * 实时模拟控制器
 *
 * 职责：
 * - 收集用户输入，转发为意图事件
 * - 逻辑判断、权限控制、技能条件判定
 * - 通过SimulatorPool与Worker通信
 * - UI状态管理和用户交互
 */

import { createSignal, createEffect, createMemo, onCleanup, createResource, Show, For } from "solid-js";
import { setup, assign, createActor } from "xstate";
import { realtimeSimulatorPool } from "./SimulatorPool";
import type { IntentMessage } from "./core/MessageRouter";
import type { SimulatorWithRelations } from "@db/repositories/simulator";
import { findSimulatorWithRelations } from "@db/repositories/simulator";
import { findCharacterWithRelations } from "@db/repositories/character";
import { findMobWithRelations } from "@db/repositories/mob";
import { Button } from "~/components/controls/button";
import { Select } from "~/components/controls/select";
import { MemberSerializeData } from "./core/Member";
import MemberStatusPanel from "./MemberStatusPanel";
import { LoadingBar } from "~/components/controls/loadingBar";
import { EngineStats } from "./core/GameEngine";
import { re } from "mathjs";
import { createId } from "@paralleldrive/cuid2";

// ============================== 类型定义 ==============================

interface ControllerContext {
  selectedMemberId: string | null;
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
}).createMachine(
  {
    id: "realtimeController",
    initial: "initializing",
    context: {
      selectedMemberId: null,
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
            actions: assign((_, event) => ({ error: (event as any).error })),
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
            actions: assign((_, event) => ({ error: (event as any).error })),
          },
        },
      },
      starting: {
        entry: assign(() => ({ error: null })),
        on: {
          ENGINE_STATE_UPDATE: {
            target: "running",
            actions: assign((_, event) => ({
              engineStats: (event as any).stats,
              members: (event as any).members,
            })),
          },
          WORKER_ERROR: {
            target: "error",
            actions: assign((_, event) => ({ error: (event as any).error })),
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
            actions: assign((_, event) => ({
              engineStats: (event as any).stats,
              members: (event as any).members,
            })),
          },
          STOP_SIMULATION: "stopping",
          PAUSE_SIMULATION: "paused",
          SELECT_MEMBER: {
            actions: assign((_, event) => ({ selectedMemberId: (event as any).memberId })),
          },
          SEND_INTENT: {
            actions: "sendIntent",
          },
          TOGGLE_LOG_PANEL: {
            actions: assign((context) => ({
              isLogPanelOpen: !context.isLogPanelOpen,
            })),
          },
          ADD_LOG: {
            actions: assign((context, event) => ({
              logs: [...context.logs, (event as any).message],
            })),
          },
          WORKER_ERROR: {
            target: "error",
            actions: assign((_, event) => ({ error: (event as any).error })),
          },
        },
      },
      paused: {
        on: {
          ENGINE_STATE_UPDATE: {
            actions: assign((_, event) => ({
              engineStats: (event as any).stats,
              members: (event as any).members,
            })),
          },
          RESUME_SIMULATION: "running",
          STOP_SIMULATION: "stopping",
          SELECT_MEMBER: {
            actions: assign((_, event) => ({ selectedMemberId: (event as any).memberId })),
          },
          SEND_INTENT: {
            actions: "sendIntent",
          },
          TOGGLE_LOG_PANEL: {
            actions: assign((context) => ({
              isLogPanelOpen: !context.isLogPanelOpen,
            })),
          },
          ADD_LOG: {
            actions: assign((context, event) => ({
              logs: [...context.logs, (event as any).message],
            })),
          },
          WORKER_ERROR: {
            target: "error",
            actions: assign((_, event) => ({ error: (event as any).error })),
          },
        },
      },
      stopping: {
        entry: assign({ error: null }),
        on: {
          ENGINE_STATE_UPDATE: {
            target: "ready",
            actions: assign({
              engineStats: (_, event) => (event as any).stats,
              members: (_, event) => (event as any).members,
            }),
          },
          WORKER_ERROR: {
            target: "error",
            actions: assign({ error: (_, event) => (event as any).error }),
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
  },
);

// ============================== 组件实现 ==============================

export default function RealtimeController() {
  // ==================== XState 状态机 ====================

  const actor = createActor(controllerMachine);
  const [state, setState] = createSignal(actor.getSnapshot());

  // 启动 actor 并订阅状态变化
  createEffect(() => {
    actor.subscribe((snapshot) => {
      console.log("🔄 控制器状态转换:", snapshot.value);
      setState(snapshot);
    });

    actor.start();

    // 清理函数
    onCleanup(() => {
      actor.stop();
    });
  });

  // ==================== 数据资源 ====================

  const [logs, setLogs] = createSignal<string[]>([]);

  // 获取真实的simulator数据
  const [simulator, { refetch: refetchSimulator }] = createResource(async () => {
    return findSimulatorWithRelations("defaultSimulatorId");
  });

  const [character, { refetch: refetchCharacter }] = createResource(async () => {
    return findCharacterWithRelations("defaultCharacterId");
  });

  const [mob, { refetch: refetchMob }] = createResource(async () => {
    return findMobWithRelations("defaultMobId");
  });

  // 获取角色习得的技能列表
  const characterSkills = createMemo(() => {
    const char = character();
    if (!char || !char.skills) return [];

    return char.skills
      .filter((cs) => cs.template) // 过滤掉没有模板的技能
      .map((cs) => ({
        id: cs.id,
        name: cs.template!.name,
        level: cs.lv,
        isStarGem: cs.isStarGem,
        template: cs.template!,
        effects: cs.template!.effects || [],
      }));
  });

  // ==================== 事件处理 ====================

  // 处理引擎状态变化事件
  const handleEngineStateChange = (data: { workerId: string; event: any }) => {
    const { event } = data;

    if (event.type === "engine_state_update") {
      try {
        if (event.engineState) {
          const stats = event.engineState as EngineStats;
          const members = stats.members || [];

          actor.send({
            type: "ENGINE_STATE_UPDATE",
            stats,
            members,
          });
        }
      } catch (error) {
        console.error("RealtimeController: 更新引擎状态失败:", error);
      }
    }
  };

  // ==================== 生命周期管理 ====================

  createEffect(() => {
    // 订阅引擎状态变化事件
    console.log("🔗 RealtimeController: 订阅引擎状态变化事件");
    realtimeSimulatorPool.on("engine_state_update", handleEngineStateChange);

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

    // 初始检查
    checkWorkerReady();

    // 添加worker状态监控
    const workerStatusInterval = setInterval(() => {
      checkWorkerReady();
    }, 500);

    // 清理函数
    onCleanup(() => {
      realtimeSimulatorPool.off("engine_state_update", handleEngineStateChange);
      clearInterval(workerStatusInterval);
      actor.stop();
    });
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
    actor.send({ type: "SELECT_MEMBER", memberId });
  };

  const addLog = (message: string) => {
    actor.send({ type: "ADD_LOG", message });
  };

  const toggleLogPanel = () => {
    actor.send({
      type: "TOGGLE_LOG_PANEL",
    });
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

  const selectedMember = createMemo(() => {
    const memberId = context().selectedMemberId;
    if (!memberId) return null;

    // 优先从引擎成员中查找
    const engineMember = context().members.find((member) => member.id === memberId);
    if (engineMember) {
      return engineMember;
    }
    return null;
  });

  // 获取所有成员 - 只从引擎数据中获取
  const getAllMembers = () => {
    return context().members;
  };

  // ==================== 技能和动作方法 ====================

  const castSkill = (skillId: string, targetId?: string) => {
    const selectedMemberId = context().selectedMemberId;
    if (!selectedMemberId) {
      addLog("⚠️ 请先选择成员");
      return;
    }

    sendIntent({
      type: "cast_skill",
      targetMemberId: selectedMemberId,
      data: { skillId },
    });
  };

  const move = (x: number, y: number) => {
    const selectedMemberId = context().selectedMemberId;
    if (!selectedMemberId) {
      addLog("⚠️ 请先选择成员");
      return;
    }

    sendIntent({
      type: "move",
      targetMemberId: selectedMemberId,
      data: { x, y },
    });
  };

  const stopAction = () => {
    const selectedMemberId = context().selectedMemberId;
    if (!selectedMemberId) {
      addLog("⚠️ 请先选择成员");
      return;
    }

    sendIntent({
      type: "stop_action",
      targetMemberId: selectedMemberId,
      data: {},
    });
  };

  // ==================== 调试方法 ====================

  const debugEngineMembers = () => {
    console.log("🔍 调试引擎成员数据:");
    console.log("📊 引擎成员数量:", context().members.length);
    console.log(
      "📊 引擎成员列表:",
      context().members.map((m) => m.id),
    );
    console.log("📊 选中成员ID:", context().selectedMemberId);
    console.log("📊 模拟状态:", currentState().value);
  };

  const fetchEngineMembers = async () => {
    try {
      const members = await realtimeSimulatorPool.getMembers();
      console.log("✅ 获取成功:", members.length, "个成员:", members.map((m) => m.id).join(", "));
    } catch (error) {
      console.error("❌ 获取失败:", error);
    }
  };

  // ==================== UI 渲染 ====================

  return (
    <div class="flex h-full flex-col gap-4 p-4">
      {/* 状态栏 */}
      <div class="bg-area-color flex items-center justify-between rounded-lg p-4">
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium">状态:</span>
            <div
              class={`h-2 w-2 rounded-full ${
                isLoading() ? "bg-yellow-500" : isError() ? "bg-red-500" : isRunning() ? "bg-green-500" : "bg-gray-500"
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

          {isRunning() && (
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium">帧数:</span>
              <span class="text-sm">{context().engineStats.currentFrame}</span>
            </div>
          )}
        </div>

        {isError() && (
          <div class="flex items-center gap-2">
            <span class="text-sm text-red-600">{context().error}</span>
            <Button size="sm" onClick={clearError}>
              清除
            </Button>
          </div>
        )}
      </div>

      {/* 控制按钮 */}
      <div class="flex gap-2">
        <Button onClick={startSimulation} disabled={isLoading() || isRunning()} class="bg-green-600 hover:bg-green-700">
          启动模拟
        </Button>

        <Button onClick={stopSimulation} disabled={isLoading() || !isRunning()} class="bg-red-600 hover:bg-red-700">
          停止模拟
        </Button>

        <Button
          onClick={pauseSimulation}
          disabled={isLoading() || !isRunning() || isPaused()}
          class="bg-yellow-600 hover:bg-yellow-700"
        >
          暂停
        </Button>

        <Button onClick={resumeSimulation} disabled={isLoading() || !isPaused()} class="bg-blue-600 hover:bg-blue-700">
          恢复
        </Button>

        <Button onClick={debugEngineMembers} class="bg-gray-600 hover:bg-gray-700">
          调试成员
        </Button>

        <Button onClick={fetchEngineMembers} class="bg-purple-600 hover:bg-purple-700">
          获取成员
        </Button>

        <Button onClick={toggleLogPanel} class="bg-indigo-600 hover:bg-indigo-700">
          {context().isLogPanelOpen ? "隐藏日志" : "显示日志"}
        </Button>
      </div>

      {/* 成员选择 */}
      <div class="bg-area-color rounded-lg p-4">
        <h3 class="mb-2 text-lg font-semibold">成员选择</h3>

        <Show
          when={context().members.length > 0}
          fallback={
            <div class="bg-area-color flex h-fit flex-col gap-2 rounded p-3">
              <h1 class="animate-pulse">正在加载成员数据...</h1>
              <LoadingBar class="w-full" />
            </div>
          }
        >
          <div
            class={`mb-2 rounded border p-3 ${context().members.length > 0 ? "border-green-400 bg-green-100" : "border-orange-400 bg-orange-100"}`}
          >
            <div class={`text-sm ${context().members.length > 0 ? "text-green-800" : "text-orange-800"}`}>
              <div>✅ 模拟运行中，显示引擎数据</div>
              <div class="mt-1 text-xs">
                引擎成员: {context().members.length} 个
                {context().members.length === 0 && <span class="ml-2">(点击"获取成员"按钮同步数据)</span>}
              </div>
            </div>
          </div>
          <Select
            value={context().selectedMemberId || ""}
            setValue={selectMember}
            options={[
              { label: "请选择成员", value: "" },
              ...context().members.map((member) => ({
                label: `${member.name || member.id} (${member.type || "unknown"})`,
                value: member.id,
              })),
            ]}
            placeholder="请选择成员"
          />
        </Show>
      </div>

      {/* 成员状态面板 */}
      <Show when={selectedMember()}>
        <MemberStatusPanel selectedMember={selectedMember()!} />
      </Show>

      {/* 技能面板 */}
      <Show when={selectedMember() && characterSkills().length > 0}>
        <div class="bg-area-color rounded-lg p-4">
          <h3 class="mb-2 text-lg font-semibold">技能</h3>
          <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            <For each={characterSkills()}>
              {(skill) => (
                <Button onClick={() => castSkill(skill.id)} class="bg-blue-600 hover:bg-blue-700" size="sm">
                  {skill.name} Lv.{skill.level}
                </Button>
              )}
            </For>
          </div>
        </div>
      </Show>

      {/* 动作面板 */}
      <Show when={selectedMember()}>
        <div class="bg-area-color rounded-lg p-4">
          <h3 class="mb-2 text-lg font-semibold">动作</h3>
          <div class="flex gap-2">
            <Button onClick={() => move(100, 100)} class="bg-green-600 hover:bg-green-700" size="sm">
              移动到 (100, 100)
            </Button>
            <Button onClick={stopAction} class="bg-red-600 hover:bg-red-700" size="sm">
              停止动作
            </Button>
          </div>
        </div>
      </Show>

      {/* 日志面板 */}
      <Show when={context().isLogPanelOpen}>
        <div class="bg-area-color rounded-lg p-4">
          <h3 class="mb-2 text-lg font-semibold">日志</h3>
          <div class="h-32 overflow-y-auto rounded bg-black p-2 text-sm text-green-400">
            <For each={context().logs}>{(log) => <div>{log}</div>}</For>
          </div>
        </div>
      </Show>
    </div>
  );
}
