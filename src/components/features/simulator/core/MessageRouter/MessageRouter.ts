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

import { z } from "zod/v4";
import type { ControlBindingManager } from "../Controller/ControlBindingManager";
import type { GameEngine } from "../GameEngine";

// ==================== 消息路由核心类型定义 ====================

/**
 * 意图消息类型枚举
 *
 * 用户可输入的意图消息类型：
 * 1. 生命周期事件 - 复活
 * 2. 移动控制事件 - 移动、停止移动
 * 3. 技能使用事件 - 使用技能
 * 4. 防御操作事件 - 格挡、闪躲 (Player 特有)
 * 5. 目标管理事件 - 切换目标
 */
export const IntentMessageTypeEnum = z.enum([
	// === 生命周期事件 ===
	"复活",

	// === 移动控制事件 ===
	"移动",
	"停止移动",

	// === 技能使用事件 ===
	"使用技能",

	// === 防御操作事件 (Player 特有) ===
	"使用格挡",
	"结束格挡",
	"使用闪躲",

	// === 目标管理事件 ===
	"切换目标",

	// === 控制器绑定管理事件 ===
	"绑定控制对象",
	"解绑控制对象",
]);

export type IntentMessageType = z.output<typeof IntentMessageTypeEnum>;

/**
 * 意图消息Schema
 */
export const IntentMessageSchema = z.object({
	id: z.string(),
	type: IntentMessageTypeEnum,
	controllerId: z.string(), // 控制器ID，通过 binding 解析到 memberId
	timestamp: z.number(),
	data: z.any(),
});

export type IntentMessage = z.output<typeof IntentMessageSchema>;

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

// ============================== 消息路由器类 ==============================

/**
 * 消息路由器类
 * 负责接收和分发外部指令到FSM，以及管理状态同步
 */
export class MessageRouter {
	// ==================== 私有属性 ====================

	/** 游戏引擎引用 */
	private engine: GameEngine;

	/** 控制绑定管理器 */
	private bindingManager: ControlBindingManager;

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
	 * @param bindingManager 控制绑定管理器
	 */
	constructor(engine: GameEngine, bindingManager: ControlBindingManager) {
		this.engine = engine;
		this.bindingManager = bindingManager;
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

			// 处理控制器绑定管理意图
			if (message.type === "绑定控制对象") {
				try {
					const memberId = message.data?.memberId;
					if (!memberId) {
						return {
							success: false,
							message: "绑定控制对象失败: 缺少成员ID",
							error: "Missing member ID",
						};
					}

					this.bindingManager.bind(message.controllerId, memberId);

					// 发出相机跟随事件
					this.engine.emitCameraFollowEvent(message.controllerId, memberId);

					this.stats.successfulMessages++;

					return {
						success: true,
						message: `控制器 ${message.controllerId} 已绑定到成员 ${memberId}`,
						error: undefined,
					};
				} catch (error: any) {
					this.stats.failedMessages++;
					console.warn(`MessageRouter: 绑定控制对象失败:`, error);

					return {
						success: false,
						message: `绑定控制对象失败: ${error.message}`,
						error: error.message,
					};
				}
			}

			if (message.type === "解绑控制对象") {
				try {
					this.bindingManager.unbind(message.controllerId);

					this.stats.successfulMessages++;

					return {
						success: true,
						message: `控制器 ${message.controllerId} 已解绑`,
						error: undefined,
					};
				} catch (error: any) {
					this.stats.failedMessages++;
					console.warn(`MessageRouter: 解绑控制对象失败:`, error);

					return {
						success: false,
						message: `解绑控制对象失败: ${error.message}`,
						error: error.message,
					};
				}
			}

			// 解析目标成员：优先使用 binding，其次使用 targetMemberId（向后兼容）
			const targetMemberId = this.bindingManager.getBoundMemberId(message.controllerId);
			if (!targetMemberId) {
				return {
					success: false,
					message: `无法确定目标成员: 控制器 ${message.controllerId} 未绑定成员`,
					error: "Target member not found",
				};
			}
			// 获取目标成员
			const targetMember = this.engine.getWorld().memberManager.getMember(targetMemberId);
			if (!targetMember) {
				return {
					success: false,
					message: `目标成员不存在: ${targetMemberId}`,
					error: "Target member not found",
				};
			}

			this.engine.dispatchMemberEvent(targetMember.id, message.type, message.data, 0, {
				source: `message:${message.type}`,
			});
			this.stats.successfulMessages++;

			return {
				success: true,
				message: `消息已分发到 ${targetMember.id}`,
				error: undefined,
			};
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
					? `${((this.stats.successfulMessages / this.stats.totalMessagesProcessed) * 100).toFixed(2)}%`
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
		// 返回所有支持的事件类型（基于当前的 IntentMessageTypeEnum）
		return IntentMessageTypeEnum.options;
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
