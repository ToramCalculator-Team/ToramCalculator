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





// ============================== 消息路由器类 ==============================

/**
 * 消息路由器类
 * 负责接收和分发外部指令到FSM，以及管理状态同步
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
    successRate: "0%",
  } as MessageRouterStats;

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
  getStats(): MessageRouterStats {
    return {
      totalMessagesProcessed: this.stats.totalMessagesProcessed,
      successfulMessages: this.stats.successfulMessages,
      failedMessages: this.stats.failedMessages,
      lastProcessedTimestamp: this.stats.lastProcessedTimestamp,
      successRate:
        this.stats.totalMessagesProcessed > 0
          ? ((this.stats.successfulMessages / this.stats.totalMessagesProcessed) * 100).toFixed(2) + "%"
          : "0%",

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
      successRate: "0%",
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
