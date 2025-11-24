/**
 * 管线管理器 - 实例化版本，支持Member级别的管线管理
 *
 * 设计思路：
 * 1. 每个Member都有自己的PipelineManager实例
 * 2. 固定管线阶段来自各自的ActionPipelines定义
 */

import { ZodType } from "zod/v4";
import {
  OutputOfSchema,
  PipeLineDef,
  PipelineParamsFromDef,
  PipeStageFunDef,
  staticStageTuple,
} from "./PipelineStageType";

// ==================== 类型定义 ====================

/**
 * 动态管线阶段
 * 用于在运行时动态插入到固定管线阶段后面
 */
export interface CustomPipelineStage {
  /** 唯一标识 */
  id: string;
  /** 来源标识（如buff ID或"combat_init"） */
  source: string;
  /** 处理函数 */
  logic: (context: any, stageInput: any) => any;
  /** 优先级，数字越小越先执行 */
  priority: number;
  /** 描述 */
  description?: string;
}

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

/* ---------- 获取到某阶段（含当前）的前序定义 ---------- */
type GetPreviousAndCurrentStageDefs<
  TStages extends readonly staticStageTuple[],
  StopStage extends string,
  Acc extends readonly staticStageTuple[] = [],
> = TStages extends readonly [infer First, ...infer Rest]
  ? First extends readonly [
      infer Name extends string,
      infer InputSchema extends ZodType,
      infer OutputSchema extends ZodType,
    ] // ← 三元组约束
    ? Rest extends readonly staticStageTuple[]
      ? Equal<Name, StopStage> extends true
        ? [...Acc, First] // include current
        : GetPreviousAndCurrentStageDefs<Rest, StopStage, [...Acc, First]>
      : Acc
    : Acc
  : Acc;

/* ---------- 累积输出为交叉类型 ---------- */
type OutputsUnionFromDefs<TDefs extends readonly staticStageTuple[]> = TDefs[number] extends readonly [
  any,
  any,
  infer OutputSchema,
]
  ? OutputSchema extends ZodType
    ? OutputOfSchema<OutputSchema>
    : never
  : never;

type AccumulateStageOutputs<TDefs extends readonly staticStageTuple[]> = UnionToIntersection<
  OutputsUnionFromDefs<TDefs>
>;

/* ---------- 阶段名 / schema / 输出 提取（已解耦版本）---------- */
type StageNamesOf<TDef extends PipeLineDef, P extends keyof TDef> = TDef[P][number] extends readonly [
  infer N extends string,
  any,
  any,
]
  ? N
  : never;

type StageInputSchemaOf<TDef extends PipeLineDef, P extends keyof TDef, S extends StageNamesOf<TDef, P>> = Extract<
  TDef[P][number],
  readonly [S, any, any]
>[1];

type StageOutputSchemaOf<TDef extends PipeLineDef, P extends keyof TDef, S extends StageNamesOf<TDef, P>> = Extract<
  TDef[P][number],
  readonly [S, any, any]
>[2];

type StageInputOf<TDef extends PipeLineDef, P extends keyof TDef, S extends StageNamesOf<TDef, P>> =
  StageInputSchemaOf<TDef, P, S> extends ZodType ? OutputOfSchema<StageInputSchemaOf<TDef, P, S>> : never;

type StageOutputOf<TDef extends PipeLineDef, P extends keyof TDef, S extends StageNamesOf<TDef, P>> =
  StageOutputSchemaOf<TDef, P, S> extends ZodType ? OutputOfSchema<StageOutputSchemaOf<TDef, P, S>> : never;

/* ---------- 执行上下文到该阶段（含） ---------- */
type StageExecutionContextAfter<
  TDef extends PipeLineDef,
  P extends keyof TDef,
  S extends StageNamesOf<TDef, P>,
  TCtx extends Record<string, any>,
> = TCtx & AccumulateStageOutputs<GetPreviousAndCurrentStageDefs<TDef[P], S>>;

/* ----------------- 动态阶段 handler 类型 ----------------- */
/**
 * 动态阶段通常期望：
 *  - ctx: 能看到基础 ctx + 到该阶段（含）的所有前序输出
 *  - input: 是所插入点对应静态阶段的输出类型（I = 输出类型）
 *  - 返回值可以是该输出类型（替换/修改）
 */
type DynamicHandlerForStage<
  TDef extends PipeLineDef,
  P extends keyof TDef,
  S extends StageNamesOf<TDef, P>,
  TCtx extends Record<string, any>,
> = (ctx: StageExecutionContextAfter<TDef, P, S, TCtx>, input: StageOutputOf<TDef, P, S>) => StageOutputOf<TDef, P, S>;

/** 获取某管线的每个阶段对应输出类型映射 */
type StageOutputsOf<TDef extends PipeLineDef, P extends keyof TDef> = {
  [S in StageNamesOf<TDef, P>]: StageOutputOf<TDef, P, S>;
};

/* ----------------- PipelineManager----------------- */
/**
 * 管线管理器
 *
 * 设计理念：
 * 2. 使用管线名称作为标识符
 * 3. 与运行时上下文（TCtx）关联，由数据结构决定
 * 4. 管线的输入参数类型从第一个阶段的 InputSchema 自动推导
 *
 * @template TDef - 管线定义（管线名称 → 阶段数组）
 * @template TCtx - 运行时上下文类型
 */
export class PipelineManager<TDef extends PipeLineDef, TCtx extends Record<string, any>> {
  /** 动态阶段存储：pipelineName -> stageName -> list of dynamic handlers */
  private dynamicStages: {
    [P in keyof TDef]?: {
      [S in StageNamesOf<TDef, P>]?: DynamicHandlerForStage<TDef, P, S, TCtx>[];
    };
  } = {} as any;

  /** 缓存已编译的执行链：pipelineName -> compiled chain */
  private compiledChains: {
    [P in keyof TDef]?: (
      ctx: TCtx,
      params?: PipelineParamsFromDef<TDef>[P],
    ) => {
      ctx: TCtx;
      stageOutputs: StageOutputsOf<TDef, P>;
    };
  } = {} as any;

  constructor(
    /** 管线定义：每个管线名称对应静态阶段数组 */
    public readonly pipelineDef: TDef,
    /** 静态阶段实际执行函数集合 */
    public readonly pipeFunDef: PipeStageFunDef<TDef, TCtx>,
  ) {}

  /**
   * 插入动态阶段
   * - pipelineName: 管线名称
   * - afterStage: 该动态 handler 插入到哪个静态阶段之后
   * - handler: 动态 handler 函数（类型安全，可访问累积 ctx）
   * - 插入后清空缓存 compiledChains[pipelineName]，保证下一次运行使用最新链
   */
  insertDynamicStage<P extends keyof TDef, S extends StageNamesOf<TDef, P>>(
    pipelineName: P,
    afterStage: S,
    handler: DynamicHandlerForStage<TDef, P, S, TCtx>,
  ) {
    const map = (this.dynamicStages[pipelineName] ??= {} as any);
    const list = (map[afterStage] ??= [] as any) as DynamicHandlerForStage<TDef, P, S, TCtx>[];
    list.push(handler);

    // 动态阶段变动时清空缓存
    delete this.compiledChains[pipelineName];
  }

  /** 获取某管线某静态阶段之后的动态 handler 列表 */
  getDynamicHandlersForStage<P extends keyof TDef, S extends StageNamesOf<TDef, P>>(pipelineName: P, stage: S) {
    return (this.dynamicStages[pipelineName]?.[stage] ?? []) as DynamicHandlerForStage<TDef, P, S, TCtx>[];
  }

  /* ---------------------- compile ---------------------- */
  /**
   * 编译某个管线的同步执行链
   *
   * 支持输入输出双重验证：
   * - 调用静态实现前：验证 prevOutput 是否符合该阶段的 inputSchema
   * - 调用静态实现后：验证 stageOut 是否符合该阶段的 outputSchema
   *
   * 返回值类型： (ctx, params?) => { ctx: TCtx, stageOutputs: StageOutputsOf<...> }
   */
  private compile<P extends keyof TDef>(
    pipelineName: P,
  ): (ctx: TCtx, params?: PipelineParamsFromDef<TDef>[P]) => { ctx: TCtx; stageOutputs: StageOutputsOf<TDef, P> } {
    const staticStages = this.pipelineDef[pipelineName]; // readonly staticStageTuple[]
    const pipeFnsForPipeline = (this.pipeFunDef as any)[pipelineName] as Record<string, Function> | undefined;

    return (ctx: TCtx, params?: PipelineParamsFromDef<TDef>[P]) => {
      // working copy of ctx so we don't mutate caller's object unexpectedly
      const currentCtx: any = Object.assign({}, ctx);
      let prevOutput: any = params ?? {};
      const stageOutputs = {} as StageOutputsOf<TDef, P>;

      // iterate each static stage in order
      for (const [stageName, inputSchema, outputSchema] of staticStages) {
        const typedStageName = stageName as StageNamesOf<TDef, P>;

        // ---------- 输入验证 ----------
        if (inputSchema) {
          const inputParsed = (inputSchema as any).safeParse(prevOutput);
          if (!inputParsed.success) {
            throw new Error(`[${String(pipelineName)}.${stageName}] 输入验证失败: ${inputParsed.error.message}`);
          }
          // 使用验证后的数据
          prevOutput = inputParsed.data;
        }

        // ---------- 静态实现：纯函数调用 ----------
        let stageOut: any = prevOutput;
        const staticImpl = pipeFnsForPipeline?.[stageName];

        if (staticImpl) {
          // 以纯函数签名调用 (ctx, input) => out
          try {
            stageOut = staticImpl(currentCtx, prevOutput);
          } catch (e) {
            throw e;
          }
        } // end if staticImpl

        // ---------- 输出验证并合并 ----------
        if (outputSchema) {
          const outputParsed = (outputSchema as any).safeParse(stageOut);
          if (!outputParsed.success) {
            throw new Error(`[${String(pipelineName)}.${stageName}] 输出验证失败: ${outputParsed.error.message}`);
          }
          // merge parsed data into context
          Object.assign(currentCtx, outputParsed.data);
          // set prevOutput to the structured parsed.data so next stage sees typed output
          prevOutput = outputParsed.data;
        } else {
          // no schema: if stageOut is object, merge into ctx; otherwise keep primitive as prevOutput
          if (stageOut && typeof stageOut === "object") {
            Object.assign(currentCtx, stageOut);
          }
          prevOutput = stageOut;
        }

        // ---------- 保存阶段输出（类型断言为 StageOutputsOf） ----------
        // TS 需要断言键类型，因为 stageName 是运行时字符串
        (stageOutputs as any)[typedStageName] = prevOutput;

        // ---------- 执行该静态阶段之后注册的动态 handlers ----------
        const dyns = this.dynamicStages[pipelineName]?.[typedStageName] ?? [];
        for (const dyn of dyns) {
          const dynOut = (dyn as any)(currentCtx, prevOutput);
          if (!dynOut) continue;
          if (typeof dynOut === "object") {
            Object.assign(currentCtx, dynOut);
            prevOutput = dynOut;
          } else {
            prevOutput = dynOut;
          }
          // 同样把动态阶段的结果视为该阶段最终输出（覆盖）
          (stageOutputs as any)[typedStageName] = prevOutput;
        }
      } // end for stages

      // 返回最终 context 与每个阶段输出
      return { ctx: currentCtx as TCtx, stageOutputs };
    };
  }

  /* ---------------------- run ---------------------- */
  /**
   * 对外同步执行入口（使用缓存的已编译闭包）
   * 返回：{ ctx, stageOutputs }，其中 stageOutputs 类型由 StageOutputsOf 推导
   */
  run<P extends keyof TDef>(
    pipelineName: P,
    ctx: TCtx,
    params?: PipelineParamsFromDef<TDef>[P],
  ): { ctx: TCtx; stageOutputs: StageOutputsOf<TDef, P> } {
    // ensure compiled chain exists for pipeline
    if (!this.compiledChains[pipelineName]) {
      this.compiledChains[pipelineName] = this.compile(pipelineName);
    }
    return this.compiledChains[pipelineName](ctx, params);
  }
}
