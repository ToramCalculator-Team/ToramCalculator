/**
 * 沙盒化的模拟器Worker
 * 将GameEngine运行在安全沙盒环境中
 */

import { GameEngine } from "../GameEngine";
import { EngineViewSchema, type WorkerTaskResponse, type WorkerTaskResult } from "./messages";
import type { SimulatorWithRelations } from "@db/repositories/simulator";
import type { IntentMessage } from "./messages";

// ==================== 消息类型定义 ====================

/**
 * 主线程到Worker的初始化消息类型
 */
interface MainThreadMessage {
  type: "init";
  port?: MessagePort;
}

/**
 * MessageChannel端口消息类型 - 与SimulatorPool保持一致
 */
interface PortMessage {
  taskId: string;
  type: string;
  data?: any;
}

/**
 * Worker响应消息类型 - 与SimulatorPool期望的格式一致
 */
type WorkerResponse<T = unknown> = WorkerTaskResponse<T>;

/**
 * Worker系统消息类型 - 用于引擎状态更新
 */
interface WorkerSystemMessage {
  type: "engine_state_update" | "system_event";
  event?: any;
}

// ==================== 沙盒环境初始化 ====================

/**
 * 初始化Worker沙盒环境
 * 屏蔽危险的全局对象，确保JS片段执行安全
 */
function initializeWorkerSandbox() {
  // 屏蔽危险的全局对象
  (globalThis as any).global = undefined;
  (globalThis as any).process = undefined;
  (globalThis as any).require = undefined;
  (globalThis as any).module = undefined;
  (globalThis as any).exports = undefined;
  (globalThis as any).Buffer = undefined;
  (globalThis as any).eval = undefined;
  // (globalThis as any).Function = undefined;
  (globalThis as any).importScripts = undefined;
  (globalThis as any).this = undefined;

  // 提供安全的API
  (globalThis as any).safeAPI = {
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Date,
    Math,
    JSON,
    // 数学函数的便捷访问
    floor: Math.floor,
    ceil: Math.ceil,
    round: Math.round,
    max: Math.max,
    min: Math.min,
    abs: Math.abs,
    pow: Math.pow,
    sqrt: Math.sqrt,
    // ID生成和时间
    generateId: () => Math.random().toString(36).substring(2, 15),
    now: () => Date.now(),
  };

  // console.log("🛡️ Worker沙盒环境已初始化");
}

// 初始化沙盒环境
initializeWorkerSandbox();

// 在沙盒环境中创建GameEngine实例
const gameEngine = new GameEngine();

// 🔥 关键：订阅引擎状态变化事件（加入节流与轻量DTO）
let engineStateSubscription: (() => void) | null = null;
let lastEngineViewSentAt = 0;
const ENGINE_VIEW_MAX_HZ = 20; // <= 20Hz
const ENGINE_VIEW_MIN_INTERVAL = 1000 / ENGINE_VIEW_MAX_HZ;
// 低频全量状态推送
const FULL_STATS_INTERVAL_MS = 2000;
let fullStatsInterval: number | null = null;

// 成员状态订阅管理
const memberWatchUnsubMap = new Map<string, () => void>();
const memberLastValueMap = new Map<string, string>();

type EngineView = {
  frameNumber: number;
  runTime: number;
  frameLoop: {
    averageFPS: number;
    averageFrameTime: number;
    totalFrames: number;
    totalRunTime: number;
    clockKind?: "raf" | "timeout";
    skippedFrames?: number;
    frameBudgetMs?: number;
  };
  eventQueue: {
    currentSize: number;
    totalProcessed: number;
    totalInserted: number;
    overflowCount: number;
  };
};

function projectEngineView(stats: any): EngineView {
  return {
    frameNumber: stats.currentFrame,
    runTime: stats.runTime,
    frameLoop: {
      averageFPS: stats.frameLoopStats?.averageFPS ?? 0,
      averageFrameTime: stats.frameLoopStats?.averageFrameTime ?? 0,
      totalFrames: stats.frameLoopStats?.totalFrames ?? 0,
      totalRunTime: stats.frameLoopStats?.totalRunTime ?? 0,
      clockKind: stats.frameLoopStats?.clockKind,
      skippedFrames: stats.frameLoopStats?.skippedFrames,
      frameBudgetMs: stats.frameLoopStats?.frameBudgetMs,
    },
    eventQueue: {
      currentSize: stats.eventQueueStats?.currentSize ?? 0,
      totalProcessed: stats.eventQueueStats?.totalProcessed ?? 0,
      totalInserted: stats.eventQueueStats?.totalInserted ?? 0,
      overflowCount: stats.eventQueueStats?.overflowCount ?? 0,
    },
  };
}

// 处理主线程消息 - 只处理初始化
self.onmessage = async (event: MessageEvent<MainThreadMessage>) => {
  const { type, port } = event.data;

  try {
    switch (type) {
      case "init":
        // 初始化Worker，设置MessageChannel
        if (!port) {
          throw new Error("Missing MessagePort for worker initialization");
        }
        const messagePort: MessagePort = port;
        {
          // 设置MessageChannel端口用于任务通信
          messagePort.onmessage = async (portEvent: MessageEvent<PortMessage>) => {
            const { taskId: portTaskId, type: portType, data: portData } = portEvent.data;
            const startTime = performance.now();

            try {
              let portResult: WorkerTaskResult<any>;

              switch (portType) {
                case "start_simulation":
                  // 初始化战斗数据
                  const simulatorData: SimulatorWithRelations = portData as SimulatorWithRelations;
                  // console.log("🛡️ Worker: 在沙盒中启动模拟，数据:", simulatorData);

                  // 添加阵营A
                  gameEngine.addCamp("campA", "阵营A");
                  simulatorData.campA.forEach((team, index) => {
                    gameEngine.addTeam("campA", team, `队伍${index + 1}`);
                    team.members.forEach((member) => {
                      gameEngine.addMember("campA", team.id, member, {
                        currentHp: 1000,
                        currentMp: 100,
                        position: { x: 100 + index * 50, y: 100 },
                      });
                    });
                  });

                  // 添加阵营B
                  gameEngine.addCamp("campB", "阵营B");
                  simulatorData.campB.forEach((team, index) => {
                    gameEngine.addTeam("campB", team, `队伍${index + 1}`);
                    team.members.forEach((member) => {
                      gameEngine.addMember("campB", team.id, member as any, {
                        currentHp: 1000,
                        currentMp: 100,
                        position: { x: 500 + index * 50, y: 100 },
                      });
                    });
                  });

                  // 启动引擎
                  gameEngine.start();

                  // 若停止流程中取消了订阅，则在重新启动后恢复引擎状态订阅（<=20Hz）
                  if (!engineStateSubscription) {
                    engineStateSubscription = gameEngine.onStateChange((stats) => {
                      const now = performance.now();
                      if (now - lastEngineViewSentAt < ENGINE_VIEW_MIN_INTERVAL) {
                        return;
                      }
                      lastEngineViewSentAt = now;

                      const view = projectEngineView(stats);
                      try {
                        EngineViewSchema.parse(view);
                      } catch {}
                      const serializableEvent = {
                        type: "engine_state_update",
                        timestamp: Date.now(),
                        engineView: view,
                      } as const;

                      postSystemMessage(messagePort, serializableEvent.type, serializableEvent);
                    });
                  }

                  // 周期性推送全量 EngineStats（仅在引擎启动后开启）
                  if (!fullStatsInterval) {
                    try {
                      // 启动后立即推送一次全量，保证首帧数据水合
                      const stats = gameEngine.getStats();
                      postSystemMessage(messagePort, "engine_stats_full", stats);
                    } catch {}
                    fullStatsInterval = setInterval(() => {
                      try {
                        const stats = gameEngine.getStats();
                        postSystemMessage(messagePort, "engine_stats_full", stats);
                      } catch {}
                    }, FULL_STATS_INTERVAL_MS) as unknown as number;
                  }

                  portResult = { success: true };
                  break;

                case "stop_simulation":
                  // 停止状态订阅
                  try {
                    engineStateSubscription?.();
                  } catch {}
                  engineStateSubscription = null;

                  // 清理全量推送定时器
                  if (fullStatsInterval) {
                    try {
                      clearInterval(fullStatsInterval as unknown as number);
                    } catch {}
                    fullStatsInterval = null;
                  }

                  // 取消所有成员监听
                  try {
                    for (const unsub of memberWatchUnsubMap.values()) {
                      try {
                        unsub();
                      } catch {}
                    }
                    memberWatchUnsubMap.clear();
                    memberLastValueMap.clear();
                  } catch {}

                  // 停止并清理引擎
                  gameEngine.stop();
                  gameEngine.cleanup();

                  // 在停止后立即推送一次全量 EngineStats，驱动前端从 stopping -> ready
                  try {
                    const stats = gameEngine.getStats();
                    postSystemMessage(messagePort, "engine_stats_full", stats);
                  } catch {}
                  portResult = { success: true };
                  break;

                case "pause_simulation":
                  gameEngine.pause();
                  portResult = { success: true };
                  break;

                case "resume_simulation":
                  gameEngine.resume();
                  portResult = { success: true };
                  break;

                case "get_snapshot":
                  const snapshot = gameEngine.getCurrentSnapshot();
                  portResult = { success: true, data: snapshot };
                  break;

                case "get_stats":
                  const stats = gameEngine.getStats();
                  portResult = { success: true, data: stats };
                  break;

                case "get_members":
                  // 获取所有成员数据（使用序列化接口）
                  try {
                    const members = gameEngine.getAllMemberData();
                    portResult = { success: true, data: members };
                  } catch (error) {
                    portResult = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
                    console.error(`Worker: 获取成员数据失败:`, error);
                  }
                  break;

                case "get_member_state": {
                  const memberId = String(portData?.memberId || "");
                  if (!memberId) {
                    portResult = { success: false, error: "memberId required" };
                    break;
                  }
                  const member = gameEngine.findMember(memberId);
                  if (!member) {
                    portResult = { success: false, error: "member not found" };
                    break;
                  }
                  try {
                    const snap: any = member.getSnapshot();
                    const value = String(snap?.value ?? "");
                    portResult = { success: true, data: { memberId, value } };
                  } catch (e) {
                    portResult = { success: false, error: e instanceof Error ? e.message : "Unknown error" };
                  }
                  break;
                }

                case "watch_member": {
                  const memberId = String(portData?.memberId || "");
                  if (!memberId) {
                    portResult = { success: false, error: "memberId required" };
                    break;
                  }

                  // 取消旧订阅
                  memberWatchUnsubMap.get(memberId)?.();

                  const actor = gameEngine.findMember(memberId);
                  if (!actor) {
                    portResult = { success: false, error: "member not found" };
                    break;
                  }

                  try {
                    // 订阅 Actor 状态变化
                    const unsub = actor.subscribe((snapshot: any) => {
                      if (!snapshot.changed) return;

                      const prevValue = memberLastValueMap.get(memberId);
                      const nextValue = String(snapshot.value || "unknown");

                      if (prevValue === nextValue) return;
                      memberLastValueMap.set(memberId, nextValue);

                      // 获取成员的基本信息（从 entry 中获取）
                      const entry = gameEngine.getMemberManager().getMemberEntry(memberId);

                      // 发送状态更新消息
                      postSystemMessage(messagePort, "member_state_update", {
                        memberId,
                        value: nextValue,
                        context: {
                          // 从 entry 的响应式系统获取属性值
                          hp: entry?.attrs?.getValue?.("hp.current") || 0,
                          mp: entry?.attrs?.getValue?.("mp.current") || 0,
                          position: { x: 0, y: 0 }, // 暂时使用默认值
                          targetId: "", // 暂时使用默认值
                        },
                      });
                    });

                    // 处理订阅返回的取消函数
                    let finalUnsub: () => void;
                    if (typeof unsub === "function") {
                      finalUnsub = unsub;
                    } else if (unsub && typeof unsub.unsubscribe === "function") {
                      finalUnsub = () => unsub.unsubscribe();
                    } else {
                      // 后备方案：无操作（不同 xstate 版本订阅类型不一致时）
                      finalUnsub = () => {};
                    }

                    memberWatchUnsubMap.set(memberId, finalUnsub);
                    portResult = { success: true };
                    console.log(`👁️ 开始监听成员状态: ${memberId}`);
                  } catch (error) {
                    console.error(`❌ 监听成员状态失败: ${memberId}`, error);
                    portResult = {
                      success: false,
                      error: error instanceof Error ? error.message : "Subscription failed",
                    };
                  }
                  break;
                }

                case "unwatch_member": {
                  const memberId = String(portData?.memberId || "");

                  try {
                    // 调用取消订阅函数
                    const unsub = memberWatchUnsubMap.get(memberId);
                    if (unsub) {
                      unsub();
                      console.log(`👁️ 停止监听成员状态: ${memberId}`);
                    }
                  } catch (error) {
                    console.warn(`⚠️ 取消订阅失败: ${memberId}`, error);
                  }

                  // 清理相关数据
                  memberLastValueMap.delete(memberId);
                  memberWatchUnsubMap.delete(memberId);

                  portResult = { success: true };
                  break;
                }

                case "send_intent":
                  // 处理意图消息（可能包含JS片段）
                  const intent = portData as IntentMessage;
                  // console.log(`🛡️ Worker: 在沙盒中处理意图消息:`, intent);
                  if (intent && intent.type) {
                    try {
                      const result = await gameEngine.processIntent(intent);
                      portResult = { success: result.success, error: result.error };
                      console.log(`Worker: 处理意图消息成功: ${intent.type}`);
                    } catch (error) {
                      portResult = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
                      console.error(`Worker: 处理意图消息失败:`, error);
                    }
                  } else {
                    portResult = { success: false, error: "Invalid intent data" };
                    console.error(`Worker: 意图数据无效:`, intent);
                  }
                  break;

                default:
                  throw new Error(`未知消息类型: ${portType}`);
              }

              // 计算执行时间
              const endTime = performance.now();
              const duration = endTime - startTime;

              // 返回结果给SimulatorPool
              const response: WorkerResponse = {
                taskId: portTaskId,
                result: portResult,
                error: null,
                metrics: {
                  duration,
                  memoryUsage: 0, // 浏览器环境无法获取精确内存使用
                },
              };
              messagePort.postMessage(response);
            } catch (error) {
              // 计算执行时间
              const endTime = performance.now();
              const duration = endTime - startTime;

              // 返回错误给SimulatorPool
              const errorResponse: WorkerResponse = {
                taskId: portTaskId,
                result: null,
                error: error instanceof Error ? error.message : String(error),
                metrics: {
                  duration,
                  memoryUsage: 0,
                },
              };
              messagePort.postMessage(errorResponse);
            }
          };
        }

        // 🔥 关键：设置引擎状态变化订阅（<=20Hz 节流 + 轻量 EngineView）
        engineStateSubscription = gameEngine.onStateChange((stats) => {
          const now = performance.now();
          if (now - lastEngineViewSentAt < ENGINE_VIEW_MIN_INTERVAL) {
            return;
          }
          lastEngineViewSentAt = now;

          const view = projectEngineView(stats);
          // 轻量校验（防御）：避免偶发结构变化导致主端崩溃
          try {
            EngineViewSchema.parse(view);
          } catch {}
          const serializableEvent = {
            type: "engine_state_update",
            timestamp: Date.now(),
            engineView: view,
          } as const;

          postSystemMessage(messagePort, serializableEvent.type, serializableEvent);
        });

        // 提供渲染通道的统一出口：用于FSM发送渲染指令（透传到主线程）
        ;(gameEngine as any).postRenderMessage = (payload: any) => {
          try {
            messagePort.postMessage(payload);
          } catch {}
        };

        // 周期性全量 EngineStats 推送改为在 start_simulation 后启动

        // Worker初始化完成，不需要通知主线程
        return;

      default:
        throw new Error(`未知消息类型: ${type}`);
    }
  } catch (error) {
    // 初始化错误，通过MessageChannel返回
    console.error("Worker初始化失败:", error);
    try {
      if (typeof port !== "undefined" && port) {
        postSystemMessage(port as MessagePort, "system_event", { level: "error", message: String(error) });
      }
    } catch {}
  }
};

// ==================== 统一系统消息出口 ====================
function postSystemMessage(
  port: MessagePort,
  type: "engine_state_update" | "engine_stats_full" | "member_state_update" | "system_event",
  data: any,
) {
  const msg = { taskId: type, type, data } as const;
  port?.postMessage(msg);
}
