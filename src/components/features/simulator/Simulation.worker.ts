/**
 * 沙盒化的模拟器Worker
 * 将GameEngine运行在安全沙盒环境中
 */

import { GameEngine } from "./core/GameEngine";
import type { SimulatorWithRelations } from "@db/repositories/simulator";
import type { IntentMessage } from "./core/MessageRouter";

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
interface WorkerResponse {
  taskId: string;
  result?: {
    success: boolean;
    data?: any;
    error?: string;
  } | null;
  error?: string | null;
  metrics?: {
    duration: number;
    memoryUsage: number;
  };
}

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

// 🔥 关键：订阅引擎状态变化事件
let engineStateSubscription: (() => void) | null = null;

// 处理主线程消息 - 只处理初始化
self.onmessage = async (event: MessageEvent<MainThreadMessage>) => {
  const { type, port } = event.data;

  try {
    switch (type) {
      case "init":
        // 初始化Worker，设置MessageChannel
        if (port) {
          // 设置MessageChannel端口用于任务通信
          port.onmessage = async (portEvent: MessageEvent<PortMessage>) => {
            const { taskId: portTaskId, type: portType, data: portData } = portEvent.data;
            const startTime = performance.now();

            try {
              let portResult: {
                success: boolean;
                data?: any;
                error?: string;
              };

              switch (portType) {
                case "start_simulation":
                  // 初始化战斗数据
                  const simulatorData: SimulatorWithRelations = portData as SimulatorWithRelations;
                  console.log("🛡️ Worker: 在沙盒中启动模拟，数据:", simulatorData);
                  
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
                  
                  // 验证成员是否添加成功
                  const initialMembers = gameEngine.getAllMemberData();
                  console.log(`👹 [Worker] 启动后成员数量: ${initialMembers.length}`);
                  console.log(`👹 [Worker] 启动后成员列表:`, initialMembers.map(m => m.id));
                  
                  portResult = { success: true };
                  break;

                case "stop_simulation":
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

                case "process_intent":
                  portResult = await gameEngine.processIntent(portData as IntentMessage);
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
                    console.log(`👹 [Worker] 返回成员数据: ${members.length} 个成员`);
                    console.log(`👹 [Worker] 成员列表:`, members.map(m => m.id));
                    portResult = { success: true, data: members };
                  } catch (error) {
                    portResult = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
                    console.error(`Worker: 获取成员数据失败:`, error);
                  }
                  break;

                case "send_intent":
                  // 处理意图消息（可能包含JS片段）
                  const intent = portData as IntentMessage;
                  console.log(`🛡️ Worker: 在沙盒中处理意图消息:`, intent);
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
              port.postMessage(response);
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
              port.postMessage(errorResponse);
            }
          };
        }

        // 🔥 关键：设置引擎状态变化订阅
        engineStateSubscription = gameEngine.onStateChange((event) => {
          // 将引擎事件通过MessageChannel转发给主线程
          // 注意：只传递可序列化的数据，避免函数等不可序列化对象
          const serializableEvent = {
            type: 'engine_state_update',
            timestamp: Date.now(),
            engineState: event
          };
          
          const stateChangeMessage = {
            taskId: "engine_state_update", // 使用特殊taskId标识系统事件
            type: "engine_state_update",
            data: serializableEvent,
          };
          port?.postMessage(stateChangeMessage);
        });

        // Worker初始化完成，不需要通知主线程
        return;

      default:
        throw new Error(`未知消息类型: ${type}`);
    }
  } catch (error) {
    // 初始化错误，通过MessageChannel返回
    console.error("Worker初始化失败:", error);
  }
};
