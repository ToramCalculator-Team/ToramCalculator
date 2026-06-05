import type { MemberWithRelations } from "@db/generated/repositories/member";
import type { MemberType } from "@db/schema/enums";
import { createActor } from "xstate";
import { createLogger } from "~/lib/Logger";
import type { EventCatalog } from "../../Event/EventCatalog";
import type { ExpressionContext } from "../../JSProcessor/types";
import type { PipelineOverlay } from "../../Pipeline/overlay";
import type { PipelineResolverService } from "../../Pipeline/PipelineResolverService";
import type { StageData, StageEnv } from "../../Pipeline/stageEnv";
import type { MemberCheckpoint, MemberDomainEvent, SimulationTickContext } from "../../types";
import type { DamageAreaRequest } from "../Area/types";
import type { WorldObservable } from "../observable";
import type { MemberBaseAttrKey } from "./MemberBaseSchema";
import type { MemberRuntimeServices, MemberTargetResolver, PipelineEventSinkEvent } from "./RuntimeServices";
import { MemberRuntimeServicesDefaults } from "./RuntimeServices";
import { AttributeThresholdSource } from "./runtime/AttributeWatcher/AttributeThresholdSource";
import { BtManager } from "./runtime/BehaviourTree/BtManager";
import type { MemberBtCapabilities, MemberBtManagerEnv } from "./runtime/BehaviourTree/BtManagerEnv";
import { ProcBus } from "./runtime/ProcBus/ProcBus";
import type { NestedSchema, SchemaStructure } from "./runtime/StatContainer/SchemaTypes";
import type { StatContainer } from "./runtime/StatContainer/StatContainer";
import type {
	MemberActor,
	MemberFSMEvent,
	MemberFSMContext,
	MemberStateMachine,
	MemberStateMachineEnv,
} from "./runtime/StateMachine/types";
import {
	InMemoryStatusInstanceStore,
	type MutableStatusInstanceStore,
	type StatusInstance,
} from "./runtime/Status/StatusInstanceStore";
import type { MemberSharedRuntime } from "./runtime/types";

const log = createLogger("Member");

export interface MemberSerializeData {
	attrs: Record<string, unknown>;
	id: string;
	type: MemberType;
	name: string;
	campId: string;
	teamId: string;
	position: {
		x: number;
		y: number;
		z: number;
	};
}

export class Member<
	TExtraAttrKey extends string,
	TFSMEvent extends MemberFSMEvent,
	TFSMContext extends MemberFSMContext,
	TRuntime extends MemberSharedRuntime<TExtraAttrKey>,
> implements WorldObservable
{
	id: string;
	type: MemberType;
	name: string;
	campId: string;
	teamId: string;
	dataSchema: NestedSchema;
	statContainer: StatContainer<MemberBaseAttrKey | TExtraAttrKey>;
	/** 共享 runtime（可序列化，可进 checkpoint） */
	runtime: TRuntime;
	/** 引擎注入 services（不可序列化） */
	services: MemberRuntimeServices;
	btManager: BtManager<TExtraAttrKey, TRuntime, TFSMEvent>;
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
	 * 属性阈值事件源（ADR 0010）：订阅 StatContainer 变更，把阈值穿越派发为 ProcBus 的
	 * `attr.crossed` 事件；emitter 在 setEventCatalog 接通 ProcBus 后注入。
	 */
	attributeThresholdSource: AttributeThresholdSource<MemberBaseAttrKey | TExtraAttrKey>;
	actor: MemberActor<TFSMEvent, TFSMContext>;
	private actorStarted = false;
	data: MemberWithRelations;
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
			return this.statContainer.getValue("hp.current") <= 0;
		} catch {
			// actor 尚未启动或快照不可读时，保守视为存活
			return false;
		}
	}
	/**
	 * 渲染侧私有状态（不序列化、不进入 checkpoint）。
	 * 用于渲染快照推断动画进度等 UI-only 信息。
	 */
	renderState: { lastAction?: { name: string; ts: number; params?: Record<string, unknown> } } = {};
	private renderMessageSender: ((payload: unknown) => void) | null = null;
	private domainEventSender: ((event: MemberDomainEvent) => void) | null = null;

	private getRenderCommandTiming(): { seq: number; ts: number } {
		let seq = this.runtime.tickIndex;
		let ts = this.runtime.currentTimeMs;
		try {
			seq = this.services.getTickIndex();
			ts = this.services.getCurrentTimeMs();
		} catch {
			// 渲染初始化可能早于引擎时间服务注入；此时使用 runtime 初始时间。
		}
		return { seq, ts };
	}

	constructor(
		stateMachine: (
			env: MemberStateMachineEnv<TExtraAttrKey, TFSMEvent, TRuntime>,
		) => MemberStateMachine<TFSMEvent, TFSMContext>,
		campId: string,
		teamId: string,
		memberData: MemberWithRelations,
		dataSchema: NestedSchema,
		statContainer: StatContainer<MemberBaseAttrKey | TExtraAttrKey>,
		runtime: TRuntime,
		services: MemberRuntimeServices = MemberRuntimeServicesDefaults,
		position?: { x: number; y: number; z: number },
		btContextBindings: (
			capabilities: MemberBtCapabilities<TExtraAttrKey, TFSMEvent>,
		) => Record<string, unknown> = () => ({}),
	) {
		this.id = memberData.id;
		this.type = memberData.type;
		this.name = memberData.name;
		this.campId = campId;
		this.teamId = teamId;
		this.runtime = runtime;
		this.services = { ...services };
		this.dataSchema = dataSchema;
		this.data = memberData;
		this.statContainer = statContainer;

		this.statusStore = new InMemoryStatusInstanceStore(() => this.services.getCurrentTimeMs());
		// 阈值事件源（ADR 0010）：emitter 在 setEventCatalog 接通 ProcBus 后注入，构造期先置空。
		this.attributeThresholdSource = new AttributeThresholdSource<MemberBaseAttrKey | TExtraAttrKey>(
			this.statContainer,
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
	}

	/**
	 * 构造 FSM 专用 env。
	 *
	 * 设计说明：
	 * - getter 让 checkpoint restore 替换 runtime 后，状态机闭包继续读取 Member 当前字段。
	 * - 方法用箭头函数转发，避免 XState action 调用时丢失 Member.this。
	 */
	private createStateMachineEnv(): MemberStateMachineEnv<TExtraAttrKey, TFSMEvent, TRuntime> {
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
			get statContainer() {
				return self.statContainer;
			},
			get services() {
				return self.services;
			},
			get btManager() {
				return self.btManager;
			},
			notifyDomainEvent: (event) => self.notifyDomainEvent(event),
			emitProc: (eventName, payload) => self.emitProc(eventName, payload),
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
	private createBtCapabilities(): MemberBtCapabilities<TExtraAttrKey, TFSMEvent> {
		const self = this;
		return {
			get services() {
				return self.services;
			},
			get statContainer() {
				return self.statContainer;
			},
			get renderState() {
				return self.renderState;
			},
			registerParallelBt: (name, definition, agent, localContext) => self.btManager.registerParallelBt(name, definition, agent, localContext),
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
		capabilities: MemberBtCapabilities<TExtraAttrKey, TFSMEvent>,
	): MemberBtManagerEnv<TFSMEvent, TExtraAttrKey, TRuntime> {
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

	start(): void {
		if (this.actorStarted) return;
		this.actor.start();
		this.actorStarted = true;
	}

	serialize(): MemberSerializeData {
		return {
			attrs: this.statContainer.exportNestedValues(),
			id: this.id,
			type: this.type,
			name: this.name,
			campId: this.campId,
			teamId: this.teamId,
			position: this.position,
		};
	}

	setRenderMessageSender(renderMessageSender: ((payload: unknown) => void) | null): void {
		this.renderMessageSender = renderMessageSender;
		this.services.renderMessageSender = renderMessageSender;
		const timing = this.getRenderCommandTiming();

		const spawnCmd = {
			type: "render:cmd" as const,
			cmd: {
				type: "spawn" as const,
				entityId: this.id,
				name: this.name,
				position: this.position,
				seq: timing.seq,
				ts: timing.ts,
			},
		};
		this.renderMessageSender?.(spawnCmd);
		log.info(`member ${this.name} sent spawn render command`);
	}

	/**
	 * Inject the canonical member-level domain event sender.
	 * Purpose: make FSM / pipeline / BT all read the same shared service slot.
	 */
	setDomainEventSender(domainEventSender: ((event: MemberDomainEvent) => void) | null): void {
		this.domainEventSender = domainEventSender;
		this.services.domainEventSender = domainEventSender;
	}

	setTargetResolver(targetResolver: MemberTargetResolver | null): void {
		this.services.targetResolver = targetResolver;
	}

	setEvaluateExpression(
		evaluateExpression: ((expression: string, context: ExpressionContext) => number | boolean) | null,
	): void {
		this.services.expressionEvaluator = evaluateExpression;
	}

	setDamageRequestHandler(damageRequestHandler: ((damageRequest: DamageAreaRequest) => void) | null): void {
		this.services.damageRequestHandler = damageRequestHandler;
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
	 * 注入引擎级 EventCatalog，并在首次注入时完成以下装配：
	 *  1. 创建本成员的 ProcBus（每成员独立）。
	 *  2. 把 StatusInstanceStore 的变更事件路由到 ProcBus，派发 `status.entered` / `status.exited`。
	 *  3. 把 Pipeline `emit` 算子的事件 sink 路由到 ProcBus（服务层 `pipelineEventSink`）。
	 *
	 * 传入 `null` 表示卸载（成员销毁前清理订阅）。
	 */
	setEventCatalog(catalog: EventCatalog | null): void {
		if (!catalog) {
			this.procBus?.clear();
			this.procBus = null;
			this.statusStore.setChangeListener(null);
			this.services.pipelineEventSink = null;
			this.attributeThresholdSource.setEmitter(null);
			return;
		}

		if (!this.procBus) {
			this.procBus = new ProcBus(catalog);
		}

		const bus = this.procBus;
		this.statusStore.setChangeListener((change) => {
			if (change.kind === "entered") {
				bus.emit(
					"status.entered",
					{
						type: change.instance.type,
						sourceId: change.instance.sourceId,
						timeMs: change.timeMs,
					},
					change.timeMs,
				);
			} else {
				bus.emit(
					"status.exited",
					{
						type: change.instance.type,
						reason: change.reason ?? "removed",
						timeMs: change.timeMs,
					},
					change.timeMs,
				);
			}
		});

		this.services.pipelineEventSink = (event: PipelineEventSinkEvent) => {
			bus.emit(event.name, event.payload, event.timeMs);
		};

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
			this.actor.send({ type: "死亡通知", data: event.payload } as TFSMEvent);
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
	 * - `emit(name, payload)`：管线 `emit` 算子的落点，事件路由给本成员的 pipelineEventSink。
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
					return this.statContainer.getValue(path as MemberBaseAttrKey | TExtraAttrKey);
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
			emit: (eventName: string, payload: unknown) => {
				const sink = this.services.pipelineEventSink;
				if (!sink) {
					log.debug(`runPipeline(${pipelineName})：pipelineEventSink 未注入，丢弃事件 ${eventName}`);
					return;
				}
				sink({ name: eventName, payload, timeMs });
			},
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

	tick(tick: SimulationTickContext): void {
		if (!this.actorStarted) {
			throw new Error(`member actor not started: ${this.id}`);
		}
		this.runtime.tickIndex = tick.tickIndex;
		this.runtime.currentTimeMs = tick.currentTimeMs;
		this.runtime.deltaTimeMs = tick.deltaTimeMs;
		this.statusStore.purgeExpired(tick.currentTimeMs);
		this.syncStatusTags();
		this.actor.send({ type: "update", timestamp: tick.currentTimeMs } as TFSMEvent);
		this.btManager.tickAll();
		// 让阈值 watcher 及时响应 modifier 导致的数值变化：把本帧累计的脏值刷出。
		this.statContainer.flushDirtyValues();
	}

	// ==================== Checkpoint ====================

	captureCheckpoint(): MemberCheckpoint {
		let runtimeClone: unknown;
		try {
			runtimeClone = structuredClone(this.runtime);
		} catch (e) {
			const uncloneable: string[] = [];
			for (const [key, value] of Object.entries(this.runtime)) {
				try { structuredClone(value); } catch { uncloneable.push(`${key}(${typeof value})`); }
			}
			log.error(`[${this.name}] runtime structuredClone failed. Uncloneable keys: ${uncloneable.join(", ")}`);
			throw e;
		}
		return {
			memberId: this.id,
			fsm: this.actor.getPersistedSnapshot(),
			statContainer: this.statContainer.captureCheckpoint(),
			statusStore: this.statusStore.captureCheckpoint(),
			btManager: this.btManager.captureCheckpoint(),
			pipelineOverlays: structuredClone(this.pipelineOverlays),
			position: { ...this.position },
			runtime: runtimeClone as typeof this.runtime,
		};
	}

	restoreCheckpoint(checkpoint: MemberCheckpoint): void {
		this.statContainer.restoreCheckpoint(checkpoint.statContainer);
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
