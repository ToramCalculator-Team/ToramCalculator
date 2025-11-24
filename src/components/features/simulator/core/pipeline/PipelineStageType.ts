import { z, ZodType } from "zod/v4";

/* ----------------- 静态阶段元组 ----------------- */
/**
 * 静态阶段三元组定义
 * [阶段名称, 输入参数Schema, 输出参数Schema]
 * 
 * zodSchema 的双重用途：
 * 1. 静态类型推导：通过 z.input<T> 和 z.output<T> 推导类型
 * 2. 值类型约束：用于节点编辑器的输入框类型判断
 */
export type staticStageTuple = readonly [string, ZodType, ZodType];

/* ----------------- 辅助类型 ----------------- */
/** 从 Zod schema 推断输入类型 */
export type InputOfSchema<T extends ZodType> = z.input<T>;

/** 从 Zod schema 推断输出类型 */
export type OutputOfSchema<T extends ZodType> = z.output<T>;

/**
 * 管线定义
 * 从 XState Action 解耦，管线现在是独立的计算单元
 * 键名：管线名称（如 "skill.cost.calculate"）
 * 值：静态阶段数组
 */
export type PipeLineDef = {
  [pipelineName: string]: readonly staticStageTuple[];
};

/**
 * 从管线定义推导每个管线的输入参数类型
 * 取第一个阶段的 InputSchema 作为管线输入类型
 */
export type PipelineParamsFromDef<TDef extends PipeLineDef> = {
  [P in keyof TDef]: TDef[P] extends readonly [
    readonly [any, infer FirstInputSchema extends ZodType, any],
    ...any[]
  ]
    ? OutputOfSchema<FirstInputSchema>
    : Record<string, any>; // 空管线默认为空对象
};

/* ----------------- 内部递归类型 ----------------- */
/**
 * 构建阶段函数签名：
 * - Stages: 静态阶段三元组数组
 * - PrevCtx: 累积的 context（前序阶段输出叠加）
 * 
 * 阶段函数签名：
 * - context: 累积Context & 当前阶段输出（可访问所有前序阶段的输出）
 * - stageInput: 该阶段的输入类型（从 InputSchema 推导）
 * - 返回值: 该阶段的输出类型（从 OutputSchema 推导）
 * 
 * 设计理念：
 * 每个阶段的输入/输出类型完全由其 Schema 定义，不依赖外部传递
 */
type _BuildStageFns<Stages extends readonly staticStageTuple[], PrevCtx> = Stages extends readonly [
  infer First,
  ...infer Rest,
]
  ? First extends readonly [infer Name extends string, infer InputSchema extends ZodType, infer OutputSchema extends ZodType]
    ? Rest extends readonly staticStageTuple[]
      ? {
          [K in Name]: (
            context: PrevCtx & OutputOfSchema<OutputSchema>,
            stageInput: OutputOfSchema<InputSchema>,
          ) => OutputOfSchema<OutputSchema>;
        } & _BuildStageFns<Rest, PrevCtx & OutputOfSchema<OutputSchema>>
      : never
    : never
  : {};

/* ----------------- 从 pipeline 定义生成阶段函数签名 ----------------- */
/**
 * 管线阶段函数定义（已解耦版本）
 * 
 * @template TDef - 管线定义（管线名称 → 阶段数组）
 * @template TContext - 运行时上下文类型（由数据结构决定）
 * 
 * 设计理念：
 * 1. 管线不依赖状态机的 Action 类型
 * 2. 每个阶段的输入/输出类型完全由其 Schema 定义
 * 3. 管线只与数据结构（TContext）关联
 * 4. 管线的输入参数类型从第一个阶段的 InputSchema 推导
 */
export type PipeStageFunDef<
  TDef extends PipeLineDef,
  TContext extends Record<string, any>,
> = {
  [P in keyof TDef]: _BuildStageFns<TDef[P], TContext>;
};
