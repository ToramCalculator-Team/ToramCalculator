import type { Actor, EventObject, NonReducibleUnknown, StateMachine } from "xstate";
import type { StageData } from "~/engine/core/Pipeline/stageEnv";
import type { MemberDomainEvent } from "~/engine/core/types";
import type { EffectBtManager } from "../EffectBehavior/EffectBtManager";
import type { MemberRuntimeServices } from "../RuntimeServices";
import type { AttributeContainer } from "../runtime/AttributeContainer/AttributeContainer";
import type { NestedSchema } from "../runtime/AttributeContainer/SchemaTypes";
import type { MemberSharedRuntime } from "../runtime/SharedRuntime";

/**
 * 成员状态机事件类型枚举
 * 基础事件类型，所有成员类型都支持的事件
 */

export interface Death extends EventObject {
	id: string;
	type: "死亡";
	data: unknown;
}
export interface SwitchTarget extends EventObject {
	id: string;
	type: "切换目标";
	data: { targetId: string };
}
export interface StartMove extends EventObject {
	id: string;
	type: "开始移动";
}
export interface StopMove extends EventObject {
	id: string;
	type: "停止移动";
}

/** 成员状态机公开接纳的公共控制事件；Player/Mob 专属事件通过 MemberFSMEvent 泛型显式组合。连续移动不在此列：它由移动段承载，不作为离散控制事件。 */
export type MemberControlEvent = Death | SwitchTarget | StartMove | StopMove;

export type MemberFSMEvent<TSpecificEvent extends EventObject> =
	| Death // 死亡事件
	| SwitchTarget // 切换目标事件
	| StartMove // 开始移动事件
	| StopMove // 停止移动事件
	| TSpecificEvent;

/**
 * 成员状态机类型
 * 基于 XState StateMachine 类型，提供完整的类型推断
 * 使用泛型参数允许子类扩展事件类型
 *
 * @template TExtraAttrKey 属性键的字符串联合类型
 */
export type MemberStateMachine<
	TFSMEvent extends MemberFSMEvent<never>, // 状态机事件类型
	TFSMContext extends MemberFSMContext = MemberFSMContext, // 状态机上下文类型
> = StateMachine<
	TFSMContext, // TContext - 状态机上下文
	TFSMEvent, // TEvent - 事件类型（可扩展）
	Record<string, any>, // TChildren - 子状态机
	any, // TActor - Actor配置
	any, // TAction - 动作配置
	any, // TGuard - 守卫配置
	string, // TDelay - 延迟配置
	any, // TStateValue - 状态值
	string, // TTag - 标签
	NonReducibleUnknown, // TInput - 输入类型
	any, // TOutput - 输出类型（当状态机完成时）
	EventObject, // TEmitted - 发出的事件类型
	any, // TMeta - 元数据
	any // TStateSchema - 状态模式
>;

// 状态机执行动作时需要的外部能力
export interface MemberStateMachineEnv<
	TSchema extends NestedSchema,
	TFSMEvent extends EventObject,
	TRuntime extends MemberSharedRuntime<TSchema>,
> {
	id: string;
	name: string;
	position: { x: number; y: number; z: number };
	runtime: TRuntime;
	attributeContainer: AttributeContainer<TSchema>;
	services: MemberRuntimeServices;
	effectBtManager: EffectBtManager<TSchema, TRuntime, TFSMEvent>;
	notifyDomainEvent(event: MemberDomainEvent): void;
	/** 派发成员内事件到本成员 ProcBus（供 passive/registlet 响应，ADR-0011）。 */
	emitProc(eventName: string, payload: unknown): void;
	/** 按当前动作目标即时更新成员权威朝向；目标无效或重合时保持原朝向。 */
	faceCurrentTarget(): boolean;
	runPipeline(pipelineName: string, params?: Record<string, unknown>): StageData;
	send(event: TFSMEvent): void;
}

/**
 * 成员Actor类型
 * 基于 XState Actor 类型，提供完整的类型推断
 * 使用泛型参数允许子类扩展事件类型
 *
 * @template TFSMEvent 状态机事件类型
 * @template TFSMContext 状态机上下文类型
 */
export type MemberActor<TFSMEvent extends MemberFSMEvent<never>, TFSMContext extends MemberFSMContext> = Actor<
	MemberStateMachine<TFSMEvent, TFSMContext>
>;

/**
 * 成员状态上下文通用接口
 * 所有成员类型（Player、Mob）的状态上下文都应实现此接口
 * 用于行为树节点访问通用功能
 */
/**
 * FSM-private compatibility context.
 *
 * Responsibility:
 * - keep legacy FSM guards/actions type-safe while the refactor is in progress
 *
 * Purpose:
 * - FSM actions read runtime through MemberStateMachineEnv; BT action capabilities are provided separately.
 */
export interface MemberFSMContext {
	/** 是否存活 */
	isAlive: boolean;
	/** 创建模拟时间（毫秒，用于行为树/FSM 计算相对时间） */
	createdAtTimeMs: number;
}
