import type { EventObject } from "xstate";
import type { BehaviourTreeOptions } from "~/lib/mistreevous";
import type { BehaviourTree } from "~/lib/mistreevous/BehaviourTree";
import type { RootNodeDefinition } from "~/lib/mistreevous/BehaviourTreeDefinition";
import type { NestedSchema, SchemaToAttrType } from "../AttributeContainer/SchemaTypes";
import type { MemberBaseNestedSchema } from "../MemberBaseSchema";
import type { RegisterOptions, ThresholdDirection } from "../ProcBus/AttributeThresholdSource";
import type { ProcHandler, ProcPredicate, ProcSubscriptionId } from "../ProcBus/ProcBus";
import type { MemberEvent, MemberRuntime, MemberRuntimeServices } from "../types";

export type EffectBtRuntime = MemberRuntime;

export type CommonEffectBtRuntime = MemberRuntime;
export type CommonEffectBtRuntimeServices = EffectBtRuntimeServices<MemberBaseNestedSchema>;

/**
 * EffectBtManager 检查点。
 *
 * 设计说明：BT agent 普通字段不承载可 checkpoint 状态；跨帧数值状态通过行为树
 * `attributeSlots` 进入成员 AttributeContainer，并随 `MemberCheckpoint.attributeContainer` 保存。
 */
export interface EffectBtManagerCheckpoint {
	hasActiveEffect: boolean;
	activeEffectBtId?: string;
	parallelEntries: Array<{
		name: string;
		btId: string;
	}>;
}

/**
 * BT action/condition 可调用服务。
 *
 * 设计说明：这些字段是成员组件或外部服务引用，生命周期由 Member 管理；它们不进入
 * MemberRuntime，避免污染 checkpoint 黑板。
 *
 * 能力面收窄约定（见 src/engine/AGENTS.md「通信机制角色」）：
 * - 订阅类能力（subscribeByName / unsubscribeBySource / registerThreshold /
 *   unregisterThresholdBySource）**只供** ActionMethods 里的声明式订阅动作（subscribeStatus /
 *   subscribeProc / watchThreshold / unsubscribeBySource）封装调用。新写的叶子不要直接调它们——
 *   要订阅就新增/复用声明式动作，以免绕过 sourceId 清理约定，泄漏订阅。
 * - 阈值穿越统一走 ProcBus 的 `attr.crossed` 事件（ADR 0010）：registerThreshold 只登记被监控点，
 *   业务响应通过 subscribeByName(["attr.crossed"]) 订阅，不再有独立的 watch handler 通路。
 * - 不提供 `runPipeline`：管线是计算层、由 FSM / DamageResolution 调用；BT 叶子不直接跑管线。
 */
export interface EffectBtRuntimeServices<TSchema extends NestedSchema> extends MemberRuntimeServices {
	getAttr: (attr: SchemaToAttrType<TSchema>) => number;
	getAttrBase: (attr: SchemaToAttrType<TSchema>) => number;
	hasAttr: (key: string) => key is SchemaToAttrType<TSchema>;
	registerParallelBt(
		name: string,
		definition: string | RootNodeDefinition | RootNodeDefinition[],
		agent?: string,
		localContext?: Record<string, unknown>,
	): BehaviourTree | undefined;
	unregisterParallelBt(name: string): void;
	hasParallelBt(name: string): boolean;
	/** @internal 仅供 ActionMethods.subscribeStatus / subscribeProc 封装调用，叶子勿直接用。 */
	subscribeByName(
		sourceId: string,
		eventNames: readonly string[],
		predicate: ProcPredicate | null,
		handler: ProcHandler,
	): ProcSubscriptionId;
	/** @internal 仅供 ActionMethods.unsubscribeBySource 封装调用。 */
	unsubscribeBySource(sourceId: string): void;
	/**
	 * @internal 仅供 ActionMethods.watchThreshold 封装调用，叶子勿直接用。
	 * 注册一个被监控的属性阈值点；穿越时由 AttributeThresholdSource 派发 `attr.crossed` 到 ProcBus。
	 * 返回本次注册的 registrationId；watchThreshold 用它过滤自己那一条 `attr.crossed` 事件。
	 */
	registerThreshold(
		sourceId: string,
		path: SchemaToAttrType<TSchema>,
		threshold: number,
		direction: ThresholdDirection,
		options?: RegisterOptions,
	): number;
	/** @internal 仅供 ActionMethods.unsubscribeBySource 封装调用：清理该来源的阈值监控点。 */
	unregisterThresholdBySource(sourceId: string): void;
	recordEvent(event: MemberEvent): void;
}

/**
 * EffectBtManager 构造参数。
 *
 * 设计说明：EffectBtManager 只需要黑板提供者、action 能力提供者和完成事件发送入口。
 */
export interface EffectBtManagerEnv extends BehaviourTreeOptions {
	getDeltaTimeMs(): number;
	getCurrentTimeMs(): number;
	random(): number;
}
