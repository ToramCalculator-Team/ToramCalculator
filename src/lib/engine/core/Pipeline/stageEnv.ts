import type { MemberSharedRuntime } from "../World/Member/runtime/types";

/**
 * 说明：
 * - env 只读，供“纯计算管线”查询帧号/数值/表达式求值等。
 * - 成员共享 runtime 作为只读快照提供给管线使用。
 * - `emit` 是计算层向编排层的唯一主动通知通路；overlay 可用 `emit` 算子在管线特定阶段
 *   派发事件（如 "last_resistance.triggered"、"damage.received"）。事件真正路由到 ProcBus
 *   由 Member 侧实现（见 `Member.runPipeline` 构造 env 处）。
 */

/** 管线输入/输出的通用数据载体。 */
export type StageData = Record<string, unknown>;

/** 管线 `emit` 派发的事件。 */
export interface PipelineEmittedEvent {
	readonly name: string;
	readonly payload: unknown;
}

/** 管线执行只读环境 */
export interface StageEnv {
	readonly frame: number;
	readonly stats: (memberId: string, path: string) => number;
	readonly eval: (expr: string, vars?: Record<string, unknown>) => number;
	readonly newId: () => string;
	readonly memberRuntime: Readonly<MemberSharedRuntime>;

	/**
	 * 当前 self 的状态 tag 集合（来自 StatusInstanceStore）。
	 * 管线里的条件判定通常读 `memberRuntime.statusTags`，这里额外暴露函数形式以便
	 * 后续切到惰性求值 / 流式视图时不需要改管线。
	 */
	readonly statusTags: () => readonly string[];

	/**
	 * 当前 payload 携带的伤害归因标签（受击管线专用；非受击场景为空数组）。
	 * 在 `Member.runPipeline` 构造 env 时从 `params.damageTags` 读入。
	 */
	readonly damageTags: () => readonly string[];

	/**
	 * 派发事件到本成员的 ProcBus / 编排层。
	 * 由管线的 `emit` 算子调用；本帧累积，帧尾统一 flush。
	 */
	readonly emit: (eventName: string, payload: unknown) => void;
}

