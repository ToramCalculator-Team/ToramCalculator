import type { MemberWithRelations } from "@db/generated/repositories/member";
import type { MemberType } from "@db/schema/enums";
import { createActor } from "xstate";
import { createLogger } from "~/lib/Logger";
import type { EventCatalog } from "../../Event/EventCatalog";
import type { ExpressionContext } from "../../JSProcessor/types";
import type { PipelineOverlay } from "../../Pipeline/overlay";
import type { PipelineResolverService } from "../../Pipeline/PipelineResolverService";
import type { StageData, StageEnv } from "../../Pipeline/stageEnv";
import type { MemberCheckpoint, MemberDomainEvent } from "../../types";
import type { DamageAreaRequest } from "../Area/types";
import type { MemberRuntimeServices, PipelineEventSinkEvent } from "./runtime/Agent/RuntimeServices";
import { MemberRuntimeServicesDefaults } from "./runtime/Agent/RuntimeServices";
import { AttributeWatcherRegistry } from "./runtime/AttributeWatcher/AttributeWatcher";
import { BtManager } from "./runtime/BehaviourTree/BtManager";
import { ProcBus } from "./runtime/ProcBus/ProcBus";
import type { NestedSchema } from "./runtime/StatContainer/SchemaTypes";
import type { StatContainer } from "./runtime/StatContainer/StatContainer";
import type {
	MemberActor,
	MemberEventType,
	MemberStateContext,
	MemberStateMachine,
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
	TAttrKey extends string,
	TStateEvent extends MemberEventType,
	TStateContext extends MemberStateContext,
	TRuntime extends MemberSharedRuntime,
> {
	id: string;
	type: MemberType;
	name: string;
	campId: string;
	teamId: string;
	dataSchema: NestedSchema;
	statContainer: StatContainer<TAttrKey>;
	/** 共享 runtime（可序列化，可进 checkpoint） */
	runtime: TRuntime;
	/** 引擎注入 services（不可序列化） */
	services: MemberRuntimeServices;
	btManager: BtManager<TAttrKey, TStateEvent, TStateContext, TRuntime>;
	/** 成员级持久 overlays（纯数据，可 checkpoint） */
	pipelineOverlays: PipelineOverlay[] = [];
	private pipelineResolverService: PipelineResolverService | null = null;
	statusStore: MutableStatusInstanceStore;
	/**
	 * 订阅子系统。`setEventCatalog` 注入目录后才创建，未创建前 `emit` / `subscribe` 都 no-op（带告警）。
	 * 每成员独立持有，跨成员事件由外部（MemberManager / GameEngine）路由。
	 */
	procBus: ProcBus | null = null;
	/** 属性阈值 watcher 注册表。每成员独立持有；passive 安装时注册，卸载时清理。 */
	attributeWatchers: AttributeWatcherRegistry<TAttrKey>;
	actor: MemberActor<TStateEvent, TStateContext>;
	private actorStarted = false;
	data: MemberWithRelations;
	get position(): { x: number; y: number; z: number } {
		return this.runtime.position;
	}
	set position(next: { x: number; y: number; z: number }) {
		this.runtime.position = next;
	}
	/**
	 * 渲染侧私有状态（不序列化、不进入 checkpoint）。
	 * 用于渲染快照推断动画进度等 UI-only 信息。
	 */
	renderState: { lastAction?: { name: string; ts: number; params?: Record<string, unknown> } } = {};
	private renderMessageSender: ((payload: unknown) => void) | null = null;
	private domainEventSender: ((event: MemberDomainEvent) => void) | null = null;

	constructor(
		stateMachine: (
			member: Member<TAttrKey, TStateEvent, TStateContext, TRuntime>,
		) => MemberStateMachine<TStateEvent, TStateContext>,
		campId: string,
		teamId: string,
		memberData: MemberWithRelations,
		dataSchema: NestedSchema,
		statContainer: StatContainer<TAttrKey>,
		runtime: TRuntime,
		services: MemberRuntimeServices = MemberRuntimeServicesDefaults,
		position?: { x: number; y: number; z: number },
		btContextBindings: Record<string, unknown> = {},
	) {
		this.id = memberData.id;
		this.type = memberData.type;
		this.name = memberData.name;
		this.campId = campId;
		this.teamId = teamId;
		this.runtime = runtime;
		this.services = services;
		this.dataSchema = dataSchema;
		this.data = memberData;
		this.statContainer = statContainer;

		// BT gets a private derived context: member.runtime + BT bindings + skill agent members.
		this.btManager = new BtManager(this, btContextBindings);

		this.statusStore = new InMemoryStatusInstanceStore(() => this.services.getCurrentFrame());
		// 属性 watcher：依赖 StatContainer.onChange，与 EventCatalog 无关，可立即构造。
		this.attributeWatchers = new AttributeWatcherRegistry<TAttrKey>(this.statContainer);
		this.runtime.statusTags = this.runtime.statusTags ?? [];
		if (position) {
			this.runtime.position = position;
		}

		this.actor = createActor(stateMachine(this), {
			id: memberData.id,
		});
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

		const spawnCmd = {
			type: "render:cmd" as const,
			cmd: {
				type: "spawn" as const,
				entityId: this.id,
				name: this.name,
				position: this.position,
				seq: 0,
				ts: Date.now(),
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

	setEvaluateExpression(
		evaluateExpression: ((expression: string, context: ExpressionContext) => number | boolean) | null,
	): void {
		this.services.expressionEvaluator = evaluateExpression;
	}

	setDamageRequestHandler(damageRequestHandler: ((damageRequest: DamageAreaRequest) => void) | null): void {
		this.services.damageRequestHandler = damageRequestHandler;
	}

	setGetCurrentFrame(getCurrentFrame: (() => number) | null): void {
		if (getCurrentFrame) {
			this.services.getCurrentFrame = getCurrentFrame;
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
						frame: change.frame,
					},
					change.frame,
				);
			} else {
				bus.emit(
					"status.exited",
					{
						type: change.instance.type,
						reason: change.reason ?? "removed",
						frame: change.frame,
					},
					change.frame,
				);
			}
		});

		this.services.pipelineEventSink = (event: PipelineEventSinkEvent) => {
			bus.emit(event.name, event.payload, event.frame);
		};
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

		const frame = this.services.getCurrentFrame();
		const damageTagsParam = Array.isArray(params?.damageTags)
			? (params?.damageTags as readonly string[])
			: ([] as readonly string[]);

		const env: StageEnv = {
			frame,
			stats: (memberIdOrSelector: string, path: string) => {
				if (memberIdOrSelector === "self" || memberIdOrSelector === this.id) {
					return this.statContainer.getValue(path as TAttrKey);
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
					currentFrame: frame,
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
					log.debug(
						`runPipeline(${pipelineName})：pipelineEventSink 未注入，丢弃事件 ${eventName}`,
					);
					return;
				}
				sink({ name: eventName, payload, frame });
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
		let currentFrame = this.runtime.currentFrame;
		try {
			currentFrame = this.services.getCurrentFrame();
		} catch {
			// Before engine services are injected, fall back to the local snapshot value.
		}
		this.runtime.statusTags = this.statusStore.getStatusTags(currentFrame);
	}

	notifyDomainEvent(event: MemberDomainEvent): void {
		if (this.domainEventSender) {
			this.domainEventSender(event);
		}
	}

	tick(frame: number): void {
		if (!this.actorStarted) {
			throw new Error(`member actor not started: ${this.id}`);
		}
		this.runtime.currentFrame = frame;
		this.statusStore.purgeExpired(frame);
		this.syncStatusTags();
		this.actor.send({ type: "update", timestamp: frame } as TStateEvent);
		this.btManager.tickAll();
		// 让阈值 watcher 及时响应 modifier 导致的数值变化：把本帧累计的脏值刷出。
		this.statContainer.flushDirtyValues();
	}

	// ==================== Checkpoint ====================

	captureCheckpoint(): MemberCheckpoint {
		return {
			memberId: this.id,
			fsm: this.actor.getPersistedSnapshot(),
			statContainer: this.statContainer.captureCheckpoint(),
			statusStore: this.statusStore.captureCheckpoint(),
			btManager: this.btManager.captureCheckpoint(),
			pipelineOverlays: structuredClone(this.pipelineOverlays),
			position: { ...this.position },
			runtime: structuredClone(this.runtime),
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

// (deleted) safeGetFrame: services 未注入应直接抛错
