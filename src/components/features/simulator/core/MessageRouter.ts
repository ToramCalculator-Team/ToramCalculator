/**
 * 消息路由器 - 分发外部指令到FSM
 *
 * 核心职责（根据架构文档）：
 * 1. 接收外部指令（控制器/AI）
 * 2. 分发给相应的 FSM / 实例处理
 * 3. 返回处理结果给调用者
 * 4. 管理状态同步（向主线程发送状态更新）
 *
 * 设计理念：
 * - 纯分发：只负责路由，不处理业务逻辑
 * - FSM驱动：让FSM负责根据消息生成事件
 * - 简单直接：最小化职责，最大化可维护性
 * - 类型安全：使用TypeScript确保消息类型正确
 * - 状态同步：统一管理所有对外通信
 */

import type GameEngine from "./GameEngine";
import { z } from "zod";
import type { EventPriority, EventHandler, BaseEvent } from "./EventQueue";
import type { Member } from "./member/Member";
// 类型定义已移动到本文件，不再需要从messages.ts导入
import { sanitizeForPostMessage } from "./thread/MessageSerializer";

// ==================== 消息路由核心类型定义 ====================

/**
 * 意图消息类型枚举
 * 注意：状态机目前处于测试状态，状态名不一定稳定
 */
export const IntentMessageTypeEnum = z.enum([
  "使用技能",
  "move_command",
  "stop_move",
  "cast_end",
  "controlled",
  "charge_end",
  "hp_zero",
  "control_end",
  "skill_animation_end",
  "check_availability",
  "custom",
]);

export type IntentMessageType = z.infer<typeof IntentMessageTypeEnum>;

/**
 * 意图消息Schema
 */
export const IntentMessageSchema = z.object({
  id: z.string(),
  type: IntentMessageTypeEnum,
  targetMemberId: z.string(),
  timestamp: z.number(),
  data: z.record(z.any()),
});

export type IntentMessage = z.infer<typeof IntentMessageSchema>;

/**
 * 消息处理结果
 */
export interface MessageProcessResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * 消息路由统计
 */
export interface MessageRouterStats {
  totalMessagesProcessed: number;
  successfulMessages: number;
  failedMessages: number;
  lastProcessedTimestamp: number;
  successRate: string;
}

// ==================== 扩展的消息路由统计 ====================

/**
 * 扩展的消息路由统计接口
 * 包含额外的统计信息，如状态同步次数
 */
export interface ExtendedMessageRouterStats extends MessageRouterStats {
  /** 状态同步总次数 */
  totalStateSyncs: number;
}

// ==================== 状态同步接口 ====================

/**
 * 状态同步回调接口
 * 用于向主线程发送状态更新事件
 */
export interface StateSyncCallback {
  (eventType: string, data: any): void;
}

// ============================== 消息路由器类 ==============================

/**
 * 消息路由器类
 * 负责接收和分发外部指令到FSM，以及管理状态同步
 */
export class MessageRouter {
  // ==================== 私有属性 ====================

  /** 游戏引擎引用 */
  private engine: GameEngine;

  /** 状态同步回调函数 */
  private stateSyncCallback?: StateSyncCallback;

  /** 消息处理统计 */
  private stats = {
    totalMessagesProcessed: 0,
    successfulMessages: 0,
    failedMessages: 0,
    lastProcessedTimestamp: 0,
    totalStateSyncs: 0,
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
          error: "Invalid message format",
        };
      }

      // 获取目标成员
      const targetMember = this.engine.getMemberManager().getMember(message.targetMemberId);
      if (!targetMember) {
        return {
          success: false,
          message: `目标成员不存在: ${message.targetMemberId}`,
          error: "Target member not found",
        };
      }

      // 将消息发送到成员的FSM - 保持简洁的FSM驱动架构
      try {
        targetMember.actor.send(message);

        this.stats.successfulMessages++;

        return {
          success: true,
          message: `消息已分发到 ${targetMember.id}`,
          error: undefined,
        };
      } catch (fsmError: any) {
        this.stats.failedMessages++;
        console.warn(`MessageRouter: 分发消息失败: ${message.type} -> ${targetMember.id}`, fsmError);

        return {
          success: false,
          message: `FSM处理失败: ${targetMember.id}`,
          error: fsmError.message,
        };
      }
    } catch (error: any) {
      this.stats.failedMessages++;
      console.error("MessageRouter: 分发消息时发生错误:", error);

      return {
        success: false,
        message: "分发消息时发生内部错误",
        error: error.message,
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
  getStats(): ExtendedMessageRouterStats {
    return {
      totalMessagesProcessed: this.stats.totalMessagesProcessed,
      successfulMessages: this.stats.successfulMessages,
      failedMessages: this.stats.failedMessages,
      lastProcessedTimestamp: this.stats.lastProcessedTimestamp,
      successRate:
        this.stats.totalMessagesProcessed > 0
          ? ((this.stats.successfulMessages / this.stats.totalMessagesProcessed) * 100).toFixed(2) + "%"
          : "0%",
      totalStateSyncs: this.stats.totalStateSyncs,
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
      totalStateSyncs: 0,
    };
  }

  /**
   * 获取支持的消息类型
   *
   * @returns 支持的消息类型数组
   */
  getSupportedMessageTypes(): IntentMessageType[] {
    return [
      "使用技能",
      "move_command",
      "stop_move",
      "cast_end",
      "controlled",
      "charge_end",
      "hp_zero",
      "control_end",
      "skill_animation_end",
      "check_availability",
      "custom",
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

  // ==================== 状态同步管理 ====================

  /**
   * 设置状态同步回调函数
   * 用于向主线程发送状态更新事件
   *
   * @param callback 回调函数
   */
  setStateSyncCallback(callback: StateSyncCallback): void {
    this.stateSyncCallback = callback;
  }

  /**
   * 发送状态更新事件到主线程
   * 这是状态同步的核心方法
   *
   * @param eventType 事件类型
   * @param data 事件数据
   */
  syncState(eventType: string, data: any): void {
    if (this.stateSyncCallback) {
      // 使用共享的MessageSerializer确保数据可以安全地通过postMessage传递
      const safeData = sanitizeForPostMessage(data);
      this.stateSyncCallback(eventType, safeData);
      this.stats.totalStateSyncs++;
    }
  }

  /**
   * 发送成员状态更新事件
   * 专门用于成员状态机状态变化
   *
   * @param memberId 成员ID
   * @param state 状态快照
   */
  syncMemberState(memberId: string, state: any): void {
    // 使用统一的sanitizeForPostMessage处理XState状态快照
    const safeState = sanitizeForPostMessage(state);
    
    this.syncState("member_state_update", {
      memberId,
      state: safeState,
    });
  }

  // ==================== 私有方法 ====================

  /**
   * 验证消息格式
   */
  private validateMessage(message: IntentMessage): boolean {
    return IntentMessageSchema.safeParse(message).success;
  }
}

// ============================== 导出 ==============================

export default MessageRouter;
