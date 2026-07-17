import type { EngineMember } from "../engineScenarioSchema";
import type { EngineLifecycleSnapshot } from "../GameEngineSM";
import type { IntentMessage } from "../MessageRouter/MessageRouter";
import type { EngineRunOutput, ExecutionRecordingPolicy } from "../runOutput";
import type { EngineScenarioData, RuntimeConfig } from "../types";
import type { MemberSnapshot } from "../World/Member/Member";
import type { EngineWorkerClient, EngineWorkerClientEventMap } from "./EngineWorkerClient";
import type { FastForwardResult, MemberSkillSummary } from "./protocol";
import type { RenderSnapshot } from "./RendererProtocol";

export type ManagedEngineWorkerClient = Pick<
	EngineWorkerClient,
	| "id"
	| "whenReady"
	| "isReady"
	| "getLifecycleSnapshot"
	| "subscribeLifecycle"
	| "loadScenario"
	| "setRuntimeConfig"
	| "start"
	| "pause"
	| "resume"
	| "stop"
	| "reset"
	| "step"
	| "sendIntent"
	| "bindMemberController"
	| "unbindMemberController"
	| "unbindAllMemberControllers"
	| "selectMemberTarget"
	| "castMemberSkill"
	| "getMembers"
	| "getMemberSkillList"
	| "getRenderSnapshot"
	| "patchMemberConfig"
	| "fastForward"
	| "startRunOutput"
	| "finishRunOutput"
	| "cancelRunOutput"
	| "acknowledgeRunOutput"
	| "setRealtimeSnapshotHz"
	| "unloadScenario"
	| "on"
	| "off"
	| "dispose"
>;

/**
 * Session 持有的通用实时引擎使用权。
 *
 * Handle 只暴露业务编排所需的类型化原子操作；物理 EngineWorkerClient、Worker、通信通道和 dispose
 * 始终由 EngineService 拥有。close 幂等；关闭中的并发调用共享同一 Promise，关闭失败允许显式重试。
 */
export class RealtimeEngineHandle {
	private closed = false;
	private closePromise: Promise<void> | null = null;

	constructor(
		readonly id: string,
		private readonly client: ManagedEngineWorkerClient,
		private readonly closeResource: (handleId: string) => Promise<void>,
	) {}

	private assertActive(): void {
		if (this.closed || this.closePromise) throw new Error(`RealtimeEngineHandle 已关闭或正在关闭: ${this.id}`);
	}

	isClosed(): boolean {
		return this.closed;
	}

	isReady(): boolean {
		this.assertActive();
		return this.client.isReady();
	}

	async whenReady(): Promise<void> {
		this.assertActive();
		await this.client.whenReady();
	}

	getLifecycleSnapshot(): EngineLifecycleSnapshot {
		this.assertActive();
		return this.client.getLifecycleSnapshot();
	}

	subscribeLifecycle(listener: (snapshot: EngineLifecycleSnapshot) => void): () => void {
		this.assertActive();
		return this.client.subscribeLifecycle(listener);
	}

	async loadScenario(data: EngineScenarioData): Promise<void> {
		this.assertActive();
		await this.client.loadScenario(data);
	}

	async setRuntimeConfig(config: RuntimeConfig): Promise<void> {
		this.assertActive();
		await this.client.setRuntimeConfig(config);
	}

	async start(): Promise<void> {
		this.assertActive();
		await this.client.start();
	}

	async pause(): Promise<void> {
		this.assertActive();
		await this.client.pause();
	}

	async resume(): Promise<void> {
		this.assertActive();
		await this.client.resume();
	}

	async stop(): Promise<void> {
		this.assertActive();
		await this.client.stop();
	}

	async reset(): Promise<void> {
		this.assertActive();
		await this.client.reset();
	}

	async step(): Promise<void> {
		this.assertActive();
		await this.client.step();
	}

	async sendIntent(intent: IntentMessage): Promise<{ success: boolean; error?: string }> {
		this.assertActive();
		return await this.client.sendIntent(intent);
	}

	async bindMemberController(memberId: string): Promise<{ controllerId: string; boundMemberId: string }> {
		this.assertActive();
		return await this.client.bindMemberController(memberId);
	}

	async unbindMemberController(controllerId: string): Promise<void> {
		this.assertActive();
		await this.client.unbindMemberController(controllerId);
	}

	async unbindAllMemberControllers(): Promise<void> {
		this.assertActive();
		await this.client.unbindAllMemberControllers();
	}

	async selectMemberTarget(controllerId: string, targetMemberId: string): Promise<void> {
		this.assertActive();
		await this.client.selectMemberTarget(controllerId, targetMemberId);
	}

	async castMemberSkill(controllerId: string, skillId: string): Promise<void> {
		this.assertActive();
		await this.client.castMemberSkill(controllerId, skillId);
	}

	async getMembers(): Promise<MemberSnapshot[]> {
		this.assertActive();
		return await this.client.getMembers();
	}

	async getMemberSkillList(memberId: string): Promise<MemberSkillSummary[]> {
		this.assertActive();
		return await this.client.getMemberSkillList(memberId);
	}

	async getRenderSnapshot(includeAreas = false): Promise<RenderSnapshot> {
		this.assertActive();
		return await this.client.getRenderSnapshot(includeAreas);
	}

	async patchMemberConfig(memberId: string, data: EngineMember): Promise<void> {
		this.assertActive();
		await this.client.patchMemberConfig(memberId, data);
	}

	async fastForward(options?: { maxTicks?: number; maxDurationMs?: number }): Promise<FastForwardResult> {
		this.assertActive();
		return await this.client.fastForward(options);
	}

	async startRunOutput(runId: string, recordingPolicy: ExecutionRecordingPolicy): Promise<void> {
		this.assertActive();
		await this.client.startRunOutput(runId, recordingPolicy);
	}

	async finishRunOutput(runId: string): Promise<EngineRunOutput> {
		this.assertActive();
		return await this.client.finishRunOutput(runId);
	}

	async cancelRunOutput(runId: string): Promise<void> {
		this.assertActive();
		await this.client.cancelRunOutput(runId);
	}

	async acknowledgeRunOutput(runId: string): Promise<void> {
		this.assertActive();
		await this.client.acknowledgeRunOutput(runId);
	}

	async setRealtimeSnapshotHz(snapshotHz: number): Promise<void> {
		this.assertActive();
		await this.client.setRealtimeSnapshotHz(snapshotHz);
	}

	async unloadScenario(): Promise<void> {
		this.assertActive();
		await this.client.unloadScenario();
	}

	on<K extends keyof EngineWorkerClientEventMap>(
		event: K,
		listener: (payload: EngineWorkerClientEventMap[K]) => void,
	): () => void {
		this.assertActive();
		return this.client.on(event, listener);
	}

	off<K extends keyof EngineWorkerClientEventMap>(
		event: K,
		listener?: (payload: EngineWorkerClientEventMap[K]) => void,
	): void {
		this.assertActive();
		this.client.off(event, listener);
	}

	subscribeRuntimeFailure(listener: (reason: string) => void): () => void {
		return this.on("runtime_failure", ({ reason }) => listener(reason));
	}

	close(): Promise<void> {
		if (this.closed) return Promise.resolve();
		if (this.closePromise) return this.closePromise;

		const closePromise = this.closeResource(this.id).then(() => {
			this.closed = true;
		});
		this.closePromise = closePromise.finally(() => {
			this.closePromise = null;
		});
		return this.closePromise;
	}
}
