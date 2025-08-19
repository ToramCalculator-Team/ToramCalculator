/**
 * 游戏引擎 - 核心运行时容器
 *
 * 核心职责（根据架构文档）：
 * 1. 作为核心运行时容器，集成所有模块
 * 2. 协调memberManager、MessageRouter、FrameLoop、EventQueue等模块
 * 3. 提供统一的引擎接口
 * 4. 管理引擎生命周期
 *
 * 设计理念：
 * - 容器模式：引擎是容器，不直接处理业务逻辑
 * - 模块集成：协调各个模块的协作
 * - 统一接口：提供简洁的引擎API
 * - 生命周期管理：管理引擎的启动、运行、停止
 */

import type { Team } from "@db/repositories/team";
import type { MemberWithRelations } from "@db/repositories/member";
import { MemberManager } from "./MemberManager";
import { MessageRouter } from "./MessageRouter";
import { FrameLoop, FrameLoopConfig, PerformanceStats } from "./FrameLoop";
import { EventQueue } from "./EventQueue";
import { EventHandlerFactory } from "../handlers/EventHandlerFactory";
import type { IntentMessage, MessageProcessResult, MessageRouterStats } from "./thread/messages";
import type { EventPriority, EventHandler, BaseEvent, QueueStats, EventQueueConfig } from "./EventQueue";
import { type MemberSerializeData } from "./member/Member";
import { JSExpressionProcessor, type CompilationContext } from "./expression/JSExpressionProcessor";

// ============================== 类型定义 ==============================

/**
 * 表达式计算上下文
 */
export interface ExpressionContext {
  /** 当前帧号 */
  currentFrame: number;
  /** 施法者属性 */
  casterId: string;
  /** 目标属性 */
  targetId?: string;
  /** 技能数据 */
  skillLv: number;
  /** 环境变量 */
  environment?: any;
  /** 自定义变量 */
  [key: string]: any;
}

/**
 * 引擎状态枚举
 */
export type EngineState =
  | "initialized" // 已初始化
  | "running"     // 运行中
  | "paused"      // 已暂停
  | "stopped";    // 已停止

/**
 * 引擎配置接口
 */
export interface EngineConfig {
  /** 是否启用实时控制 */
  enableRealtimeControl: boolean;
  /** 事件队列配置 */
  eventQueueConfig: Partial<EventQueueConfig>;
  /** 帧循环配置 */
  frameLoopConfig: Partial<FrameLoopConfig>;
}

/**
 * 引擎统计信息接口
 */
export interface EngineStats {
  /** 引擎状态 */
  state: EngineState;
  /** 当前帧号 */
  currentFrame: number;
  /** 运行时间（毫秒） */
  runTime: number;
  /** 成员 */
  members: MemberSerializeData[];
  /** 事件队列统计 */
  eventQueueStats: QueueStats;
  /** 帧循环统计 */
  frameLoopStats: PerformanceStats;
  /** 消息路由统计 */
  messageRouterStats: MessageRouterStats;
}

/**
 * 战斗快照接口
 */
export interface BattleSnapshot {
  /** 快照时间戳 */
  timestamp: number;
  /** 帧号 */
  frameNumber: number;
  /** 所有成员状态 */
  members: Array<MemberSerializeData>;
  /** 战斗状态 */
  battleStatus: {
    isEnded: boolean;
    winner?: string;
    reason?: string;
  };
}

// ============================== 游戏引擎类 ==============================

/**
 * 游戏引擎类
 * 核心运行时容器，集成所有模块
 */
export class GameEngine {
  // ==================== 核心模块 ====================

  /** 成员管理器 - 管理所有成员的生命周期 */
  private memberManager: MemberManager;

  /** 事件队列 - 管理时间片段事件 */
  private eventQueue: EventQueue;

  /** 消息路由器 - 分发外部指令 */
  private messageRouter: MessageRouter;

  /** 帧循环 - 推进时间和调度事件 */
  private frameLoop: FrameLoop;

  /** 事件处理器工厂 - 创建和管理事件处理器 */
  private eventHandlerFactory: EventHandlerFactory;

  // ==================== JS编译系统 ====================

  /** JS表达式处理器 - 负责编译JS代码 */
  private jsProcessor: JSExpressionProcessor;

  /** 编译缓存 - 存储编译后的JS代码 */
  private compiledScripts: Map<string, string> = new Map();

  // ==================== 事件系统 ====================

  /** 状态变化监听器列表 */
  private stateChangeListeners: Array<(event: EngineStats) => void> = [];

  // ==================== 引擎状态 ====================

  /** 引擎状态 */
  private state: EngineState = "initialized";

  /** 引擎配置 */
  private config: EngineConfig;

  /** 开始时间戳 */
  private startTime: number = 0;

  /** 快照历史 */
  private snapshots: BattleSnapshot[] = [];

  /** 统计信息 */
  private stats = {
    totalSnapshots: 0,
    totalEventsProcessed: 0,
    totalMessagesProcessed: 0,
  };

  // ==================== 静态方法 ====================

  /**
   * 为测试环境启用GameEngine（仅用于测试）
   * ⚠️ 警告：这会绕过安全检查，仅在测试中使用
   */
  static enableForTesting(): void {
    (globalThis as any).__ALLOW_GAMEENGINE_IN_MAIN_THREAD = true;
    console.warn("⚠️ GameEngine测试模式已启用 - 仅用于测试环境！");
  }

  /**
   * 禁用测试环境的GameEngine（恢复安全检查）
   */
  static disableForTesting(): void {
    delete (globalThis as any).__ALLOW_GAMEENGINE_IN_MAIN_THREAD;
    console.log("✅ GameEngine安全检查已恢复");
  }

  // ==================== 构造函数 ====================

  /**
   * 构造函数
   *
   * @param config 引擎配置
   */
  constructor(config: Partial<EngineConfig> = {}) {
    // 🛡️ 安全检查：只允许在Worker线程中创建GameEngine
    this.validateWorkerContext();

    // 设置默认配置
    this.config = {
      enableRealtimeControl: true,
      eventQueueConfig: {
        maxQueueSize: 10000,
        enablePrioritySort: true,
        enableSnapshot: true,
        snapshotRetention: 0,
        enablePerformanceMonitoring: false,
      },
      frameLoopConfig: {
        targetFPS: 60,
        enableFrameSkip: true,
        maxFrameSkip: 5,
        enablePerformanceMonitoring: true,
        timeScale: 0,
        maxEventsPerFrame: 0,
      },
      ...config,
    };

    // 初始化核心模块 - 按依赖顺序
    this.eventQueue = new EventQueue(this.config.eventQueueConfig);
    this.memberManager = new MemberManager(this); // 注入自身引用
    this.messageRouter = new MessageRouter(this); // 注入引擎
    this.frameLoop = new FrameLoop(this, this.config.frameLoopConfig); // 注入引擎
    this.eventHandlerFactory = new EventHandlerFactory(this); // 注入引擎
    this.jsProcessor = new JSExpressionProcessor(); // 初始化JS表达式处理器

    // 🔥 设置帧循环状态变化回调 - 简化为直接输出
    this.frameLoop.setStateChangeCallback((event) => {
      if (event.type === "frame_update") {
        // 直接输出引擎状态，不需要复杂的回调链
        this.outputFrameState();
      }
    });

    // 初始化默认事件处理器
    this.initializeDefaultEventHandlers();

    console.log("GameEngine: 初始化完成");
  }

  // ==================== 生命周期管理 ====================

  /**
   * 启动引擎
   */
  start(): void {
    if (this.state === "running") {
      console.warn("GameEngine: 引擎已在运行中");
      return;
    }

    this.state = "running";
    this.startTime = performance.now();
    this.snapshots = [];

    // 启动帧循环
    this.frameLoop.start();

    console.log("GameEngine: 引擎已启动");
  }

  /**
   * 停止引擎
   */
  stop(): void {
    if (this.state === "stopped") {
      console.log("GameEngine: 引擎已停止");
      return;
    }

    this.state = "stopped";

    // 停止帧循环
    this.frameLoop.stop();

    console.log("GameEngine: 引擎已停止");
  }

  /**
   * 暂停引擎
   */
  pause(): void {
    if (this.state === "paused") {
      console.warn("GameEngine: 引擎已暂停");
      return;
    }

    this.state = "paused";

    // 暂停帧循环
    this.frameLoop.pause();

    console.log("GameEngine: 引擎已暂停");
  }

  /**
   * 恢复引擎
   */
  resume(): void {
    if (this.state === "running") {
      console.warn("GameEngine: 引擎已在运行中");
      return;
    }

    this.state = "running";

    // 恢复帧循环
    this.frameLoop.resume();

    console.log("GameEngine: 引擎已恢复");
  }

  /**
   * 单步执行
   */
  step(): void {
    if (this.state === "running") {
      console.warn("GameEngine: 引擎正在运行，无法单步执行");
      return;
    }

    this.frameLoop.step();
  }

  /**
   * 清理引擎资源
   */
  cleanup(): void {
    // 停止引擎
    this.stop();

    // 清理成员注册表
    this.memberManager.clear();

    // 清理事件队列
    this.eventQueue.clear();

    // 重置统计
    this.stats = {
      totalSnapshots: 0,
      totalEventsProcessed: 0,
      totalMessagesProcessed: 0,
    };

    console.log("🧹 引擎资源已清理");
  }

  // ==================== 状态查询 ====================

  /**
   * 获取引擎状态
   *
   * @returns 当前状态
   */
  getState(): EngineState {
    return this.state;
  }

  /**
   * 检查引擎是否正在运行
   *
   * @returns 是否运行中
   */
  isRunning(): boolean {
    return this.state === "running";
  }

  /**
   * 获取引擎统计信息
   *
   * @returns 统计信息
   */
  getStats(): EngineStats {
    const runTime = performance.now() - this.startTime;

    return {
      state: this.state,
      currentFrame: this.frameLoop.getFrameNumber(),
      runTime,
      members: this.getAllMemberData(),
      eventQueueStats: this.eventQueue.getStats(),
      frameLoopStats: this.frameLoop.getPerformanceStats(),
      messageRouterStats: this.messageRouter.getStats(),
    };
  }

  // ==================== 事件系统 ====================

  /**
   * 添加状态变化监听器
   */
  onStateChange(listener: (event: EngineStats) => void): () => void {
    this.stateChangeListeners.push(listener);

    // 返回取消订阅函数
    return () => {
      const index = this.stateChangeListeners.indexOf(listener);
      if (index > -1) {
        this.stateChangeListeners.splice(index, 1);
      }
    };
  }

  /**
   * 插入事件到队列
   *
   * @param event 事件对象
   * @param priority 事件优先级
   * @returns 插入是否成功
   */
  insertEvent(event: BaseEvent, priority: EventPriority = "normal"): boolean {
    const success = this.eventQueue.insert(event, priority);
    return success;
  }

  /**
   * 注册事件处理器
   *
   * @param eventType 事件类型
   * @param handler 事件处理器
   */
  registerEventHandler(eventType: string, handler: EventHandler): void {
    this.frameLoop.registerEventHandler(eventType, handler);
  }

  // ==================== 成员管理 ====================

  /**
   * 添加阵营
   *
   * @param campId 阵营ID
   */
  addCamp(campId: string): void {
    this.memberManager.addCamp(campId);
  }

  /**
   * 添加队伍
   *
   * @param campId 阵营ID
   * @param teamData 队伍数据
   */
  addTeam(campId: string, teamData: Team): void {
    this.memberManager.addTeam(campId, teamData);
  }

  /**
   * 添加成员（委托给 memberManager）
   *
   * @param campId 阵营ID
   * @param teamId 队伍ID
   * @param memberData 成员数据
   */
  addMember(campId: string, teamId: string, memberData: MemberWithRelations): void {
    // 容器只负责委托，不处理具体创建逻辑
    const member = this.memberManager.createAndRegister(memberData, campId, teamId);
  }

  /**
   * 获取所有成员
   *
   * @returns 成员数组
   */
  getAllMembers() {
    return this.memberManager.getAllMembers();
  }

  /**
   * 查找成员
   *
   * @param memberId 成员ID
   * @returns 成员实例
   */
  findMember(memberId: string) {
    return this.memberManager.getMember(memberId);
  }

  // ==================== 消息处理 ====================

  /**
   * 处理意图消息
   *
   * @param message 意图消息
   * @returns 处理结果
   */
  async processIntent(message: IntentMessage): Promise<MessageProcessResult> {
    if (!this.config.enableRealtimeControl) {
      return {
        success: false,
        message: "实时控制已禁用",
        error: "Realtime control disabled",
      };
    }

    const result = await this.messageRouter.processMessage(message);
    this.stats.totalMessagesProcessed++;

    return result;
  }

  /**
   * 批量处理意图消息
   *
   * @param messages 消息数组
   * @returns 处理结果数组
   */
  async processIntents(messages: IntentMessage[]): Promise<MessageProcessResult[]> {
    if (!this.config.enableRealtimeControl) {
      return messages.map(() => ({
        success: false,
        message: "实时控制已禁用",
        error: "Realtime control disabled",
      }));
    }

    const results = await this.messageRouter.processMessages(messages);
    this.stats.totalMessagesProcessed += messages.length;

    return results;
  }

  // ==================== 快照管理 ====================

  /**
   * 获取当前快照
   *
   * @returns 当前战斗快照
   */
  getCurrentSnapshot(): BattleSnapshot {
    const members = this.memberManager.getAllMembers();
    const currentFrame = this.frameLoop.getFrameNumber();

    return {
      timestamp: performance.now(),
      frameNumber: currentFrame,
      members: members.map((member) => member.serialize()),
      battleStatus: {
        isEnded: false,
        winner: undefined,
        reason: undefined,
      },
    };
  }

  /**
   * 生成快照
   */
  generateSnapshot(): void {
    const snapshot = this.getCurrentSnapshot();
    this.snapshots.push(snapshot);
    this.stats.totalSnapshots++;

    // 限制快照数量
    if (this.snapshots.length > 1000) {
      this.snapshots = this.snapshots.slice(-500);
    }

    console.log(`📸 生成快照 #${this.stats.totalSnapshots} - 帧: ${snapshot.frameNumber}`);
  }

  /**
   * 获取快照历史
   *
   * @returns 快照数组
   */
  getSnapshots(): BattleSnapshot[] {
    return this.snapshots.map((snapshot) => ({ ...snapshot }));
  }

  // ==================== 数据访问 ====================

  /**
   * 获取成员数据（外部使用 - 序列化）
   *
   * @param memberId 成员ID
   * @returns 成员数据，如果不存在则返回null
   */
  getMemberData(memberId: string) {
    return this.memberManager.getMember(memberId)?.serialize();
  }

  /**
   * 获取所有成员数据（外部使用 - 序列化）
   *
   * @returns 所有成员数据数组
   */
  getAllMemberData(): MemberSerializeData[] {
    return this.memberManager.getAllMembers().map((member) => member.serialize());
  }

  /**
   * 按阵营获取成员数据（外部使用 - 序列化）
   *
   * @param campId 阵营ID
   * @returns 指定阵营的成员数据数组
   */
  getMembersByCamp(campId: string): MemberSerializeData[] {
    return this.memberManager.getMembersByCamp(campId).map((member) => member.serialize());
  }

  /**
   * 按队伍获取成员数据（外部使用 - 序列化）
   *
   * @param teamId 队伍ID
   * @returns 指定队伍的成员数据数组
   */
  getMembersByTeam(teamId: string): MemberSerializeData[] {
    return this.memberManager.getMembersByTeam(teamId).map((member) => member.serialize());
  }

  // ==================== 依赖注入支持 ====================

  /**
   * 获取事件队列实例
   */
  getEventQueue(): EventQueue {
    return this.eventQueue;
  }

  /**
   * 获取成员管理器实例
   */
  getMemberManager(): MemberManager {
    return this.memberManager;
  }

  /**
   * 获取消息路由器实例
   */
  getMessageRouter(): MessageRouter {
    return this.messageRouter;
  }

  /**
   * 获取帧循环实例
   */
  getFrameLoop(): FrameLoop {
    return this.frameLoop;
  }

  // ==================== JS编译和执行 ====================

  /**
   * 编译JS代码
   *
   * @param code JS代码字符串
   * @param memberId 成员ID
   * @param targetId 目标成员ID (可选)
   * @returns 编译后的代码
   */
  compileScript(code: string, memberId: string, targetId?: string): string {
    // 从目录项获取Schema
    const member = this.memberManager.getMember(memberId);
    if (!member) {
      throw new Error(`成员不存在: ${memberId}`);
    }
    const schema = member.schema;

    const context: CompilationContext = {
      memberId,
      targetId,
      schema,
      options: {
        enableCaching: true,
        enableValidation: true,
      },
    };

    // 检查缓存
    const result = this.jsProcessor.compile(code, context);
    if (!result.success) {
      throw new Error(`编译失败: ${result.error}`);
    }

    // 缓存编译结果
    this.compiledScripts.set(result.cacheKey, result.compiledCode);

    console.log(`✅ JS脚本编译成功: ${result.cacheKey}`);

    return result.compiledCode;
  }

  /**
   * 执行编译后的JS代码
   *
   * @param compiledCode 编译后的代码
   * @param context 执行上下文
   * @returns 执行结果
   */
  executeScript(compiledCode: string, context: ExpressionContext): any {
    try {
      const memberId = context.casterId;
      const targetId = context.targetId;

      if (!memberId) {
        throw new Error("缺少成员ID");
      }

      // 调试信息
      console.log(`🔧 GameEngine.executeScript: 执行代码: ${compiledCode}`);
      console.log(`🔧 GameEngine.executeScript: 上下文:`, context);

      // 在安全的沙盒环境中执行编译后的代码
      // JSExpressionProcessor 已经在代码中声明了 _self 和 _target 变量
      const runner = new Function("ctx", compiledCode);
      
      // 确保 context 包含 engine 引用，供生成的代码使用
      const executionContext = {
        ...context,
        engine: this
      };
      
      const result = runner.call(null, executionContext);
      
      console.log(`✅ JS脚本执行成功: ${memberId}, 结果:`, result);
      return result;
    } catch (error) {
      console.error("JS脚本执行失败:", error);
      console.error("编译后的代码:", compiledCode);
      console.error("执行上下文:", context);
      throw new Error(`脚本执行失败: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * 计算表达式
   *
   * @param expression 表达式字符串
   * @param context 计算上下文
   * @returns 计算结果
   */
  evaluateExpression(expression: string, context: ExpressionContext): number {
    try {
      const memberId = context.casterId;
      if (!memberId) {
        throw new Error("缺少成员ID");
      }

      const member = this.memberManager.getMember(memberId);
      if (!member) {
        throw new Error(`成员不存在: ${memberId}`);
      }

      console.log(`🔧 GameEngine.evaluateExpression: 计算表达式: ${expression}`);

      // 使用 JSExpressionProcessor 编译表达式
      const compiledResult = this.jsProcessor.compile(expression, {
        memberId,
        targetId: context.targetId,
        schema: member.schema,
        options: { enableValidation: true }
      });
      
      if (!compiledResult.success) {
        throw new Error(`表达式编译失败: ${compiledResult.error}`);
      }
      
      console.log(`🔧 GameEngine.evaluateExpression: 编译成功，编译后代码: ${compiledResult.compiledCode}`);
      
      // 执行编译后的表达式，确保 context 包含 engine 引用
      const executionContext = {
        ...context,
        engine: this
      };
      
      const result = this.executeScript(compiledResult.compiledCode, executionContext);
      console.log(`🔧 GameEngine.evaluateExpression: 执行结果: ${result} (类型: ${typeof result})`);
      
      return result;
    } catch (error) {
      console.error("表达式计算失败:", error);
      return 0;
    }
  }

  /**
   * 获取编译缓存统计
   * 用于调试和监控
   */
  getCompilationStats(): { cacheSize: number; cacheKeys: string[] } {
    return {
      cacheSize: this.compiledScripts.size,
      cacheKeys: Array.from(this.compiledScripts.keys()),
    };
  }

  /**
   * 清理编译缓存
   * 用于内存管理
   */
  clearCompilationCache(): void {
    this.compiledScripts.clear();
    console.log("🧹 JS编译缓存已清理");
  }

  // ==================== 私有方法 ====================

  /**
   * 验证当前执行环境是否为Worker线程
   * 防止在主线程意外创建GameEngine实例
   */
  private validateWorkerContext(): void {
    // 检查是否在浏览器主线程（有window对象）
    const isMainThread = typeof window !== "undefined";

    // 检查是否在Node.js环境中（用于测试）
    const isNode = typeof process !== "undefined" && process.versions && process.versions.node;

    // 检查是否有特殊的测试标记（用于单元测试等）
    const isTestEnvironment =
      typeof globalThis !== "undefined" && (globalThis as any).__ALLOW_GAMEENGINE_IN_MAIN_THREAD;

    // 检查是否在沙盒Worker中（有safeAPI标记）
    const isSandboxWorker = typeof globalThis !== "undefined" && (globalThis as any).safeAPI;

    // 检查是否在Worker环境中（有self但没有window）
    const isWorkerEnvironment = typeof self !== "undefined" && !isMainThread;

    // 只有在浏览器主线程中才阻止创建
    if (isMainThread && !isTestEnvironment) {
      const error = new Error(
        "🛡️ 安全限制：GameEngine禁止在浏览器主线程中运行！\n" +
          "请使用SimulatorPool启动Worker中的GameEngine实例。\n" +
          "这是为了确保JS片段执行的安全性。\n" +
          "如需在测试中使用，请设置 globalThis.__ALLOW_GAMEENGINE_IN_MAIN_THREAD = true",
      );
      console.error(error.message);
      throw error;
    }

    // 记录运行环境
    if (isSandboxWorker) {
      // 默认环境，不需要输出日志
      // console.log("🛡️ GameEngine正在沙盒Worker线程中安全运行");
    } else if (isWorkerEnvironment) {
      console.log("🛡️ GameEngine正在Worker线程中运行");
    } else if (isNode) {
      console.log("🛡️ GameEngine在Node.js环境中运行（测试模式）");
    } else if (isTestEnvironment) {
      console.log("🛡️ GameEngine在测试环境中运行（已标记允许）");
    }
  }

  /**
   * 输出当前帧状态 - 引擎的直接输出方法
   */
  private outputFrameState(): void {
    // 直接通知所有监听器，不需要中间的回调层
    this.stateChangeListeners.forEach((listener) => {
      try {
        listener(this.getStats());
      } catch (error) {
        console.error("GameEngine: 状态输出监听器执行失败:", error);
      }
    });
  }

  /**
   * 初始化默认事件处理器
   */
  private initializeDefaultEventHandlers(): void {
    // 使用工厂创建所有默认处理器
    const handlers = this.eventHandlerFactory.createDefaultHandlers();

    // 注册所有处理器
    for (const [eventType, handler] of handlers) {
      this.registerEventHandler(eventType, handler);
    }

    // console.log('GameEngine: 默认事件处理器初始化完成');
  }
}

// ============================== 导出 ==============================

export default GameEngine;
