import { z, ZodTypeAny } from "zod/v3";
import { ParameterizedObject, EventObject, ActionFunction, NonReducibleUnknown } from "xstate";

/**
 * 将Zod Schema转换为一个具有默认值的JavaScript对象。
 * 对于复杂对象和数组会进行递归处理。
 * @param schema Zod Schema实例
 * @returns 对应Schema的默认值对象
 */
export function schemaToObject(schema: z.ZodTypeAny): any {
  // 处理可选/可空字段，如果设置了default，优先使用default
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    if ("defaultValue" in schema && typeof schema.defaultValue === "function") {
      return schema.defaultValue();
    }
    // 如果是可选或可空但没有默认值，通常返回 undefined 或 null
    return undefined; // 或者 null; 根据业务需求
  }

  if ("defaultValue" in schema && typeof schema.defaultValue === "function") {
    return schema.defaultValue();
  }

  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const result: Record<string, any> = {};
    for (const key in shape) {
      result[key] = schemaToObject(shape[key]); // 递归
    }
    return result;
  }
  if (schema instanceof z.ZodArray) {
    // 假设数组默认值为空数组，或包含一个元素的默认值
    return [schemaToObject(schema.element)]; // 或者 []
  }
  if (schema instanceof z.ZodNumber) {
    return 0;
  }
  if (schema instanceof z.ZodString) {
    return "";
  }
  if (schema instanceof z.ZodBoolean) {
    return false;
  }
  // TODO: 扩展对其他Zod类型的支持 (z.enum, z.union, z.literal etc.)
  return null; // 其它类型，如果没有明确默认值，返回null
}

/* ----------------- 静态阶段元组 ----------------- */
/** [ stageName, zodSchemaForThisStageOutput ] */
export type staticStageTuple = readonly [string, ZodTypeAny];

/* ----------------- 辅助类型 ----------------- */
/** 从 Zod schema 推断输出类型 */
export type OutputOfSchema<T extends ZodTypeAny> = z.infer<T>;

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
