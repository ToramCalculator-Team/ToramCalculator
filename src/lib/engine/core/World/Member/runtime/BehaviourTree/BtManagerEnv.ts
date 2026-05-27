import type { EventObject } from "xstate";
import type { RootNodeDefinition } from "~/lib/mistreevous/BehaviourTreeDefinition";
import type { BehaviourTree } from "~/lib/mistreevous/BehaviourTree";
import type { StageData } from "../../../../Pipeline/stageEnv";
import type { MemberDomainEvent } from "../../../../types";
import type {
	WatchDirection,
	WatchHandler,
	WatcherId,
	WatchOptions,
} from "../AttributeWatcher/AttributeWatcher";
import type { ProcHandler, ProcPredicate, ProcSubscriptionId } from "../ProcBus/ProcBus";
import type { StatContainer } from "../StatContainer/StatContainer";
import type { MemberEventType } from "../StateMachine/types";
import type { MemberSharedRuntime } from "../types";
import type { MemberRuntimeServices } from "../../RuntimeServices";
import { MemberBaseAttrKey } from "../../MemberBaseSchema";

export interface BtTreeController {
	registerParallelBt(
		name: string,
		definition: string | RootNodeDefinition | RootNodeDefinition[],
	): unknown;
	unregisterParallelBt(name: string): void;
	hasBuff(name: string): boolean;
}

/**
 * BT 黑板上下文。
 *
 * 设计说明：
 * - 只包含可序列化的成员共享运行时数据。
 * - action/condition 所需组件通过 MemberBtCapabilities 闭包传入，不挂进黑板。
 */
export type BtContext<TExtraAttrKey extends string = string> = MemberSharedRuntime<TExtraAttrKey>;

/**
 * BT action/condition 可调用能力。
 *
 * 设计说明：这些字段是成员组件或外部服务引用，生命周期由 Member 管理；它们不进入
 * MemberSharedRuntime，避免污染 checkpoint 黑板。
 */
export interface MemberBtCapabilities<
	TExtraAttrKey extends string = never,
	TStateEvent extends EventObject = MemberEventType,
> {
	readonly statContainer: StatContainer<TExtraAttrKey | MemberBaseAttrKey>;
	readonly services: MemberRuntimeServices;
	readonly renderState: { lastAction?: { name: string; ts: number; params?: Record<string, unknown> } };
	registerParallelBt(
		name: string,
		definition: string | RootNodeDefinition | RootNodeDefinition[],
	): BehaviourTree | undefined;
	unregisterParallelBt(name: string): void;
	hasParallelBt(name: string): boolean;
	subscribeByName(
		sourceId: string,
		eventNames: readonly string[],
		predicate: ProcPredicate | null,
		handler: ProcHandler,
	): ProcSubscriptionId;
	unsubscribeBySource(sourceId: string): void;
	watch(
		sourceId: string,
		path: TExtraAttrKey | MemberBaseAttrKey,
		threshold: number,
		direction: WatchDirection,
		handler: WatchHandler,
		options?: WatchOptions,
	): WatcherId;
	unwatchBySource(sourceId: string): void;
	notifyDomainEvent(event: MemberDomainEvent): void;
	runPipeline(pipelineName: string, params?: Record<string, unknown>): StageData;
	send(event: TStateEvent): void;
}

/**
 * BtManager 构造参数。
 *
 * 设计说明：BtManager 只需要黑板提供者、action 能力提供者和完成事件发送入口。
 */
export interface MemberBtManagerEnv<
	TStateEvent extends EventObject = MemberEventType,
	TExtraAttrKey extends string = never,
	TContext extends MemberSharedRuntime<TExtraAttrKey> = MemberSharedRuntime<TExtraAttrKey>,
> {
	readonly name: string;
	getContext(): TContext;
	getCapabilities(): MemberBtCapabilities<TExtraAttrKey, TStateEvent>;
	getDeltaTimeMs(): number;
	send(event: TStateEvent): void;
}
