import type { MemberWithRelations } from "@db/generated/repositories/member";
import type { MemberType } from "@db/schema/enums";
import { createActor } from "xstate";
import { createLogger } from "~/lib/Logger";
import type { ExpressionContext } from "../../JSProcessor/types";
import type { PipelineOverlay } from "../../Pipeline/overlay";
import type { PipelineResolverService } from "../../Pipeline/PipelineResolverService";
import type { StageData, StageEnv } from "../../Pipeline/stageEnv";
import type { MemberCheckpoint, MemberDomainEvent } from "../../types";
import type { DamageAreaRequest } from "../Area/types";
import type { MemberRuntimeServices } from "./runtime/Agent/RuntimeServices";
import { MemberRuntimeServicesDefaults } from "./runtime/Agent/RuntimeServices";
import { BtManager } from "./runtime/BehaviourTree/BtManager";
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
	 * 执行管线（纯计算）。
	 *
	 * Actor 隔离原则：member 只访问自身属性。
	 * 需要跨 actor 数据（如目标防御力）的管线，由编排层通过 `peerStats` 逐次传入。
	 *
	 * @param pipelineName 管线名称
	 * @param params 管线输入参数
	 * @param peerStats 编排层按次提供的跨 actor 只读查询函数（仅本次调用有效）
	 */
	runPipeline(
		pipelineName: string,
		params?: Record<string, unknown>,
		peerStats?: (memberId: string, path: string) => number,
	) {
		const resolver = this.pipelineResolverService;
		if (!resolver) {
			throw new Error(`pipelineResolverService 未注入：${pipelineName}`);
		}

		const frame = this.services.getCurrentFrame();

		const env: StageEnv = {
			frame,
			stats: (memberIdOrSelector: string, path: string) => {
				if (memberIdOrSelector === "self" || memberIdOrSelector === this.id) {
					return this.statContainer.getValue(path as TAttrKey);
				}
				if (peerStats) {
					return peerStats(memberIdOrSelector, path);
				}
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
