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

import type GameEngine from "./GameEngine";
import {
  IntentMessage,
  IntentMessageType,
  IntentMessageSchema,
  MessageProcessResult,
  MessageRouterStats,
} from "./thread/messages";

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
        // console.log(
        //   `🔍 MessageRouter: 发送事件到FSM前，成员 ${targetMember.getName()} 当前状态:`,
        //   targetMember.getFSM().getSnapshot().value,
        // );

        // 输入意图到 FSM 事件的映射（解耦 UI/意图 与 内部 FSM 事件语义）
        const mapped = this.mapIntentToFsmEvent(targetMember, message);
        // console.log(`🔍 MessageRouter: 发送的事件:`, mapped);

        targetMember.getFSM().send(mapped as any);

        // const newState = targetMember.getFSM().getSnapshot();
        // console.log(`🔍 MessageRouter: 发送事件到FSM后，成员 ${targetMember.getName()} 新状态:`, newState.value);

        this.stats.successfulMessages++;
        // console.log(`MessageRouter: 分发消息成功: ${message.type} -> ${targetMember.getName()}`);

        return {
          success: true,
          message: `消息已分发到 ${targetMember.getName()}`,
          error: undefined,
        };
      } catch (fsmError: any) {
        this.stats.failedMessages++;
        console.warn(`MessageRouter: 分发消息失败: ${message.type} -> ${targetMember.getName()}`, fsmError);

        return {
          success: false,
          message: `FSM处理失败: ${targetMember.getName()}`,
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
      ...this.stats,
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
    };
  }

  /**
   * 获取支持的消息类型
   *
   * @returns 支持的消息类型数组
   */
  getSupportedMessageTypes(): IntentMessageType[] {
    return ["cast_skill", "move", "stop_action", "use_item", "target_change", "block", "dodge", "custom"];
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

  /**
   * 将外部意图映射为目标成员 FSM 事件
   * 目前最小实现：cast_skill -> skill_press（Player FSM 期望的事件）
   */
  private mapIntentToFsmEvent(
    _targetMember: any,
    message: IntentMessage,
  ): { type: string; data?: Record<string, any> } {
    // 最小实现：意图名即事件名；特例映射外置到 mapper（后续可注入）
    const { type, data } = message;
    if (type === "cast_skill") {
      const skillId = (data as any)?.skillId;
      return { type: "skill_press", data: { skillId, ...data } };
    }
    return { type, data } as any;
  }
}

// ============================== 导出 ==============================

export default MessageRouter;
