/**
 * 管线管理器 - 实例化版本，支持Member级别的管线管理
 *
 * 设计思路：
 * 1. 每个Member都有自己的PipelineManager实例
 * 2. 固定管线阶段来自各自的ActionPipelines定义
 */

import { ZodTypeAny } from "zod/v3";
import { OutputOfSchema, PipeLineDef, PipeStageFunDef, staticStageTuple } from "./PipelineStageType";
import { ParameterizedObject } from "xstate";

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
  ? First extends readonly [infer Name extends string, infer Schema extends ZodTypeAny] // ← 关键：约束 Schema 为 ZodTypeAny
    ? Rest extends readonly staticStageTuple[]
      ? Equal<Name, StopStage> extends true
        ? [...Acc, First] // include current
        : GetPreviousAndCurrentStageDefs<Rest, StopStage, [...Acc, First]>
      : Acc
    : Acc
  : Acc;

/* ---------- 累积输出为交叉类型 ---------- */
type OutputsUnionFromDefs<TDefs extends readonly staticStageTuple[]> = TDefs[number] extends readonly [any, infer S]
  ? S extends ZodTypeAny
    ? OutputOfSchema<S>
    : never
  : never;

type AccumulateStageOutputs<TDefs extends readonly staticStageTuple[]> = UnionToIntersection<
  OutputsUnionFromDefs<TDefs>
>;

/* ---------- 阶段名 / schema / 输出 提取 ---------- */
type StageNamesOf<
  TActionName extends string,
  TDef extends PipeLineDef<TActionName>,
  A extends TActionName,
> = TDef[A][number] extends readonly [infer N extends string, any] ? N : never;

type StageSchemaOf<
  TActionName extends string,
  TDef extends PipeLineDef<TActionName>,
  A extends TActionName,
  S extends StageNamesOf<TActionName, TDef, A>,
> = Extract<TDef[A][number], readonly [S, any]>[1];

type StageOutputOf<
  TActionName extends string,
  TDef extends PipeLineDef<TActionName>,
  A extends TActionName,
  S extends StageNamesOf<TActionName, TDef, A>,
> =
  StageSchemaOf<TActionName, TDef, A, S> extends ZodTypeAny
    ? OutputOfSchema<StageSchemaOf<TActionName, TDef, A, S>>
    : never;

/* ---------- 执行上下文到该阶段（含） ---------- */
type StageExecutionContextAfter<
  TActionName extends string,
  TDef extends PipeLineDef<TActionName>,
  A extends TActionName,
  S extends StageNamesOf<TActionName, TDef, A>,
  TCtx extends Record<string, any>,
> = TCtx & AccumulateStageOutputs<GetPreviousAndCurrentStageDefs<TDef[A], S>>;

/* ----------------- 动态阶段 handler 类型 ----------------- */
/**
 * 动态阶段通常期望：
 *  - ctx: 能看到基础 ctx + 到该阶段（含）的所有前序输出
 *  - input: 是所插入点对应静态阶段的输出类型（I = 输出类型）
 *  - 返回值可以是该输出类型（替换/修改），也可以部分更新 ctx（Partial），或 void
 */
type DynamicHandlerForStage<
  TActionName extends string,
  TDef extends PipeLineDef<TActionName>,
  A extends TActionName,
  S extends StageNamesOf<TActionName, TDef, A>,
  TCtx extends Record<string, any>,
> = (
  ctx: StageExecutionContextAfter<TActionName, TDef, A, S, TCtx>,
  input: StageOutputOf<TActionName, TDef, A, S>,
) => StageOutputOf<TActionName, TDef, A, S> | Partial<StageExecutionContextAfter<TActionName, TDef, A, S, TCtx>> | void;

/** 获取某 action 的每个阶段对应输出类型映射 */
type StageOutputsOf<TActionName extends string, TDef extends PipeLineDef<TActionName>, A extends TActionName> = {
  [S in StageNamesOf<TActionName, TDef, A>]: StageOutputOf<TActionName, TDef, A, S>;
};

/* ----------------- PipelineManager ----------------- */
export class PipelineManager<
  TActionTypeAndParams extends ParameterizedObject,
  TDef extends PipeLineDef<TActionTypeAndParams["type"]>,
  TCtx extends Record<string, any>,
  TActionName extends string = TActionTypeAndParams["type"],
  TParams = TActionTypeAndParams["params"],
> {
  /** 动态阶段存储：action -> stageName -> list of dynamic handlers */
  private dynamicStages: {
    [A in TActionName]?: {
      [S in StageNamesOf<TActionName, TDef, A>]?: DynamicHandlerForStage<TActionName, TDef, A, S, TCtx>[];
    };
  } = {} as any;

  /** 缓存已编译的执行链：action -> compiled chain */
  private compiledChains: {
    [A in TActionName]?: (ctx: TCtx, params?: TParams) => {
      ctx: TCtx;
      stageOutputs: StageOutputsOf<TActionName, TDef, A>;
    }
  } = {} as any;

  constructor(
    /** 管线定义：每个 action 对应静态阶段数组 */
    public readonly pipelineDef: TDef,
    /** 静态阶段实际执行函数集合 */
    public readonly pipeFunDef: PipeStageFunDef<{ type: TActionName; params: TParams }, TDef, TCtx>,
  ) {}

  /**
   * 插入动态阶段
   * - afterStage: 该动态 handler 插入到哪个静态阶段之后
   * - handler: 动态 handler 函数（类型安全，可访问累积 ctx）
   * - 插入后清空缓存 compiledChains[action]，保证下一次运行使用最新链
   */
  insertDynamicStage<A extends TActionName, S extends StageNamesOf<TActionName, TDef, A>>(
    action: A,
    afterStage: S,
    handler: DynamicHandlerForStage<TActionName, TDef, A, S, TCtx>,
  ) {
    const map = (this.dynamicStages[action] ??= {} as any);
    const list = (map[afterStage] ??= [] as any) as DynamicHandlerForStage<TActionName, TDef, A, S, TCtx>[];
    list.push(handler);

    // 动态阶段变动时清空缓存
    delete this.compiledChains[action];
  }

  /** 获取某 action 某静态阶段之后的动态 handler 列表 */
  getDynamicHandlersForStage<A extends TActionName, S extends StageNamesOf<TActionName, TDef, A>>(action: A, stage: S) {
    return (this.dynamicStages[action]?.[stage] ?? []) as DynamicHandlerForStage<TActionName, TDef, A, S, TCtx>[];
  }

  /**
   * 编译某个 action 的执行链
   * - 返回闭包函数：接受 ctx + params，返回完整 ctx + 每个阶段输出
   * - 步骤：
   *   1) 按 pipelineDef[action] 顺序遍历每个静态阶段
   *   2) 调用静态实现函数，得到阶段输出
   *   3) 使用 zod schema 校验阶段输出并合并到 ctx
   *   4) 执行当前阶段之后的所有动态 handlers
   *   5) 更新 prevOutput 用于下一阶段
   */
  private compile<A extends TActionName>(
    action: A,
  ): (
    ctx: TCtx,
    params?: TParams,
  ) => {
    ctx: TCtx;
    stageOutputs: StageOutputsOf<TActionName, TDef, A>;
  } {
    const staticStages = this.pipelineDef[action]; // readonly staticStageTuple[]
    const pipeFnsForAction = (this.pipeFunDef as any)[action] as Record<string, Function> | undefined;

    // 返回闭包执行函数
    return (ctx: TCtx, params?: TParams) => {
      const currentCtx: any = Object.assign({}, ctx);
      let prevOutput: any = params ?? {};
      const stageOutputs = {} as StageOutputsOf<TActionName, TDef, A>;

      for (const [stageName, schema] of staticStages) {
        const typedStageName = stageName as StageNamesOf<TActionName, TDef, A>;

        // ---------- 执行静态阶段函数 ----------
        let stageOut = prevOutput;
        const staticImpl = pipeFnsForAction?.[stageName];
        if (staticImpl) {
          stageOut = staticImpl(currentCtx, prevOutput);
        }

        // 校验并合并阶段输出
        if (schema) {
          const parsed = (schema as any).safeParse(stageOut);
          if (!parsed.success) throw parsed.error;
          Object.assign(currentCtx, parsed.data);
          stageOut = parsed.data;
        } else if (stageOut && typeof stageOut === "object") {
          Object.assign(currentCtx, stageOut);
        }

        // ---------- 保存阶段输出 ----------
        stageOutputs[typedStageName] = stageOut;

        prevOutput = stageOut; // 下一阶段输入

        // ---------- 执行动态阶段 handlers ----------
        const dyns = this.dynamicStages[action]?.[typedStageName] ?? [];
        for (const dyn of dyns) {
          const dynOut = (dyn as any)(currentCtx, prevOutput);
          if (!dynOut) continue;
          if (typeof dynOut === "object") {
            Object.assign(currentCtx, dynOut);
            prevOutput = dynOut;
          } else {
            prevOutput = dynOut;
          }
        }
      }

      return { ctx: currentCtx, stageOutputs };
    };
  }

  /**
   * 对外执行接口
   * - action: 要执行的 action
   * - ctx: 基础上下文
   * - params: 初始输入（第一阶段的 stageInput）
   * - 返回：{ ctx, stageOutputs }，包含最终上下文及每个阶段输出
   */
  run<A extends TActionName>(
    action: A,
    ctx: TCtx,
    params?: TParams,
  ): { ctx: TCtx; stageOutputs: StageOutputsOf<TActionName, TDef, A> } {
    if (!this.compiledChains[action]) {
      this.compiledChains[action] = this.compile(action);
    }
    return this.compiledChains[action](ctx, params);
  }
}
