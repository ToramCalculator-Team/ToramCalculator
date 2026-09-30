import type { ZodType, z } from "zod/v4";
import type { State } from "~/lib/mistreevous";

export type Action<TInput extends ZodType, TContext extends Record<string, any>, TCapabilities> = readonly [
	TInput,
	(context: TContext, actionInput: z.output<TInput>, capabilities: TCapabilities) => State,
];

export type ActionPool<TContext extends Record<string, any>, TCapabilities> = {
	readonly [actionName: string]: Action<any, TContext, TCapabilities>;
};

export type Condition<TInput extends ZodType, TContext extends Record<string, any>, TCapabilities> = readonly [
	TInput,
	(context: TContext, actionInput: z.output<TInput>, capabilities: TCapabilities) => boolean,
];

export type ConditionPool<TContext extends Record<string, any>, TCapabilities> = {
	readonly [conditionName: string]: Condition<any, TContext, TCapabilities>;
};

export const defineAction = <TInput extends ZodType, TContext extends Record<string, any>, TCapabilities>(
	inputSchema: TInput,
	impl: (context: TContext, actionInput: z.output<TInput>, capabilities: TCapabilities) => State,
): Action<TInput, TContext, TCapabilities> => [inputSchema, impl] as const;

export const defineCondition = <TInput extends ZodType, TContext extends Record<string, any>, TCapabilities>(
	inputSchema: TInput,
	impl: (context: TContext, actionInput: z.output<TInput>, capabilities: TCapabilities) => boolean,
): Condition<TInput, TContext, TCapabilities> => [inputSchema, impl] as const;
