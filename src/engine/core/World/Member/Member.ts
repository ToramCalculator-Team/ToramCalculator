import { MEMBER_TYPE, type MemberType } from "@db/schema/enums";
import type { MovementBehaviorRecordData } from "@db/schema/jsons";
import { createActor, type EventObject } from "xstate";
import { z } from "zod/v4";
import { createLogger } from "~/lib/logger";
import type { EventCatalog } from "../../Event/EventCatalog";
import type { EngineMember } from "../../engineScenarioSchema";
import type { ExpressionContext } from "../../JSProcessor/types";
import type { PipelineOverlay } from "../../Pipeline/overlay";
import type { PipelineResolverService } from "../../Pipeline/PipelineResolverService";
import type { StageData, StageEnv } from "../../Pipeline/stageEnv";
import type { MemberCheckpoint, MemberDomainEvent, SimulationTickContext } from "../../types";
import type { WorldObservable } from "../observable";
import {
	createCommonControlBehaviorBindings,
	type MemberControlBehaviorCapabilities,
} from "./ControlBehavior/Bindings";
import { ControlBehaviorRuntime } from "./ControlBehavior/ControlBehaviorRuntime";
import { createEffectBindings } from "./EffectBehavior/Bindings";
import { EffectBtManager } from "./EffectBehavior/EffectBtManager";
import type { EffectBtCapabilities, EffectBtManagerEnv } from "./EffectBehavior/EffectBtTypes";
import { AttributeThresholdSource } from "./ProcBus/AttributeThresholdSource";
import { ProcBus } from "./ProcBus/ProcBus";
import type { MemberRuntimeServices } from "./RuntimeServices";
import type { AttributeContainer } from "./runtime/AttributeContainer/AttributeContainer";
import { AttributeSnapshotSchema } from "./runtime/AttributeContainer/AttributeContainerTypes";
import type { NestedSchema } from "./runtime/AttributeContainer/SchemaTypes";
import type { MemberMovementInput, MemberSharedRuntime } from "./runtime/SharedRuntime";
import {
	InMemoryStatusInstanceStore,
	type MutableStatusInstanceStore,
	type StatusInstance,
} from "./runtime/Status/StatusInstanceStore";
import type {
	MemberActor,
	MemberControlEvent,
	MemberFSMContext,
	MemberFSMEvent,
	MemberStateMachine,
	MemberStateMachineEnv,
} from "./StateMachine/types";

const log = createLogger("Member");
const MOVEMENT_EPSILON = 0.0001;

export const MemberSnapshotSchema = z.object({
	attrs: AttributeSnapshotSchema,
	id: z.string(),
	type: z.enum(MEMBER_TYPE),
	name: z.string(),
	campId: z.string(),
	teamId: z.string(),
	position: z.object({
		x: z.number(),
		y: z.number(),
		z: z.number(),
	}),
});

export type MemberSnapshot = z.output<typeof MemberSnapshotSchema>;

/**
 * Member 聚合根：薄壳设计，持有三层（数据层、计算层、编排层）并协调其交互。
 *
 * 核心设计原则：
 * 1. 成员是被动实体：所有状态信息通过查询接口暴露
 * 2. 唯一主动行为：通过 DomainEventBus 发布瞬时事件
 * 3. 业务逻辑在 FSM 内：伤害处理、垂直运动、落地检测都在 FSM
 * 4. 三层职责清晰：通过注释分割，不创建独立类
 */
export abstract class Member<
	TSchema extends NestedSchema,
	TSpecificEvent extends EventObject,
	TFSMContext extends MemberFSMContext,
	TRuntime extends MemberSharedRuntime<TSchema>,
> implements WorldObservable
{
	// ==================== 身份与元数据 ====================
	readonly id: string;
	readonly type: MemberType;
	readonly name: string;
	readonly campId: string;
	readonly teamId: string;
	readonly data: EngineMember;

	// ==================== 数据层：状态容器 ====================
	private readonly dataSchema: NestedSchema;
	private readonly attributeContainer: AttributeContainer<TSchema>;
	private readonly statusStore: MutableStatusInstanceStore;
	private readonly runtime: TRuntime;

	// ==================== 计算层：管线 ====================
	private readonly pipelineOverlays: PipelineOverlay[] = [];
	private pipelineResolverService: PipelineResolverService | null = null;

	// ==================== 编排层：状态机与行为树 ====================
	private readonly actor: MemberActor<MemberFSMEvent<TSpecificEvent>, TFSMContext>;
	private actorStarted = false;
	/** 行为模式：autonomous(AI 控制) 或 manual(外部控制) */
	private behaviorMode: "autonomous" | "manual";
	private readonly controlBehavior: ControlBehaviorRuntime | null = null;
	private readonly effectBtManager: EffectBtManager<TSchema, TRuntime, MemberFSMEvent<TSpecificEvent>>;
	private readonly procBus: ProcBus | null = null;
	private readonly attributeThresholdSource: AttributeThresholdSource<TSchema>;
	/** ai 模式下的连续移动行为记录 */
	private aiMovementBehaviors: MovementBehaviorRecordData[] = [];

	// ==================== 依赖服务（注入） ====================
	private readonly services: MemberRuntimeServices;
	private readonly domainEventBus: ((event: MemberDomainEvent) => void) | null = null;

	// ==================== 构造与初始化 ====================

	constructor(
		stateMachine: (
			env: MemberStateMachineEnv<TSchema, MemberFSMEvent<TSpecificEvent>, TRuntime>,
		) => MemberStateMachine<MemberFSMEvent<TSpecificEvent>, TFSMContext>,
		campId: string,
		teamId: string,
		memberData: EngineMember,
		dataSchema: NestedSchema,
		attributeContainer: AttributeContainer<TSchema>,
		runtime: TRuntime,
		services: MemberRuntimeServices,
		domainEventBus: ((event: MemberDomainEvent) => void) | null,
		pipelineResolverService: PipelineResolverService | null,
		eventCatalog: EventCatalog | null,
		position?: { x: number; y: number; z: number },
		controlBehaviorBindings: (capabilities: MemberControlBehaviorCapabilities) => Record<string, unknown> = (
			capabilities,
		) => createCommonControlBehaviorBindings(capabilities),
		effectBindings: (capabilities: EffectBtCapabilities<TSchema>) => Record<string, unknown> = (capabilities) =>
			createEffectBindings({} as MemberSharedRuntime<TSchema> & Record<string, unknown>, {}, {}, capabilities),
	) {
		// 身份
		this.id = memberData.id;
		this.type = memberData.type;
		this.name = memberData.name;
		this.campId = campId;
		this.teamId = teamId;
		this.data = memberData;

		// 数据层
		this.dataSchema = dataSchema;
		this.attributeContainer = attributeContainer;
		this.runtime = runtime;
		this.runtime.statusTags = this.runtime.statusTags ?? [];
		if (position) {
			this.runtime.position = position;
		}
		this.statusStore = new InMemoryStatusInstanceStore(() => runtime.currentTimeMs);

		// 计算层
		this.pipelineResolverService = pipelineResolverService;

		// 编排层
		this.behaviorMode = memberData.resolvedBehavior ? "autonomous" : "manual";
		this.services = services;
		this.domainEventBus = domainEventBus;

		// 初始化 AttributeThresholdSource
		this.attributeThresholdSource = new AttributeThresholdSource<TSchema>(this.attributeContainer, null);

		// 初始化 ProcBus 和事件路由
		if (eventCatalog) {
			this.procBus = new ProcBus(eventCatalog);
			this.setupEventRouting();
		}

		// 初始化 BT 能力和环境
		const btCapabilities = this.createBtCapabilities();
		this.effectBtManager = new EffectBtManager(this.createBtEnv(btCapabilities), effectBindings(btCapabilities));

		// 初始化 AI 控制行为树
		this.aiMovementBehaviors = memberData.resolvedBehavior?.movementBehaviors ?? [];
		if (this.behaviorMode === "autonomous" && memberData.resolvedBehavior) {
			const controlBehaviorCapabilities: MemberControlBehaviorCapabilities = {
				submitControlInput: (event) => this.submitControlInput(event, "autonomous"),
			};
			this.controlBehavior = new ControlBehaviorRuntime(
				memberData.resolvedBehavior.definition,
				memberData.resolvedBehavior.agent,
				controlBehaviorBindings(controlBehaviorCapabilities),
				runtime,
				{
					getDeltaTimeMs: () => this.runtime.deltaTimeMs,
					getCurrentTimeMs: () => this.runtime.currentTimeMs,
					resolveProperty: (path) => {
						if (this.attributeContainer.hasKey(path)) {
							return this.attributeContainer.getValue(path as Parameters<typeof this.attributeContainer.getValue>[0]);
						}
						return undefined;
					},
				},
			);
		}

		// 创建 FSM Actor
		this.actor = createActor(stateMachine(this.createStateMachineEnv()));
	}

	/**
	 * 设置事件路由：StatusStore 变更 → ProcBus 事件 + DomainEvent
	 */
	private setupEventRouting(): void {
		if (!this.procBus) return;

		const bus = this.procBus;

		// StatusStore 变更监听
		this.statusStore.setChangeListener((change) => {
			const timeMs = this.getLogicalTimeMs();
			if (change.kind === "entered") {
				bus.emit(
					"status.entered",
					{
						type: change.instance.type,
						sourceId: change.instance.sourceId,
						timeMs,
					},
					timeMs,
				);
				this.notifyDomainEvent({
					type: "status_entered",
					memberId: this.id,
					statusType: change.instance.type,
					sourceId: change.instance.sourceId,
					timeMs,
				});
			} else {
				const reason = change.reason ?? "removed";
				bus.emit(
					"status.exited",
					{
						type: change.instance.type,
						reason,
						timeMs,
					},
					timeMs,
				);
				this.notifyDomainEvent({
					type: "status_exited",
					memberId: this.id,
					statusType: change.instance.type,
					reason,
					timeMs,
				});
			}
		});

		// 属性阈值事件源
		this.attributeThresholdSource.setEmitter((payload) => {
			const timeMs = this.getLogicalTimeMs();
			bus.emit("attr.crossed", payload, timeMs);
		});

		// 致死事件订阅
		bus.subscribeByName(`member:${this.id}:death`, ["damage.fatal"], null, (event) => {
			this.actor.send({ type: "死亡通知", data: event.payload });
		});
	}

	/**
	 * 构造 FSM 专用 env。
	 * 使用 getter 让 checkpoint restore 后状态机闭包继续读取 Member 当前字段。
	 */
	private createStateMachineEnv(): MemberStateMachineEnv<TSchema, MemberFSMEvent<TSpecificEvent>, TRuntime> {
		const self = this;
		return {
			get id() {
				return self.id;
			},
			get name() {
				return self.name;
			},
			get position() {
				return self.runtime.position;
			},
			get runtime() {
				return self.runtime;
			},
			get attributeContainer() {
				return self.attributeContainer;
			},
			get services() {
				return self.services;
			},
			get effectBtManager() {
				return self.effectBtManager;
			},
			notifyDomainEvent: (event) => self.notifyDomainEvent(event),
			emitProc: (eventName, payload) => self.emitProc(eventName, payload),
			faceCurrentTarget: () => self.faceCurrentTarget(),
			runPipeline: (pipelineName, params) => self.runPipeline(pipelineName, params),
			send: (event) => self.actor.send(event),
		};
	}

	/**
	 * 构造 BT 能力提供者。
	 */
	private createBtCapabilities(): EffectBtCapabilities<TSchema> {
		const self = this;
		return {
			get services() {
				return self.services;
			},
			get attributeContainer() {
				return self.attributeContainer;
			},
			declareState: () => {
				// 状态声明已移除，保留空实现以兼容现有 BT
			},
			clearActiveEffectStateDeclaration: () => {
				// 状态声明已移除，保留空实现
			},
			registerParallelBt: (name, definition, agent, localContext) =>
				self.effectBtManager.registerParallelBt(name, definition, agent, localContext),
			unregisterParallelBt: (name) => self.effectBtManager.unregisterParallelBt(name),
			hasParallelBt: (name) => self.effectBtManager.hasBuff(name),
			subscribeByName: (sourceId, eventNames, predicate, handler) => {
				if (!self.procBus) {
					log.warn(`member ${self.name} ProcBus 未就绪，忽略订阅 ${sourceId}`);
					return 0;
				}
				return self.procBus.subscribeByName(sourceId, eventNames, predicate, handler);
			},
			unsubscribeBySource: (sourceId) => {
				self.procBus?.unsubscribeBySource(sourceId);
			},
			registerThreshold: (sourceId, path, threshold, direction, options) =>
				self.attributeThresholdSource.register(sourceId, path, threshold, direction, options),
			unregisterThresholdBySource: (sourceId) => self.attributeThresholdSource.unregisterBySource(sourceId),
			notifyDomainEvent: (event) => self.notifyDomainEvent(event),
		};
	}

	/**
	 * 构造 BT Manager 专用 env。
	 */
	private createBtEnv(
		capabilities: EffectBtCapabilities<TSchema>,
	): EffectBtManagerEnv<MemberFSMEvent<TSpecificEvent>, TSchema, TRuntime> {
		const self = this;
		return {
			get name() {
				return self.name;
			},
			getContext: () => self.runtime,
			getCapabilities: () => capabilities,
			getDeltaTimeMs: () => self.runtime.deltaTimeMs,
			send: (event) => self.actor.send(event),
		};
	}

	// ==================== 生命周期 ====================

	start(): void {
		if (this.actorStarted) return;
		this.actor.start();
		this.actorStarted = true;
	}

	tick(tick: SimulationTickContext, movementInput: MemberMovementInput | null = null): void {
		if (!this.actorStarted) {
			throw new Error(`member actor not started: ${this.id}`);
		}

		// 1. 数据层 tick
		this.tickDataLayer(tick);

		// 2. 编排层 tick
		this.tickOrchestrationLayer(tick, movementInput);
	}

	private tickDataLayer(tick: SimulationTickContext): void {
		this.runtime.tickIndex = tick.tickIndex;
		this.runtime.currentTimeMs = tick.currentTimeMs;
		this.runtime.deltaTimeMs = tick.deltaTimeMs;

		// 清理过期状态
		this.statusStore.purgeExpired(tick.currentTimeMs);

		// 同步状态标签
		this.syncStatusTags();

		// 刷新属性脏值
		this.attributeContainer.flushDirtyValues();
	}

	private tickOrchestrationLayer(tick: SimulationTickContext, movementInput: MemberMovementInput | null): void {
		// FSM update
		this.actor.send({ type: "update", timestamp: tick.currentTimeMs });

		// 解析并积分水平移动
		this.resolveAndIntegrateMovement(tick, movementInput);

		// 推进 effect BT
		this.effectBtManager.tickAll();

		// 推进 control BT（autonomous 模式）
		if (this.behaviorMode === "autonomous") {
			this.controlBehavior?.step();
		}
	}

	// ==================== 查询接口：数据层 ====================

	get position(): { x: number; y: number; z: number } {
		return this.runtime.position;
	}

	set position(next: { x: number; y: number; z: number }) {
		this.runtime.position = next;
	}

	get collisionRadius(): number {
		return 0; // TODO: 真实碰撞半径
	}

	getAttribute(key: string): number {
		if (!this.attributeContainer.hasKey(key)) {
			throw new Error(`member ${this.name} attributeContainer 没有 key: ${key}`);
		}
		return this.attributeContainer.getValue(key);
	}

	serialize(): MemberSnapshot {
		return {
			attrs: this.attributeContainer.exportAttributeSnapshot(),
			id: this.id,
			type: this.type,
			name: this.name,
			campId: this.campId,
			teamId: this.teamId,
			position: this.position,
		};
	}

	// ==================== 查询接口：编排层 ====================

	get alive(): boolean {
		const snapshot = this.actor.getSnapshot();
		return snapshot.matches("存活");
	}

	/**
	 * 获取当前 FSM 状态名称。
	 * 子类应实现 resolveFsmState() 将 FSM 快照投影为稳定状态名。
	 */
	getFsmState(): string {
		try {
			return this.resolveFsmState();
		} catch {
			return "unknown";
		}
	}

	/**
	 * 获取当前 active effect BT 状态。
	 * 如果没有 active effect，返回 null。
	 */
	getActiveEffectState(): { name: string; timeMs: number } | null {
		if (!this.effectBtManager.hasActiveEffectBt()) {
			return null;
		}
		// TODO: 从 effectBtManager 获取真实的状态信息
		// 当前 effectBtManager 没有暴露 active effect 的状态名称
		// 需要后续完善
		return null;
	}

	/**
	 * 子类用 XState snapshot.matches 把当前 FSM 动作状态投影为稳定状态名。
	 */
	protected abstract resolveFsmState(): string;

	isAiBehaviorRunning(): boolean {
		return this.controlBehavior?.isRunning() ?? false;
	}

	// ==================== 命令接口 ====================

	/**
	 * 唯一的控制输入入口。
	 * 外部控制器调用时 source 为 "manual"，AI 调用时为 "autonomous"。
	 */
	submitControlInput(event: MemberControlEvent, source: "autonomous" | "manual"): void {
		if (source !== this.behaviorMode) {
			log.warn(`member ${this.name} 拒绝来自 ${source} 的输入，当前模式: ${this.behaviorMode}`);
			return;
		}
		this.actor.send(event);
	}

	/**
	 * 切换行为模式。
	 */
	setBehaviorMode(mode: "autonomous" | "manual"): boolean {
		if (mode === "autonomous" && !this.controlBehavior) {
			log.warn(`member ${this.name} 没有 AI 行为树，无法进入 autonomous 模式`);
			return false;
		}
		if (this.behaviorMode === mode) return true;

		this.behaviorMode = mode;
		if (mode === "manual") {
			this.controlBehavior?.pause();
		} else {
			this.controlBehavior?.resume();
		}
		return true;
	}

	// ==================== 数据层私有方法 ====================

	/**
	 * 同步状态标签：从 StatusStore 派生更新 runtime.statusTags。
	 */
	private syncStatusTags(): void {
		const currentTimeMs = this.getLogicalTimeMs();
		this.runtime.statusTags = this.statusStore.getStatusTags(currentTimeMs);
	}

	/**
	 * 应用状态实例（由 FSM 或外部调用）。
	 */
	applyStatusInstance(instance: StatusInstance): void {
		this.statusStore.apply(instance);
		this.syncStatusTags();
	}

	/**
	 * 移除指定类型的状态。
	 */
	removeStatusByType(type: string): void {
		this.statusStore.removeByType(type);
		this.syncStatusTags();
	}

	// ==================== 编排层私有方法 ====================

	/**
	 * 解析并积分水平移动。
	 */
	private resolveAndIntegrateMovement(tick: SimulationTickContext, input: MemberMovementInput | null): void {
		// 解析移动输入
		if (!input || !this.actor.getSnapshot().hasTag("movement-input-enabled")) {
			this.runtime.movement = null;
			return;
		}

		const length = Math.hypot(input.direction.x, input.direction.z);
		const intensity = Math.min(1, Math.max(0, input.intensity));
		if (!Number.isFinite(length) || length <= MOVEMENT_EPSILON || !Number.isFinite(intensity) || intensity === 0) {
			this.runtime.movement = null;
			return;
		}

		const baseSpeed = intensity >= 0.75 ? this.runtime.locomotion.runSpeed : this.runtime.locomotion.walkSpeed;
		this.runtime.movement = {
			dir: { x: input.direction.x / length, z: input.direction.z / length },
			speed: baseSpeed,
		};

		// 积分水平移动
		this.integrateHorizontalMovement(tick);
	}

	/**
	 * 积分水平移动（只更新 x、z 和朝向）。
	 */
	private integrateHorizontalMovement(tick: SimulationTickContext): void {
		const movement = this.runtime.movement;
		if (!movement) return;

		this.runtime.position.x += (movement.dir.x * movement.speed * tick.deltaTimeMs) / 1000;
		this.runtime.position.z += (movement.dir.z * movement.speed * tick.deltaTimeMs) / 1000;
		this.faceDirection(movement.dir);
	}

	/**
	 * 设置朝向。
	 */
	private faceDirection(direction: { x: number; z: number }): boolean {
		const length = Math.hypot(direction.x, direction.z);
		if (!Number.isFinite(length) || length <= MOVEMENT_EPSILON) return false;
		this.runtime.yaw = Math.atan2(direction.x / length, direction.z / length);
		return true;
	}

	/**
	 * 朝向当前目标（由 FSM 调用）。
	 */
	private faceCurrentTarget(): boolean {
		const targetId = this.runtime.targetId;
		const direction = targetId ? this.services.targetDirectionResolver?.(this.id, targetId) : null;
		return direction ? this.faceDirection(direction) : false;
	}

	/**
	 * AI 模式下按逻辑时间读取当前移动样本。
	 */
	sampleAiMovementInput(currentTimeMs: number, logicStepMs: number): MemberMovementInput | null {
		if (logicStepMs <= 0) return null;
		for (const record of this.aiMovementBehaviors) {
			const index = Math.floor((currentTimeMs - record.startTimeMs) / logicStepMs);
			if (index < 0) continue;
			const sample = record.samples[index];
			if (!sample) continue;
			return { direction: { x: sample.direction.x, z: sample.direction.z }, intensity: sample.intensity };
		}
		return null;
	}

	/**
	 * 派发成员内事件到 ProcBus。
	 */
	emitProc(eventName: string, payload: unknown): void {
		if (!this.procBus) {
			log.warn(`member ${this.name} ProcBus 未就绪，丢弃事件 ${eventName}`);
			return;
		}
		const timeMs = this.getLogicalTimeMs();
		this.procBus.emit(eventName, payload, timeMs);
	}

	// ==================== 计算层私有方法 ====================

	/**
	 * 执行管线（纯计算）。
	 *
	 * Actor 隔离原则：member 只访问自身属性。跨 actor 数据必须通过事件 payload 快照传递。
	 * （例如受击 payload 里的 `casterSnapshot`），严禁在管线执行期同步读取其他成员。
	 */
	runPipeline(pipelineName: string, params?: Record<string, unknown>) {
		const resolver = this.pipelineResolverService;
		if (!resolver) {
			throw new Error(`pipelineResolverService 未注入：${pipelineName}`);
		}

		const timeMs = this.runtime.currentTimeMs;
		const tickIndex = this.services.getTickIndex();
		const damageTagsParam = Array.isArray(params?.damageTags)
			? (params?.damageTags as readonly string[])
			: ([] as readonly string[]);

		const env: StageEnv<TSchema> = {
			timeMs,
			tickIndex,
			stats: (memberIdOrSelector: string, path: string) => {
				if (memberIdOrSelector === "self" || memberIdOrSelector === this.id) {
					return this.attributeContainer.getValue(path);
				}
				log.warn(
					`runPipeline(${pipelineName})：拒绝跨 actor 属性读取 (${memberIdOrSelector}.${path})；跨成员数据必须随事件 payload 传入`,
				);
				return 0;
			},
			eval: (expr: string, vars?: Record<string, unknown>) => {
				const evaluator = this.services.expressionEvaluator;
				if (!evaluator) throw new Error(`expressionEvaluator 未注入：${expr}`);
				const ctx: ExpressionContext = {
					currentTimeMs: timeMs,
					tickIndex,
					casterId: this.id,
					targetId: this.runtime.targetId,
					...(vars ?? {}),
				};
				const out = evaluator(expr, ctx);
				return typeof out === "number" ? out : out ? 1 : 0;
			},
			newId: () => `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
			memberRuntime: this.runtime,
			statusTags: () => this.runtime.statusTags,
			damageTags: () => damageTagsParam,
		};

		const overlays = this.pipelineOverlays;
		const input: StageData = params ?? {};
		return resolver.resolveAndRun(pipelineName, overlays, env, input);
	}

	// ==================== Checkpoint ====================

	captureCheckpoint(): MemberCheckpoint {
		let runtimeClone: unknown;
		try {
			runtimeClone = structuredClone(this.runtime);
		} catch (e) {
			const uncloneable: string[] = [];
			for (const [key, value] of Object.entries(this.runtime)) {
				try {
					structuredClone(value);
				} catch {
					uncloneable.push(`${key}(${typeof value})`);
				}
			}
			log.error(`[${this.name}] runtime structuredClone failed. Uncloneable keys: ${uncloneable.join(", ")}`);
			throw e;
		}
		return {
			memberId: this.id,
			fsm: this.actor.getPersistedSnapshot(),
			attributeContainer: this.attributeContainer.captureCheckpoint(),
			statusStore: this.statusStore.captureCheckpoint(),
			effectBtManager: this.effectBtManager.captureCheckpoint(),
			pipelineOverlays: structuredClone(this.pipelineOverlays),
			position: { ...this.position },
			runtime: runtimeClone as typeof this.runtime,
		};
	}

	restoreCheckpoint(checkpoint: MemberCheckpoint): void {
		this.attributeContainer.restoreCheckpoint(checkpoint.attributeContainer);
		this.statusStore.restoreCheckpoint(checkpoint.statusStore);
		this.effectBtManager.restoreCheckpoint(checkpoint.effectBtManager);
		const overlayCp = checkpoint as unknown as { pipelineOverlays?: PipelineOverlay[] };
		const runtimeCp = checkpoint as unknown as { runtime?: TRuntime };
		this.pipelineOverlays.splice(0, this.pipelineOverlays.length, ...(overlayCp.pipelineOverlays ?? []));
		Object.assign(this.runtime, structuredClone(runtimeCp.runtime ?? this.runtime));
		this.runtime.position = { ...checkpoint.position };
		this.syncStatusTags();
	}

	// ==================== 域事件发布（内部） ====================

	/**
	 * 发布域事件到外部（DomainEventBus）。
	 * 只推送瞬时事件（hit、death、cast_start 等），不推送状态快照。
	 */
	private notifyDomainEvent(event: MemberDomainEvent): void {
		if (this.domainEventBus) {
			this.domainEventBus(event);
		}
	}

	/**
	 * 读取当前逻辑时间。
	 */
	private getLogicalTimeMs(): number {
		try {
			return this.runtime.currentTimeMs;
		} catch {
			return this.runtime.currentTimeMs;
		}
	}
}
