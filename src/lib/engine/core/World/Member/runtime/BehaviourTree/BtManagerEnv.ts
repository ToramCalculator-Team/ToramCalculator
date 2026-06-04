import type { EventObject } from "xstate";
import type { BehaviourTree } from "~/lib/mistreevous/BehaviourTree";
import type { RootNodeDefinition } from "~/lib/mistreevous/BehaviourTreeDefinition";
import type { MemberDomainEvent } from "../../../../types";
import type { MemberBaseAttrKey } from "../../MemberBaseSchema";
import type { MemberRuntimeServices } from "../../RuntimeServices";
import type { WatchDirection, WatcherId, WatchHandler, WatchOptions } from "../AttributeWatcher/AttributeWatcher";
import type { ProcHandler, ProcPredicate, ProcSubscriptionId } from "../ProcBus/ProcBus";
import type { StatContainer } from "../StatContainer/StatContainer";
import type { MemberFSMEvent } from "../StateMachine/types";
import type { MemberSharedRuntime } from "../types";

export interface BtTreeController {
	registerParallelBt(
		name: string,
		definition: string | RootNodeDefinition | RootNodeDefinition[],
		agent?: string,
		localContext?: Record<string, unknown>,
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
 *
 * 能力面收窄约定（见 src/lib/engine/AGENTS.md「通信机制角色」）：
 * - 订阅类能力（subscribeByName / watch / unsubscribeBySource / unwatchBySource）**只供**
 *   CommonActions 里的声明式订阅动作（subscribeStatus / subscribeProc / watchThreshold /
 *   unsubscribeBySource）封装调用。新写的叶子不要直接调它们——要订阅就新增/复用声明式动作，
 *   以免绕过 sourceId 清理约定，泄漏订阅。
 * - `notifyDomainEvent` 是「出 UI」通路，当前被 healHp / healMp 等叶子直接调用；这属于
 *   双总线在叶子层的残留，待 ADR（成员内总线统一 emit + DomainEventBus 降为下游投影）消除后收回。
 * - 不提供 `runPipeline`：管线是计算层、由 FSM / DamageResolution 调用；BT 叶子不直接跑管线。
 */
export interface MemberBtCapabilities<
	TExtraAttrKey extends string = never,
	TFSMEvent extends EventObject = MemberFSMEvent,
> {
	readonly statContainer: StatContainer<TExtraAttrKey | MemberBaseAttrKey>;
	readonly services: MemberRuntimeServices;
	readonly renderState: { lastAction?: { name: string; ts: number; params?: Record<string, unknown> } };
	registerParallelBt(
		name: string,
		definition: string | RootNodeDefinition | RootNodeDefinition[],
		agent?: string,
		localContext?: Record<string, unknown>,
	): BehaviourTree | undefined;
	unregisterParallelBt(name: string): void;
	hasParallelBt(name: string): boolean;
	/** @internal 仅供 CommonActions.subscribeStatus / subscribeProc 封装调用，叶子勿直接用。 */
	subscribeByName(
		sourceId: string,
		eventNames: readonly string[],
		predicate: ProcPredicate | null,
		handler: ProcHandler,
	): ProcSubscriptionId;
	/** @internal 仅供 CommonActions.unsubscribeBySource 封装调用。 */
	unsubscribeBySource(sourceId: string): void;
	/** @internal 仅供 CommonActions.watchThreshold 封装调用，叶子勿直接用。 */
	watch(
		sourceId: string,
		path: TExtraAttrKey | MemberBaseAttrKey,
		threshold: number,
		direction: WatchDirection,
		handler: WatchHandler,
		options?: WatchOptions,
	): WatcherId;
	/** @internal 仅供 CommonActions.unsubscribeBySource 封装调用。 */
	unwatchBySource(sourceId: string): void;
	/** 出 UI 投影；双总线残留，待 ADR 消除（见类注释）。 */
	notifyDomainEvent(event: MemberDomainEvent): void;
	send(event: TFSMEvent): void;
}

/**
 * BtManager 构造参数。
 *
 * 设计说明：BtManager 只需要黑板提供者、action 能力提供者和完成事件发送入口。
 */
export interface MemberBtManagerEnv<
	TFSMEvent extends EventObject = MemberFSMEvent,
	TExtraAttrKey extends string = never,
	TContext extends MemberSharedRuntime<TExtraAttrKey> = MemberSharedRuntime<TExtraAttrKey>,
> {
	readonly name: string;
	getContext(): TContext;
	getCapabilities(): MemberBtCapabilities<TExtraAttrKey, TFSMEvent>;
	getDeltaTimeMs(): number;
	send(event: TFSMEvent): void;
}
