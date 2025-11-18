import { z, ZodType } from "zod/v4";
import { ParameterizedObject } from "xstate";

/* ----------------- 静态阶段元组 ----------------- */
/** [ stageName, zodSchemaForThisStageOutput ] */
export type staticStageTuple = readonly [string, ZodType];

/* ----------------- 辅助类型 ----------------- */
/** 从 Zod schema 推断输出类型 */
export type OutputOfSchema<T extends ZodType> = z.output<T>;

/** 管线定义，每个 action 对应静态阶段数组 */
export type PipeLineDef<TActionName extends string> = {
  [K in TActionName]: readonly staticStageTuple[];
};

/* ----------------- 内部递归类型 ----------------- */
/**
 * 构建阶段函数：
 * - PrevCtx: 累积的 context（前序阶段输出叠加）
 * - PrevOut: 上一阶段输出类型（第一阶段 = action params）
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
          // 以下是Xstate中setup内的actions类型定义
          // [K in TActions]: ActionFunction<
          // TContext,
          // TEvent,
          // TEvent,
          // TActions[K],
          // ToProvidedActor<
          //     TChildrenMap,
          //     TActors
          // >,
          // ToParameterizedObject<TActions>,
          // ToParameterizedObject<TGuards>,
          // TDelay,
          // TEmitted>;
        } & _BuildStageFns<Rest, PrevCtx & OutputOfSchema<First[1]>, OutputOfSchema<First[1]>>
      : never
    : never
  : {};

/* ----------------- 从 pipeline 定义生成阶段函数签名 ----------------- */
/**
 * TDef: 管线定义
 * TContext: 基础 context 类型
 * 第一阶段输入 = 用户传入 params（类型自由）
 */
export type PipeStageFunDef<
  TActionUnion extends ParameterizedObject,
  TDef extends PipeLineDef<TActionUnion["type"]>,
  TContext extends Record<string, any>,
> = {
  [A in TActionUnion as A["type"]]: _BuildStageFns<TDef[A["type"]], TContext, A["params"]>;
};
