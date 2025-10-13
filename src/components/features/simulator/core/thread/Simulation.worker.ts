/**
 * 沙盒化的模拟器Worker
 * 将GameEngine运行在安全沙盒环境中
 */

import { EngineStats, GameEngine, EngineViewSchema, type EngineView } from "../GameEngine";
import type { SimulatorWithRelations } from "@db/repositories/simulator";
import type { IntentMessage } from "../MessageRouter";

import { prepareForTransfer, sanitizeForPostMessage } from "../../../../../lib/WorkerPool/MessageSerializer";
import { createActor } from "xstate";
import { gameEngineSM, type EngineCommand, EngineCommandSchema } from "../GameEngineSM";
import { DataQueryCommand, SimulatorTaskMap, SimulatorTaskTypeMapValue, SimulatorTaskPriority, DataQueryCommandSchema } from "./SimulatorPool";
import { WorkerMessage, WorkerMessageEvent } from "~/lib/WorkerPool/type";

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
  if (globalMessagePort && typeof postSystemMessage === "function") {
    postSystemMessage(globalMessagePort, "frame_snapshot", snapshot);
  }
}

// 将发送函数挂载到引擎上，供FrameLoop调用
(gameEngine as any).sendFrameSnapshot = sendFrameSnapshot;

// 注释：引擎状态机现在已集成到 GameEngine 内部，不再需要单独的 Actor

// ==================== 数据查询处理函数 ====================

/**
 * 处理数据查询命令
 */
async function handleDataQuery(command: DataQueryCommand): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    switch (command.type) {
      case "get_members":
        const members = gameEngine.getAllMemberData();
        return { success: true, data: members };

      case "get_stats":
        const stats = gameEngine.getStats();
        return { success: true, data: stats };

      case "get_snapshot":
        const snapshot = gameEngine.getCurrentSnapshot();
        return { success: true, data: snapshot };

      case "get_member_state": {
        const memberId = command.memberId;
        if (!memberId) {
          return { success: false, error: "memberId required" };
        }
        const member = gameEngine.getMember(memberId);
        if (!member) {
          return { success: false, error: "member not found" };
        }
        try {
          const snap: any = member.actor.getSnapshot();
          const value = String(snap?.value ?? "");
          return { success: true, data: { memberId, value } };
        } catch (e) {
          return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
        }
      }

      case "send_intent": {
        const intent = command.intent;
        if (!intent || !intent.type) {
          return { success: false, error: "Invalid intent data" };
        }
        try {
          const result = await gameEngine.processIntent(intent);
          return { success: result.success, error: result.error };
        } catch (error) {
          return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
        }
      }

      default:
        return { success: false, error: `未知数据查询类型: ${(command as any).type}` };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// 处理主线程消息 - 只处理初始化
self.onmessage = async (event: MessageEvent<{ type: "init"; port?: MessagePort }>) => {
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

        // 设置引擎的镜像通信发送器
        gameEngine.setMirrorSender((msg: EngineCommand) => {
          try {
            messagePort.postMessage({ belongToTaskId: "engine_state_machine", type: "engine_state_machine", data: msg });
          } catch (error) {
            console.error("Worker: 发送镜像消息失败:", error);
          }
        });

        // 设置MessageChannel端口用于任务通信
        messagePort.onmessage = async (portEvent: MessageEvent<WorkerMessage<SimulatorTaskTypeMapValue, SimulatorTaskPriority>>) => {
          console.log("🔌 Worker: 收到消息", portEvent.data);
          const { belongToTaskId: portbelongToTaskId, payload, priority } = portEvent.data;
          const startTime = performance.now();

          try {
            // 检查命令是否存在
            if (!payload) {
              throw new Error("命令不能为空");
            }

            let portResult: { success: boolean; data?: any; error?: string };

            // 使用 Zod Schema 验证命令类型
            const engineCommandResult = EngineCommandSchema.safeParse(payload);
              const dataQueryResult = DataQueryCommandSchema.safeParse(payload);
            if (engineCommandResult.success) {
              // 状态机命令直接转发给引擎
              gameEngine.sendCommand(engineCommandResult.data);
              portResult = { success: true };
            } else if(dataQueryResult.success) {
              // 数据查询命令处理
              portResult = await handleDataQuery(dataQueryResult.data);
            } else {
              console.error(payload)
              console.error(engineCommandResult.error)
              console.error(dataQueryResult.error)
              throw new Error(`未知命令类型: ${(payload as any)?.type || 'undefined'}`);
            }

            // 计算执行时间
            const endTime = performance.now();
            const duration = endTime - startTime;

            // 返回结果给SimulatorPool
            const response: WorkerMessageEvent<any, SimulatorTaskMap, any> = {
              belongToTaskId: portbelongToTaskId,
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
            const errorResponse: WorkerMessageEvent<any, SimulatorTaskMap, any> = {
              belongToTaskId: portbelongToTaskId,
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

        // 设置渲染消息发送器：用于FSM发送渲染指令（通过系统消息格式）
        gameEngine.setRenderMessageSender((payload: any) => {
          try {
            console.log("🔌 Worker: 发送渲染消息到主线程", payload);
            postSystemMessage(messagePort, "render_cmd", payload);
          } catch (error) {
            console.error("Worker: 发送渲染消息失败:", error);
          }
        });

        // 设置系统消息发送器：用于发送系统级事件到控制器
        gameEngine.setSystemMessageSender((payload: any) => {
          try {
            console.log("🔌 Worker: 发送系统消息到主线程", payload);
            postSystemMessage(messagePort, "system_event", payload);
          } catch (error) {
            console.error("Worker: 发送系统消息失败:", error);
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
function postSystemMessage(port: MessagePort, type: "system_event" | "frame_snapshot" | "render_cmd", data: any) {
  // 使用共享的MessageSerializer确保数据可以安全地通过postMessage传递
  const sanitizedData = sanitizeForPostMessage(data);
  const msg = { belongToTaskId: type, type, data: sanitizedData } as const;

  try {
    const { message, transferables } = prepareForTransfer(msg);
    port?.postMessage(message, transferables);
  } catch (error) {
    console.error("Worker: 消息序列化失败:", error);
    // 如果序列化失败，尝试发送清理后的数据
    try {
      port?.postMessage({ belongToTaskId: type, type, data: sanitizedData });
    } catch (fallbackError) {
      console.error("Worker: 备用消息发送也失败:", fallbackError);
    }
  }
}
