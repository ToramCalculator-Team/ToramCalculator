/**
 * 简化的控制器通信层
 * 
 * 职责：
 * - 与Worker通信
 * - 管理连接状态
 */

import { realtimeSimulatorPool } from "../core/thread/SimulatorPool";
import type { SimulatorWithRelations } from "@db/repositories/simulator";

// ============================== 简化的通信管理器 ==============================

export class ControllerCommunication {
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
  
  async selectMember(memberId: string) {
    // 不再需要订阅成员状态，因为每帧都会发送完整的帧快照
    return { success: true };
  }

  async castSkill(memberId: string, skillId: string) {
    const intent = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      type: "使用技能" as const,
      targetMemberId: memberId,
      data: { skillId }
    };
    return await realtimeSimulatorPool.sendIntent(intent);
  }

  async moveMember(memberId: string, x: number, y: number) {
    const intent = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      type: "move_command" as const,
      targetMemberId: memberId,
      data: { position: { x, y } }
    };
    return await realtimeSimulatorPool.sendIntent(intent);
  }

  async stopMemberAction(memberId: string) {
    const intent = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      type: "stop_move" as const,
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

export const controllerCommunication = new ControllerCommunication();
