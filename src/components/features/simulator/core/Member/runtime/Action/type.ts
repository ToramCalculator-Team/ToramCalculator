import { z, ZodType } from "zod/v4";

/**
 * 阶段定义（Stage）
 * [输入Schema, 输出Schema, 实现函数]
 *
 * 设计理念：
 * 1. 阶段是独立的计算单元，包含完整的类型定义和实现
 * 2. 阶段可被多个管线复用
 * 3. Schema 用于类型推导和运行时验证
 */
export type Stage<
  TInput extends ZodType,
  TOutput extends ZodType,
  TContext extends Record<string, any>,
> = readonly [
  TInput,
  TOutput,
  (context: TContext, stageInput: z.output<TInput>) => z.output<TOutput>,
];

/**
 * 阶段池定义
 * 阶段名称 → 阶段定义 的映射
 */
export type StagePool<TContext extends Record<string, any>> = {
  readonly [stageName: string]: Stage<any, any, TContext>;
};

/**
 * 从阶段池提取阶段名称联合类型
 */
export type StageNamesFromPool<TPool extends StagePool<any>> = keyof TPool & string;

/**
 * 从阶段池提取特定阶段的输入Schema类型
 */
export type StageInputSchema<
  TPool extends StagePool<any>,
  TStageName extends StageNamesFromPool<TPool>,
> = TPool[TStageName] extends Stage<infer TInput, any, any> ? TInput : never;

/**
 * 从阶段池提取特定阶段的输出Schema类型
 */
export type StageOutputSchema<
  TPool extends StagePool<any>,
  TStageName extends StageNamesFromPool<TPool>,
> = TPool[TStageName] extends Stage<any, infer TOutput, any> ? TOutput : never;

/**
 * 辅助函数：创建类型安全的阶段
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
export const defineStage = <
  TInput extends ZodType,
  TOutput extends ZodType,
  TContext extends Record<string, any> = Record<string, any>,
>(
  inputSchema: TInput,
  outputSchema: TOutput,
  impl: (context: TContext, actionInput: z.output<TInput>) => z.output<TOutput>,
): Stage<TInput, TOutput, TContext> => {
  return [inputSchema, outputSchema, impl] as const;
};

/* ----------------- 辅助类型 ----------------- */
/** 从 Zod schema 推断输入类型 */
export type InputOfSchema<T extends ZodType> = z.input<T>;

/** 从 Zod schema 推断输出类型 */
export type OutputOfSchema<T extends ZodType> = z.output<T>;

/**
 * 管线定义（Pipeline）
 * 键名：管线名称（如 "技能.消耗计算"）
 * 值：阶段名称数组（编排信息）
 *
 * 设计理念：
 * 1. 管线只负责存储编排信息，不包含实现
 * 2. 阶段实现定义在独立的阶段池中
 * 3. 通过泛型参数约束可用的阶段名称
 *
 * @template TPool - 阶段池类型，用于约束阶段名
 */
export type PipelineDef<TPool extends StagePool<any> = StagePool<any>> = {
  [pipelineName: string]: readonly (keyof TPool & string)[];
};

/* ----------------- 兼容别名（Deprecated） ----------------- */
/** @deprecated 请使用 Stage */
export type Action<
  TInput extends ZodType,
  TOutput extends ZodType,
  TContext extends Record<string, any>,
> = Stage<TInput, TOutput, TContext>;
/** @deprecated 请使用 StagePool */
export type ActionPool<TContext extends Record<string, any>> = StagePool<TContext>;
/** @deprecated 请使用 PipelineDef */
export type ActionGroupDef<TPool extends StagePool<any> = StagePool<any>> = PipelineDef<TPool>;
/** @deprecated 请使用 StageNamesFromPool */
export type ActionNamesFromPool<TPool extends StagePool<any>> = StageNamesFromPool<TPool>;
/** @deprecated 请使用 StageInputSchema */
export type ActionInputSchema<
  TPool extends StagePool<any>,
  TStageName extends StageNamesFromPool<TPool>,
> = StageInputSchema<TPool, TStageName>;
/** @deprecated 请使用 StageOutputSchema */
export type ActionOutputSchema<
  TPool extends StagePool<any>,
  TStageName extends StageNamesFromPool<TPool>,
> = StageOutputSchema<TPool, TStageName>;
/** @deprecated 请使用 defineStage */
export const defineAction = defineStage;