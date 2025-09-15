/**
 * 控制器输入通信层
 * 
 * 职责：
 * - 处理玩家输入指令 → Worker
 * - 管理模拟器控制
 * - 获取状态数据
 */

import { IntentMessage } from "../core/MessageRouter";
import { realtimeSimulatorPool } from "../core/thread/SimulatorPool";
import type { SimulatorWithRelations } from "@db/repositories/simulator";

// ============================== 简化的通信管理器 ==============================

export class ControllerInputCommunication {
  private isConnected = false;

  // ==================== 连接管理 ====================
  
  checkConnection(): boolean {
    try {
      this.isConnected = realtimeSimulatorPool.isReady();
      return this.isConnected;
    } catch {
      this.isConnected = false;
      return false;
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  // ==================== 模拟控制 ====================
  
  async startSimulation(simulatorData: SimulatorWithRelations) {
    return await realtimeSimulatorPool.startSimulation(simulatorData);
  }

  async stopSimulation() {
    return await realtimeSimulatorPool.stopSimulation();
  }

  async pauseSimulation() {
    return await realtimeSimulatorPool.pauseSimulation();
  }

  async resumeSimulation() {
    return await realtimeSimulatorPool.resumeSimulation();
  }

  // ==================== 成员操作 ====================


  async selectTarget(sourceMemberId: string, targetMemberId: string) {
    const intent: IntentMessage = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      type: "切换目标",
      targetMemberId: sourceMemberId, // 接收事件的成员（施法者）
      data: { targetId: targetMemberId } // 被选择的目标ID
    };
    return await realtimeSimulatorPool.sendIntent(intent);
  }

  async castSkill(memberId: string, skillId: string) {
    const intent: IntentMessage = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      type: "使用技能",
      targetMemberId: memberId,
      data: { skillId }
    };
    return await realtimeSimulatorPool.sendIntent(intent);
  }

  async moveMember(memberId: string, x: number, y: number) {
    const intent: IntentMessage = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      type: "移动",
      targetMemberId: memberId,
      data: { position: { x, y } }
    };
    return await realtimeSimulatorPool.sendIntent(intent);
  }

  async stopMemberAction(memberId: string) {
    const intent: IntentMessage = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      type: "停止移动",
      targetMemberId: memberId,
      data: {}
    };
    return await realtimeSimulatorPool.sendIntent(intent);
  }

  // ==================== 数据获取 ====================
  
  async getMembers() {
    return await realtimeSimulatorPool.getMembers();
  }

  async getMemberState(memberId: string) {
    return await realtimeSimulatorPool.getMemberState(memberId);
  }

  // ==================== 事件监听 ====================
  
  on(event: string, callback: Function) {
    realtimeSimulatorPool.on(event, callback);
    return () => realtimeSimulatorPool.off(event, callback);
  }

  off(event: string, callback: Function) {
    realtimeSimulatorPool.off(event, callback);
  }
}

// ============================== 导出单例 ==============================

export const controllerInputCommunication = new ControllerInputCommunication();
