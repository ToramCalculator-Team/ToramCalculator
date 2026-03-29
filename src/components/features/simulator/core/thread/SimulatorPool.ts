// ==================== 模拟器专用扩展 ====================

import { z } from "zod/v4";
import { createLogger } from "~/lib/Logger";
import type { WorkerMessageEvent } from "~/lib/WorkerPool/type";
import { type PoolConfig, WorkerPool, type WorkerWrapper } from "~/lib/WorkerPool/WorkerPool";
import type { RendererCmd, RenderSnapshot } from "../../render/RendererProtocol";
import type { EngineControlMessage } from "../GameEngineSM";
import { type IntentMessage, IntentMessageSchema } from "../MessageRouter/MessageRouter";
import type { EngineStats } from "../types";
import type { MemberSerializeData } from "../World/Member/Member";
import { WorkerSystemMessageSchema } from "./protocol";
import simulationWorker from "./Simulation.worker?worker&url";

const log = createLogger("SimPool");

/**
 * 通用任务优先级
 */
export const SimulatorTaskPriority = ["high", "medium", "low"] as const;
export type SimulatorTaskPriority = (typeof SimulatorTaskPriority)[number];

// ==================== 数据查询命令 ====================

/**
 * 数据查询命令 Schema
 */
export const DataQueryCommandSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("get_members"),
	}),
	z.object({
		type: z.literal("get_member_skill_list"),
		memberId: z.string(),
	}),
	z.object({
		type: z.literal("get_stats"),
	}),
	z.object({
		type: z.literal("get_snapshot"),
	}),
	z.object({
		type: z.literal("get_member_state"),
		memberId: z.string(),
	}),
	z.object({
		type: z.literal("send_intent"),
		intent: IntentMessageSchema,
	}),
	z.object({
		type: z.literal("subscribe_debug_view"),
		controllerId: z.string(),
		memberId: z.string(),
		viewType: z.enum(["stat_container_export"]),
		hz: z.number().optional(),
		fields: z.array(z.string()).optional(),
	}),
	z.object({
		type: z.literal("unsubscribe_debug_view"),
		viewId: z.string(),
	}),
	z.object({
		type: z.literal("get_render_snapshot"),
		includeAreas: z.boolean().optional(),
	}),
]);

/**
 * 数据查询命令类型
 */
export type DataQueryCommand = z.output<typeof DataQueryCommandSchema>;

// ==================== 渲染指令类型 ====================

/**
 * 渲染指令包装类型
 */
export type RenderCommand = { type: "render:cmd"; cmd: RendererCmd } | { type: "render:cmds"; cmds: RendererCmd[] };

// ===================== 任务类型映射 ====================

/**
 * 任务类型映射表 - 建立任务类型和 Payload 的一一对应关系
 *
 * 设计原则：
 * - 类型安全：编译时确保 type 和 payload 匹配
 * - 集中管理：所有任务类型在一处定义
 * - 易于扩展：新增任务类型只需添加一行
 */
export interface SimulatorTaskMap {
	engine_command: EngineControlMessage;
	data_query: DataQueryCommand;
}

export type SimulatorTaskTypeMapKey = keyof SimulatorTaskMap;
export type SimulatorTaskTypeMapValue = SimulatorTaskMap[SimulatorTaskTypeMapKey];

/**
 * 模拟器线程池 - 基于通用 WorkerPool 的模拟器专用实现
 *
 * 提供模拟器业务特定的 API，同时保持通用线程池的核心功能
 */
export class SimulatorPool extends WorkerPool<SimulatorTaskTypeMapKey, SimulatorTaskMap, SimulatorTaskPriority> {
	constructor(config: PoolConfig<SimulatorTaskPriority>) {
		super(config);

		// 设置模拟器专用的事件处理器
		this.on(
			"worker-message",
			(
				data: {
					worker: WorkerWrapper;
					event: WorkerMessageEvent<unknown, SimulatorTaskMap, unknown>;
				},
			) => {
				// 检查是否是系统消息（通过 schema 验证）
				const parsed = WorkerSystemMessageSchema.safeParse(data.event);
				if (parsed.success) {
					const { type, data: eventData } = parsed.data;

					// 处理系统事件（worker_ready/error/日志等杂项）
					if (type === "system_event") {
						this.emit("system_event", { workerId: data.worker.id, event: eventData });
					}
					// 帧快照事件 - 每帧包含完整的引擎和成员状态（默认关闭或降频）
					else if (type === "frame_snapshot") {
						this.emit("frame_snapshot", { workerId: data.worker.id, event: eventData });
					}
					// 渲染指令事件 - 统一通过系统消息格式传递
					else if (type === "render_cmd") {
						this.emit("render_cmd", { workerId: data.worker.id, event: eventData });
					}
					// 引擎状态机消息 - 镜像通信
					else if (type === "engine_state_machine") {
						this.emit("engine_state_machine", { workerId: data.worker.id, event: eventData });
					}
					// 引擎遥测 - 轻量运行指标（帧号/运行时间/FPS/成员数）
					else if (type === "engine_telemetry") {
						this.emit("engine_telemetry", { workerId: data.worker.id, event: eventData });
					}
					// 领域事件批 - 控制器领域事件（从 system_event 提升为顶层消息）
					else if (type === "domain_event_batch") {
						this.emit("domain_event_batch", { workerId: data.worker.id, event: eventData });
					}
					// 调试视图数据帧 - 订阅制高频数据（井盖）
					else if (type === "debug_view_frame") {
						this.emit("debug_view_frame", { workerId: data.worker.id, event: eventData });
					}
				}
				// 其他消息（如任务结果）不需要特殊处理，由 WorkerPool 处理
			},
		);
	}

	/**
	 * 发送意图消息
	 */
	async sendIntent(intent: IntentMessage): Promise<{ success: boolean; error?: string }> {
		const command: DataQueryCommand = { type: "send_intent", intent };
		const result = await this.executeTask("data_query", command, "high");
		return {
			success: result.success,
			error: result.error,
		};
	}

	/**
	 * 获取成员信息
	 */
	async getMembers(): Promise<MemberSerializeData[]> {
		const command: DataQueryCommand = { type: "get_members" };
		const result = await this.executeTask("data_query", command, "low");

		const task = result.data as { success: boolean; data?: MemberSerializeData[] } | undefined;
		if (result.success && task?.success && Array.isArray(task.data)) {
			return task.data;
		}

		log.warn("🔍 SimulatorPool.getMembers: 解析失败，返回空数组");
		return [];
	}

	/**
	 * 获取成员技能静态列表（绑定时拉取一次）
	 */
	async getMemberSkillList(memberId: string): Promise<Array<{ id: string; name: string; level: number }>> {
		const command: DataQueryCommand = { type: "get_member_skill_list", memberId };
		const result = await this.executeTask("data_query", command, "low");
		const task = result.data as { success: boolean; data?: unknown; error?: string } | undefined;
		if (result.success && task?.success && Array.isArray(task.data)) {
			return (task.data as Array<{ id: unknown; name: unknown; level: unknown }>).map((x) => ({
				id: String(x.id ?? ""),
				name: String(x.name ?? ""),
				level: Number(x.level ?? 0),
			}));
		}
		return [];
	}

	/**
	 * 获取引擎统计信息
	 */
	async getEngineStats(): Promise<{ success: boolean; data?: EngineStats; error?: string }> {
		const command: DataQueryCommand = { type: "get_stats" };
		const result = await this.executeTask("data_query", command, "low");
		return {
			success: result.success,
			data: result.data,
			error: result.error,
		};
	}

	/** 拉取单个成员的当前 FSM 状态（即时同步一次） */
	async getMemberState(memberId: string): Promise<{ success: boolean; value?: string; error?: string }> {
		const command: DataQueryCommand = { type: "get_member_state", memberId };
		const result = await this.executeTask("data_query", command, "low");
		if (result.success && result.data?.success) {
			return { success: true, value: result.data.data?.value };
		}
		return { success: false, error: result.data?.error || result.error };
	}

	/** 拉取当前世界渲染快照（供渲染层首次同步，与 get_snapshot 等逻辑快照区分；渲染层晚于引擎就绪时使用） */
	async getRenderSnapshot(includeAreas = false): Promise<RenderSnapshot | null> {
		const command: DataQueryCommand = { type: "get_render_snapshot", includeAreas };
		const result = await this.executeTask("data_query", command, "high");
		const task = result.data as { success: boolean; data?: RenderSnapshot } | undefined;
		if (result.success && task?.success && task.data) {
			return task.data;
		}
		log.warn("🔍 SimulatorPool.getRenderSnapshot: 渲染快照解析失败");
		return null;
	}
}

// ==================== 实例导出 ====================

// 实时模拟实例 - 单Worker，适合实时控制
export const realtimeSimulatorPool = new SimulatorPool({
	workerUrl: simulationWorker,
	priority: [...SimulatorTaskPriority],
	maxWorkers: 1, // 单Worker用于实时模拟
	taskTimeout: 30000, // 实时模拟需要更快的响应
	maxRetries: 1, // 实时模拟减少重试次数
	maxQueueSize: 10, // 实时模拟减少队列大小
	monitorInterval: 5000, // 实时模拟更频繁的监控
	isWorkerReadyMessage: (sys) => {
		if (sys.type !== "system_event") return false;
		if (typeof sys.data !== "object" || sys.data === null) return false;
		const data = sys.data as { type?: unknown };
		return data.type === "worker_ready";
	},
});

// 批量计算实例 - 多Worker，适合并行计算
export const batchSimulatorPool = new SimulatorPool({
	workerUrl: simulationWorker,
	priority: [...SimulatorTaskPriority],
	maxWorkers: Math.min(navigator.hardwareConcurrency || 4, 6), // 多Worker用于并行计算
	taskTimeout: 60000, // 增加超时时间，战斗模拟可能需要更长时间
	maxRetries: 2, // 减少重试次数
	maxQueueSize: 100, // 减少队列大小
	monitorInterval: 10000, // 增加监控间隔
	isWorkerReadyMessage: (sys) => {
		if (sys.type !== "system_event") return false;
		if (typeof sys.data !== "object" || sys.data === null) return false;
		const data = sys.data as { type?: unknown };
		return data.type === "worker_ready";
	},
});
