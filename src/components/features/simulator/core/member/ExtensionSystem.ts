import { ActorRef } from "xstate";

/**
 * 从状态机定义中提取 Action 类型的工具类型
 * 这允许我们从状态机的 setup() 配置中自动推导所有可扩展的点
 */
export type ExtractActionNames<T> = T extends { actions: infer A }
  ? A extends Record<infer K, any>
    ? K extends string
      ? K
      : never
    : never
  : never;

export type ExtractGuardNames<T> = T extends { guards: infer G }
  ? G extends Record<infer K, any>
    ? K extends string
      ? K
      : never
    : never
  : never;

/**
 * 扩展函数的通用签名
 * @template TContext 状态机上下文类型
 * @template TEvent 事件类型
 * @template TOutput 基础逻辑的输出类型
 */
export type ExtensionFunction<TContext = any, TEvent = any, TOutput = any> = (
  /** 基础逻辑的输出结果 */
  output: TOutput,
  /** 状态机上下文 */
  context: TContext,
  /** 触发事件 */
  event: TEvent,
) => TOutput;

/**
 * 扩展注册表的接口定义
 * 键名从状态机定义中自动推导
 */
export interface ExtensionRegistry<TActionNames extends string, TGuardNames extends string> {
  /** Action 扩展函数映射 */
  actions: Record<TActionNames, ExtensionFunction[]>;
  /** Guard 扩展函数映射 */
  guards: Record<TGuardNames, ExtensionFunction[]>;
}

/**
 * 扩展系统管理器
 * 自动从状态机类型定义中推导可扩展的 Action 和 Guard 名称
 */
export class TypeSafeExtensionSystem<
  TMachineConfig,
  TActionNames extends string = ExtractActionNames<TMachineConfig>,
  TGuardNames extends string = ExtractGuardNames<TMachineConfig>,
> {
  private registry: ExtensionRegistry<TActionNames, TGuardNames>;

  constructor() {
    this.registry = {
      actions: {} as Record<TActionNames, ExtensionFunction[]>,
      guards: {} as Record<TGuardNames, ExtensionFunction[]>,
    };
  }

  /**
   * 为指定的 Action 添加扩展函数
   * @param actionName Action 名称（类型安全，必须是状态机中定义的 Action）
   * @param extension 扩展函数
   */
  addActionExtension(actionName: TActionNames, extension: ExtensionFunction): void {
    if (!this.registry.actions[actionName]) {
      this.registry.actions[actionName] = [];
    }
    this.registry.actions[actionName].push(extension);
    console.log(`[ExtensionSystem] 为 Action "${actionName}" 添加扩展函数`);
  }

  /**
   * 为指定的 Guard 添加扩展函数
   * @param guardName Guard 名称（类型安全，必须是状态机中定义的 Guard）
   * @param extension 扩展函数
   */
  addGuardExtension(guardName: TGuardNames, extension: ExtensionFunction): void {
    if (!this.registry.guards[guardName]) {
      this.registry.guards[guardName] = [];
    }
    this.registry.guards[guardName].push(extension);
    console.log(`[ExtensionSystem] 为 Guard "${guardName}" 添加扩展函数`);
  }

  /**
   * 执行 Action 的所有扩展函数
   * @param actionName Action 名称
   * @param baseOutput 基础逻辑的输出
   * @param context 状态机上下文
   * @param event 触发事件
   * @returns 经过所有扩展函数处理后的最终输出
   */
  runActionExtensions<TOutput>(
    actionName: TActionNames,
    baseOutput: TOutput,
    context: any,
    event: any,
  ): TOutput {
    const extensions = this.registry.actions[actionName] || [];
    return extensions.reduce(
      (acc, extension) => extension(acc, context, event),
      baseOutput,
    );
  }

  /**
   * 执行 Guard 的所有扩展函数
   * @param guardName Guard 名称
   * @param baseResult 基础逻辑的结果
   * @param context 状态机上下文
   * @param event 触发事件
   * @returns 经过所有扩展函数处理后的最终结果
   */
  runGuardExtensions<TOutput>(
    guardName: TGuardNames,
    baseResult: TOutput,
    context: any,
    event: any,
  ): TOutput {
    const extensions = this.registry.guards[guardName] || [];
    return extensions.reduce(
      (acc, extension) => extension(acc, context, event),
      baseResult,
    );
  }

  /**
   * 获取指定 Action 的扩展函数列表
   */
  getActionExtensions(actionName: TActionNames): ExtensionFunction[] {
    return this.registry.actions[actionName] || [];
  }

  /**
   * 获取指定 Guard 的扩展函数列表
   */
  getGuardExtensions(guardName: TGuardNames): ExtensionFunction[] {
    return this.registry.guards[guardName] || [];
  }

  /**
   * 移除指定 Action 的所有扩展函数
   */
  clearActionExtensions(actionName: TActionNames): void {
    this.registry.actions[actionName] = [];
    console.log(`[ExtensionSystem] 清空 Action "${actionName}" 的所有扩展函数`);
  }

  /**
   * 移除指定 Guard 的所有扩展函数
   */
  clearGuardExtensions(guardName: TGuardNames): void {
    this.registry.guards[guardName] = [];
    console.log(`[ExtensionSystem] 清空 Guard "${guardName}" 的所有扩展函数`);
  }

  /**
   * 获取所有可扩展的 Action 名称（编译时确定）
   */
  getAvailableActionNames(): TActionNames[] {
    return Object.keys(this.registry.actions) as TActionNames[];
  }

  /**
   * 获取所有可扩展的 Guard 名称（编译时确定）
   */
  getAvailableGuardNames(): TGuardNames[] {
    return Object.keys(this.registry.guards) as TGuardNames[];
  }
}

/**
 * 扩展包装器函数，用于包装原始的 Action/Guard 函数
 * 使其支持扩展系统
 */
export function withExtensions<TContext, TEvent, TOutput, TActionNames extends string>(
  extensionSystem: TypeSafeExtensionSystem<any, TActionNames, any>,
  actionOrGuardName: TActionNames,
  originalFunction: (context: TContext, event: TEvent) => TOutput,
): (context: TContext, event: TEvent) => TOutput {
  return (context: TContext, event: TEvent): TOutput => {
    // 执行原始逻辑
    const baseResult = originalFunction(context, event);

    // 执行扩展函数
    const finalResult = extensionSystem.runActionExtensions(
      actionOrGuardName,
      baseResult,
      context,
      event,
    );

    return finalResult;
  };
}
