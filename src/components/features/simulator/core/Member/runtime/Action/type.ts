import { z, ZodType } from "zod/v4";

/**
 * 动作定义
 * [输入Schema, 输出Schema, 实现函数]
 *
 * 设计理念：
 * 1. 阶段是独立的计算单元，包含完整的类型定义和实现
 * 2. 阶段可被多个管线复用
 * 3. Schema 用于类型推导和运行时验证
 */
export type Action<
  TInput extends ZodType,
  TOutput extends ZodType,
  TContext extends Record<string, any>,
> = readonly [
  TInput,
  TOutput,
  (context: TContext, stageInput: z.output<TInput>) => z.output<TOutput>,
];

/**
 * 动作池定义
 * 动作名称 → 动作定义 的映射
 */
export type ActionPool<TContext extends Record<string, any>> = {
  readonly [actionName: string]: Action<any, any, TContext>;
};

/**
 * 从动作池提取动作名称联合类型
 */
export type ActionNamesFromPool<TPool extends ActionPool<any>> = keyof TPool & string;

/**
 * 从动作池提取特定动作的输入Schema类型
 */
export type ActionInputSchema<
  TPool extends ActionPool<any>,
  TActionName extends ActionNamesFromPool<TPool>,
> = TPool[TActionName] extends Action<infer TInput, any, any> ? TInput : never;

/**
 * 从动作池提取特定动作的输出Schema类型
 */
export type ActionOutputSchema<
  TPool extends ActionPool<any>,
  TActionName extends ActionNamesFromPool<TPool>,
> = TPool[TActionName] extends Action<any, infer TOutput, any> ? TOutput : never;

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
  TOutput extends ZodType,
  TContext extends Record<string, any> = Record<string, any>,
>(
  inputSchema: TInput,
  outputSchema: TOutput,
  impl: (context: TContext, actionInput: z.output<TInput>) => z.output<TOutput>,
): Action<TInput, TOutput, TContext> => {
  return [inputSchema, outputSchema, impl] as const;
};

/* ----------------- 辅助类型 ----------------- */
/** 从 Zod schema 推断输入类型 */
export type InputOfSchema<T extends ZodType> = z.input<T>;

/** 从 Zod schema 推断输出类型 */
export type OutputOfSchema<T extends ZodType> = z.output<T>;

/**
 * 动作组定义
 * 键名：动作组名称（如 "技能.消耗计算"）
 * 值：动作名称数组（编排信息）
 *
 * 设计理念：
 * 1. 动作组只负责存储编排信息，不包含实现
 * 2. 动作实现定义在独立的动作池中
 * 3. 通过泛型参数约束可用的动作名称
 *
 * @template TPool - 动作池类型，用于约束动作名
 */
export type ActionGroupDef<TPool extends ActionPool<any> = ActionPool<any>> = {
  [actionGroupName: string]: readonly (keyof TPool)[];
};