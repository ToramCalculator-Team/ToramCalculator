/**
 * 调试视图注册表
 * 
 * 管理订阅制的高频调试数据流（井盖模式）
 * - 只有订阅者才会收到数据
 * - 可配置频率（默认 10Hz）
 * - 可裁剪字段（只发送需要的字段）
 */

import { createId } from "@paralleldrive/cuid2";
import { createLogger } from "~/lib/Logger";
import type { GameEngine } from "../GameEngine";

const log = createLogger("DebugView");

/**
 * 调试视图类型
 */
export type DebugViewType = "stat_container_export";

/**
 * 调试视图订阅配置
 */
export interface DebugViewSubscription {
	viewId: string;
	controllerId: string;
	memberId: string;
	viewType: DebugViewType;
	hz: number; // 发送频率（Hz），默认 10
	fields?: string[]; // 可选：只发送指定字段（例如 ["hp", "mp"]）
}

/**
 * 调试视图注册表
 */
export class DebugViewRegistry {
	private subscriptions = new Map<string, DebugViewSubscription>();
	private gameEngine: GameEngine | null = null;
	/** 每个订阅的上次发送时间（performance.now） */
	private lastSentAt = new Map<string, number>();
	/** 用于驱动调试帧推送的定时器 */
	private frameTimer: number | null = null;

	// constructor() {
	// 	// 注意：不要在构造时启动帧循环
	// 	// 只有在存在订阅时才启动（井盖模式），避免空转定时器
	// }

	/**
	 * 设置游戏引擎引用（用于获取成员数据）
	 */
	setGameEngine(engine: GameEngine): void {
		this.gameEngine = engine;
	}

	/**
	 * 订阅调试视图
	 * 
	 * @param config 订阅配置
	 * @returns viewId 订阅ID
	 */
	subscribe(config: Omit<DebugViewSubscription, "viewId">): string {
		const viewId = createId();
		const subscription: DebugViewSubscription = {
			...config,
			viewId,
		};

		this.subscriptions.set(viewId, subscription);
		log.info(`🔍 DebugViewRegistry: 订阅调试视图 ${viewId} (${config.viewType}, ${config.hz}Hz)`);

		// 如果这是第一个订阅，启动帧循环
		if (this.subscriptions.size === 1) {
			this.startFrameLoop();
		}

		return viewId;
	}

	/**
	 * 取消订阅
	 * 
	 * @param viewId 订阅ID
	 */
	unsubscribe(viewId: string): boolean {
		const removed = this.subscriptions.delete(viewId);
		this.lastSentAt.delete(viewId);
		if (removed) {
			log.info(`🔍 DebugViewRegistry: 取消订阅调试视图 ${viewId}`);
		}

		// 如果没有订阅了，停止帧循环
		if (this.subscriptions.size === 0) {
			this.stopFrameLoop();
		}

		return removed;
	}

	/**
	 * 获取所有订阅
	 */
	getSubscriptions(): DebugViewSubscription[] {
		return Array.from(this.subscriptions.values());
	}

	/**
	 * 获取指定 memberId 的所有订阅
	 */
	getSubscriptionsByMemberId(memberId: string): DebugViewSubscription[] {
		return Array.from(this.subscriptions.values()).filter((sub) => sub.memberId === memberId);
	}

	/**
	 * 启动帧循环（推送调试数据）
	 */
	private startFrameLoop(): void {
		if (this.frameTimer !== null) {
			return; // 已在运行
		}

		// 使用 setInterval（Worker 环境更稳定；也避免 rAF 的签名差异）
		this.frameTimer = setInterval(() => {
			if (this.subscriptions.size === 0) {
				this.stopFrameLoop();
				return;
			}
			this.emitDebugFrames();
		}, 16) as unknown as number; // ~60Hz 调度粒度，具体发送频率由各订阅 hz 控制
	}

	/**
	 * 停止帧循环
	 */
	private stopFrameLoop(): void {
		if (this.frameTimer === null) {
			return;
		}

		clearInterval(this.frameTimer);

		this.frameTimer = null;
	}

	/**
	 * 发送调试数据帧
	 */
	private emitDebugFrames(): void {
		if (!this.gameEngine) {
			return;
		}

		const now = performance.now();

		// 按订阅发送数据
		for (const subscription of this.subscriptions.values()) {
			// 按订阅的 hz 节流（默认 10Hz）
			const hz = subscription.hz > 0 ? subscription.hz : 10;
			const intervalMs = 1000 / hz;
			const last = this.lastSentAt.get(subscription.viewId) ?? 0;
			if (now - last < intervalMs) {
				continue;
			}

			const member = this.gameEngine.getMember(subscription.memberId);
			if (!member) {
				continue;
			}

			// 根据 viewType 生成数据
			let data: unknown = null;
			switch (subscription.viewType) {
				case "stat_container_export": {
					// 导出 StatContainer 的结构化数据
					data = this.exportStatContainer(member, subscription.fields);
					break;
				}
				default:
					log.warn(`🔍 DebugViewRegistry: 未知的视图类型: ${subscription.viewType}`);
					continue;
			}

			// 发送调试数据帧（通过回调）
			if (this.debugFrameSender) {
				this.debugFrameSender({
					viewId: subscription.viewId,
					controllerId: subscription.controllerId,
					memberId: subscription.memberId,
					frame: this.gameEngine.getCurrentFrame(),
					data,
				});
			}

			this.lastSentAt.set(subscription.viewId, now);
		}
	}

	/**
	 * 导出 StatContainer 数据
	 */
	private exportStatContainer(
		member: { statContainer?: { exportNestedValues: () => Record<string, unknown> } },
		_fields?: string[],
	): Record<string, unknown> {
		// 目前 MemberStatusPanel 的 StatsRenderer 需要 DataStorage 嵌套结构，
		// 直接复用 StatContainer.exportNestedValues() 作为“结构化导出”。
		// fields 过滤后续再做（避免在这里做深层裁剪带来的复杂度）。
		if (!member.statContainer) {
			return {};
		}
		try {
			return member.statContainer.exportNestedValues();
		} catch (error) {
			log.error("🔍 DebugViewRegistry: 导出 StatContainer 失败:", error);
			return {};
		}
	}

	/** 调试数据帧发送器（由 worker 设置） */
	private debugFrameSender: ((frame: {
		viewId: string;
		controllerId: string;
		memberId: string;
		frame: number;
		data: unknown;
	}) => void) | null = null;

	/**
	 * 设置调试数据帧发送器
	 */
	setDebugFrameSender(sender: ((frame: {
		viewId: string;
		controllerId: string;
		memberId: string;
		frame: number;
		data: unknown;
	}) => void) | null): void {
		this.debugFrameSender = sender;
	}

	/**
	 * 清理所有订阅
	 */
	clear(): void {
		this.subscriptions.clear();
		this.lastSentAt.clear();
		this.stopFrameLoop();
	}
}

