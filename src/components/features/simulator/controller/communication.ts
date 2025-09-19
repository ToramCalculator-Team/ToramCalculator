/**
 * 重构后的通信层
 * 
 * 核心理念：纯粹的代理层，不做任何业务逻辑
 * 1. 状态机命令 - 直接转发
 * 2. 成员操作 - 直接转发
 * 3. 数据获取 - 直接转发
 */

import { EngineCommand } from "../core/GameEngineSM";
import { IntentMessage, IntentMessageType } from "../core/MessageRouter";
import { realtimeSimulatorPool } from "../core/thread/SimulatorPool";
import type { SimulatorWithRelations } from "@db/repositories/simulator";

// ============================== 纯代理通信层 ==============================

export class ControllerInputCommunication {

  // ==================== 连接管理 - 纯代理 ====================
  
  isReady(): boolean {
    return realtimeSimulatorPool.isReady();
  }

  // ==================== 引擎操作 - 纯代理 ====================

  async sendEngineCommand(command: EngineCommand) {
    return realtimeSimulatorPool.sendEngineCommand(command);
  }

  // ==================== 成员操作 - 统一Intent处理 ====================

  private createIntent(type: IntentMessageType, targetMemberId: string, data: any = {}): IntentMessage {
    return {
      id: Date.now().toString(),
      timestamp: Date.now(),
      type,
      targetMemberId,
      data
    };
  }

  async selectTarget(sourceMemberId: string, targetMemberId: string) {
    return realtimeSimulatorPool.sendIntent(
      this.createIntent("切换目标", sourceMemberId, { targetId: targetMemberId })
    );
  }

  async castSkill(memberId: string, skillId: string) {
    return realtimeSimulatorPool.sendIntent(
      this.createIntent("使用技能", memberId, { skillId })
    );
  }

  async moveMember(memberId: string, x: number, y: number) {
    return realtimeSimulatorPool.sendIntent(
      this.createIntent("移动", memberId, { position: { x, y } })
    );
  }

  async stopMemberAction(memberId: string) {
    return realtimeSimulatorPool.sendIntent(
      this.createIntent("停止移动", memberId)
    );
  }

  // ==================== 数据获取 - 纯代理 ====================
  
  async getMembers() {
    return realtimeSimulatorPool.getMembers();
  }

  async getMemberState(memberId: string) {
    return realtimeSimulatorPool.getMemberState(memberId);
  }

  // ==================== 事件监听 - 纯代理 ====================
  
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
