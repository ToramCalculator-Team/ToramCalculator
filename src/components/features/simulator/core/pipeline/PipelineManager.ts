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

  /* ---------------------- compile ---------------------- */
/**
 * 编译某个 action 的同步执行链（支持两种静态实现：纯函数或 XState ActionFunction）
 *
 * 返回值类型： (ctx, params?) => { ctx: TCtx, stageOutputs: StageOutputsOf<...> }
 */
private compile<A extends TActionName>(
  action: A
): (ctx: TCtx, params?: TParams) => { ctx: TCtx; stageOutputs: StageOutputsOf<TActionName, TDef, A> } {
  const staticStages = this.pipelineDef[action]; // readonly staticStageTuple[]
  const pipeFnsForAction = (this.pipeFunDef as any)[action] as Record<string, Function> | undefined;

  return (ctx: TCtx, params?: TParams) => {
    // working copy of ctx so we don't mutate caller's object unexpectedly
    const currentCtx: any = Object.assign({}, ctx);
    let prevOutput: any = params ?? {};
    const stageOutputs = {} as StageOutputsOf<TActionName, TDef, A>;

    // iterate each static stage in order
    for (const [stageName, schema] of staticStages) {
      const typedStageName = stageName as StageNamesOf<TActionName, TDef, A>;

      // ---------- 静态实现：先当作纯函数调用 ----------
      let stageOut: any = prevOutput;
      const staticImpl = pipeFnsForAction?.[stageName];

      if (staticImpl) {
        // 1) 首先以纯函数签名尝试调用 (ctx, input) => out
        //    这涵盖最常见的纯计算函数实现
        try {
          const maybeOut = staticImpl(currentCtx, prevOutput);
          stageOut = maybeOut;
        } catch (e) {
          // 如果实现内部抛错，直接抛出（与之前行为一致）
          throw e;
        }

        // 2) 如果返回的是 undefined（常见于 action-style impl），
        //    那么我们认为它可能是 XState 的 ActionFunction（enqueueActions 返回的函数）
        //    我们构造简单的 ActionArgs 提供给它（enqueue.assign 等会同步修改 currentCtx）。
        if (stageOut === undefined) {
          // Minimal ActionArgs-like object for enqueueActions / ActionFunction compatibility
          const actionArgs: any = {
            // XState 的 ActionArgs 包含 context, event, and helpers like enqueue/assign/check
            context: currentCtx,
            event: { type: '__PIPE__' }, // synthetic event
            // enqueue: provide helpers expected by enqueueActions: assign, maybe enqueue(...) - keep minimal
            enqueue: {
              // assign 支持传对象或 updater function (ctx => patch)
              assign: (patchOrFn: any) => {
                if (typeof patchOrFn === 'function') {
                  // patch function: receives context-like arg
                  const patch = patchOrFn({ context: currentCtx });
                  if (patch && typeof patch === 'object') Object.assign(currentCtx, patch);
                } else if (patchOrFn && typeof patchOrFn === 'object') {
                  Object.assign(currentCtx, patchOrFn);
                }
                // return nothing (like xstate enqueue.assign)
              },
              // Allow enqueue(action) to be a no-op or store for later — for simplicity it's no-op
              // If you need to actually enqueue actions, you'd provide a more complete implementation.
              call: (action: any) => {
                // no-op in this minimal shim
              }
            },
            // check helper (used in your examples like if (check('someGuard')) ...)
            check: (guardName: string) => {
              // minimal; you can wire real guard lookup if desired
              return false;
            }
          };

          // Call as an action: actionFn(ActionArgs, params)
          // For enqueueActions, the returned ActionFunction expects (args, params)
          try {
            const maybeVoid = (staticImpl as any)(actionArgs, prevOutput);
            // if it returns object despite being action-style, use it as stageOut
            if (maybeVoid !== undefined) {
              stageOut = maybeVoid;
            } else {
              // action mutated currentCtx via enqueue.assign; we keep prevOutput as-is
              stageOut = prevOutput;
            }
          } catch (e) {
            throw e;
          }
        }
      } // end if staticImpl

      // ---------- 校验并合并静态阶段输出 ----------
      if (schema) {
        const parsed = (schema as any).safeParse(stageOut);
        if (!parsed.success) {
          // throw zod parse error
          throw parsed.error;
        }
        // merge parsed data into context
        Object.assign(currentCtx, parsed.data);
        // set prevOutput to the structured parsed.data so next stage sees typed output
        prevOutput = parsed.data;
      } else {
        // no schema: if stageOut is object, merge into ctx; otherwise keep primitive as prevOutput
        if (stageOut && typeof stageOut === 'object') {
          Object.assign(currentCtx, stageOut);
        }
        prevOutput = stageOut;
      }

      // ---------- 保存阶段输出（类型断言为 StageOutputsOf） ----------
      // TS 需要断言键类型，因为 stageName 是运行时字符串
      (stageOutputs as any)[typedStageName] = prevOutput;

      // ---------- 执行该静态阶段之后注册的动态 handlers ----------
      const dyns = this.dynamicStages[action]?.[typedStageName] ?? [];
      for (const dyn of dyns) {
        const dynOut = (dyn as any)(currentCtx, prevOutput);
        if (!dynOut) continue;
        if (typeof dynOut === 'object') {
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
run<A extends TActionName>(
  action: A,
  ctx: TCtx,
  params?: TParams
): { ctx: TCtx; stageOutputs: StageOutputsOf<TActionName, TDef, A> } {
  // ensure compiled chain exists for action (typed per-action)
  if (!this.compiledChains[action]) {
    // Note: compile(action) returns a function with exact return type that uses StageOutputsOf<A>
    this.compiledChains[action] = this.compile(action);
  }
  return this.compiledChains[action](ctx, params);
}
}
