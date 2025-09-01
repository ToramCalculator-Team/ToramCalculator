import { skill_effectSchema } from "@db/generated/zod";
import { z } from "zod/v3";

/**
 * @file 定义游戏引擎单帧计算流程的计算阶段和接口。
 * 这个模块包含了流程中各个事件的定义、输入输出Schema以及处理函数的类型定义。
 */

// 计算阶段枚举：枚举键是阶段名，枚举值是输出属性名（用于上下文访问）
export enum PipelineStageEvent {
  /** 技能效果选择阶段，输出为技能效果Schema */
  SkillEffectSelection = 'skillEffectResult',
  /** 技能射程计算阶段，输出为射程数字 */
  SkillRangeCalculation = 'skillRangeResult',
  /** 技能消耗扣除阶段，输出为HP和MP消耗对象 */
  SkillCostDeduction = 'skillCostDeductionResult',
}

// 调试用的字典，方便将枚举值映射为可读的中文名称
export const PipelineStageEventNameMap: Record<PipelineStageEvent, string> = {
  [PipelineStageEvent.SkillEffectSelection]: "技能效果选择",
  [PipelineStageEvent.SkillRangeCalculation]: "技能射程计算",
  [PipelineStageEvent.SkillCostDeduction]: "技能消耗扣除",
};

// 流程节点IO定义：每个元组包含 [阶段事件, 阶段的输出Schema]
export const PipelineStageDefinitions = [
  [PipelineStageEvent.SkillEffectSelection, skill_effectSchema],
  [PipelineStageEvent.SkillRangeCalculation, z.number()],
  [
    PipelineStageEvent.SkillCostDeduction,
    z.object({
      hpCost: z.number().default(0), // 增加default方便 schemaToObject
      mpCost: z.number().default(0),
    }),
  ],
] as const;

/**
 * 将Zod Schema转换为一个具有默认值的JavaScript对象。
 * 对于复杂对象和数组会进行递归处理。
 * @param schema Zod Schema实例
 * @returns 对应Schema的默认值对象
 */
function schemaToObject(schema: z.ZodTypeAny): any {
  // 处理可选/可空字段，如果设置了default，优先使用default
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    if ('defaultValue' in schema && typeof schema.defaultValue === 'function') {
      return schema.defaultValue();
    }
    // 如果是可选或可空但没有默认值，通常返回 undefined 或 null
    return undefined; // 或者 null; 根据业务需求
  }

  if ('defaultValue' in schema && typeof schema.defaultValue === 'function') {
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

// 所有阶段事件的名称联合类型
type StageEventName = (typeof PipelineStageDefinitions)[number][0];

/**
 * 泛型工具类型：截取管道定义中直到指定阶段的所有前置阶段的定义。
 * 返回一个包含 [阶段名称, 阶段Schema] 元组的数组。
 * @param PipelineDefs - 整个管道的阶段定义数组
 * @param StopStage - 停止截取的特定阶段名称
 * @param Acc - 累积的前置阶段定义
 */
type GetPreviousStageDefs<
  PipelineDefs extends readonly any[],
  StopStage,
  Acc extends any[] = []
> = PipelineDefs extends readonly [
  readonly [infer Name, infer Schema],
  ...infer Tail
]
  ? Name extends StopStage
    ? Acc // 找到目标节点时，返回之前累积的节点（不包含当前节点）
    : GetPreviousStageDefs<Tail, StopStage, [...Acc, [Name, Schema]]> // 继续累积
  : Acc;

/**
 * 泛型工具类型：将一个包含 [名称, Schema] 元组的数组，
 * 转换为一个以名称为键，Schema推断类型为值的对象。
 * 用于累加前置阶段的输出作为当前阶段的上下文。
 * @param StageSchemaPairs - 阶段定义元组数组
 */
type AccumulateStageOutputs<StageSchemaPairs extends readonly any[]> = {
  [K in StageSchemaPairs[number] as K extends readonly [infer Name, any]
    ? Name extends keyof any
      ? Name
      : never
    : never]: K extends readonly [any, infer Schema]
    ? Schema extends z.ZodTypeAny
      ? z.infer<Schema>
      : Schema
    : never;
};

/**
 * 获取指定阶段的输入/输出Zod Schema类型。
 * @param Stage - 目标阶段的事件名称
 */
type StageDefinitionSchema<Stage extends StageEventName> = Extract<(typeof PipelineStageDefinitions)[number], readonly [Stage, any]>[1];

/**
 * 获取指定阶段的运行时上下文类型。
 * 上下文包含了该阶段所有前置阶段的输出。
 * @param Stage - 目标阶段的事件名称
 */
type StageExecutionContext<Stage extends StageEventName> = AccumulateStageOutputs<GetPreviousStageDefs<typeof PipelineStageDefinitions, Stage>>;

/**
 * 获取指定阶段的运行时输出类型。
 * @param Stage - 目标阶段的事件名称
 */
type StageRuntimeOutput<Stage extends StageEventName> = StageDefinitionSchema<Stage> extends z.ZodTypeAny
  ? z.infer<StageDefinitionSchema<Stage>>
  : never;

/**
 * 定义游戏引擎中每个计算阶段的处理函数接口。
 * @template T - 外部通用的上下文类型，会被合并到每个阶段的特定上下文中。
 */
export type PipelineStageHandlers<T> = {
  [StageName in StageEventName]: (
    context: T & StageExecutionContext<StageName>,
    stageInput: StageDefinitionSchema<StageName> extends z.ZodTypeAny ? z.infer<StageDefinitionSchema<StageName>> : never,
  ) => StageRuntimeOutput<StageName>;
};