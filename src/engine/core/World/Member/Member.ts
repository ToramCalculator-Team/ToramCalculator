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
import type { DamageAreaSpec } from "../Area/types";
import type { ResolvedDamageEffect } from "../Damage/types";
import type { WorldObservable } from "../observable";
import type { MemberBaseAttrKey } from "./MemberBaseSchema";
import type { MemberRuntimeServices, MemberTargetDirectionResolver, MemberTargetResolver } from "./RuntimeServices";
import { MemberRuntimeServicesDefaults } from "./RuntimeServices";
import type { AttributeContainer } from "./runtime/AttributeContainer/AttributeContainer";
import { AttributeSnapshotSchema } from "./runtime/AttributeContainer/AttributeContainerTypes";
import type { NestedSchema } from "./runtime/AttributeContainer/SchemaTypes";
import { AttributeThresholdSource } from "./runtime/AttributeWatcher/AttributeThresholdSource";
import { AiBehaviorRuntime } from "./runtime/Behavior/AiBehaviorRuntime";
import type { MemberControlMode } from "./runtime/Behavior/MemberControlMode";
import { BtManager } from "./runtime/BehaviourTree/BtManager";
import type { MemberBtCapabilities, MemberBtManagerEnv } from "./runtime/BehaviourTree/BtManagerEnv";
import { ProcBus } from "./runtime/ProcBus/ProcBus";
import type { MemberStateDeclaration, MemberStateFrameEntry, MemberStateName } from "./runtime/State/MemberState";
import type {
	MemberActor,
	MemberControlEvent,
	MemberFSMContext,
	MemberFSMEvent,
	MemberStateMachine,
	MemberStateMachineEnv,
} from "./runtime/StateMachine/types";
import {
	InMemoryStatusInstanceStore,
	type MutableStatusInstanceStore,
	type StatusInstance,
} from "./runtime/Status/StatusInstanceStore";
import type { MemberMovementInput, MemberSharedRuntime } from "./runtime/types";

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
export type MemberControlInputRecorder = (
	memberId: string,
	event: MemberControlEvent,
	disposition: "pending" | "rejected",
	reason?: string,
) => void;

/**
 * 成员基类只接收具体成员新增的 FSM 事件；公共事件由 MemberFSMEvent 在唯一位置组合。
 * 这样 Member 自身发送 update、死亡通知等公共事件时不需要类型断言。
 */
export abstract class Member<
	TExtraAttrKey extends string,
	TSpecificEvent extends EventObject,
	TFSMContext extends MemberFSMContext,
	TRuntime extends MemberSharedRuntime<TExtraAttrKey>,
> implements WorldObservable
{
	id: string;
	type: MemberType;
	name: string;
	/** 成员控制模式（ADR 0054）。 */
	controlMode: MemberControlMode;
	/** AI 控制行为树；由 Member 持有，不在 BtManager 管理。 */
	aiBehavior: AiBehaviorRuntime | null = null;
	/** ai 模式下的连续移动行为；回放时逐逻辑 Tick 读取。 */
	aiMovementBehaviors: MovementBehaviorRecordData[] = [];
	/** 子类用 XState snapshot.matches 把当前 FSM 动作状态投影为稳定状态名。 */
	protected abstract resolveFsmState(): MemberStateName;
	campId: string;
	teamId: string;
	dataSchema: NestedSchema;
	attributeContainer: AttributeContainer<MemberBaseAttrKey | TExtraAttrKey>;
	/** 共享 runtime（可序列化，可进 checkpoint） */
	runtime: TRuntime;
	/** 引擎注入 services（不可序列化） */
	services: MemberRuntimeServices;
	btManager: BtManager<TExtraAttrKey, TRuntime, MemberFSMEvent<TSpecificEvent>>;
	/** 成员级持久 overlays（纯数据，可 checkpoint） */
	pipelineOverlays: PipelineOverlay[] = [];
	private pipelineResolverService: PipelineResolverService | null = null;
	statusStore: MutableStatusInstanceStore;
	/**
	 * 订阅子系统。`setEventCatalog` 注入目录后才创建，未创建前 `emit` / `subscribe` 都 no-op（带告警）。
	 * 每成员独立持有，跨成员事件由外部（MemberManager / GameEngine）路由。
	 */
	procBus: ProcBus | null = null;
	/**
	 * 属性阈值事件源（ADR 0010）：订阅 AttributeContainer 变更，把阈值穿越派发为 ProcBus 的
	 * `attr.crossed` 事件；emitter 在 setEventCatalog 接通 ProcBus 后注入。
	 */
	attributeThresholdSource: AttributeThresholdSource<MemberBaseAttrKey | TExtraAttrKey>;
	actor: MemberActor<MemberFSMEvent<TSpecificEvent>, TFSMContext>;
	private actorStarted = false;
	data: EngineMember;
	get position(): { x: number; y: number; z: number } {
		return this.runtime.position;
	}
	set position(next: { x: number; y: number; z: number }) {
		this.runtime.position = next;
	}
	/**
	 * 权威存活标志（实现 WorldObservable.alive）。
	 *
	 * 判定策略（对齐 document/world-medium-analysis.tmp.md 偏差#1 决策）：
	 * - FSM 死亡状态优先：若成员状态机定义了顶层「死亡」状态（如 Mob），
	 *   则以「当前是否处于死亡态」为权威——不在死亡态即存活。
	 * - 无死亡态者回退 HP：Player 等无死亡状态机的成员，回退到 `hp.current > 0`，
	 *   保证在死亡 FSM 落地前不阻塞这类成员的存活判定。
	 *
	 * 这样可以收敛此前散落在各处的 `hp.current > 0` 内联 guard，统一对外暴露权威字段。
	 */
	get alive(): boolean {
		return !this.isDeadState();
	}
	/**
	 * 碰撞半径占位（实现 WorldObservable.collisionRadius）。
	 *
	 * 当前统一返回 0；真实碰撞几何留待切片 4（碰撞取代 startTimeMs 延迟 / 投射物命中）。
	 * TODO(切片4): 由成员几何配置驱动真实碰撞半径。
	 */
	get collisionRadius(): number {
		return 0;
	}
	/**
	 * 判定成员是否处于「死亡」状态。
	 *
	 * 实现细节：
	 * - 通过 actor 快照读取 FSM。`snapshot.machine.states` 暴露顶层状态定义，
	 *   据此判断该成员的状态机是否定义了「死亡」状态。
	 * - 定义了「死亡」态（Mob）：用 `snapshot.matches("死亡")` 作权威判定。
	 * - 未定义「死亡」态（Player）：回退 `hp.current > 0`（HP 耗尽视为死亡）。
	 * - 任何读取异常（actor 未就绪等）一律按「未死亡」处理，避免误判存活实体出局。
	 */
	private isDeadState(): boolean {
		try {
			const snapshot = this.actor.getSnapshot();
			const states = snapshot.machine?.states as Record<string, unknown> | undefined;
			const hasDeathState = !!states && "死亡" in states;
			if (hasDeathState) {
				return snapshot.matches("死亡" as never);
			}
			// 回退：无死亡状态机的成员以 HP 判定
			return this.attributeContainer.getValue("hp.current") <= 0;
		} catch {
			// actor 尚未启动或快照不可读时，保守视为存活
			return false;
		}
	}
	/**
	 * 每 Tick 投影后的成员动作状态帧（ADR 0053）。
	 * FSM 与行为流程 BT 在 refreshPresentationState 汇合；这里只保存最终输出。
	 */
	presentationState: { current?: MemberStateFrameEntry; nextInstance: number } = {
		nextInstance: 0,
	};
	private activeEffectStateDeclaration: MemberStateDeclaration | null = null;
	private nextBtStateSequence = 0;
	private lastAcceptedStateKey: string | null = null;
	private domainEventSender: ((event: MemberDomainEvent) => void) | null = null;
	private controlInputRecorder: MemberControlInputRecorder | null = null;

	constructor(
		stateMachine: (
			env: MemberStateMachineEnv<TExtraAttrKey, MemberFSMEvent<TSpecificEvent>, TRuntime>,
		) => MemberStateMachine<MemberFSMEvent<TSpecificEvent>, TFSMContext>,
		campId: string,
		teamId: string,
		memberData: EngineMember,
		dataSchema: NestedSchema,
		attributeContainer: AttributeContainer<MemberBaseAttrKey | TExtraAttrKey>,
		runtime: TRuntime,
		services: MemberRuntimeServices = MemberRuntimeServicesDefaults,
		position?: { x: number; y: number; z: number },
		btContextBindings: (
			capabilities: MemberBtCapabilities<TExtraAttrKey, MemberFSMEvent<TSpecificEvent>>,
		) => Record<string, unknown> = () => ({}),
	) {
		this.id = memberData.id;
		this.type = memberData.type;
		this.name = memberData.name;
		this.controlMode = memberData.resolvedBehavior ? "ai" : "controlled";
		this.campId = campId;
		this.teamId = teamId;
		this.runtime = runtime;
		this.services = { ...services };
		this.dataSchema = dataSchema;
		this.data = memberData;
		this.attributeContainer = attributeContainer;

		this.statusStore = new InMemoryStatusInstanceStore(() => this.services.getCurrentTimeMs());
		// 阈值事件源（ADR 0010）：emitter 在 setEventCatalog 接通 ProcBus 后注入，构造期先置空。
		this.attributeThresholdSource = new AttributeThresholdSource<MemberBaseAttrKey | TExtraAttrKey>(
			this.attributeContainer,
			null,
		);
		const btCapabilities = this.createBtCapabilities();
		// BT gets the checkpointable runtime blackboard plus callable bindings closed over capabilities.
		this.btManager = new BtManager(this.createBtEnv(btCapabilities), btContextBindings(btCapabilities));
		this.runtime.statusTags = this.runtime.statusTags ?? [];
		if (position) {
			this.runtime.position = position;
		}

		this.actor = createActor(stateMachine(this.createStateMachineEnv()));
		this.aiMovementBehaviors = memberData.resolvedBehavior?.movementBehaviors ?? [];
		if (this.controlMode === "ai" && memberData.resolvedBehavior) {
			this.aiBehavior = new AiBehaviorRuntime(
				memberData.resolvedBehavior.definition,
				memberData.resolvedBehavior.agent,
				btContextBindings(btCapabilities),
				runtime,
				{
					getDeltaTimeMs: () => this.runtime.deltaTimeMs,
					getCurrentTimeMs: () => this.services.getCurrentTimeMs(),
					resolveProperty: (path) => {
						if (this.attributeContainer.hasKey(path)) {
							return this.attributeContainer.getValue(path as Parameters<typeof this.attributeContainer.getValue>[0]);
						}
						return undefined;
					},
				},
			);
		}
	}

	/**
	 * 构造 FSM 专用 env。
	 *
	 * 设计说明：
	 * - getter 让 checkpoint restore 替换 runtime 后，状态机闭包继续读取 Member 当前字段。
	 * - 方法用箭头函数转发，避免 XState action 调用时丢失 Member.this。
	 */
	private createStateMachineEnv(): MemberStateMachineEnv<TExtraAttrKey, MemberFSMEvent<TSpecificEvent>, TRuntime> {
		const self = this;
		return {
			get id() {
				return self.id;
			},
			get name() {
				return self.name;
			},
			get position() {
				return self.position;
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
			get btManager() {
				return self.btManager;
			},
			notifyDomainEvent: (event) => self.notifyDomainEvent(event),
			emitProc: (eventName, payload) => self.emitProc(eventName, payload),
			faceCurrentTarget: () => self.faceCurrentTarget(),
			runPipeline: (pipelineName, params) => self.runPipeline(pipelineName, params),
			send: (event) => self.actor.send(event),
		};
	}

	/**
	 * 构造 BT 专用 env。
	 *
	 * 设计说明：
	 * - getter 让 checkpoint restore 替换 runtime / procBus 后，BT 继续读取 Member 当前字段。
	 * - send 封装 actor 访问，使 BtManager 不依赖完整 Member 类。
	 */
	private createBtCapabilities(): MemberBtCapabilities<TExtraAttrKey, MemberFSMEvent<TSpecificEvent>> {
		const self = this;
		return {
			get services() {
				return self.services;
			},
			get attributeContainer() {
				return self.attributeContainer;
			},
			declareState: (name) => self.declareState(name),
			clearActiveEffectStateDeclaration: () => {
				self.activeEffectStateDeclaration = null;
			},
			registerParallelBt: (name, definition, agent, localContext) =>
				self.btManager.registerParallelBt(name, definition, agent, localContext),
			unregisterParallelBt: (name) => self.btManager.unregisterParallelBt(name),
			hasParallelBt: (name) => self.btManager.hasBuff(name),
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
			submitControlInput: (event) => self.submitControlInput(event, "ai"),
			// 不暴露 runPipeline：管线属计算层，由 FSM / DamageResolution 调用；BT 叶子不直接跑管线。
			send: (event) => self.actor.send(event),
		};
	}

	/**
	 * 构造 BT Manager 专用 env。
	 *
	 * 设计说明：
	 * - BtManager 只拿黑板和能力提供者，不直接依赖完整 Member 类。
	 * - action/condition 的副作用能力由 bindings 闭包持有，不进入可 checkpoint runtime。
	 */
	private createBtEnv(
		capabilities: MemberBtCapabilities<TExtraAttrKey, MemberFSMEvent<TSpecificEvent>>,
	): MemberBtManagerEnv<MemberFSMEvent<TSpecificEvent>, TExtraAttrKey, TRuntime> {
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

	/**
	 * 供 active effect BT 的 animation 叶子提交本 Tick 状态声明。
	 * AI 行为树和其他 parallel BT 不发布成员动作状态。
	 */
	private declareState(name: MemberStateName): void {
		const timeMs = this.getLogicalTimeMs();
		const sequence = ++this.nextBtStateSequence;
		if (this.btManager.isSteppingActiveEffect()) {
			this.activeEffectStateDeclaration = {
				name,
				timeMs,
				sequence,
			};
			return;
		}
		log.warn(`member ${this.name} 的非技能 BT 不能声明成员动作状态: ${name}`);
	}

	/**
	 * 在 Tick 收尾把 FSM 与行为流程 BT 汇合为单一状态帧。
	 *
	 * 选择规则来自状态结构而不是全局优先级：
	 * - FSM 的 blocking/dead 状态直接胜出；
	 * - FSM 处于技能执行状态时，active effect BT 细化技能阶段；

	 */
	private refreshPresentationState(): void {
		if (!this.btManager.hasActiveEffectBt()) {
			this.activeEffectStateDeclaration = null;
		}
		const fsmName = this.resolveFsmState();
		let selectedName = fsmName;
		let selectedTimeMs = this.getLogicalTimeMs();
		let stateKey = `fsm:${selectedName}`;
		if (fsmName === "skill.busy" && this.activeEffectStateDeclaration) {
			selectedName = this.activeEffectStateDeclaration.name;
			selectedTimeMs = this.activeEffectStateDeclaration.timeMs;
			stateKey = `active-effect:${this.activeEffectStateDeclaration.sequence}`;
		}
		if (this.lastAcceptedStateKey === stateKey && this.presentationState.current) return;

		const instance = this.presentationState.nextInstance + 1;
		this.presentationState.nextInstance = instance;
		this.presentationState.current = {
			name: selectedName,
			instance,
			startedAtLogicalTimeMs: selectedTimeMs,
		};
		this.lastAcceptedStateKey = stateKey;
	}

	/** 读取当前逻辑时间；时间服务未注入时回退 runtime 快照值。 */
	private getLogicalTimeMs(): number {
		try {
			return this.services.getCurrentTimeMs();
		} catch {
			return this.runtime.currentTimeMs;
		}
	}

	start(): void {
		if (this.actorStarted) return;
		this.actor.start();
		this.actorStarted = true;
		this.refreshPresentationState();
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

	/**
	 * Inject the canonical member-level domain event sender.
	 * Purpose: make FSM / pipeline / BT all read the same shared service slot.
	 */
	setDomainEventSender(domainEventSender: ((event: MemberDomainEvent) => void) | null): void {
		this.domainEventSender = domainEventSender;
		this.services.domainEventSender = domainEventSender;
	}

	/** 注入控制输入登记器；它只登记 pending 或源不匹配拒绝，FSM 接纳/拒绝仍由成员事实封闭。 */
	setControlInputRecorder(recorder: MemberControlInputRecorder | null): void {
		this.controlInputRecorder = recorder;
	}

	setTargetResolver(targetResolver: MemberTargetResolver | null): void {
		this.services.targetResolver = targetResolver;
	}

	setTargetDirectionResolver(targetDirectionResolver: MemberTargetDirectionResolver | null): void {
		this.services.targetDirectionResolver = targetDirectionResolver;
	}

	setEvaluateExpression(
		evaluateExpression: ((expression: string, context: ExpressionContext) => number | boolean) | null,
	): void {
		this.services.expressionEvaluator = evaluateExpression;
	}

	setDamageExecutionHandlers(handlers: {
		executeInstantDamage: ((effect: ResolvedDamageEffect) => void) | null;
		createDamageArea: ((spec: DamageAreaSpec) => string) | null;
	}): void {
		this.services.executeInstantDamage = handlers.executeInstantDamage;
		this.services.createDamageArea = handlers.createDamageArea;
	}

	setGetCurrentTimeMs(getCurrentTimeMs: (() => number) | null): void {
		if (getCurrentTimeMs) {
			this.services.getCurrentTimeMs = getCurrentTimeMs;
		}
	}

	setGetTickIndex(getTickIndex: (() => number) | null): void {
		if (getTickIndex) {
			this.services.getTickIndex = getTickIndex;
		}
	}

	setPipelineResolverService(resolver: PipelineResolverService | null): void {
		this.pipelineResolverService = resolver;
	}

	/**
	 * 派发状态进入事实。
	 *
	 * 同一权威状态变更点必须同时写入成员内响应总线和对外投影总线（ADR 0011），
	 * 所以这里把两条派发路径收在一个 helper 内，避免后续只补其中一条。
	 */
	private dispatchStatusEnteredFact(bus: ProcBus, instance: StatusInstance, timeMs: number): void {
		bus.emit(
			"status.entered",
			{
				type: instance.type,
				sourceId: instance.sourceId,
				timeMs,
			},
			timeMs,
		);
		this.notifyDomainEvent({
			type: "status_entered",
			memberId: this.id,
			statusType: instance.type,
			sourceId: instance.sourceId,
			timeMs,
		});
	}

	/**
	 * 派发状态离开事实。
	 *
	 * 这是 status.entered 的对称 helper，保持 ProcBus 与 DomainEventBus 的事实来源一致。
	 */
	private dispatchStatusExitedFact(
		bus: ProcBus,
		instance: StatusInstance,
		reason: "expired" | "removed" | undefined,
		timeMs: number,
	): void {
		const resolvedReason = reason ?? "removed";
		bus.emit(
			"status.exited",
			{
				type: instance.type,
				reason: resolvedReason,
				timeMs,
			},
			timeMs,
		);
		this.notifyDomainEvent({
			type: "status_exited",
			memberId: this.id,
			statusType: instance.type,
			reason: resolvedReason,
			timeMs,
		});
	}

	/**
	 * 注入引擎级 EventCatalog，并在首次注入时完成以下装配：
	 *  1. 创建本成员的 ProcBus（每成员独立）。
	 *  2. 把 StatusInstanceStore 的变更事件路由到 ProcBus，派发 `status.entered` / `status.exited`。
	 *
	 * 传入 `null` 表示卸载（成员销毁前清理订阅）。
	 */
	setEventCatalog(catalog: EventCatalog | null): void {
		if (!catalog) {
			this.procBus?.clear();
			this.procBus = null;
			this.statusStore.setChangeListener(null);
			this.attributeThresholdSource.setEmitter(null);
			return;
		}

		if (!this.procBus) {
			this.procBus = new ProcBus(catalog);
		}

		const bus = this.procBus;
		this.statusStore.setChangeListener((change) => {
			if (change.kind === "entered") {
				this.dispatchStatusEnteredFact(bus, change.instance, change.timeMs);
			} else {
				this.dispatchStatusExitedFact(bus, change.instance, change.reason, change.timeMs);
			}
		});

		// 阈值事件源（ADR 0010）：把属性穿越派发为 ProcBus 的 attr.crossed 事件。
		this.attributeThresholdSource.setEmitter((payload) => {
			let timeMs = this.runtime.currentTimeMs;
			try {
				timeMs = this.services.getCurrentTimeMs();
			} catch {
				// 引擎时间服务注入前回退到 runtime 快照值。
			}
			bus.emit("attr.crossed", payload, timeMs);
		});

		// 致死事件（统一死亡转换）：成员级订阅 damage.fatal，转发给 FSM 触发死亡转换。
		// 订阅无状态，checkpoint restore 后由本方法重新装配；卸载分支已由 procBus.clear() 清理。
		bus.subscribeByName(`member:${this.id}:death`, ["damage.fatal"], null, (event) => {
			this.actor.send({ type: "死亡通知", data: event.payload });
		});
	}

	/**
	 * 执行管线（纯计算）。
	 *
	 * Actor 隔离原则：member 只访问自身属性。跨 actor 数据必须通过事件 payload 快照传递
	 * （例如受击 payload 里的 `casterSnapshot`），严禁在管线执行期同步读取其他成员。
	 *
	 * 环境字段：
	 * - `stats("self", path)` / `stats(<selfId>, path)`：读本成员属性；读其他成员会返回 0 并告警。
	 * - `memberRuntime`：共享 runtime 只读快照。
	 * - `statusTags()`：本成员 status tag 列表（等价于 `memberRuntime.statusTags`）。
	 * - `damageTags()`：`params.damageTags` 的只读视图（受击管线调用时传入）。
	 *
	 * @param pipelineName 管线名称
	 * @param params 管线输入参数；包含特殊键 `damageTags?: string[]` 用于受击相关管线
	 */
	runPipeline(pipelineName: string, params?: Record<string, unknown>) {
		const resolver = this.pipelineResolverService;
		if (!resolver) {
			throw new Error(`pipelineResolverService 未注入：${pipelineName}`);
		}

		const timeMs = this.services.getCurrentTimeMs();
		const tickIndex = this.services.getTickIndex();
		const damageTagsParam = Array.isArray(params?.damageTags)
			? (params?.damageTags as readonly string[])
			: ([] as readonly string[]);

		const env: StageEnv<TExtraAttrKey> = {
			timeMs,
			tickIndex,
			stats: (memberIdOrSelector: string, path: string) => {
				if (memberIdOrSelector === "self" || memberIdOrSelector === this.id) {
					return this.attributeContainer.getValue(path as MemberBaseAttrKey | TExtraAttrKey);
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

	/**
	 * Status truth lives in statusStore.
	 * statusTags 由 runtime 提供，是跨系统共享读面；写入由 statusStore 派生更新。
	 */
	applyStatusInstance(instance: StatusInstance): void {
		this.statusStore.apply(instance);
		this.syncStatusTags();
	}

	removeStatusByType(type: string): void {
		this.statusStore.removeByType(type);
		this.syncStatusTags();
	}

	private syncStatusTags(): void {
		let currentTimeMs = this.runtime.currentTimeMs;
		try {
			currentTimeMs = this.services.getCurrentTimeMs();
		} catch {
			// Before engine services are injected, fall back to the local snapshot value.
		}
		this.runtime.statusTags = this.statusStore.getStatusTags(currentTimeMs);
	}

	notifyDomainEvent(event: MemberDomainEvent): void {
		if (this.domainEventSender) {
			this.domainEventSender(event);
		}
	}

	/** 外部控制器输入入口；只在 controlled 模式下有效。 */
	submitExternalControlInput(event: MemberControlEvent): void {
		this.submitControlInput(event, "controlled");
	}

	/** 切换控制模式；ai -> controlled 暂停 AI 行为树，controlled -> ai 恢复。 */
	setControlMode(mode: MemberControlMode): void {
		if (this.controlMode === mode) return;
		this.controlMode = mode;
		if (mode === "controlled") {
			this.aiBehavior?.pause();
		} else if (!this.aiBehavior) {
			log.warn(`member ${this.name} 没有 AI 行为树，无法进入 ai 模式`);
		} else {
			this.aiBehavior.resume();
		}
	}

	/** 设置 ai 模式下的连续移动行为记录；替换旧记录。 */
	setAiMovementBehaviors(records: MovementBehaviorRecordData[]): void {
		this.aiMovementBehaviors = records;
	}

	/** ai 模式下按逻辑时间读取当前移动样本。 */
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

	/** AI 行为树是否仍在运行；停止策略用它判断成员行为序列是否结束。 */
	isAiBehaviorRunning(): boolean {
		return this.aiBehavior?.isRunning() ?? false;
	}

	/**
	 * 统一控制输入入口（ADR 0054）。
	 * Recorder 必须先看到 pending 输入，FSM 同步产生的接纳或拒绝事实才能封闭同一 inputId。
	 */
	private submitControlInput(event: MemberControlEvent, source: MemberControlMode): void {
		if (source !== this.controlMode) {
			this.controlInputRecorder?.(this.id, event, "rejected", "control_source_not_active");
			return;
		}
		this.controlInputRecorder?.(this.id, event, "pending");
		this.actor.send(event);
	}

	/** 派发成员内事件到本成员 ProcBus（供 passive/registlet 响应，ADR-0011）。 */
	emitProc(eventName: string, payload: unknown): void {
		if (!this.procBus) {
			log.warn(`member ${this.name} ProcBus 未就绪，丢弃事件 ${eventName}`);
			return;
		}
		let timeMs = this.runtime.currentTimeMs;
		try {
			timeMs = this.services.getCurrentTimeMs();
		} catch {
			// 引擎时间服务注入前回退到 runtime 快照值。
		}
		this.procBus.emit(eventName, payload, timeMs);
	}

	tick(tick: SimulationTickContext, movementInput: MemberMovementInput | null = null): void {
		if (!this.actorStarted) {
			throw new Error(`member actor not started: ${this.id}`);
		}
		this.runtime.tickIndex = tick.tickIndex;
		this.runtime.currentTimeMs = tick.currentTimeMs;
		this.runtime.deltaTimeMs = tick.deltaTimeMs;
		this.statusStore.purgeExpired(tick.currentTimeMs);
		this.syncStatusTags();
		this.actor.send({ type: "update", timestamp: tick.currentTimeMs });
		this.resolveMovementInput(movementInput);
		this.integrateMovement(tick);
		this.btManager.tickAll();
		if (this.controlMode === "ai") this.aiBehavior?.step();
		this.refreshPresentationState();
		// 让阈值 watcher 及时响应 modifier 导致的数值变化：把本帧累计的脏值刷出。
		this.attributeContainer.flushDirtyValues();
	}

	/**
	 * 将本 Tick 的控制状态解析为成员移动状态。
	 *
	 * 输入每 Tick 重新判定，按键状态没有变化时也会响应 FSM 可移动性的变化；输入未附加、
	 * 控制器停用或当前成员状态禁止移动时都直接清空，不通过外部意图或事件队列保存连续状态。
	 */
	private resolveMovementInput(input: MemberMovementInput | null): void {
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
	}

	/**
	 * 把水平单位方向写为成员权威朝向。
	 * 所有即时转向都经过本入口，统一处理非法方向和零长度方向。
	 */
	private faceDirection(direction: { x: number; z: number }): boolean {
		const length = Math.hypot(direction.x, direction.z);
		if (!Number.isFinite(length) || length <= MOVEMENT_EPSILON) return false;
		this.runtime.yaw = Math.atan2(direction.x / length, direction.z / length);
		return true;
	}

	/**
	 * 在动作接纳边界朝向当前目标。
	 * World 服务只返回跨成员空间方向，最终 yaw 始终由本 Member 写入。
	 */
	private faceCurrentTarget(): boolean {
		const targetId = this.runtime.targetId;
		const direction = targetId ? this.services.targetDirectionResolver?.(this.id, targetId) : null;
		return direction ? this.faceDirection(direction) : false;
	}

	/**
	 * 积分当前 Tick 已接纳的移动状态；成员位置、朝向和步态事实始终由引擎持有，
	 * 实时渲染统一从世界状态 latest-state 通道读取，不再维护并行的移动命令状态。
	 */
	private integrateMovement(tick: SimulationTickContext): void {
		const movement = this.runtime.movement;
		if (!movement) return;

		this.runtime.position.x += (movement.dir.x * movement.speed * tick.deltaTimeMs) / 1000;
		this.runtime.position.z += (movement.dir.z * movement.speed * tick.deltaTimeMs) / 1000;
		this.faceDirection(movement.dir);
	}

	/**
	 * 在水平积分完成后，根据权威地形高度推进垂直状态。
	 * grounded 时直接跟随地面；腾空时只由重力和状态机设置的初速度决定，落地事实回送成员 FSM。
	 */
	integrateTerrainHeight(groundY: number, tick: SimulationTickContext): void {
		if (this.runtime.grounded) {
			this.runtime.position.y = groundY;
			this.runtime.verticalVelocity = 0;
			return;
		}

		const deltaSeconds = tick.deltaTimeMs / 1000;
		this.runtime.verticalVelocity -= this.runtime.locomotion.gravity * deltaSeconds;
		this.runtime.position.y += this.runtime.verticalVelocity * deltaSeconds;
		if (this.runtime.position.y > groundY) return;

		this.runtime.position.y = groundY;
		this.runtime.verticalVelocity = 0;
		this.runtime.grounded = true;
		this.actor.send({ type: "落地" });
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
			btManager: this.btManager.captureCheckpoint(),
			pipelineOverlays: structuredClone(this.pipelineOverlays),
			position: { ...this.position },
			runtime: runtimeClone as typeof this.runtime,
		};
	}

	restoreCheckpoint(checkpoint: MemberCheckpoint): void {
		this.attributeContainer.restoreCheckpoint(checkpoint.attributeContainer);
		this.statusStore.restoreCheckpoint(checkpoint.statusStore);
		this.btManager.restoreCheckpoint(checkpoint.btManager);
		const overlayCp = checkpoint as unknown as { pipelineOverlays?: PipelineOverlay[] };
		const runtimeCp = checkpoint as unknown as { runtime?: TRuntime };
		this.pipelineOverlays = structuredClone(overlayCp.pipelineOverlays ?? []);
		this.runtime = structuredClone(runtimeCp.runtime ?? this.runtime);
		// position 以 checkpoint.position 为准（与 runtime.position 保持一致）
		this.runtime.position = { ...checkpoint.position };
		this.syncStatusTags();
	}
}

// (deleted) safeGetTimeMs: services 未注入应直接抛错
