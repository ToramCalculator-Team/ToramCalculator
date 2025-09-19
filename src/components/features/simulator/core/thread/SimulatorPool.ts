// ==================== 模拟器专用扩展 ====================

import { SimulatorWithRelations } from "@db/repositories/simulator";
import { PoolConfig, TaskExecutionResult, WorkerPool, WorkerWrapper } from "./WorkerPool";
import { IntentMessage } from "../MessageRouter";
import { MemberSerializeData } from "../member/Member";
import { EngineStats } from "../GameEngine";
import { EngineCommand } from "../GameEngineSM";
import { DataQueryCommand, WorkerMessage, TaskResult, WorkerSystemMessageSchema, WorkerMessageEvent } from "./messages";

/**
 * 模拟器线程池 - 基于通用 WorkerPool 的模拟器专用实现
 *
 * 提供模拟器业务特定的 API，同时保持通用线程池的核心功能
 */
export class SimulatorPool extends WorkerPool {
  constructor(config: PoolConfig = {}) {
    super(config);

    // 设置模拟器专用的事件处理器
    this.on("worker-message", (data: { worker: WorkerWrapper; event: WorkerMessageEvent }) => {
      // 检查是否是系统消息（通过 schema 验证）
      const parsed = WorkerSystemMessageSchema.safeParse(data.event);
      if (parsed.success) {
        const { type, data: eventData } = parsed.data;

      // 处理系统事件
      if (type === "system_event") {
        this.emit("system_event", { workerId: data.worker.id, event: eventData });
      }
      // 帧快照事件 - 每帧包含完整的引擎和成员状态
      else if (type === "frame_snapshot") {
        this.emit("frame_snapshot", { workerId: data.worker.id, event: eventData });
      }
        // 渲染指令事件 - 统一通过系统消息格式传递
        else if (type === "render_cmd") {
          this.emit("render_cmd", { workerId: data.worker.id, event: eventData });
        }
      }
      // 其他消息（如任务结果）不需要特殊处理，由 WorkerPool 处理
    });
  }

  /**
   * 发送引擎状态机命令
   */
  async sendEngineCommand(command: EngineCommand): Promise<TaskExecutionResult> {
    return this.executeTask("engine_command", command, "high");
  }

  /**
   * 发送意图消息
   */
  async sendIntent(intent: IntentMessage): Promise<{ success: boolean; error?: string }> {
    const command: DataQueryCommand = { type: "send_intent", intent };
    const result = await this.executeTask("data_query", command, "high");
    return {
      success: result.success,
      error: result.error,
    };
  }

  /**
   * 获取成员信息
   */
  async getMembers(): Promise<MemberSerializeData[]> {
    const command: DataQueryCommand = { type: "get_members" };
    const result = await this.executeTask("data_query", command, "low");

    const task = result.data as { success: boolean; data?: MemberSerializeData[] } | undefined;
    if (result.success && task?.success && Array.isArray(task.data)) {
      return task.data;
    }

    console.log("🔍 SimulatorPool.getMembers: 解析失败，返回空数组");
    return [];
  }

  /**
   * 获取引擎统计信息
   */
  async getEngineStats(): Promise<{ success: boolean; data?: EngineStats; error?: string }> {
    const command: DataQueryCommand = { type: "get_stats" };
    const result = await this.executeTask("data_query", command, "low");
    return {
      success: result.success,
      data: result.data,
      error: result.error,
    };
  }



  /** 拉取单个成员的当前 FSM 状态（即时同步一次） */
  async getMemberState(memberId: string): Promise<{ success: boolean; value?: string; error?: string }> {
    const command: DataQueryCommand = { type: "get_member_state", memberId };
    const result = await this.executeTask("data_query", command, "low");
    if (result.success && result.data?.success) {
      return { success: true, value: result.data.data?.value };
    }
    return { success: false, error: result.data?.error || result.error };
  }
}

// ==================== 实例导出 ====================

// 实时模拟实例 - 单Worker，适合实时控制
export const realtimeSimulatorPool = new SimulatorPool({
  maxWorkers: 1, // 单Worker用于实时模拟
  taskTimeout: 30000, // 实时模拟需要更快的响应
  maxRetries: 1, // 实时模拟减少重试次数
  maxQueueSize: 10, // 实时模拟减少队列大小
  monitorInterval: 5000, // 实时模拟更频繁的监控
});

// 批量计算实例 - 多Worker，适合并行计算
export const batchSimulatorPool = new SimulatorPool({
  maxWorkers: Math.min(navigator.hardwareConcurrency || 4, 6), // 多Worker用于并行计算
  taskTimeout: 60000, // 增加超时时间，战斗模拟可能需要更长时间
  maxRetries: 2, // 减少重试次数
  maxQueueSize: 100, // 减少队列大小
  monitorInterval: 10000, // 增加监控间隔
});

// 导出通用线程池类
export default WorkerPool;
