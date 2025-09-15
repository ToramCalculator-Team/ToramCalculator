import { skill_effectSchema } from "@db/generated/zod";
import { z } from "zod/v3";

/**
 * 将Zod Schema转换为一个具有默认值的JavaScript对象。
 * 对于复杂对象和数组会进行递归处理。
 * @param schema Zod Schema实例
 * @returns 对应Schema的默认值对象
 */
function schemaToObject(schema: z.ZodTypeAny): any {
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

/**
 * 泛型工具类型：截取管道定义中直到指定阶段的所有前置阶段的定义。
 * 返回一个包含 [阶段名称, 输出属性名, 阶段Schema] 元组的数组。
 * @param PipelineDefs - 整个管道的阶段定义数组
 * @param StopStage - 停止截取的特定阶段名称
 * @param Acc - 累积的前置阶段定义
 */
type GetPreviousStageDefs<
  PipelineDefs extends readonly any[],
  StopStage,
  Acc extends any[] = [],
> = PipelineDefs extends readonly [readonly [infer Name, infer OutputKey, infer Schema], ...infer Tail]
  ? Name extends StopStage
    ? Acc // 找到目标节点时，返回之前累积的节点（不包含当前节点）
    : GetPreviousStageDefs<Tail, StopStage, [...Acc, [Name, OutputKey, Schema]]> // 继续累积
  : Acc;

/**
 * 泛型工具类型：将一个包含 [阶段名称, 输出属性名, Schema] 元组的数组，
 * 转换为一个以输出属性名为键，Schema推断类型为值的对象。
 * 用于累加前置阶段的输出作为当前阶段的上下文。
 * @param StageSchemaPairs - 阶段定义元组数组
 */
type AccumulateStageOutputs<StageSchemaPairs extends readonly any[]> = {
  [K in StageSchemaPairs[number] as K extends readonly [any, infer OutputKey, any]
    ? OutputKey extends keyof any
      ? OutputKey
      : never
    : never]: K extends readonly [any, any, infer Schema]
    ? Schema extends z.ZodTypeAny
      ? z.infer<Schema>
      : Schema
    : never;
};

/**
 * 获取指定阶段的输入/输出Zod Schema类型。
 * @param TStage - 目标阶段的事件名称
 * @param TStageDefinitions - 阶段定义数组
 */
type StageDefinitionSchema<
  TStage extends string,
  TStageDefinitions extends readonly (readonly [string, string, any])[],
> = Extract<TStageDefinitions[number], readonly [TStage, any, any]>[2];

/**
 * 获取指定阶段的运行时上下文类型。
 * 上下文包含了该阶段所有前置阶段的输出。
 * @param TStage - 目标阶段的事件名称
 * @param TStageDefinitions - 阶段定义数组
 */
type StageExecutionContext<
  TStage extends string,
  TStageDefinitions extends readonly (readonly [string, string, any])[],
> = AccumulateStageOutputs<GetPreviousStageDefs<TStageDefinitions, TStage>>;

/**
 * 获取指定阶段的运行时输出类型。
 * @param TStage - 目标阶段的事件名称
 * @param TStageDefinitions - 阶段定义数组
 */
type StageRuntimeOutput<TStage extends string, TStageDefinitions extends readonly (readonly [string, string, any])[]> =
  StageDefinitionSchema<TStage, TStageDefinitions> extends z.ZodTypeAny
    ? z.infer<StageDefinitionSchema<TStage, TStageDefinitions>>
    : never;

/**
 * 从阶段定义数组中提取所有阶段名称的联合类型
 */
type ExtractStageNames<TStageDefinitions extends readonly (readonly [string, string, any])[]> =
  TStageDefinitions[number][0];

/**
 * 定义游戏引擎中每个计算阶段的处理函数接口。
 * @template TStageDefinitions - 阶段定义数组类型，格式为 [阶段名称, 输出属性名, Schema]
 * @template TExternalContext - 外部通用的上下文类型，会被合并到每个阶段的特定上下文中
 */
export type PipelineStageHandlers<
  TStageDefinitions extends readonly (readonly [string, string, any])[],
  TExternalContext = {},
> = {
  [StageName in ExtractStageNames<TStageDefinitions>]: (
    context: TExternalContext & StageExecutionContext<StageName, TStageDefinitions>,
    stageInput: StageDefinitionSchema<StageName, TStageDefinitions> extends z.ZodTypeAny
      ? z.infer<StageDefinitionSchema<StageName, TStageDefinitions>>
      : never,
  ) => StageRuntimeOutput<StageName, TStageDefinitions>;
};

// 从actions定义
export type ActionsPipelineDefinitions<TActions extends string> = Record<
  TActions,
  readonly (readonly [string, string, any])[]
>;

export type ActionsPipelineHanders<
  TActions extends string,
  TPipelineDefinitions extends ActionsPipelineDefinitions<TActions>,
  TExternalContext = {},
> = {
  [K in TActions]: PipelineStageHandlers<TPipelineDefinitions[K], TExternalContext>
};
