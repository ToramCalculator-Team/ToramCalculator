import type { MemberSharedRuntime } from "../World/Member/runtime/types";

/**
 * 说明：
 * - env 只读，供“纯计算管线”查询帧号/数值/表达式求值等。
 * - 成员共享 runtime 作为只读快照提供给管线使用。
 */

/** 管线输入/输出的通用数据载体。 */
export type StageData = Record<string, unknown>;

/** 管线执行只读环境 */
export interface StageEnv {
	readonly frame: number;
	readonly stats: (memberId: string, path: string) => number;
	readonly eval: (expr: string, vars?: Record<string, unknown>) => number;
	readonly newId: () => string;
	readonly memberRuntime: Readonly<MemberSharedRuntime>;
}

