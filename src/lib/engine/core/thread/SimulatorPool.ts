import type { MemberWithRelations } from "@db/generated/repositories/member";
import { createLogger } from "~/lib/Logger";
import type { WorkerMessageEvent } from "~/lib/WorkerPool/type";
import { type PoolConfig, WorkerPool, type WorkerWrapper } from "~/lib/WorkerPool/WorkerPool";
import type { RendererCmd, RenderSnapshot } from "../../render/RendererProtocol";
import type { IntentMessage } from "../MessageRouter/MessageRouter";
import type { PreviewReport } from "../Preview/types";
import type { EngineScenarioData, EngineStats, RuntimeConfig } from "../types";
import type { MemberSerializeData } from "../World/Member/Member";
import {
	type EngineRPC,
	type SimulatorTaskMap,
	type SimulatorTaskPriority,
	type SimulatorTaskTypeMapKey,
	WorkerSystemMessageSchema,
} from "./protocol";

const log = createLogger("SimPool");

// ==================== 渲染指令类型 ====================

/**
 * 渲染指令包装类型
 */
export type RenderCommand = { type: "render:cmd"; cmd: RendererCmd } | { type: "render:cmds"; cmds: RendererCmd[] };

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
			(data: { worker: WorkerWrapper; event: WorkerMessageEvent<unknown, SimulatorTaskMap, unknown> }) => {
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
	 * 通过 `engine_rpc` 通道发送意图。
	 */
	async sendIntent(intent: IntentMessage): Promise<{ success: boolean; error?: string }> {
		const rpc: EngineRPC = { type: "send_intent", intent };
		const result = await this.executeTask("engine_rpc", rpc, "high");
		return {
			success: result.success,
			error: result.error,
		};
	}

	/**
	 * 获取成员信息
	 */
	async getMembers(): Promise<MemberSerializeData[]> {
		const rpc: EngineRPC = { type: "get_members" };
		const result = await this.executeTask("engine_rpc", rpc, "low");

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
		const rpc: EngineRPC = { type: "get_member_skill_list", memberId };
		const result = await this.executeTask("engine_rpc", rpc, "low");
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
		const rpc: EngineRPC = { type: "get_stats" };
		const result = await this.executeTask("engine_rpc", rpc, "low");
		return {
			success: result.success,
			data: result.data,
			error: result.error,
		};
	}

	/** 拉取单个成员的当前 FSM 状态（即时同步一次） */
	async getMemberState(memberId: string): Promise<{ success: boolean; value?: string; error?: string }> {
		const rpc: EngineRPC = { type: "get_member_state", memberId };
		const result = await this.executeTask("engine_rpc", rpc, "low");
		if (result.success && result.data?.success) {
			return { success: true, value: result.data.data?.value };
		}
		return { success: false, error: result.data?.error || result.error };
	}

	/** 拉取当前世界渲染快照（供渲染层首次同步，与 get_snapshot 等逻辑快照区分；渲染层晚于引擎就绪时使用） */
	async getRenderSnapshot(includeAreas = false): Promise<RenderSnapshot | null> {
		const rpc: EngineRPC = { type: "get_render_snapshot", includeAreas };
		const result = await this.executeTask("engine_rpc", rpc, "high");
		const task = result.data as { success: boolean; data?: RenderSnapshot } | undefined;
		if (result.success && task?.success && task.data) {
			return task.data;
		}
		log.warn("🔍 SimulatorPool.getRenderSnapshot: 渲染快照解析失败");
		return null;
	}

	// ==================== 引擎 RPC 封装 ====================

	async loadScenario(data: EngineScenarioData): Promise<{ success: boolean; error?: string }> {
		const rpc: EngineRPC = { type: "load_scenario", data };
		const result = await this.executeTask("engine_rpc", rpc, "high");
		return { success: result.success, error: result.error };
	}

	async setRuntimeConfig(config: RuntimeConfig): Promise<{ success: boolean; error?: string }> {
		const rpc: EngineRPC = { type: "set_runtime_config", config };
		const result = await this.executeTask("engine_rpc", rpc, "high");
		return { success: result.success, error: result.error };
	}

	async patchMember(memberId: string, memberData: MemberWithRelations): Promise<{ success: boolean; error?: string }> {
		const rpc: EngineRPC = { type: "patch_member", memberId, memberData };
		const result = await this.executeTask("engine_rpc", rpc, "high");
		return { success: result.success, error: result.error };
	}

	async runPreview(memberId: string): Promise<PreviewReport | null> {
		const rpc: EngineRPC = { type: "run_preview", memberId };
		const result = await this.executeTask("engine_rpc", rpc, "medium");
		const task = result.data as { success: boolean; data?: PreviewReport } | undefined;
		if (result.success && task?.success && task.data) {
			return task.data;
		}
		return null;
	}

	async getComputedSkills(memberId: string): Promise<unknown[]> {
		const rpc: EngineRPC = { type: "get_computed_skills", memberId };
		const result = await this.executeTask("engine_rpc", rpc, "low");
		const task = result.data as { success: boolean; data?: unknown[] } | undefined;
		return task?.success && Array.isArray(task.data) ? task.data : [];
	}

	async captureCheckpoint(): Promise<unknown | null> {
		const rpc: EngineRPC = { type: "capture_checkpoint" };
		const result = await this.executeTask("engine_rpc", rpc, "high");
		const task = result.data as { success: boolean; data?: unknown } | undefined;
		return task?.success ? (task.data ?? null) : null;
	}

	async restoreCheckpoint(checkpoint: unknown): Promise<{ success: boolean; error?: string }> {
		const rpc: EngineRPC = { type: "restore_checkpoint", checkpoint };
		const result = await this.executeTask("engine_rpc", rpc, "high");
		return { success: result.success, error: result.error };
	}

	async exportExprDict(): Promise<Array<[string, string]>> {
		const rpc: EngineRPC = { type: "export_expr_dict" };
		const result = await this.executeTask("engine_rpc", rpc, "low");
		const task = result.data as { success: boolean; data?: Array<[string, string]> } | undefined;
		return task?.success && Array.isArray(task.data) ? task.data : [];
	}

	async importExprDict(entries: Array<[string, string]>): Promise<{ success: boolean; error?: string }> {
		const rpc: EngineRPC = { type: "import_expr_dict", entries };
		const result = await this.executeTask("engine_rpc", rpc, "high");
		return { success: result.success, error: result.error };
	}
}

// 实例由 EngineService 按场景创建并管理。
