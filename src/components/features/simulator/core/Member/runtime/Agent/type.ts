import type { ZodType, z } from "zod/v4";
import type { State } from "~/lib/mistreevous";

/**
 * 动作定义（Action）
 * [输入Schema, 实现函数]
 * 实现函数返回 State 类型
 */
export type Action<
	TInput extends ZodType,
	TContext extends Record<string, any>,
> = readonly [
	TInput,
	(context: TContext, actionInput: z.output<TInput>) => State,
];

/**
 * 动作池定义
 * 动作名称 → 动作定义 的映射
 */
export type ActionPool<TContext extends Record<string, any>> = {
	readonly [actionName: string]: Action<any, TContext>;
};

/**
 * 从动作池提取动作名称联合类型
 */
export type ActionNamesFromPool<TPool extends ActionPool<any>> = keyof TPool &
	string;

/**
 * 从动作池提取特定动作的输入Schema类型
 */
export type ActionInputSchema<
	TPool extends ActionPool<any>,
	TActionName extends ActionNamesFromPool<TPool>,
> = TPool[TActionName] extends Action<infer TInput, any> ? TInput : never;

/**
 * 辅助函数：创建类型安全的动作
 *
 * 使用示例：
 * ```ts
 * const MyActions = {
 *   动作A: defineAction(
 *     z.object({ input: z.number() }),
 *     z.object({ output: z.string() }),
 *     (context, input) => ({ output: String(input.input) })
 *   ),
 * } as const;
 * ```
 */
export const defineAction = <
	TInput extends ZodType,
	TContext extends Record<string, any> = Record<string, any>,
>(
	inputSchema: TInput,
	impl: (context: TContext, actionInput: z.output<TInput>) => State,
): Action<TInput, TContext> => {
	return [inputSchema, impl] as const;
};

/**
 * 条件定义
 * [输入Schema, 实现函数]
 * 实现函数返回 Boolean 类型
 */

export type Condition<
	TInput extends ZodType,
	TContext extends Record<string, any> = Record<string, any>,
> = readonly [
	TInput,
	(context: TContext, actionInput: z.output<TInput>) => boolean,
];

/**
 * 条件池定义
 * 条件名称 → 条件定义 的映射
 */
export type ConditionPool<TContext extends Record<string, any>> = {
	readonly [conditionName: string]: Condition<any, TContext>;
};

/**
 * 从条件池提取条件名称联合类型
 */
export type ConditionNamesFromPool<TPool extends ConditionPool<any>> =
	keyof TPool & string;

/**
 * 从条件池提取特定条件的输入Schema类型
 */
export type ConditionInputSchema<
	TPool extends ConditionPool<any>,
	TConditionName extends ConditionNamesFromPool<TPool>,
> = TPool[TConditionName] extends Condition<infer TInput, any> ? TInput : never;

/**
 * 辅助函数：创建类型安全的条件
 * 使用示例：
 * ```ts
 * const MyConditions = {
 *   条件A: defineCondition(z.object({ input: z.number() }), (context, input) => input.input > 10),
 * } as const;
 * ```
 */
export const defineCondition = <
	TInput extends ZodType,
	TContext extends Record<string, any> = Record<string, any>,
>(
	inputSchema: TInput,
	impl: (context: TContext, actionInput: z.output<TInput>) => boolean,
): Condition<TInput, TContext> => {
	return [inputSchema, impl] as const;
};
