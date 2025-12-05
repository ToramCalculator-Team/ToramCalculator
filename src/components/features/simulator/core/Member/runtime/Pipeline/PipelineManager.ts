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
  StagePool,
  StageOutputSchema,
  StageInputSchema,
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

/* ---------- 辅助类型 ---------- */

/** 获取 Stage 的输出类型 */
type StageOutputOf<TPool extends StagePool<any>, S extends keyof TPool & string> = OutputOfSchema<
  StageOutputSchema<TPool, S>
>;

/** 获取 Stage 的输入类型 */
type StageInputOf<TPool extends StagePool<any>, S extends keyof TPool & string> = OutputOfSchema<
  StageInputSchema<TPool, S>
>;

/* ---------- 获取到某阶段（含当前）的前序阶段名列表 ---------- */
type GetPreviousAndCurrentStageNames<
  Names extends readonly string[],
  StopStage extends string,
  Acc extends readonly string[] = [],
> = Names extends readonly [infer First extends string, ...infer Rest extends string[]]
  ? First extends StopStage
    ? [...Acc, First]
    : GetPreviousAndCurrentStageNames<Rest, StopStage, [...Acc, First]>
  : Acc;

/* ---------- 累积输出为交叉类型 ---------- */
type OutputsUnionFromNames<
  Names extends readonly string[],
  TPool extends StagePool<any>,
> = Names[number] extends infer N
  ? N extends keyof TPool & string
    ? StageOutputOf<TPool, N>
    : never
  : never;

type AccumulateStageOutputs<
  Names extends readonly string[],
  TPool extends StagePool<any>,
> = UnionToIntersection<OutputsUnionFromNames<Names, TPool>>;

/* ---------- 执行上下文到该阶段（含） ---------- */
type StageExecutionContextAfter<
  TDef extends PipeLineDef<TPool>,
  P extends keyof TDef,
  S extends TDef[P][number] & string,
  TPool extends StagePool<TCtx>,
  TCtx extends Record<string, any>,
> = TCtx & AccumulateStageOutputs<GetPreviousAndCurrentStageNames<TDef[P], S>, TPool>;

/* ----------------- 动态阶段 handler 类型 ----------------- */
/**
 * 动态阶段通常期望：
 *  - ctx: 能看到基础 ctx + 到该阶段（含）的所有前序输出
 *  - input: 是所插入点对应静态阶段的输出类型（I = 输出类型）
 *  - 返回值可以是该输出类型（替换/修改）
 */
type DynamicHandlerForStage<
  TDef extends PipeLineDef<TPool>,
  P extends keyof TDef,
  S extends TDef[P][number] & string,
  TPool extends StagePool<TCtx>,
  TCtx extends Record<string, any>,
> = (
  ctx: StageExecutionContextAfter<TDef, P, S, TPool, TCtx>,
  input: StageOutputOf<TPool, S>,
) => StageOutputOf<TPool, S>;

/**
 * 动态阶段存储条目
 */
interface DynamicStageEntry<
  TDef extends PipeLineDef<TPool>,
  P extends keyof TDef,
  S extends TDef[P][number] & string,
  TPool extends StagePool<TCtx>,
  TCtx extends Record<string, any>,
> {
  id: string;
  source: string;
  handler: DynamicHandlerForStage<TDef, P, S, TPool, TCtx>;
  priority: number;
}

export interface PipelineDynamicStageInfo {
  pipelineName: string;
  stageName: string;
  id: string;
  source: string;
  priority: number;
}

/** 获取某管线的每个阶段对应输出类型映射 */
type StageOutputsOf<
  TDef extends PipeLineDef<TPool>,
  P extends keyof TDef,
  TPool extends StagePool<any>,
> = {
  [S in TDef[P][number] & string]: StageOutputOf<TPool, S>;
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
 * @template TDef - 管线定义（管线名称 → 阶段名数组）
 * @template TPool - 阶段池
 * @template TCtx - 运行时上下文类型
 */
export class PipelineManager<
  TDef extends PipeLineDef<TPool>,
  TPool extends StagePool<TCtx>,
  TCtx extends Record<string, any>,
> {
  /** 动态阶段存储：pipelineName -> stageName -> list of dynamic entries */
  private dynamicStages: {
    [P in keyof TDef]?: {
      [S in TDef[P][number] & string]?: DynamicStageEntry<TDef, P, S, TPool, TCtx>[];
    };
  } = {} as any;

  /** 缓存已编译的执行链：pipelineName -> compiled chain */
  private compiledChains: {
    [P in keyof TDef]?: (
      ctx: TCtx,
      params?: PipelineParamsFromDef<TDef, TPool>[P],
    ) => {
      ctx: TCtx;
      stageOutputs: StageOutputsOf<TDef, P, TPool>;
    };
  } = {} as any;

  constructor(
    /** 管线定义：每个管线名称对应静态阶段名数组 */
    public readonly pipelineDef: TDef,
    /** 阶段池：包含具体的实现 */
    public readonly stagePool: TPool,
  ) {}

  /**
   * 插入动态阶段
   * @param pipelineName 管线名称
   * @param afterStage 该动态 handler 插入到哪个静态阶段之后
   * @param handler 动态 handler 函数
   * @param id 动态阶段唯一标识
   * @param source 动态阶段来源标识
   * @returns 移除该动态阶段的清理函数
   */
  insertDynamicStage<P extends keyof TDef, S extends TDef[P][number] & string>(
    pipelineName: P,
    afterStage: S,
    handler: DynamicHandlerForStage<TDef, P, S, TPool, TCtx>,
    id: string,
    source: string,
    priority = 0,
  ): () => void {
    const map = (this.dynamicStages[pipelineName] ??= {} as any);
    const list = (map[afterStage] ??= [] as any) as DynamicStageEntry<TDef, P, S, TPool, TCtx>[];

    // 如果已存在相同ID，先移除
    const existingIndex = list.findIndex((e) => e.id === id);
    if (existingIndex !== -1) {
      list.splice(existingIndex, 1);
    }

    const entry: DynamicStageEntry<TDef, P, S, TPool, TCtx> = {
      id,
      source,
      handler,
      priority,
    };
    const insertIndex = list.findIndex((item) => priority < item.priority);
    if (insertIndex === -1) {
    list.push(entry);
    } else {
      list.splice(insertIndex, 0, entry);
    }

    // 动态阶段变动时清空缓存
    delete this.compiledChains[pipelineName];

    // 返回清理函数
    return () => {
      const index = list.indexOf(entry);
      if (index !== -1) {
        list.splice(index, 1);
        // 清空缓存以应用移除
        delete this.compiledChains[pipelineName];
      }
    };
  }

  /**
   * 根据来源移除所有动态阶段
   * @param source 来源标识
   */
  removeStagesBySource(source: string): void {
    let changed = false;
    for (const pipelineName in this.dynamicStages) {
      const stages = this.dynamicStages[pipelineName];
      if (!stages) continue;

      for (const stageName in stages) {
        const list = stages[stageName] as DynamicStageEntry<TDef, any, any, TPool, TCtx>[];
        if (!list) continue;

        const initialLength = list.length;
        // 过滤掉匹配 source 的条目
        const filteredList = list.filter((entry) => entry.source !== source);

        if (filteredList.length !== initialLength) {
          stages[stageName] = filteredList as any;
          changed = true;
        }
      }
    }

    if (changed) {
      this.compiledChains = {} as any; // 清空所有缓存，简单粗暴
    }
  }

  /**
   * 根据ID移除动态阶段
   * @param id 动态阶段唯一标识
   */
  removeStageById(id: string): void {
    let changed = false;
    for (const pipelineName in this.dynamicStages) {
      const stages = this.dynamicStages[pipelineName];
      if (!stages) continue;

      for (const stageName in stages) {
        const list = stages[stageName] as DynamicStageEntry<TDef, any, any, TPool, TCtx>[];
        if (!list) continue;

        const index = list.findIndex((entry) => entry.id === id);
        if (index !== -1) {
          list.splice(index, 1);
          changed = true;
          // ID 是唯一的，找到就可以退出了？不一定，也许不同管线有相同ID（虽然不推荐）
          // 这里继续查找以防万一
        }
      }
    }

    if (changed) {
      this.compiledChains = {} as any;
    }
  }

  /** 获取某管线某静态阶段之后的动态 handler 列表 */
  getDynamicHandlersForStage<P extends keyof TDef, S extends TDef[P][number] & string>(pipelineName: P, stage: S) {
    const entries = (this.dynamicStages[pipelineName]?.[stage] ?? []) as DynamicStageEntry<
      TDef,
      P,
      S,
      TPool,
      TCtx
    >[];
    return entries.map((e) => e.handler);
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
  ): (
    ctx: TCtx,
    params?: PipelineParamsFromDef<TDef, TPool>[P],
  ) => { ctx: TCtx; stageOutputs: StageOutputsOf<TDef, P, TPool> } {
    const stageNames = this.pipelineDef[pipelineName]; // readonly string[]

    const mergeOutputs = (base: any, addition: any) => {
      if (addition && typeof addition === "object") {
        if (base && typeof base === "object") {
          return { ...base, ...addition };
        }
        return { ...addition };
      }
      return addition;
    };

    return (ctx: TCtx, params?: PipelineParamsFromDef<TDef, TPool>[P]) => {
      // working copy of ctx so we don't mutate caller's object unexpectedly
      const currentCtx: any = Object.assign({}, ctx);
      let prevOutput: any = params ?? {};
      const stageOutputs = {} as StageOutputsOf<TDef, P, TPool>;

      // iterate each static stage in order
      for (const stageName of stageNames) {
        const typedStageName = stageName as TDef[P][number] & string;

        // 从池中获取阶段定义
        const stageDef = this.stagePool[stageName];
        if (!stageDef) {
          throw new Error(
            `[PipelineManager] Stage "${String(stageName)}" not found in pool for pipeline "${String(pipelineName)}"`,
          );
        }
        const [inputSchema, outputSchema, staticImpl] = stageDef;

        // ---------- 输入验证 ----------
        let stageInput = prevOutput;
        if (inputSchema) {
          const inputParsed = (inputSchema as any).safeParse(prevOutput);
          if (!inputParsed.success) {
            throw new Error(`[${String(pipelineName)}.${stageName}] 输入验证失败: ${inputParsed.error.message}`);
          }
          // 使用验证后的数据作为本阶段输入
          stageInput = inputParsed.data;
        }

        // ---------- 静态实现：纯函数调用 ----------
        let stageOut: any = stageInput;

        if (staticImpl) {
          // 以纯函数签名调用 (ctx, input) => out
          try {
            stageOut = staticImpl(currentCtx, stageInput);
          } catch (e) {
            throw e;
          }
        }

        // ---------- 输出验证并合并 ----------
        if (outputSchema) {
          const outputParsed = (outputSchema as any).safeParse(stageOut);
          if (!outputParsed.success) {
            throw new Error(`[${String(pipelineName)}.${stageName}] 输出验证失败: ${outputParsed.error.message}`);
          }
          // merge parsed data into context
          Object.assign(currentCtx, outputParsed.data);
          // 累积输出给下一阶段
          prevOutput = mergeOutputs(prevOutput, outputParsed.data);
        } else {
          // no schema: if stageOut is object, merge into ctx; otherwise keep primitive as prevOutput
          if (stageOut && typeof stageOut === "object") {
            Object.assign(currentCtx, stageOut);
          }
          prevOutput = mergeOutputs(prevOutput, stageOut);
        }

        // ---------- 保存阶段输出（类型断言为 StageOutputsOf） ----------
        // TS 需要断言键类型，因为 stageName 是运行时字符串
        (stageOutputs as any)[typedStageName] = prevOutput;

        // ---------- 执行该静态阶段之后注册的动态 handlers ----------
        const dynEntries = this.dynamicStages[pipelineName]?.[typedStageName] ?? [];
        for (const entry of dynEntries) {
          const dynOut = (entry.handler as any)(currentCtx, prevOutput);
          if (!dynOut) continue;
          if (typeof dynOut === "object") {
            Object.assign(currentCtx, dynOut);
          }
          prevOutput = mergeOutputs(prevOutput, dynOut);
          // 同样把动态阶段的结果视为该阶段最终输出（覆盖）
          (stageOutputs as any)[typedStageName] = prevOutput;
        }
      } // end for stages

      // 返回最终 context 与每个阶段输出
      return { ctx: currentCtx as TCtx, stageOutputs };
    };
  }

  /**
   * 获取当前动态阶段的快照，可用于调试和 UI 展示
   */
  getDynamicStageInfos(filter?: { source?: string; pipelineName?: string; stageName?: string }): PipelineDynamicStageInfo[] {
    const result: PipelineDynamicStageInfo[] = [];
    for (const pipelineName of Object.keys(this.dynamicStages)) {
      const stages = this.dynamicStages[pipelineName as keyof TDef];
      if (!stages) continue;
      if (filter?.pipelineName && filter.pipelineName !== pipelineName) continue;

      for (const stageName of Object.keys(stages)) {
        if (filter?.stageName && filter.stageName !== stageName) continue;
        const entries = (stages as Record<string, DynamicStageEntry<any, any, any, any, any>[] | undefined>)[stageName];
        if (!entries) continue;

        for (const entry of entries as DynamicStageEntry<any, any, any, any, any>[]) {
          if (filter?.source && filter.source !== entry.source) continue;
          result.push({
            pipelineName,
            stageName,
            id: entry.id,
            source: entry.source,
            priority: entry.priority,
          });
        }
      }
    }

    return result.sort((a, b) => {
      if (a.pipelineName !== b.pipelineName) return a.pipelineName.localeCompare(b.pipelineName);
      if (a.stageName !== b.stageName) return a.stageName.localeCompare(b.stageName);
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.id.localeCompare(b.id);
    });
  }

  /* ---------------------- run ---------------------- */
  /**
   * 对外同步执行入口（使用缓存的已编译闭包）
   * 返回：{ ctx, stageOutputs }，其中 stageOutputs 类型由 StageOutputsOf 推导
   */
  run<P extends keyof TDef>(
    pipelineName: P,
    ctx: TCtx,
    params?: PipelineParamsFromDef<TDef, TPool>[P],
  ): { ctx: TCtx; stageOutputs: StageOutputsOf<TDef, P, TPool> } {
    // ensure compiled chain exists for pipeline
    if (!this.compiledChains[pipelineName]) {
      this.compiledChains[pipelineName] = this.compile(pipelineName);
    }
    return this.compiledChains[pipelineName](ctx, params);
  }
}
