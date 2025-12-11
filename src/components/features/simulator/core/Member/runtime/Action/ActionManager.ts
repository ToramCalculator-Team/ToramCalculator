/**
 * 动作管理器（运行时）
 *
 * 现在的事实前提：
 * - 动作组定义（ActionGroup）来自运行时 JSON/数据库，不再是编译期常量。
 * - 仍然希望保留：动作池的静态类型安全 + 运行时 Zod 校验。
 * - 管理粒度在动作组上（插入/覆盖），执行粒度在动作上。
 */

import { ZodType } from "zod/v4";
import { ActionGroupDef, ActionPool } from "./type";

/** 动态动作条目（插入在某个动作之后） */
interface DynamicActionEntry<TCtx> {
  id: string;
  source: string;
  priority: number;
  actionName: string;
  handler: (ctx: TCtx, input: any) => any;
}

export interface ActionDynamicStageInfo {
  actionGroupName: string;
  actionName: string;
  id: string;
  source: string;
  priority: number;
}

/**
 * 动作管理器（ActionGroup 执行器）
 *
 * @template TDef  动作组定义（运行时）
 * @template TPool 动作池
 * @template TCtx  上下文类型
 */
export class ActionManager<
  TDef extends ActionGroupDef = ActionGroupDef,
  TPool extends ActionPool<TCtx> = ActionPool<any>,
  TCtx extends Record<string, any> = Record<string, any>,
> {
  /** 按作用域的管线覆盖：member、skill */
  private memberOverrides?: Partial<TDef>;
  private skillOverrides?: Partial<TDef>;

  /** 动态动作存储：actionGroup -> actionName -> entries */
  private dynamicActions: Record<string, Record<string, DynamicActionEntry<TCtx>[]>> = {};

  /** 缓存已编译的执行链：actionGroup -> compiled chain */
  private compiledChains: Record<
    string,
    (ctx: TCtx, params?: Record<string, any>) => { ctx: TCtx; stageOutputs: Record<string, any> }
  > = {};

  constructor(
    /** 动作组定义：每个动作组名称对应静态动作名数组（来自运行时 JSON） */
    public readonly actionGroupDef: TDef,
    /** 动作池：包含具体的实现 */
    public readonly actionPool: TPool,
  ) {}

  /**
   * 动态注册自定义动作组，返回清理函数
   */
  registerActionGroups(custom: { name: string; actions: string[] }[]): () => void {
    const added: string[] = [];
    for (const cp of custom ?? []) {
      if (!cp?.name || !Array.isArray(cp.actions)) continue;
      (this.actionGroupDef as any)[cp.name] = cp.actions ;
      delete this.compiledChains[String(cp.name)];
      added.push(cp.name);
    }
    return () => {
      for (const name of added) {
        delete (this.actionGroupDef )[name];
      }
      this.compiledChains = {};
    };
  }

  /**
   * 兼容旧命名：registerPipelines -> registerActionGroups
   */
  registerPipelines(custom: { name: string; stages: string[] }[]): () => void {
    const mapped = (custom ?? []).map((c) => ({ name: c.name, actions: c.stages }));
    return this.registerActionGroups(mapped);
  }

  /**
   * 设置角色级覆盖（作用于当前 PipelineManager 实例）
   */
  setMemberOverrides(overrides?: Partial<TDef>) {
    this.memberOverrides = overrides;
    this.compiledChains = {};
  }

  /**
   * 设置技能级覆盖（一次技能作用域，优先级最高）
   */
  setSkillOverrides(overrides?: Partial<TDef>) {
    this.skillOverrides = overrides;
    this.compiledChains = {};
  }

  clearSkillOverrides() {
    this.skillOverrides = undefined;
    this.compiledChains = {};
  }

  /**
   * 插入动态动作
   * @param actionGroupName 动作组名称
   * @param afterActionName 插入到哪个静态动作之后
   * @param handler 动态 handler 函数
   * @param id 唯一标识
   * @param source 来源标识
   * @returns 清理函数
   */
  insertDynamicStage(
    actionGroupName: string,
    afterActionName: string,
    handler: (ctx: TCtx, input: any) => any,
    id: string,
    source: string,
    priority = 0,
  ): () => void {
    const map = (this.dynamicActions[actionGroupName] ??= {});
    const list = (map[afterActionName] ??= []) as DynamicActionEntry<TCtx>[];

    // 如果已存在相同ID，先移除
    const existingIndex = list.findIndex((e) => e.id === id);
    if (existingIndex !== -1) {
      list.splice(existingIndex, 1);
    }

    const entry: DynamicActionEntry<TCtx> = {
      id,
      source,
      handler,
      actionName: afterActionName,
      priority,
    };
    const insertIndex = list.findIndex((item) => priority < item.priority);
    if (insertIndex === -1) {
      list.push(entry);
    } else {
      list.splice(insertIndex, 0, entry);
    }

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
    for (const actionGroupName of Object.keys(this.dynamicActions)) {
      const actions = this.dynamicActions[actionGroupName];
      if (!actions) continue;

      for (const actionName of Object.keys(actions)) {
        const list = actions[actionName];
        if (!list) continue;

        const initialLength = list.length;
        // 过滤掉匹配 source 的条目
        const filteredList = list.filter((entry) => entry.source !== source);

        if (filteredList.length !== initialLength) {
          actions[actionName] = filteredList;
          changed = true;
        }
      }
    }

    if (changed) {
      this.compiledChains = {} ; // 清空所有缓存，简单粗暴
    }
  }

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
    for (const actionGroupName of Object.keys(this.dynamicActions)) {
      const actions = this.dynamicActions[actionGroupName];
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
      this.compiledChains = {} ;
    }
  }

  /** 获取某动作组某静态动作之后的动态 handler 列表 */
  getDynamicHandlersForStage(actionGroupName: string, actionName: string) {
    const entries = (this.dynamicActions[actionGroupName]?.[actionName] ?? []) as DynamicActionEntry<TCtx>[];
    return entries.map((e) => e.handler);
  }

  /* ---------------------- compile ---------------------- */
  /**
   * 编译某个动作组的同步执行链
   *
   * 支持输入输出双重验证：
   * - 调用静态实现前：验证 prevOutput 是否符合该阶段的 inputSchema
   * - 调用静态实现后：验证 stageOut 是否符合该阶段的 outputSchema
   *
   * 返回值类型： (ctx, params?) => { ctx: TCtx, stageOutputs: Record<string, any> }
   */
  private compile(
    actionGroupName: string,
    actionNames: readonly string[],
  ): (ctx: TCtx, params?: Record<string, any>) => { ctx: TCtx; stageOutputs: Record<string, any> } {
    return (ctx: TCtx, params?: Record<string, any>) => {
      // working copy of ctx so we don't mutate caller's object unexpectedly
      const currentCtx: any = Object.assign({}, ctx);
      const initialParams = params ?? {};
      Object.assign(currentCtx, initialParams);
      let prevOutput: any = initialParams;
      const stageOutputs: Record<string, any> = {};

      // iterate each static action in order
      for (const actionName of actionNames) {
        const typedStageName = actionName as string;

        // 从池中获取阶段定义
        const stageDef = this.actionPool[actionName];
        if (!stageDef) {
          throw new Error(
            `[ActionManager] Action "${String(actionName)}" not found in pool for actionGroup "${String(actionGroupName)}"`,
          );
        }
        const [inputSchema, outputSchema, staticImpl] = stageDef as unknown as [ZodType<any>, ZodType<any>, (ctx: TCtx, input: any) => any];

        // ---------- 输入验证 ----------
        let stageInput = prevOutput;
        if (inputSchema) {
          const inputParsed = (inputSchema ).safeParse(prevOutput);
          if (!inputParsed.success) {
            throw new Error(`[${String(actionGroupName)}.${actionName}] 输入验证失败: ${inputParsed.error.message}`);
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
          const outputParsed = (outputSchema ).safeParse(stageOut);
          if (!outputParsed.success) {
            throw new Error(`[${String(actionGroupName)}.${actionName}] 输出验证失败: ${outputParsed.error.message}`);
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
        // TS 需要断言键类型，因为 stageName 是运行时字符串
        (stageOutputs )[typedStageName] = prevOutput;

        // ---------- 执行该静态阶段之后注册的动态 handlers ----------
        const dynEntries = this.dynamicActions[actionGroupName]?.[typedStageName] ?? [];
        for (const entry of dynEntries) {
          const dynOut = (entry.handler )(currentCtx, prevOutput);
          if (!dynOut) continue;
          if (typeof dynOut === "object") {
            Object.assign(currentCtx, dynOut);
          }
          prevOutput = this.mergeOutputs(prevOutput, dynOut);
          // 同样把动态阶段的结果视为该阶段最终输出（覆盖）
          (stageOutputs )[typedStageName] = prevOutput;
        }
      } // end for stages

      // 返回最终 context 与每个阶段输出
      return { ctx: currentCtx as TCtx, stageOutputs };
    };
  }

  /**
   * 获取当前动态阶段的快照，可用于调试和 UI 展示
   */
  getDynamicStageInfos(filter?: {
    source?: string;
    actionGroupName?: string;
    actionName?: string;
    /** 兼容旧命名 */
    pipelineName?: string;
    stageName?: string;
  }): ActionDynamicStageInfo[] {
    const result: ActionDynamicStageInfo[] = [];
    for (const actionGroupName of Object.keys(this.dynamicActions)) {
      const stages = this.dynamicActions[actionGroupName];
      if (!stages) continue;
      const filterGroup = filter?.actionGroupName ?? filter?.pipelineName;
      if (filterGroup && filterGroup !== actionGroupName) continue;

      for (const actionName of Object.keys(stages)) {
        const filterAction = filter?.actionName ?? filter?.stageName;
        if (filterAction && filterAction !== actionName) continue;
        const entries = stages[actionName];
        if (!entries) continue;

        for (const entry of entries) {
          if (filter?.source && filter.source !== entry.source) continue;
          result.push({
            actionGroupName,
            actionName,
            id: entry.id,
            source: entry.source,
            priority: entry.priority,
          });
        }
      }
    }

    return result.sort((a, b) => {
      if (a.actionGroupName !== b.actionGroupName) return a.actionGroupName.localeCompare(b.actionGroupName);
      if (a.actionName !== b.actionName) return a.actionName.localeCompare(b.actionName);
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.id.localeCompare(b.id);
    });
  }

  /* ---------------------- run ---------------------- */
  /**
   * 对外同步执行入口（使用缓存的已编译闭包）
   * 返回：{ ctx, stageOutputs }，stageOutputs 为各动作最终输出
   */
  run(actionGroupName: string, ctx: TCtx, params?: Record<string, any>): { ctx: TCtx; stageOutputs: Record<string, any> } {
    // 按优先级解析管线定义：skill > member > global
    const stageNames =
      (this.skillOverrides?.[actionGroupName] as unknown as readonly string[] | undefined) ??
      (this.memberOverrides?.[actionGroupName] as unknown as readonly string[] | undefined) ??
      this.actionGroupDef[actionGroupName];

    if (!stageNames) {
      throw new Error(`[ActionManager] 找不到动作组定义: ${String(actionGroupName)}`);
    }

    const cacheKey = `${String(actionGroupName)}::${stageNames.join("|")}`;
    if (!this.compiledChains[cacheKey]) {
      this.compiledChains[cacheKey] = this.compile(actionGroupName, stageNames) ;
    }

    const result = this.compiledChains[cacheKey](ctx , params) ;
    return result as { ctx: TCtx; stageOutputs: Record<string, any> };
  }
}

// 兼容旧导出名
export type PipelineDynamicStageInfo = ActionDynamicStageInfo;
export const PipelineManager = ActionManager;
