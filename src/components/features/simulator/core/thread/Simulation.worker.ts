/**
 * 沙盒化的模拟器Worker
 * 将GameEngine运行在安全沙盒环境中
 */

import { EngineStats, GameEngine, EngineViewSchema, type EngineView } from "../GameEngine";
import type { SimulatorWithRelations } from "@db/repositories/simulator";
import type { IntentMessage } from "../MessageRouter";

import { 
  prepareForTransfer, 
  sanitizeForPostMessage
} from "./MessageSerializer";

// ==================== 消息类型定义 ====================

/**
 * Worker任务结果类型
 */
interface WorkerTaskResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Worker响应消息类型 - 与SimulatorPool期望的格式一致
 */
type WorkerResponse<T = unknown> = {
  taskId: string;
  result: WorkerTaskResult<T> | null;
  error: string | null;
  metrics: {
    duration: number;
    memoryUsage: number;
  };
};

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
const gameEngine = new GameEngine({
  frameLoopConfig: {
    targetFPS: 60,
    enablePerformanceMonitoring: true,
  },
});

// 全局变量存储messagePort，供事件发射器回调使用
let globalMessagePort: MessagePort | null = null;

// 帧快照发送函数 - 直接在帧循环中调用
function sendFrameSnapshot(snapshot: any) {
  if (globalMessagePort && typeof postSystemMessage === 'function') {
    postSystemMessage(globalMessagePort, "frame_snapshot", snapshot);
  }
}

// 将发送函数挂载到引擎上，供FrameLoop调用
(gameEngine as any).sendFrameSnapshot = sendFrameSnapshot;





// EngineView类型已从messages.ts导入，无需重复定义

function projectEngineView(stats: EngineStats): EngineView {
  // 构建EngineView数据，使用EngineViewSchema进行验证
  const engineView = {
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
  
  // 使用EngineViewSchema验证数据
  return EngineViewSchema.parse(engineView);
}

// 处理主线程消息 - 只处理初始化
self.onmessage = async (event: MessageEvent<MainThreadMessage>) => {
  const { type, port } = event.data;

  try {
    switch (type) {
      case "init":
        // 初始化Worker，设置MessageChannel
        if (!port) {
          throw new Error("初始化失败，缺少MessagePort");
        }
        const messagePort: MessagePort = port;
        
        // 设置全局messagePort供事件发射器使用
        globalMessagePort = messagePort;
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
                  gameEngine.addCamp("campA");
                  simulatorData.campA.forEach((team, index) => {
                    gameEngine.addTeam("campA", team);
                    team.members.forEach((member) => {
                      gameEngine.addMember("campA", team.id, member);
                    });
                  });

                  // 添加阵营B
                  gameEngine.addCamp("campB");
                  simulatorData.campB.forEach((team, index) => {
                    gameEngine.addTeam("campB", team);
                    team.members.forEach((member) => {
                      gameEngine.addMember("campB", team.id, member);
                    });
                  });

                  // 启动引擎
                  gameEngine.start();





                  portResult = { success: true };
                  break;

                case "stop_simulation":






                  // 停止并清理引擎
                  gameEngine.stop();
                  gameEngine.cleanup();


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
                  const member = gameEngine.getMember(memberId);
                  if (!member) {
                    portResult = { success: false, error: "member not found" };
                    break;
                  }
                  try {
                    const snap: any = member.actor.getSnapshot();
                    const value = String(snap?.value ?? "");
                    portResult = { success: true, data: { memberId, value } };
                  } catch (e) {
                    portResult = { success: false, error: e instanceof Error ? e.message : "Unknown error" };
                  }
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



        // 设置渲染消息发送器：用于FSM发送渲染指令（透传到主线程）
        gameEngine.setRenderMessageSender((payload: any) => {
          try {
            messagePort.postMessage(payload);
          } catch (error) {
            console.error("Worker: 发送渲染消息失败:", error);
          }
        });

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
  type: "system_event" | "frame_snapshot",
  data: any,
) {
  // 使用共享的MessageSerializer确保数据可以安全地通过postMessage传递
  const sanitizedData = sanitizeForPostMessage(data);
  const msg = { taskId: type, type, data: sanitizedData } as const;
  
  try {
    const { message, transferables } = prepareForTransfer(msg);
    port?.postMessage(message, transferables);
  } catch (error) {
    console.error("Worker: 消息序列化失败:", error);
    // 如果序列化失败，尝试发送清理后的数据
    try {
      port?.postMessage({ taskId: type, type, data: sanitizedData });
    } catch (fallbackError) {
      console.error("Worker: 备用消息发送也失败:", fallbackError);
    }
  }
}

