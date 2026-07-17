/**
 * 单个实时模拟 Worker 的主线程客户端。
 *
 * Client 是 controller actor、Worker task RPC 与类型化 push 的唯一主线程宿主；上层只能通过
 * RealtimeEngineHandle 使用受限命令和只读生命周期投影。
 */

import { createId } from "@paralleldrive/cuid2";
import { type Actor, createActor } from "xstate";
import { createLogger } from "~/lib/Logger";
import { EventEmitter } from "~/lib/WorkerPool/EventEmitter";
import type { WorkerMessage, WorkerTaskResponseEnvelope } from "~/lib/WorkerPool/type";
import { WorkerTaskResponseEnvelopeSchema } from "~/lib/WorkerPool/type";
import { MemberController } from "../../controller/MemberController";
import type { EngineMember } from "../engineScenarioSchema";
import {
	type EngineLifecycleCommand,
	type EngineLifecycleResult,
	type EngineLifecycleSnapshot,
	EngineLifecycleSnapshotSchema,
	GameEngineSM,
	projectEngineLifecycleSnapshot,
} from "../GameEngineSM";
import type { IntentMessage } from "../MessageRouter/MessageRouter";
import type { EngineRunOutput, ExecutionRecordingPolicy } from "../runOutput";
import { type EngineScenarioData, type FrameSnapshot, FrameSnapshotSchema, type RuntimeConfig } from "../types";
import type { MemberSnapshot } from "../World/Member/Member";
import {
	EngineExecutionFailure,
	EngineProtocolError,
	type EngineRPC,
	type EngineRPCData,
	type EngineRPCResult,
	type EngineTaskPriority,
	type EngineTelemetry,
	EngineTelemetrySchema,
	EngineTransportError,
	type EngineWorkerTaskTypeMapValue,
	type FastForwardResult,
	type MemberSkillSummary,
	parseEngineLifecycleResult,
	parseEngineRPCResult,
	type WorkerSystemMessage,
	WorkerSystemMessageSchema,
} from "./protocol";
import type { RenderSnapshot } from "./RendererProtocol";
import simulationWorker from "./Simulation.worker?worker&url";

const log = createLogger("EngineWorkerClient");

export interface EngineWorkerClientEventMap {
	engine_telemetry: { engineId: string; telemetry: EngineTelemetry };
	frame_snapshot: { engineId: string; snapshot: FrameSnapshot };
	domain_event_batch: { engineId: string; batch: unknown };
	render_cmd: { engineId: string; cmd: unknown };
	debug_view_frame: { engineId: string; frame: unknown };
	system_event: { engineId: string; event: unknown };
	disposed: { engineId: string };
	runtime_failure: { engineId: string; reason: string };
}

type PendingTask = {
	resolve: (value: WorkerTaskResponseEnvelope) => void;
	reject: (error: Error) => void;
	timeout: number;
};

export class EngineWorkerClient {
	private readonly lifecycleActor: Actor<typeof GameEngineSM>;
	private readonly worker: Worker;
	private readonly port: MessagePort;
	private readonly emitter = new EventEmitter();
	private readonly pending = new Map<string, PendingTask>();
	private readonly memberControllers = new Map<string, { boundMemberId: string; controller: MemberController }>();
	private ready = false;
	private disposed = false;
	private workerLifecycleSnapshot: EngineLifecycleSnapshot | null = null;
	private readonly readyPromise: Promise<void>;
	private resolveReady: (() => void) | null = null;
	private rejectReady: ((error: Error) => void) | null = null;

	constructor(public readonly id: string) {
		this.worker = new Worker(simulationWorker, { type: "module" });
		const channel = new MessageChannel();
		this.port = channel.port2;
		this.readyPromise = new Promise<void>((resolve, reject) => {
			this.resolveReady = resolve;
			this.rejectReady = reject;
		});

		this.port.onmessage = (event) => this.handleWorkerMessage(event);
		this.worker.onerror = (error) => {
			const transportError = new EngineTransportError(
				`[${this.id}] worker error: ${error.message || "unknown"}`,
				error,
			);
			log.error(transportError.message, error);
			if (!this.ready) this.rejectReady?.(transportError);
			this.rejectAllPending(transportError);
			if (this.ready) {
				this.emitter.emit("runtime_failure", {
					engineId: this.id,
					reason: String(error.message || "worker error"),
				});
			}
		};

		this.worker.postMessage({ type: "init", port: channel.port1 }, [channel.port1]);
		this.lifecycleActor = createActor(GameEngineSM, { input: { role: "controller" } });
		this.lifecycleActor.start();
	}

	private assertActive(): void {
		if (this.disposed) throw new Error(`[${this.id}] EngineWorkerClient 已销毁`);
	}

	private rejectAllPending(error: Error): void {
		for (const pending of this.pending.values()) {
			clearTimeout(pending.timeout);
			pending.reject(error);
		}
		this.pending.clear();
	}

	private handleWorkerMessage(event: MessageEvent<unknown>): void {
		const systemMessage = WorkerSystemMessageSchema.safeParse(event.data);
		if (systemMessage.success) {
			try {
				this.routeSystemMessage(systemMessage.data);
			} catch (cause) {
				const error =
					cause instanceof EngineProtocolError
						? cause
						: new EngineProtocolError(`[${this.id}] invalid worker push payload`, cause);
				this.rejectAllPending(error);
				this.emitter.emit("runtime_failure", { engineId: this.id, reason: error.message });
			}
			return;
		}

		const taskResponse = WorkerTaskResponseEnvelopeSchema.safeParse(event.data);
		if (!taskResponse.success) {
			const error = new EngineTransportError(`[${this.id}] invalid worker task response`, taskResponse.error);
			this.rejectAllPending(error);
			this.emitter.emit("runtime_failure", { engineId: this.id, reason: error.message });
			return;
		}

		const data = taskResponse.data;
		const pending = this.pending.get(data.belongToTaskId);
		if (!pending) {
			if (this.pending.size === 0) return;
			const error = new EngineTransportError(`[${this.id}] worker returned unknown task id: ${data.belongToTaskId}`);
			this.rejectAllPending(error);
			this.emitter.emit("runtime_failure", { engineId: this.id, reason: error.message });
			return;
		}

		clearTimeout(pending.timeout);
		this.pending.delete(data.belongToTaskId);
		if (data.error !== undefined && data.error !== null) {
			pending.reject(new EngineTransportError(`[${this.id}] worker task failed: ${data.error}`));
			return;
		}
		pending.resolve(data);
	}

	private routeSystemMessage(message: WorkerSystemMessage): void {
		const { type, data } = message;
		if (type === "engine_lifecycle_snapshot") {
			this.workerLifecycleSnapshot = EngineLifecycleSnapshotSchema.parse(data);
			return;
		}
		if (type === "system_event" && !this.ready) {
			const event = data as { type?: unknown };
			if (event?.type === "worker_ready") {
				if (this.workerLifecycleSnapshot?.confirmedState !== "idle") {
					throw new EngineProtocolError("Worker must be idle when the realtime client becomes ready");
				}
				this.ready = true;
				this.resolveReady?.();
			}
		}
		this.emitter.emit(type, this.payloadFor(type, data));
	}

	private payloadFor(type: WorkerSystemMessage["type"], data: unknown) {
		switch (type) {
			case "engine_telemetry":
				return { engineId: this.id, telemetry: EngineTelemetrySchema.parse(data) };
			case "frame_snapshot":
				return { engineId: this.id, snapshot: FrameSnapshotSchema.parse(data) };
			case "domain_event_batch":
				return { engineId: this.id, batch: data };
			case "render_cmd":
				return { engineId: this.id, cmd: data };
			case "debug_view_frame":
				return { engineId: this.id, frame: data };
			default:
				return { engineId: this.id, event: data };
		}
	}

	private async executePayload(
		payload: EngineWorkerTaskTypeMapValue,
		priority: EngineTaskPriority,
	): Promise<WorkerTaskResponseEnvelope> {
		this.assertActive();
		await this.whenReady();
		const taskId = createId();
		const message: WorkerMessage<EngineWorkerTaskTypeMapValue, EngineTaskPriority> = {
			belongToTaskId: taskId,
			payload,
			priority,
		};
		return await new Promise((resolve, reject) => {
			const timeout = globalThis.setTimeout(() => {
				this.pending.delete(taskId);
				reject(new EngineTransportError(`[${this.id}] task timeout`));
			}, 30_000) as unknown as number;
			this.pending.set(taskId, { resolve, reject, timeout });
			try {
				this.port.postMessage(message);
			} catch (error) {
				clearTimeout(timeout);
				this.pending.delete(taskId);
				reject(new EngineTransportError(`[${this.id}] failed to send worker task`, error));
			}
		});
	}

	/** Controller 和 Worker 都完成匹配转换后才完成公开命令。 */
	private async dispatchLifecycleControl(command: EngineLifecycleCommand): Promise<EngineLifecycleResult> {
		this.assertActive();
		this.lifecycleActor.send(command);
		const waiting = this.getLifecycleSnapshot();
		if (waiting.pending?.correlationId !== command.correlationId) {
			throw new EngineExecutionFailure({
				code: "invalid_engine_lifecycle_transition",
				message: `${command.type} 不允许在 ${waiting.state} 状态执行`,
				details: { command: command.type, state: waiting.state },
			});
		}

		const response = await this.executePayload(command, "high");
		const result = parseEngineLifecycleResult(command, response.result);
		this.lifecycleActor.send(result);
		const settled = this.getLifecycleSnapshot();
		if (settled.pending !== null) {
			throw new EngineProtocolError(`Controller did not settle ${command.type}`, { result, settled });
		}
		if (
			this.workerLifecycleSnapshot?.pending === null &&
			this.workerLifecycleSnapshot.confirmedState !== settled.confirmedState
		) {
			throw new EngineProtocolError(`Controller and executor settled to different states after ${command.type}`, {
				controller: settled,
				executor: this.workerLifecycleSnapshot,
			});
		}
		if (!result.success) throw new EngineExecutionFailure(result.error);
		return result;
	}

	async executeEngineRPC<TRequest extends EngineRPC>(
		rpc: TRequest,
		priority: EngineTaskPriority = "high",
	): Promise<EngineRPCResult<TRequest["type"]>> {
		const response = await this.executePayload(rpc, priority);
		return parseEngineRPCResult<TRequest["type"]>(rpc.type, response.result);
	}

	async whenReady(): Promise<void> {
		this.assertActive();
		if (this.ready) return;
		await this.readyPromise;
	}

	isReady(): boolean {
		return !this.disposed && this.ready;
	}

	getLifecycleSnapshot(): EngineLifecycleSnapshot {
		this.assertActive();
		return projectEngineLifecycleSnapshot(this.lifecycleActor.getSnapshot());
	}

	subscribeLifecycle(listener: (snapshot: EngineLifecycleSnapshot) => void): () => void {
		this.assertActive();
		const subscription = this.lifecycleActor.subscribe((snapshot) => {
			listener(projectEngineLifecycleSnapshot(snapshot));
		});
		return () => subscription.unsubscribe();
	}

	private async requireRPC<TRequest extends EngineRPC>(
		rpc: TRequest,
		priority: EngineTaskPriority = "high",
	): Promise<EngineRPCData<TRequest["type"]>> {
		const result = await this.executeEngineRPC(rpc, priority);
		if (!result.success) throw new EngineExecutionFailure(result.error);
		return result.data;
	}

	async loadScenario(data: EngineScenarioData): Promise<void> {
		await this.dispatchLifecycleControl({
			type: "CMD_INIT",
			data,
			sourceSide: "controller",
			correlationId: createId(),
		});
	}

	async setRuntimeConfig(config: RuntimeConfig): Promise<void> {
		await this.requireRPC({ type: "set_runtime_config", config });
	}

	async start(): Promise<void> {
		await this.dispatchLifecycleControl({ type: "CMD_START", sourceSide: "controller", correlationId: createId() });
	}

	async pause(): Promise<void> {
		await this.dispatchLifecycleControl({ type: "CMD_PAUSE", sourceSide: "controller", correlationId: createId() });
	}

	async resume(): Promise<void> {
		await this.dispatchLifecycleControl({ type: "CMD_RESUME", sourceSide: "controller", correlationId: createId() });
	}

	async stop(): Promise<void> {
		await this.dispatchLifecycleControl({ type: "CMD_STOP", sourceSide: "controller", correlationId: createId() });
	}

	async reset(): Promise<void> {
		await this.dispatchLifecycleControl({ type: "CMD_RESET", sourceSide: "controller", correlationId: createId() });
	}

	async step(): Promise<void> {
		await this.dispatchLifecycleControl({ type: "CMD_STEP", sourceSide: "controller", correlationId: createId() });
	}

	async unloadScenario(): Promise<void> {
		await this.dispatchLifecycleControl({ type: "CMD_UNLOAD", sourceSide: "controller", correlationId: createId() });
	}

	async fastForward(options?: { maxTicks?: number; maxDurationMs?: number }): Promise<FastForwardResult> {
		const result = await this.dispatchLifecycleControl({
			type: "CMD_FAST_FORWARD",
			sourceSide: "controller",
			correlationId: createId(),
			options,
		});
		if (result.type !== "RESULT_FAST_FORWARD" || !result.success) {
			throw new EngineProtocolError("CMD_FAST_FORWARD returned an invalid success result", result);
		}
		return result.data;
	}

	async sendIntent(intent: IntentMessage): Promise<{ success: boolean; error?: string }> {
		const result = await this.executeEngineRPC({ type: "send_intent", intent }, "high");
		return result.success ? { success: true } : { success: false, error: result.error.message };
	}

	async bindMemberController(memberId: string): Promise<{ controllerId: string; boundMemberId: string }> {
		const existing = Array.from(this.memberControllers.entries()).find(([, entry]) => entry.boundMemberId === memberId);
		if (existing) return { controllerId: existing[0], boundMemberId: memberId };
		const controller = new MemberController(this);
		const failed = (await controller.bind(memberId)).find((result) => !result.success);
		if (failed) throw new Error(failed.error ?? `控制器绑定失败: ${memberId}`);
		this.memberControllers.set(controller.controllerId, { boundMemberId: memberId, controller });
		return { controllerId: controller.controllerId, boundMemberId: memberId };
	}

	async unbindMemberController(controllerId: string): Promise<void> {
		const entry = this.memberControllers.get(controllerId);
		if (!entry) return;
		await entry.controller.unbind();
		this.memberControllers.delete(controllerId);
	}

	async unbindAllMemberControllers(): Promise<void> {
		await Promise.all(
			Array.from(this.memberControllers.keys()).map((controllerId) => this.unbindMemberController(controllerId)),
		);
	}

	async selectMemberTarget(controllerId: string, targetMemberId: string): Promise<void> {
		const entry = this.memberControllers.get(controllerId);
		if (!entry) throw new Error(`控制器不存在: ${controllerId}`);
		const failed = (await entry.controller.selectTarget(targetMemberId)).find((result) => !result.success);
		if (failed) throw new Error(failed.error ?? `目标选择失败: ${targetMemberId}`);
	}

	async castMemberSkill(controllerId: string, skillId: string): Promise<void> {
		const entry = this.memberControllers.get(controllerId);
		if (!entry) throw new Error(`控制器不存在: ${controllerId}`);
		const failed = (await entry.controller.castSkill(skillId)).find((result) => !result.success);
		if (failed) throw new Error(failed.error ?? `技能施放失败: ${skillId}`);
	}

	async getMembers(): Promise<MemberSnapshot[]> {
		return await this.requireRPC({ type: "get_members" }, "low");
	}

	async getMemberSkillList(memberId: string): Promise<MemberSkillSummary[]> {
		return await this.requireRPC({ type: "get_member_skill_list", memberId }, "low");
	}

	async getRenderSnapshot(includeAreas = false): Promise<RenderSnapshot> {
		return await this.requireRPC({ type: "get_render_snapshot", includeAreas }, "high");
	}

	async patchMemberConfig(memberId: string, data: EngineMember): Promise<void> {
		await this.requireRPC({ type: "patch_member", memberId, memberData: data });
	}

	async startRunOutput(runId: string, recordingPolicy: ExecutionRecordingPolicy): Promise<void> {
		await this.requireRPC({ type: "start_run_output", runId, recordingPolicy });
	}

	async finishRunOutput(runId: string): Promise<EngineRunOutput> {
		return await this.requireRPC({ type: "finish_run_output", runId });
	}

	async cancelRunOutput(runId: string): Promise<void> {
		await this.requireRPC({ type: "cancel_run_output", runId });
	}

	async acknowledgeRunOutput(runId: string): Promise<void> {
		await this.requireRPC({ type: "acknowledge_run_output", runId });
	}

	async setRealtimeSnapshotHz(snapshotHz: number): Promise<void> {
		await this.requireRPC({ type: "set_realtime_snapshot_hz", snapshotHz });
	}

	on<K extends keyof EngineWorkerClientEventMap>(
		event: K,
		listener: (payload: EngineWorkerClientEventMap[K]) => void,
	): () => void {
		this.assertActive();
		this.emitter.on(event, listener);
		return () => this.off(event, listener);
	}

	off<K extends keyof EngineWorkerClientEventMap>(
		event: K,
		listener?: (payload: EngineWorkerClientEventMap[K]) => void,
	): void {
		this.emitter.off(event, listener);
	}

	async dispose(): Promise<void> {
		if (this.disposed) return;
		this.disposed = true;
		this.memberControllers.clear();
		this.lifecycleActor.stop();
		this.rejectAllPending(new Error(`[${this.id}] disposed`));
		this.port.close();
		this.worker.terminate();
		this.emitter.emit("disposed", { engineId: this.id });
	}

	isDisposed(): boolean {
		return this.disposed;
	}
}
