/**
 * 管线管理器（运行时）
 * - 管线定义（Pipeline）来自运行时 JSON/数据库。
 * - 管理粒度在管线编排上（插入/覆盖），执行粒度在阶段上。
 */

import { ZodType } from "zod/v4";
import { PipelineDef, StagePool } from "./type";

export interface PipelineDynamicStageInfo {
  pipelineName: string;
  /** 插入点（在哪个 stage 之后插入） */
  afterStageName: string;
  /** 被插入的 stage 名称 */
  insertStageName: string;
  id: string;
  source: string;
  priority: number;
  insertedAt: number;
}

interface DynamicStageEntry<TPool extends StagePool<any>> {
  id: string;
  source: string;
  priority: number;
  /** 插入的 stage 名称（必须在 stagePool 中存在） */
  insertStageName: keyof TPool ;
  /** 可选：执行该 stage 前额外合并到输入的 params（纯数据） */
  params?: Record<string, unknown>;
  /** 插入时间戳序号（用于按时间顺序执行） */
  insertedAt: number;
}

/**
 * 管线管理器（Pipeline 执行器）
 *
 * @template TPool 阶段池
 * @template TCtx  上下文类型
 */
export class PipelineManager<
  TPool extends StagePool<TCtx> = StagePool<any>,
  TCtx extends Record<string, any> = Record<string, any>,
> {
  /**
   * PipelineDef（管线编排定义）
   * - 不再使用代码常量固定注入
   * - 由技能效果 JSON 在初始化/挂载时动态注册
   */
  public readonly pipelineDef: PipelineDef<TPool> = {};

  /** 按作用域的管线覆盖：member、skill */
  private memberOverrides?: PipelineDef<TPool>;
  private skillOverrides?: PipelineDef<TPool>;

  /**
   * 动态管线补丁（仅存 stageName + params，不存 handler）
   * - actionGroupName -> afterStageName -> entries
   */
  private dynamicStages: Record<string, Record<keyof TPool, DynamicStageEntry<TPool>[]>> = {};
  private insertedSeq = 0;

  /** 缓存已编译的执行链：actionGroup -> compiled chain */
  private compiledChains: Record<
    string,
    (ctx: TCtx, params?: Record<string, any>) => { ctx: TCtx; actionOutputs: Record<string, any> }
  > = {};

  constructor(
    /** 动作池：包含具体的实现 */
    public readonly actionPool: TPool,
  ) {}

  /**
   * 动态注册管线，返回清理函数
   */
  registerActionGroups(custom: { name: string; actions: string[] }[]): () => void {
    const added: string[] = [];
    for (const cp of custom ?? []) {
      if (!cp?.name || !Array.isArray(cp.actions)) continue;
      (this.pipelineDef as any)[cp.name] = cp.actions;
      delete this.compiledChains[String(cp.name)];
      added.push(cp.name);
    }
    return () => {
      for (const name of added) {
        delete this.pipelineDef[name];
      }
      this.compiledChains = {};
    };
  }

  /**
   * 注册/覆盖管线定义（来自技能效果 JSON）
   * - 同名 pipeline 会被覆盖
   */
  registerPipelines(def: Record<string, readonly (keyof TPool )[]>): () => void {
    const added: string[] = [];
    for (const [name, stages] of Object.entries(def ?? {})) {
      if (!name || !Array.isArray(stages)) continue;
      this.pipelineDef[name] = stages;
      added.push(name);
    }
    this.compiledChains = {};
    return () => {
      for (const name of added) delete this.pipelineDef[name];
      this.compiledChains = {};
    };
  }

  /**
   * 设置角色级覆盖（作用于当前 PipelineManager 实例）
   */
  setMemberOverrides(overrides?: PipelineDef<TPool>) {
    this.memberOverrides = overrides;
    this.compiledChains = {};
  }

  /**
   * 设置技能级覆盖（一次技能作用域，优先级最高）
   */
  setSkillOverrides(overrides?: PipelineDef<TPool>) {
    this.skillOverrides = overrides;
    this.compiledChains = {};
  }

  /**
   * 清除角色级覆盖
   */
  clearMemberOverrides() {
    this.memberOverrides = undefined;
    this.compiledChains = {};
  }

  /**
   * 清除技能级覆盖
   */
  clearSkillOverrides() {
    this.skillOverrides = undefined;
    this.compiledChains = {};
  }

  /**
   * 插入动态阶段（按时间顺序生效）
   * - 仅存 insertStageName 与 params，不存 handler
   */
  insertPipelineStage(
    actionGroupName: string,
    afterStageName: keyof TPool ,
    insertStageName: keyof TPool ,
    id: string,
    source: string,
    params?: Record<string, unknown>,
    priority = 0,
  ): () => void {
    const map = (this.dynamicStages[actionGroupName] ??= ({} as Record<keyof TPool, DynamicStageEntry<TPool>[]>)) ;
    const list = (map[afterStageName] ??= []);

    // 如果已存在相同ID，先移除
    const existingIndex = list.findIndex((e) => e.id === id);
    if (existingIndex !== -1) {
      list.splice(existingIndex, 1);
    }

    const entry: DynamicStageEntry<TPool> = {
      id,
      source,
      priority,
      insertStageName,
      params,
      insertedAt: ++this.insertedSeq,
    };
    // 规则：按时间顺序（insertedAt）执行；priority 仅保留作调试字段
    list.push(entry);

    // 动态阶段变动时清空缓存
    this.compiledChains = {};

    // 返回清理函数
    return () => {
      const index = list.indexOf(entry);
      if (index !== -1) {
        list.splice(index, 1);
        // 清空缓存以应用移除
        this.compiledChains = {};
      }
    };
  }

  /**
   * 根据来源移除所有动态阶段
   * @param source 来源标识
   */
  removeStagesBySource(source: string): void {
    let changed = false;
    for (const actionGroupName of Object.keys(this.dynamicStages)) {
      const actionGroup = this.dynamicStages[actionGroupName];
      if (!actionGroup) continue;

      for (const actionName of Object.keys(actionGroup)) {
        const list = actionGroup[actionName];
        if (!list) continue;
        const initialLength = list.length;
        const filteredList = list.filter((entry) => entry.source !== source);

        if (filteredList.length !== initialLength) {
          actionGroup[actionName as keyof TPool] = filteredList;
          changed = true;
        }
      }
    }

    if (changed) {
      this.compiledChains = {}; // 清空所有缓存，简单粗暴
    }
  }

  /**
   * 合并输出
   * @param base 基础输出
   * @param addition 添加输出
   * @returns 合并后的输出
   */
  private mergeOutputs(base: any, addition: any) {
    if (addition && typeof addition === "object") {
      if (base && typeof base === "object") {
        return { ...base, ...addition };
      }
      return { ...addition };
    }
    return addition;
  }

  /**
   * 根据ID移除动态阶段
   * @param id 动态阶段唯一标识
   */
  removeStageById(id: string): void {
    let changed = false;
    for (const actionGroupName of Object.keys(this.dynamicStages)) {
      const actions = this.dynamicStages[actionGroupName];
      if (!actions) continue;

      for (const actionName of Object.keys(actions)) {
        const list = actions[actionName];
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
      this.compiledChains = {};
    }
  }

  /** 内部：计算某条管线的最终 stage 列表（含动态插入） */
  private resolveEffectiveStages(
    actionGroupName: string,
    baseStages: readonly (keyof TPool )[],
  ): readonly (keyof TPool )[] {
    const dyn = this.dynamicStages[actionGroupName];
    if (!dyn) return baseStages;
    const out: (keyof TPool )[] = [];
    for (const stageName of baseStages) {
      out.push(stageName);
      const entries = dyn[stageName] ?? [];
      // 按插入时间顺序
      entries.sort((a, b) => a.insertedAt - b.insertedAt);
      for (const entry of entries) {
        out.push(entry.insertStageName as keyof TPool );
      }
    }
    return out;
  }

  /* ---------------------- compile ---------------------- */
  /**
   * 编译某个动作组的同步执行链
   *
   * 支持输入输出双重验证：
   * - 调用静态实现前：验证 prevOutput 是否符合该阶段的 inputSchema
   * - 调用静态实现后：验证 stageOut 是否符合该阶段的 outputSchema
   *
   * 返回值类型： (ctx, params?) => { ctx: TCtx, actionOutputs: Record<string, any> }
   */
  private compile(
    actionGroupName: string,
    actionNames: readonly (keyof TPool )[],
  ): (ctx: TCtx, params?: Record<string, any>) => { ctx: TCtx; actionOutputs: Record<string, any> } {
    return (ctx: TCtx, params?: Record<string, any>) => {
      // working copy of ctx so we don't mutate caller's object unexpectedly
      const currentCtx: any = Object.assign({}, ctx);
      const initialParams = params ?? {};
      Object.assign(currentCtx, initialParams);
      let prevOutput: any = initialParams;
      const actionOutputs: Record<string, any> = {};

      // iterate each stage in order (after dynamic insertion resolved)
      for (const actionName of actionNames) {
        const typedStageName = actionName as string;

        // 从池中获取阶段定义
        const stageDef = this.actionPool[actionName];
        if (!stageDef) {
          throw new Error(
            `[PipelineManager] Stage "${String(actionName)}" not found in pool for pipeline "${String(actionGroupName)}"`,
          );
        }
        const [inputSchema, outputSchema, staticImpl] = stageDef as unknown as [
          ZodType<any>,
          ZodType<any>,
          (ctx: TCtx, input: any) => any,
        ];

        // ---------- 输入（动态插入 stage 可带 params 合并） ----------
        let stageInput = prevOutput;
        const dynEntries = this.dynamicStages[actionGroupName]?.[typedStageName] ?? [];
        // 如果本 stage 是“插入进来的 stage”，可能需要合并 params。
        // 由于本实现只存 insertStageName，不存来源映射，这里采用简化策略：
        // - 若存在同名 insertStageName 的动态条目，则使用“最后一次插入”的 params 合并
        // （后续若需要更精确，可在 resolveEffectiveStages 生成带 meta 的执行列表）
        const dynParams = dynEntries.length > 0 ? dynEntries[dynEntries.length - 1]?.params : undefined;
        if (dynParams && stageInput && typeof stageInput === "object") {
          stageInput = { ...stageInput, ...dynParams };
        } else if (dynParams && (!stageInput || typeof stageInput !== "object")) {
          stageInput = { ...dynParams };
        }

        if (inputSchema) {
          const inputParsed = inputSchema.safeParse(prevOutput);
          if (!inputParsed.success) {
            throw new Error(`[${String(actionGroupName)}.${String(actionName)}] 输入验证失败: ${inputParsed.error.message}`);
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
          const outputParsed = outputSchema.safeParse(stageOut);
          if (!outputParsed.success) {
            throw new Error(`[${String(actionGroupName)}.${String(actionName)}] 输出验证失败: ${outputParsed.error.message}`);
          }
          // merge parsed data into context
          Object.assign(currentCtx, outputParsed.data);
          // 累积输出给下一阶段
          prevOutput = this.mergeOutputs(prevOutput, outputParsed.data);
        } else {
          // no schema: if stageOut is object, merge into ctx; otherwise keep primitive as prevOutput
          if (stageOut && typeof stageOut === "object") {
            Object.assign(currentCtx, stageOut);
          }
          prevOutput = this.mergeOutputs(prevOutput, stageOut);
        }

        // ---------- 保存动作输出 ----------
        // TS 需要断言键类型，因为 actionName 是运行时字符串
        actionOutputs[typedStageName] = prevOutput;
      } // end for stages

      // 返回最终 context 与每个阶段输出
      return { ctx: currentCtx as TCtx, actionOutputs };
    };
  }

  /**
   * 获取当前动态阶段的快照，可用于调试和 UI 展示
   */
  getDynamicStageInfos(filter?: {
    source?: string;
    pipelineName?: string;
    afterStageName?: string;
  }): PipelineDynamicStageInfo[] {
    const result: PipelineDynamicStageInfo[] = [];
    for (const pipelineName of Object.keys(this.dynamicStages)) {
      const stages = this.dynamicStages[pipelineName];
      if (!stages) continue;
      const filterGroup = filter?.pipelineName;
      if (filterGroup && filterGroup !== pipelineName) continue;

      for (const actionName of Object.keys(stages)) {
        const filterAction = filter?.afterStageName;
        if (filterAction && filterAction !== actionName) continue;
        const entries = stages[actionName];
        if (!entries) continue;

        for (const entry of entries) {
          if (filter?.source && filter.source !== entry.source) continue;
          result.push({
            pipelineName,
            afterStageName: actionName,
            insertStageName: String(entry.insertStageName),
            id: entry.id,
            source: entry.source,
            priority: entry.priority,
            insertedAt: entry.insertedAt,
          });
        }
      }
    }

    return result.sort((a, b) => {
      if (a.pipelineName !== b.pipelineName) return a.pipelineName.localeCompare(b.pipelineName);
      if (a.afterStageName !== b.afterStageName) return a.afterStageName.localeCompare(b.afterStageName);
      return a.insertedAt - b.insertedAt;
    });
  }

  /* ---------------------- run ---------------------- */
  /**
   * 对外同步执行入口（使用缓存的已编译闭包）
   * 返回：{ ctx, actionOutputs }，actionOutputs 为各动作最终输出
   */
  run(
    pipelineName: string,
    ctx: TCtx,
    params?: Record<string, any>,
  ): { ctx: TCtx; actionOutputs: Record<string, any> } {
    // 按优先级解析管线定义：skill > member > global
    const stageNames =
      (this.skillOverrides?.[pipelineName] as unknown as readonly string[] | undefined) ??
      (this.memberOverrides?.[pipelineName] as unknown as readonly string[] | undefined) ??
      this.pipelineDef[pipelineName];

    if (!stageNames) {
      throw new Error(`[PipelineManager] 找不到管线定义: ${String(pipelineName)}`);
    }

    const effectiveStages = this.resolveEffectiveStages(pipelineName, stageNames as any);
    const cacheKey = `${String(pipelineName)}::${effectiveStages.join("|")}`;
    if (!this.compiledChains[cacheKey]) {
      this.compiledChains[cacheKey] = this.compile(pipelineName, effectiveStages as any);
    }

    const result = this.compiledChains[cacheKey](ctx, params);
    return result as { ctx: TCtx; actionOutputs: Record<string, any> };
  }
}
