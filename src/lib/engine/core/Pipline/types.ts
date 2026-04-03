import type { ZodType, z } from "zod/v4";

/**
 * 阶段定义（Stage）
 * [输入Schema, 输出Schema, 实现函数]
 *
 * 设计理念：
 * 1. 阶段是 pipeline 中独立的最小处理单元
 * 2. 阶段可被多个管线复用
 * 3. Schema 用于类型推导和运行时验证
 */
export type Stage<TInput extends ZodType, TOutput extends ZodType, TContext extends Record<string, any>> = readonly [
	TInput,
	TOutput,
	(context: TContext, actionInput: z.output<TInput>) => z.output<TOutput>,
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
 *   阶段A: defineStage(
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
): Stage<TInput, TOutput, TContext> => {
	return [inputSchema, outputSchema, impl] as const;
};

export const defineStage = defineAction;

/* ----------------- 辅助类型 ----------------- */
/** 从 Zod schema 推断输入类型 */
export type InputOfSchema<T extends ZodType> = z.input<T>;

/** 从 Zod schema 推断输出类型 */
export type OutputOfSchema<T extends ZodType> = z.output<T>;

/**
 * 管线定义（Pipeline）
 * 键名：管线名称（如 "技能.消耗计算"）
 * 值：动作名称数组（编排信息）
 *
 * 设计理念：
 * 1. 管线只负责存储编排信息，不包含实现
 * 2. 动作实现定义在独立的动作池中
 * 3. 通过泛型参数约束可用的动作名称
 *
 * @template TPool - 阶段池类型，用于约束阶段名
 */
export type PipelineDef<TPool extends StagePool<any> = StagePool<any>> = {
	[pipelineName: string]: readonly (keyof TPool & string)[];
};

/**
 * ==================== 兼容旧命名：Action ====================
 *
 * 旧代码曾用 Action/ActionPool 来命名 pipeline 阶段。
 * 本轮重构后，pipeline 侧统一使用 Stage/StagePool。
 *
 * 当前等价关系：
 * - Action = Stage
 * - ActionPool = StagePool
 * - ActionNamesFromPool = StageNamesFromPool
 * - ActionInputSchema = StageInputSchema
 * - ActionOutputSchema = StageOutputSchema
 * - defineAction = defineStage
 */
export type Action<TInput extends ZodType, TOutput extends ZodType, TContext extends Record<string, any>> = Stage<
	TInput,
	TOutput,
	TContext
>;
export type ActionPool<TContext extends Record<string, any>> = StagePool<TContext>;
export type ActionNamesFromPool<TPool extends ActionPool<any>> = StageNamesFromPool<TPool>;
export type ActionInputSchema<
	TPool extends ActionPool<any>,
	TActionName extends ActionNamesFromPool<TPool>,
> = StageInputSchema<TPool, TActionName>;
export type ActionOutputSchema<
	TPool extends ActionPool<any>,
	TActionName extends ActionNamesFromPool<TPool>,
> = StageOutputSchema<TPool, TActionName>;
export type PipeLineDef<TPool extends StagePool<any> = StagePool<any>> = PipelineDef<TPool>;
