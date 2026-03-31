/**
 * SimulationEngine — 单个实时模拟引擎的主线程控制面
 *
 * 设计定位：
 *   每个 SimulationEngine 实例 **直接持有** 一个 Web Worker（运行 GameEngine），
 *   通过 MessageChannel 进行双向通信。这是 "长生命周期 + 强状态" 的引擎管理方式，
 *   与 WorkerPool 管理的 "短生命周期 + 弱状态" 批量分支 Worker 形成互补。
 *
 * 关键职责：
 *   1. Worker 生命周期管理 — 创建 / 就绪等待 / 销毁
 *   2. 请求-响应 RPC — 通过 pending Map 将异步消息映射回 Promise
 *   3. XState 状态机镜像 — 将 Worker 侧 GameEngine 的状态同步到主线程 lifecycleActor
 *   4. 事件分发 — 将 Worker 产出的帧快照、渲染指令、领域事件等路由到注册监听器
 *
 * 通信模型（MessageChannel）：
 *   - port1: 传给 Worker，Worker 通过此端口收发消息
 *   - port2: 本类持有，用于发送 RPC 请求和接收各类消息
 *   - 所有消息分为两类：
 *     a. 系统消息（WorkerSystemMessageEnvelope）— 由 routeSystemMessage 处理
 *     b. 任务响应（WorkerMessageEvent）— 按 belongToTaskId 匹配 pending Promise
 */

import { createId } from "@paralleldrive/cuid2";
import { type Actor, createActor } from "xstate";
import { createLogger } from "~/lib/Logger";
import { EventEmitter } from "~/lib/WorkerPool/EventEmitter";
import type { WorkerMessage, WorkerMessageEvent, WorkerSystemMessageEnvelope } from "~/lib/WorkerPool/type";
import { WorkerSystemMessageEnvelopeSchema } from "~/lib/WorkerPool/type";
import { type EngineControlMessage, GameEngineSM } from "../GameEngineSM";
import type { IntentMessage } from "../MessageRouter/MessageRouter";
import type { PreviewReport } from "../Preview/types";
import type { RenderSnapshot } from "../../render/RendererProtocol";
import type {
	EngineScenarioData,
	EngineStats,
	FrameSnapshot,
	SimulationProfile,
} from "../types";
import type { MemberSerializeData } from "../World/Member/Member";
import type { DataQueryCommand, SimulatorTaskPriority, SimulatorTaskTypeMapValue } from "./SimulatorPool";
import simulationWorker from "./Simulation.worker?worker&url";
import { WorkerSystemMessageSchema } from "./protocol";

const log = createLogger("SimulationEngine");

/**
 * 引擎对外发射的事件表。
 * 所有事件 payload 都携带 engineId，便于多引擎场景下的来源辨识。
 */
export interface SimulationEngineEventMap {
	/** Worker 侧状态机变更（INIT/RUNNING/PAUSED 等）已同步到 lifecycleActor */
	engine_state_machine: { engineId: string; message: EngineControlMessage };
	/** 引擎运行遥测数据（TPS、帧耗时等） */
	engine_telemetry: { engineId: string; telemetry: unknown };
	/** 每逻辑帧结束时产出的世界快照 */
	frame_snapshot: { engineId: string; snapshot: FrameSnapshot };
	/** 一帧内聚合的领域事件批次（技能释放、伤害结算等） */
	domain_event_batch: { engineId: string; batch: unknown };
	/** 渲染指令 — 传递给 RendererCommunication 驱动画面更新 */
	render_cmd: { engineId: string; cmd: unknown };
	/** 调试视图帧数据 */
	debug_view_frame: { engineId: string; frame: unknown };
	/** 其他系统事件（worker_ready 等） */
	system_event: { engineId: string; event: unknown };
	/** 引擎已被销毁 */
	disposed: { engineId: string };
}

/** 尚未收到响应的 RPC 任务，按 taskId 存储在 pending Map 中 */
type PendingTask = {
	resolve: (value: WorkerMessageEvent<unknown, Record<string, unknown>, unknown>) => void;
	reject: (error: Error) => void;
	/** setTimeout 句柄，超时后自动 reject */
	timeout: number;
};

/**
 * SimulationEngine 公共接口
 *
 * 对上层（EngineService / UI 组件）屏蔽 Worker 通信细节，
 * 提供引擎生命周期控制、数据查询、状态检查点、事件订阅等能力。
 */
export interface SimulationEngine {
	/** 引擎唯一标识（由创建方指定，如 "simulator"、"wiki-dps-0"） */
	readonly id: string;
	/** 主线程侧的 XState 状态机 actor，镜像 Worker 内 GameEngine 的生命周期状态 */
	readonly lifecycleActor: Actor<typeof GameEngineSM>;
	/** 操作者 ID — 用于 EngineControlMessage 的权限标记 */
	readonly operatorId: string;

	// ── 就绪门控 ──────────────────────────────────
	/** 等待 Worker 发送 worker_ready 系统事件 */
	whenReady(): Promise<void>;
	isReady(): boolean;

	// ── 场景与配置 ──────────────────────────────────
	loadScenario(data: EngineScenarioData): Promise<void>;
	setProfile(profile: SimulationProfile): Promise<void>;

	// ── 生命周期控制（映射为 EngineControlMessage → Worker） ──
	start(): Promise<void>;
	pause(): Promise<void>;
	resume(): Promise<void>;
	stop(): Promise<void>;
	reset(): Promise<void>;
	step(): Promise<void>;

	// ── 意图下发（玩家操作指令） ──────────────────
	sendIntent(intent: IntentMessage): Promise<{ success: boolean; error?: string }>;

	// ── 数据查询 ──────────────────────────────────
	getMembers(): Promise<MemberSerializeData[]>;
	getMemberSkillList(memberId: string): Promise<Array<{ id: string; name: string; level: number }>>;
	getMemberState(memberId: string): Promise<{ success: boolean; value?: string; error?: string }>;
	getRenderSnapshot(includeAreas?: boolean): Promise<RenderSnapshot | null>;
	getEngineStats(): Promise<{ success: boolean; data?: EngineStats; error?: string }>;
	getComputedSkills(memberId: string): Promise<unknown[]>;
	patchMemberConfig(memberId: string, data: unknown): Promise<void>;
	runPreview(memberId: string): Promise<PreviewReport | null>;

	// ── 检查点与表达式字典 ─────────────────────────
	/** 从当前引擎状态导出完整快照，用于初始化分支 Worker */
	captureCheckpoint(): Promise<unknown | null>;
	restoreCheckpoint(checkpoint: unknown): Promise<void>;
	exportExprDict(): Promise<Array<[string, string]>>;
	importExprDict(entries: Array<[string, string]>): Promise<void>;

	// ── 通用数据查询（低层 RPC） ─────────────────
	executeDataQuery(command: DataQueryCommand, priority?: SimulatorTaskPriority): Promise<{ success: boolean; data?: unknown; error?: string }>;

	// ── 事件订阅 ──────────────────────────────────
	on<K extends keyof SimulationEngineEventMap>(event: K, listener: (payload: SimulationEngineEventMap[K]) => void): () => void;
	off<K extends keyof SimulationEngineEventMap>(event: K, listener?: (payload: SimulationEngineEventMap[K]) => void): void;

	// ── 销毁 ──────────────────────────────────────
	dispose(): Promise<void>;
	isDisposed(): boolean;
}

/**
 * SimulationEngine 的标准实现。
 *
 * 构造时立即创建 Worker + MessageChannel，并启动 XState 状态机 actor。
 * Worker 初始化完成后会发送 worker_ready 系统事件，此时 whenReady() 解锁。
 */
export class SimulationEngineImpl implements SimulationEngine {
	public readonly lifecycleActor: Actor<typeof GameEngineSM>;
	public readonly operatorId = createId();

	private readonly worker: Worker;
	/** 主线程持有的 MessagePort（对端 port1 已 transfer 给 Worker） */
	private readonly port: MessagePort;
	private readonly emitter = new EventEmitter();
	/** taskId → PendingTask 映射，用于匹配 RPC 请求-响应 */
	private readonly pending = new Map<string, PendingTask>();
	private ready = false;
	private disposed = false;
	/** 递增序列号，用于生成 EngineControlMessage.seq */
	private seqCounter = 0;
	private readyPromise: Promise<void>;
	private resolveReady: (() => void) | null = null;
	private rejectReady: ((error: Error) => void) | null = null;

	constructor(public readonly id: string) {
		// 1. 创建 Worker 和 MessageChannel
		this.worker = new Worker(simulationWorker, { type: "module" });
		const channel = new MessageChannel();
		this.port = channel.port2;
		this.readyPromise = new Promise<void>((resolve, reject) => {
			this.resolveReady = resolve;
			this.rejectReady = reject;
		});

		// 2. 绑定消息处理
		this.port.onmessage = (event) => this.handleWorkerMessage(event);
		this.worker.onerror = (error) => {
			log.error(`[${this.id}] worker error`, error);
			if (!this.ready && this.rejectReady) this.rejectReady(new Error(String(error.message || "worker error")));
		};

		// 3. 将 port1 transfer 给 Worker，建立专用通信通道
		this.worker.postMessage({ type: "init", port: channel.port1 }, [channel.port1]);

		// 4. 创建主线程侧状态机 actor —— 作为 Worker 侧 GameEngineSM 的 "controller" 镜像
		this.lifecycleActor = createActor(GameEngineSM, {
			input: {
				role: "controller",
				threadName: "main",
				peer: {
					send: (msg: EngineControlMessage) => {
						this.executeControl(msg).catch((error) => {
							log.error(`[${this.id}] send engine command failed`, error);
						});
					},
				},
				engine: undefined,
				controller: undefined,
				nextSeq: () => ++this.seqCounter,
				newCorrelationId: () => createId(),
			},
		});
		this.lifecycleActor.start();
	}

	/**
	 * Worker 消息入口 — 区分系统消息和 RPC 响应：
	 *   · 系统消息（符合 WorkerSystemMessageEnvelope 格式）→ routeSystemMessage
	 *   · RPC 响应（携带 belongToTaskId）→ 匹配 pending Promise 并 resolve/reject
	 */
	private handleWorkerMessage(
		event: MessageEvent<WorkerSystemMessageEnvelope | WorkerMessageEvent<unknown, Record<string, unknown>, unknown>>,
	) {
		const sysParsed = WorkerSystemMessageEnvelopeSchema.safeParse(event.data);
		if (sysParsed.success) {
			this.routeSystemMessage(sysParsed.data);
			return;
		}

		const data = event.data as WorkerMessageEvent<unknown, Record<string, unknown>, unknown>;
		const taskId = data.belongToTaskId;
		if (!taskId) return;
		const pending = this.pending.get(taskId);
		if (!pending) return;
		clearTimeout(pending.timeout);
		this.pending.delete(taskId);
		if (data.error) {
			pending.reject(new Error(String(data.error)));
			return;
		}
		pending.resolve(data);
	}

	/**
	 * 系统消息路由：
	 *   1. worker_ready → 解锁 whenReady()
	 *   2. engine_state_machine → 同步到 lifecycleActor + 对外 emit
	 *   3. 其他 → 按类型 emit 给外部监听者
	 */
	private routeSystemMessage(sys: WorkerSystemMessageEnvelope) {
		const parsed = WorkerSystemMessageSchema.safeParse(sys);
		if (!parsed.success) return;
		const { type, data } = parsed.data;
		if (type === "system_event" && !this.ready) {
			const d = data as { type?: unknown };
			if (d?.type === "worker_ready") {
				this.ready = true;
				this.resolveReady?.();
			}
		}

		if (type === "engine_state_machine") {
			this.emitter.emit("engine_state_machine", { engineId: this.id, message: data as EngineControlMessage });
			(this.lifecycleActor as { send: (msg: EngineControlMessage) => void }).send(data as EngineControlMessage);
			return;
		}

		this.emitter.emit(type, this.payloadFor(type, data));
	}

	/** 为各系统消息类型构造统一的 { engineId, ... } 事件 payload */
	private payloadFor(type: string, data: unknown) {
		switch (type) {
			case "engine_telemetry":
				return { engineId: this.id, telemetry: data };
			case "frame_snapshot":
				return { engineId: this.id, snapshot: data as FrameSnapshot };
			case "domain_event_batch":
				return { engineId: this.id, batch: data };
			case "render_cmd":
				return { engineId: this.id, cmd: data };
			case "debug_view_frame":
				return { engineId: this.id, frame: data };
			case "system_event":
				return { engineId: this.id, event: data };
			default:
				return { engineId: this.id, event: data };
		}
	}

	/**
	 * 底层 RPC 方法：构造消息 → 注册 pending → 发送到 Worker → 等待响应。
	 * 30 秒超时后自动 reject，防止永久挂起。
	 */
	private async executePayload(payload: SimulatorTaskTypeMapValue, priority: SimulatorTaskPriority): Promise<WorkerMessageEvent<unknown, Record<string, unknown>, unknown>> {
		await this.whenReady();
		const taskId = createId();
		const message: WorkerMessage<SimulatorTaskTypeMapValue, SimulatorTaskPriority> = {
			belongToTaskId: taskId,
			payload,
			priority,
		};
		return await new Promise((resolve, reject) => {
			const timeout = window.setTimeout(() => {
				this.pending.delete(taskId);
				reject(new Error(`[${this.id}] task timeout`));
			}, 30000);
			this.pending.set(taskId, { resolve, reject, timeout });
			this.port.postMessage(message);
		});
	}

	/** 发送生命周期控制命令（CMD_START / CMD_PAUSE 等），固定高优先级 */
	private async executeControl(message: EngineControlMessage): Promise<void> {
		await this.executePayload(message as SimulatorTaskTypeMapValue, "high");
	}

	/** 通用数据查询 RPC，返回标准化 { success, data?, error? } */
	async executeDataQuery(command: DataQueryCommand, priority: SimulatorTaskPriority = "high") {
		const res = await this.executePayload(command, priority);
		if (res.error) return { success: false, error: String(res.error) };
		return (res.result as { success: boolean; data?: unknown; error?: string }) ?? { success: false, error: "empty result" };
	}

	async whenReady(): Promise<void> {
		if (this.ready) return;
		await this.readyPromise;
	}
	isReady(): boolean {
		return this.ready;
	}

	/** 执行查询并断言成功，失败时直接抛异常 — 用于必须成功的写操作 */
	private async mustSuccess(command: DataQueryCommand): Promise<void> {
		const res = await this.executeDataQuery(command, "high");
		if (!res.success) throw new Error(res.error ?? "command failed");
	}

	async loadScenario(data: EngineScenarioData): Promise<void> {
		await this.mustSuccess({ type: "load_scenario", data });
	}
	async setProfile(profile: SimulationProfile): Promise<void> {
		await this.mustSuccess({ type: "set_profile", profile });
	}
	// ── 生命周期控制 ──────────────────────────────────
	// 每个方法构造一条 EngineControlMessage，通过 executeControl 发送给 Worker。
	// Worker 侧 GameEngine 执行状态迁移后，会通过 engine_state_machine 系统消息回传结果，
	// 由 routeSystemMessage 自动同步到 lifecycleActor。

	start(): Promise<void> {
		const ctx = this.lifecycleActor.getSnapshot().context;
		return this.executeControl({
			type: "CMD_START",
			sourceSide: "controller",
			seq: ctx.nextSeq(),
			correlationId: ctx.newCorrelationId(),
			operatorId: this.operatorId,
		} as EngineControlMessage);
	}
	pause(): Promise<void> {
		const ctx = this.lifecycleActor.getSnapshot().context;
		return this.executeControl({ type: "CMD_PAUSE", sourceSide: "controller", seq: ctx.nextSeq(), correlationId: ctx.newCorrelationId(), operatorId: this.operatorId } as EngineControlMessage);
	}
	resume(): Promise<void> {
		const ctx = this.lifecycleActor.getSnapshot().context;
		return this.executeControl({ type: "CMD_RESUME", sourceSide: "controller", seq: ctx.nextSeq(), correlationId: ctx.newCorrelationId(), operatorId: this.operatorId } as EngineControlMessage);
	}
	stop(): Promise<void> {
		const ctx = this.lifecycleActor.getSnapshot().context;
		return this.executeControl({ type: "CMD_STOP", sourceSide: "controller", seq: ctx.nextSeq(), correlationId: ctx.newCorrelationId(), operatorId: this.operatorId } as EngineControlMessage);
	}
	reset(): Promise<void> {
		const ctx = this.lifecycleActor.getSnapshot().context;
		return this.executeControl({ type: "CMD_RESET", sourceSide: "controller", seq: ctx.nextSeq(), correlationId: ctx.newCorrelationId(), operatorId: this.operatorId } as EngineControlMessage);
	}
	step(): Promise<void> {
		const ctx = this.lifecycleActor.getSnapshot().context;
		return this.executeControl({ type: "CMD_STEP", sourceSide: "controller", seq: ctx.nextSeq(), correlationId: ctx.newCorrelationId(), operatorId: this.operatorId } as EngineControlMessage);
	}

	sendIntent(intent: IntentMessage): Promise<{ success: boolean; error?: string }> {
		return this.executeDataQuery({ type: "send_intent", intent }, "high");
	}
	async getMembers(): Promise<MemberSerializeData[]> {
		const res = await this.executeDataQuery({ type: "get_members" }, "low");
		return res.success && Array.isArray(res.data) ? (res.data as MemberSerializeData[]) : [];
	}
	async getMemberSkillList(memberId: string): Promise<Array<{ id: string; name: string; level: number }>> {
		const res = await this.executeDataQuery({ type: "get_member_skill_list", memberId }, "low");
		return res.success && Array.isArray(res.data) ? (res.data as Array<{ id: string; name: string; level: number }>) : [];
	}
	async getMemberState(memberId: string): Promise<{ success: boolean; value?: string; error?: string }> {
		const res = await this.executeDataQuery({ type: "get_member_state", memberId }, "low");
		const data = res.data as { value?: string } | undefined;
		return { success: res.success, value: data?.value, error: res.error };
	}
	async getRenderSnapshot(includeAreas = false): Promise<RenderSnapshot | null> {
		const res = await this.executeDataQuery({ type: "get_render_snapshot", includeAreas }, "high");
		return res.success ? ((res.data as RenderSnapshot | undefined) ?? null) : null;
	}
	async getEngineStats(): Promise<{ success: boolean; data?: EngineStats; error?: string }> {
		const res = await this.executeDataQuery({ type: "get_stats" }, "low");
		return { success: res.success, data: res.data as EngineStats | undefined, error: res.error };
	}
	async getComputedSkills(memberId: string): Promise<unknown[]> {
		const res = await this.executeDataQuery({ type: "get_computed_skills", memberId }, "low");
		return res.success && Array.isArray(res.data) ? (res.data as unknown[]) : [];
	}
	async patchMemberConfig(memberId: string, data: unknown): Promise<void> {
		await this.mustSuccess({ type: "patch_member", memberId, memberData: data });
	}
	async runPreview(memberId: string): Promise<PreviewReport | null> {
		const res = await this.executeDataQuery({ type: "run_preview", memberId }, "medium");
		return res.success ? ((res.data as PreviewReport | undefined) ?? null) : null;
	}
	async captureCheckpoint(): Promise<unknown | null> {
		const res = await this.executeDataQuery({ type: "capture_checkpoint" }, "high");
		return res.success ? (res.data ?? null) : null;
	}
	async restoreCheckpoint(checkpoint: unknown): Promise<void> {
		await this.mustSuccess({ type: "restore_checkpoint", checkpoint });
	}
	async exportExprDict(): Promise<Array<[string, string]>> {
		const res = await this.executeDataQuery({ type: "export_expr_dict" }, "low");
		return res.success && Array.isArray(res.data) ? (res.data as Array<[string, string]>) : [];
	}
	async importExprDict(entries: Array<[string, string]>): Promise<void> {
		await this.mustSuccess({ type: "import_expr_dict", entries });
	}

	on<K extends keyof SimulationEngineEventMap>(event: K, listener: (payload: SimulationEngineEventMap[K]) => void): () => void {
		this.emitter.on(event, listener);
		return () => this.off(event, listener);
	}
	off<K extends keyof SimulationEngineEventMap>(event: K, listener?: (payload: SimulationEngineEventMap[K]) => void): void {
		this.emitter.off(event, listener);
	}

	/**
	 * 销毁引擎：停止 actor → reject 所有 pending → 关闭 port → 终止 Worker。
	 * 幂等：重复调用不会重复销毁。
	 */
	async dispose(): Promise<void> {
		if (this.disposed) return;
		this.disposed = true;
		this.lifecycleActor.stop();
		for (const [taskId, pending] of this.pending.entries()) {
			clearTimeout(pending.timeout);
			pending.reject(new Error(`[${this.id}] disposed`));
			this.pending.delete(taskId);
		}
		this.port.close();
		this.worker.terminate();
		this.emitter.emit("disposed", { engineId: this.id });
	}
	isDisposed(): boolean {
		return this.disposed;
	}
}

