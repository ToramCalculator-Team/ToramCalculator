import type { ZodType, z } from "zod/v4";
import type { State } from "~/lib/mistreevous";

export type NodeMethodContext = Record<string, unknown>;

export type Action<TInput extends ZodType, TContext extends NodeMethodContext, TCapabilities> = readonly [
	TInput,
	(context: TContext, actionInput: z.output<TInput>, capabilities: TCapabilities) => State,
];

/**
 * ActionPool 使用 never 表示未知输入，避免用 any 绕过实现函数的参数检查。
 * 具体 action 的输入类型仍由 defineAction 的 TInput 保留。
 */
export type ActionPool<TContext extends NodeMethodContext, TCapabilities> = Record<
	string,
	readonly [ZodType, (context: TContext, actionInput: never, capabilities: TCapabilities) => State]
>;

export type Condition<TInput extends ZodType, TContext extends NodeMethodContext, TCapabilities> = readonly [
	TInput,
	(context: TContext, actionInput: z.output<TInput>, capabilities: TCapabilities) => boolean,
];

/** 见 ActionPool：never 只描述池级未知输入，不削弱具体条件的 schema 推导。 */
export type ConditionPool<TContext extends NodeMethodContext, TCapabilities> = Record<
	string,
	readonly [ZodType, (context: TContext, actionInput: never, capabilities: TCapabilities) => boolean]
>;

export const defineAction = <TInput extends ZodType, TContext extends NodeMethodContext, TCapabilities>(
	inputSchema: TInput,
	impl: (context: TContext, actionInput: z.output<TInput>, capabilities: TCapabilities) => State,
): Action<TInput, TContext, TCapabilities> => [inputSchema, impl] as const;

export const defineCondition = <TInput extends ZodType, TContext extends NodeMethodContext, TCapabilities>(
	inputSchema: TInput,
	impl: (context: TContext, actionInput: z.output<TInput>, capabilities: TCapabilities) => boolean,
): Condition<TInput, TContext, TCapabilities> => [inputSchema, impl] as const;
