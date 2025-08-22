/**
 * 模拟控制模块
 * 
 * 功能：
 * - 模拟器启动、停止、暂停、恢复逻辑
 * - 意图发送和处理
 * - Worker 通信管理
 */

import { createId } from "@paralleldrive/cuid2";
import { realtimeSimulatorPool } from "../core/thread/SimulatorPool";
import type { IntentMessage } from "../core/thread/messages";
import type { SimulatorWithRelations } from "@db/repositories/simulator";

// ============================== 模拟器控制逻辑 ==============================

/**
 * 启动模拟
 */
export async function startSimulation(simulatorData: SimulatorWithRelations): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await realtimeSimulatorPool.startSimulation(simulatorData);
    if (!result.success) {
      return { success: false, error: result.error || "启动模拟失败" };
    }

    console.log("✅ 模拟启动成功");
    
    // 启动成功后，主动拉取一次成员数据用于下拉框
    try {
      const members = await realtimeSimulatorPool.getMembers();
      return { success: true };
    } catch (e) {
      console.warn("获取成员失败（可稍后手动重试）", e);
      return { success: true };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "启动失败";
    console.error("❌ 启动模拟失败:", error);
    return { success: false, error: errorMessage };
  }
}

/**
 * 停止模拟
 */
export async function stopSimulation(): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await realtimeSimulatorPool.stopSimulation();
    if (!result.success) {
      return { success: false, error: result.error || "停止模拟失败" };
    }

    console.log("✅ 模拟停止成功");
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "停止失败";
    console.error("❌ 停止模拟失败:", error);
    return { success: false, error: errorMessage };
  }
}

/**
 * 暂停模拟
 */
export async function pauseSimulation(): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await realtimeSimulatorPool.pauseSimulation();
    if (!result.success) {
      return { success: false, error: result.error || "暂停模拟失败" };
    }

    console.log("✅ 模拟暂停成功");
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "暂停失败";
    console.error("❌ 暂停模拟失败:", error);
    return { success: false, error: errorMessage };
  }
}

/**
 * 恢复模拟
 */
export async function resumeSimulation(): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await realtimeSimulatorPool.resumeSimulation();
    if (!result.success) {
      return { success: false, error: result.error || "恢复模拟失败" };
    }

    console.log("✅ 模拟恢复成功");
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "恢复失败";
    console.error("❌ 恢复模拟失败:", error);
    return { success: false, error: errorMessage };
  }
}

/**
 * 发送意图
 */
export async function sendIntent(intent: Omit<IntentMessage, "id" | "timestamp">): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await realtimeSimulatorPool.sendIntent({
      ...intent,
      id: createId(),
      timestamp: Date.now(),
    });
    
    if (!result.success) {
      return { success: false, error: result.error || "发送意图失败" };
    }

    console.log("✅ 意图发送成功:", intent.type);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "发送意图失败";
    console.error("❌ 发送意图失败:", error);
    return { success: false, error: errorMessage };
  }
}

// ============================== Worker 管理 ==============================

/**
 * 检查 Worker 是否准备就绪
 */
export function checkWorkerReady(): boolean {
  try {
    return realtimeSimulatorPool.isReady();
  } catch (error) {
    console.error("检查 Worker 状态失败:", error);
    return false;
  }
}

/**
 * 获取成员列表
 */
export async function getMembers() {
  try {
    return await realtimeSimulatorPool.getMembers();
  } catch (error) {
    console.error("获取成员列表失败:", error);
    throw error;
  }
}

/**
 * 获取成员状态
 */
export async function getMemberState(memberId: string) {
  try {
    return await realtimeSimulatorPool.getMemberState(memberId);
  } catch (error) {
    console.error("获取成员状态失败:", error);
    throw error;
  }
}

/**
 * 监听成员状态
 */
export function watchMember(memberId: string) {
  try {
    realtimeSimulatorPool.watchMember(memberId);
  } catch (error) {
    console.error("监听成员失败:", error);
  }
}

/**
 * 取消监听成员状态
 */
export function unwatchMember(memberId: string) {
  try {
    realtimeSimulatorPool.unwatchMember(memberId);
  } catch (error) {
    console.error("取消监听成员失败:", error);
  }
}
