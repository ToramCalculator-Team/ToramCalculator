/**
 * 消息路由器 - 分发外部指令到FSM
 * 
 * 核心职责（根据架构文档）：
 * 1. 接收外部指令（控制器/AI）
 * 2. 分发给相应的 FSM / 实例处理
 * 3. 返回处理结果给调用者
 * 
 * 设计理念：
 * - 纯分发：只负责路由，不处理业务逻辑
 * - FSM驱动：让FSM负责根据消息生成事件
 * - 简单直接：最小化职责，最大化可维护性
 * - 类型安全：使用TypeScript确保消息类型正确
 */

import { MemberManager } from "./MemberManager";
import type GameEngine from "./GameEngine";

// ============================== 类型定义 ==============================


/**
 * 消息路由统计接口 - 对应MessageRouter.getStats()的返回类型
 */
export interface MessageRouterStats {
  totalMessagesProcessed: number;
  successfulMessages: number;
  failedMessages: number;
  lastProcessedTimestamp: number;
  successRate: string;
}

/**
 * 意图消息接口
 * 外部控制器发送的意图指令
 */
export interface IntentMessage {
  /** 消息ID */
  id: string;
  /** 消息类型 */
  type: IntentMessageType;
  /** 目标成员ID */
  targetMemberId: string;
  /** 发送时间戳 */
  timestamp: number;
  /** 消息数据 */
  data: Record<string, any>;
}

/**
 * 意图消息类型枚举
 */
export type IntentMessageType =
  | "cast_skill"      // 释放技能
  | "move"            // 移动
  | "stop_action"     // 停止动作
  | "use_item"        // 使用道具
  | "target_change"   // 切换目标
  | "block"           // 格挡
  | "dodge"           // 闪躲
  | "custom";         // 自定义意图

/**
 * 消息处理结果接口
 */
export interface MessageProcessResult {
  /** 处理是否成功 */
  success: boolean;
  /** 结果消息 */
  message: string;
  /** 错误信息（如果失败） */
  error?: string;
}

// ============================== 消息路由器类 ==============================

/**
 * 消息路由器类
 * 负责接收和分发外部指令到FSM
 */
export class MessageRouter {
  // ==================== 私有属性 ====================

  /** 游戏引擎引用 */
  private engine: GameEngine;

  /** 消息处理统计 */
  private stats = {
    totalMessagesProcessed: 0,
    successfulMessages: 0,
    failedMessages: 0,
    lastProcessedTimestamp: 0,
  };

  // ==================== 构造函数 ====================

  /**
   * 构造函数
   * 
   * @param engine 游戏引擎实例
   */
  constructor(engine: GameEngine) {
    this.engine = engine;
  }

  // ==================== 公共接口 ====================

  /**
   * 处理意图消息
   * 将消息分发到目标成员的FSM
   * 
   * @param message 意图消息
   * @returns 处理结果
   */
  async processMessage(message: IntentMessage): Promise<MessageProcessResult> {
    try {
      this.stats.totalMessagesProcessed++;
      this.stats.lastProcessedTimestamp = Date.now();

      // 验证消息格式
      if (!this.validateMessage(message)) {
        return {
          success: false,
          message: "消息格式无效",
          error: "Invalid message format"
        };
      }

      // 获取目标成员
      const targetMember = this.engine.getMemberManager().getMember(message.targetMemberId);
      if (!targetMember) {
        return {
          success: false,
          message: `目标成员不存在: ${message.targetMemberId}`,
          error: "Target member not found"
        };
      }

      // 检查成员是否可以接受输入
      if (!targetMember.canAcceptInput()) {
        return {
          success: false,
          message: `成员当前无法接受输入: ${targetMember.getName()}`,
          error: "Member cannot accept input"
        };
      }

      // 将消息发送到成员的FSM
      // FSM负责根据消息生成事件并写入事件队列
      try {
        // 调试：检查FSM当前状态
        const currentState = targetMember.getFSM().getSnapshot();
        console.log(`🔍 MessageRouter: 发送事件到FSM前，成员 ${targetMember.getName()} 当前状态:`, currentState.value);
        console.log(`🔍 MessageRouter: 发送的事件:`, { type: message.type, data: message.data });
        
        targetMember.getFSM().send({
          type: message.type,
          data: message.data,
        });

        // 调试：检查FSM状态是否有变化
        const newState = targetMember.getFSM().getSnapshot();
        console.log(`🔍 MessageRouter: 发送事件到FSM后，成员 ${targetMember.getName()} 新状态:`, newState.value);

        // 更新统计
        this.stats.successfulMessages++;

        console.log(`MessageRouter: 分发消息成功: ${message.type} -> ${targetMember.getName()}`);
        
        return {
          success: true,
          message: `消息已分发到 ${targetMember.getName()}`,
          error: undefined
        };
      } catch (fsmError: any) {
        // 更新统计
        this.stats.failedMessages++;

        console.warn(`MessageRouter: 分发消息失败: ${message.type} -> ${targetMember.getName()}`, fsmError);
        
        return {
          success: false,
          message: `FSM处理失败: ${targetMember.getName()}`,
          error: fsmError.message
        };
      }

    } catch (error: any) {
      this.stats.failedMessages++;
      console.error("MessageRouter: 分发消息时发生错误:", error);
      
      return {
        success: false,
        message: "分发消息时发生内部错误",
        error: error.message
      };
    }
  }

  /**
   * 批量处理消息
   * 
   * @param messages 消息数组
   * @returns 处理结果数组
   */
  async processMessages(messages: IntentMessage[]): Promise<MessageProcessResult[]> {
    const results: MessageProcessResult[] = [];
    
    for (const message of messages) {
      const result = await this.processMessage(message);
      results.push(result);
    }
    
    return results;
  }

  /**
   * 获取处理统计信息
   * 
   * @returns 统计信息
   */
  getStats(): MessageRouterStats {
    return {
      ...this.stats,
      successRate: this.stats.totalMessagesProcessed > 0 
        ? (this.stats.successfulMessages / this.stats.totalMessagesProcessed * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      totalMessagesProcessed: 0,
      successfulMessages: 0,
      failedMessages: 0,
      lastProcessedTimestamp: 0,
    };
  }

  /**
   * 获取支持的消息类型
   * 
   * @returns 支持的消息类型数组
   */
  getSupportedMessageTypes(): IntentMessageType[] {
    return [
      "cast_skill",
      "move", 
      "stop_action",
      "use_item",
      "target_change",
      "block",
      "dodge",
      "custom"
    ];
  }

  /**
   * 检查是否支持指定消息类型
   * 
   * @param messageType 消息类型
   * @returns 是否支持
   */
  supportsMessageType(messageType: IntentMessageType): boolean {
    return this.getSupportedMessageTypes().includes(messageType);
  }

  // ==================== 私有方法 ====================

  /**
   * 验证消息格式
   */
  private validateMessage(message: IntentMessage): boolean {
    return !!(
      message.id &&
      message.type &&
      message.targetMemberId &&
      message.timestamp &&
      message.data &&
      typeof message.data === 'object'
    );
  }
}

// ============================== 导出 ==============================

export default MessageRouter; 