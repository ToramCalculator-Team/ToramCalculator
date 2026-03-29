import type { MemberWithRelations } from "@db/generated/repositories/member";
import type { MemberType } from "@db/schema/enums";
import { createActor } from "xstate";
import { createLogger } from "~/lib/Logger";
import type { ExpressionContext } from "../../JSProcessor/types";
import type { PipelineRegistry } from "../../Pipline/PipelineRegistry";
import type { StagePool } from "../../Pipline/types";
import type { MemberCheckpoint, MemberDomainEvent } from "../../types";
import type { DamageAreaRequest } from "../Area/types";
import type { MemberContext } from "./MemberContext";
import { BtManager } from "./runtime/BehaviourTree/BtManager";
import { PipelineManager } from "./runtime/Pipeline/PiplineManager";
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
	TContext extends MemberContext & Record<string, unknown>,
> {
	id: string;
	type: MemberType;
	name: string;
	campId: string;
	teamId: string;
	dataSchema: NestedSchema;
	statContainer: StatContainer<TAttrKey>;
	/**
	 * Shared cross-system runtime context.
	 * FSM / pipeline / BT all read from this public member-level surface.
	 * Any system-private context should derive from it instead of expanding the contract in-place.
	 */
	context: TContext;
	btManager: BtManager<TAttrKey, TStateEvent, TStateContext, TContext>;
	pipelineManager: PipelineManager<MemberContext, StagePool<MemberContext>>;
	statusStore: MutableStatusInstanceStore;
	actor: MemberActor<TStateEvent, TStateContext>;
	private actorStarted = false;
	data: MemberWithRelations;
	position: { x: number; y: number; z: number };
	private renderMessageSender: ((payload: unknown) => void) | null = null;
	private domainEventSender: ((event: MemberDomainEvent) => void) | null = null;

	constructor(
		stateMachine: (
			member: Member<TAttrKey, TStateEvent, TStateContext, TContext>,
		) => MemberStateMachine<TStateEvent, TStateContext>,
		campId: string,
		teamId: string,
		memberData: MemberWithRelations,
		dataSchema: NestedSchema,
		statContainer: StatContainer<TAttrKey>,
		context: TContext,
		position?: { x: number; y: number; z: number },
		btContextBindings: Record<string, unknown> = {},
	) {
		this.id = memberData.id;
		this.type = memberData.type;
		this.name = memberData.name;
		this.campId = campId;
		this.teamId = teamId;
		this.context = context;
		this.dataSchema = dataSchema;
		this.data = memberData;
		this.statContainer = statContainer;

		// BT gets a private derived context: member.context + BT bindings + skill agent members.
		this.btManager = new BtManager(this, btContextBindings);

		this.pipelineManager = new PipelineManager({} as StagePool<MemberContext>);
		this.statusStore = new InMemoryStatusInstanceStore(() => this.context.getCurrentFrame());
		this.context.statusTags = [];

		this.position = position ?? { x: 0, y: 0, z: 0 };

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
		this.context.renderMessageSender = renderMessageSender;

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
		this.context.domainEventSender = domainEventSender;
	}

	setEvaluateExpression(
		evaluateExpression: ((expression: string, context: ExpressionContext) => number | boolean) | null,
	): void {
		if (evaluateExpression) {
			this.context.expressionEvaluator = evaluateExpression;
		}
	}

	setDamageRequestHandler(damageRequestHandler: ((damageRequest: DamageAreaRequest) => void) | null): void {
		this.context.damageRequestHandler = damageRequestHandler;
	}

	setGetCurrentFrame(getCurrentFrame: (() => number) | null): void {
		(this.context as Record<string, unknown>).getCurrentFrame = getCurrentFrame;
	}

	setPipelineRegistry(registry: PipelineRegistry<MemberContext, StagePool<MemberContext>>): void {
		this.pipelineManager.replaceStagePool(registry.stagePool);
		this.pipelineManager.replacePipelines(registry.getPipelineDefSnapshot());
	}

	runPipeline(pipelineName: string, params?: Record<string, unknown>) {
		return this.pipelineManager.run(pipelineName, this.context as MemberContext, params);
	}

	/**
	 * Status truth lives in statusStore.
	 * member.context.statusTags is only the derived compatibility view that other systems read.
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
		let currentFrame = this.context.currentFrame;
		try {
			currentFrame = this.context.getCurrentFrame();
		} catch {
			// Before engine services are injected, fall back to the local snapshot value.
		}
		this.context.statusTags = this.statusStore.getStatusTags(currentFrame);
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
		this.context.currentFrame = frame;
		this.context.position = this.position;
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
			pipelineManager: this.pipelineManager.captureCheckpoint(),
			position: { ...this.position },
		};
	}

	restoreCheckpoint(checkpoint: MemberCheckpoint): void {
		this.statContainer.restoreCheckpoint(checkpoint.statContainer);
		this.statusStore.restoreCheckpoint(checkpoint.statusStore);
		this.btManager.restoreCheckpoint(checkpoint.btManager);
		this.pipelineManager.restoreCheckpoint(checkpoint.pipelineManager);
		this.position = { ...checkpoint.position };
		this.context.position = this.position;
		this.syncStatusTags();
	}
}
