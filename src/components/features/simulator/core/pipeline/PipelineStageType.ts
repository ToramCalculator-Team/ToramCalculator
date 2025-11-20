import { z, ZodType } from "zod/v4";

/* ----------------- 静态阶段元组 ----------------- */
/** [ stageName, zodSchemaForThisStageOutput ] */
export type staticStageTuple = readonly [string, ZodType];

/* ----------------- 辅助类型 ----------------- */
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
 * 管线输入参数定义
 * 定义每个管线所需的输入参数类型
 */
export type PipelineParams = {
  [pipelineName: string]: Record<string, any>;
};

/* ----------------- 内部递归类型 ----------------- */
/**
 * 构建阶段函数：
 * - PrevCtx: 累积的 context（前序阶段输出叠加）
 * - PrevOut: 上一阶段输出类型（第一阶段 = 管线输入 params）
 */
type _BuildStageFns<Stages extends readonly staticStageTuple[], PrevCtx, PrevOut> = Stages extends readonly [
  infer First,
  ...infer Rest,
]
  ? First extends staticStageTuple
    ? Rest extends readonly staticStageTuple[]
      ? {
          [K in First[0]]: (
            context: PrevCtx & OutputOfSchema<First[1]>,
            stageInput: PrevOut,
          ) => OutputOfSchema<First[1]>;
        } & _BuildStageFns<Rest, PrevCtx & OutputOfSchema<First[1]>, OutputOfSchema<First[1]>>
      : never
    : never
  : {};

/* ----------------- 从 pipeline 定义生成阶段函数签名 ----------------- */
/**
 * 管线阶段函数定义（已解耦版本）
 * 
 * @template TDef - 管线定义（管线名称 → 阶段数组）
 * @template TParams - 管线输入参数定义（管线名称 → 参数类型）
 * @template TContext - 运行时上下文类型（由数据结构决定）
 * 
 * 设计理念：
 * 1. 管线不依赖状态机的 Action 类型
 * 2. 管线的输入参数独立定义
 * 3. 管线只与数据结构（TContext）关联
 */
export type PipeStageFunDef<
  TDef extends PipeLineDef,
  TParams extends PipelineParams,
  TContext extends Record<string, any>,
> = {
  [P in keyof TDef]: _BuildStageFns<TDef[P], TContext, TParams[P]>;
};
