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

import type { TeamWithRelations } from "@db/repositories/team";
import type { MemberWithRelations } from "@db/repositories/member";
import { MemberManager, MemberManagerEntry } from "./MemberManager";
import { MessageRouter } from "./MessageRouter";
import { FrameLoop, PerformanceStats } from "./FrameLoop";
import { EventQueue } from "./EventQueue";

import { EventHandlerFactory } from "../handlers/EventHandlerFactory";
import type { IntentMessage, MessageProcessResult, MessageRouterStats } from "./thread/messages";
import type {
  QueueEvent,
  EventPriority,
  EventHandler,
  BaseEvent,
  ExecutionContext,
  EventResult,
  QueueStats,
} from "./EventQueue";
import { type MemberContext, type MemberSerializeData } from "./member/MemberType";
import type { AnyStateMachine, Snapshot, Actor } from "xstate";
import { PlayerAttrSchema } from "./member/player/PlayerData";
import { JSExpressionProcessor, type CompilationContext, type CompileResult } from "./expression/JSExpressionProcessor";
import { ReactiveSystem } from "./member/ReactiveSystem";
import { cloneDeep } from "lodash-es";
// 容器不直接依赖具体成员类型

// ============================== 类型定义 ==============================

/**
 * 引擎状态枚举
 */
export type EngineState =
  | "initialized" // 已初始化
  | "running" // 运行中
  | "paused" // 已暂停
  | "stopped"; // 已停止

/**
 * 引擎配置接口
 */
export interface EngineConfig {
  /** 目标帧率 */
  targetFPS: number;
  /** 最大模拟时间（秒） */
  maxSimulationTime: number;
  /** 快照生成间隔（帧数） */
  snapshotInterval: number;
  /** 是否启用实时控制 */
  enableRealtimeControl: boolean;
  /** 事件队列配置 */
  eventQueueConfig: {
    maxQueueSize: number;
    enablePrioritySort: boolean;
    enableSnapshot: boolean;
  };
  /** 帧循环配置 */
  frameLoopConfig: {
    enableFrameSkip: boolean;
    maxFrameSkip: number;
    enablePerformanceMonitoring: boolean;
  };
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

  // ==================== 安全验证 ====================

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
      console.log("🛡️ GameEngine正在沙盒Worker线程中安全运行");
    } else if (isWorkerEnvironment) {
      console.log("🛡️ GameEngine正在Worker线程中运行");
    } else if (isNode) {
      console.log("🛡️ GameEngine在Node.js环境中运行（测试模式）");
    } else if (isTestEnvironment) {
      console.log("🛡️ GameEngine在测试环境中运行（已标记允许）");
    }
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
      targetFPS: 60,
      maxSimulationTime: 120, // 120秒
      snapshotInterval: 60, // 每60帧生成快照
      enableRealtimeControl: true,
      eventQueueConfig: {
        maxQueueSize: 10000,
        enablePrioritySort: true,
        enableSnapshot: true,
      },
      frameLoopConfig: {
        enableFrameSkip: true,
        maxFrameSkip: 5,
        enablePerformanceMonitoring: true,
      },
      ...config,
    };

    // 初始化核心模块 - 按依赖顺序
    this.eventQueue = new EventQueue(this.config.eventQueueConfig);
    this.memberManager = new MemberManager(this); // 注入自身引用
    this.messageRouter = new MessageRouter(this); // 注入引擎
    this.frameLoop = new FrameLoop(this, this.config.frameLoopConfig); // 注入引擎（内含eventExecutor）
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

  // ==================== 公共接口 ====================

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
   * 添加阵营
   *
   * @param campId 阵营ID
   * @param campName 阵营名称
   */
  addCamp(campId: string, campName?: string): void {
    this.memberManager.addCamp(campId, campName);
    console.log(`GameEngine: 添加阵营: ${campId} - ${campName || "未命名"}`);
  }

  /**
   * 添加队伍
   *
   * @param campId 阵营ID
   * @param teamData 队伍数据
   * @param teamName 队伍名称
   */
  addTeam(campId: string, teamData: TeamWithRelations, teamName?: string): void {
    this.memberManager.addTeam(campId, { id: teamData.id, name: teamData.name ?? undefined }, teamName);
    console.log(`GameEngine: 添加队伍: ${teamData.id} - ${teamName || teamData.name}`);
  }

  /**
   * 添加成员（委托给 memberManager）
   *
   * @param campId 阵营ID
   * @param teamId 队伍ID
   * @param memberData 成员数据
   * @param initialState 初始状态
   */
  addMember(
    campId: string,
    teamId: string,
    memberData: MemberWithRelations,
    initialState: {
      currentHp?: number;
      currentMp?: number;
      position?: { x: number; y: number };
    } = {},
  ): void {
    // 容器只负责委托，不处理具体创建逻辑
    const member = this.memberManager.createAndRegister(memberData, campId, teamId);
    console.log("GameEngine: 添加成员:", member);
  }

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
   * 处理意图消息
   *
   * @param message 意图消息
   * @returns 处理结果
   */
  async processIntent(message: IntentMessage): Promise<MessageProcessResult> {
    console.log("GameEngine: 处理意图消息:", message);
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

  /**
   * 插入事件到队列
   *
   * @param event 事件对象
   * @param priority 事件优先级
   * @returns 插入是否成功
   */
  insertEvent(event: BaseEvent, priority: EventPriority = "normal"): boolean {
    const success = this.eventQueue.insert(event, priority);

    // 🔥 移除事件插入时的状态更新，因为FrameLoop会在下一帧处理时统一发送
    // 事件插入只是将事件加入队列，实际处理在processFrame中进行

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
    // console.log(`GameEngine: 注册事件处理器: ${eventType}`);
  }

  /**
   * 获取所有成员（委托给 memberManager）
   *
   * @returns 成员数组
   */
  getAllMembers() {
    return this.memberManager.getAllMembers();
  }

  /**
   * 查找成员（委托给 memberManager）
   *
   * @param memberId 成员ID
   * @returns 成员实例
   */
  findMember(memberId: string) {
    return this.memberManager.getMember(memberId);
  }

  // ==================== 外部数据访问接口 ====================

  /**
   * 获取成员数据（外部使用 - 序列化）
   *
   * @param memberId 成员ID
   * @returns 成员数据，如果不存在则返回null
   */
  getMemberData(memberId: string) {
    const entry = this.memberManager.getMemberEntry(memberId);
    if (!entry) return null;
    const actor = this.memberManager.getMember(memberId);
    const snapshot = actor?.getSnapshot();
    if (!snapshot) return null;
    return this.serializeFrom(entry);
  }

  /**
   * 获取所有成员数据（外部使用 - 序列化）
   *
   * @returns 所有成员数据数组
   */
  getAllMemberData(): MemberSerializeData[] {
    const ids = this.memberManager.getAllMemberIds();
    return ids.map((id) => this.getMemberData(id)).filter((x): x is MemberSerializeData => !!x);
  }

  /**
   * 按阵营获取成员数据（外部使用 - 序列化）
   *
   * @param campId 阵营ID
   * @returns 指定阵营的成员数据数组
   */
  getMembersByCamp(campId: string): MemberSerializeData[] {
    const actors = this.memberManager.getMembersByCamp(campId) as Actor<AnyStateMachine>[];
    return actors
      .map((actor) => {
        const id = actor.id;
        if (!id) return null;
        const entry = this.memberManager.getMemberEntry(id);
        if (!entry) return null;
        return this.serializeFrom(entry);
      })
      .filter((x): x is MemberSerializeData => !!x);
  }

  /**
   * 按队伍获取成员数据（外部使用 - 序列化）
   *
   * @param teamId 队伍ID
   * @returns 指定队伍的成员数据数组
   */
  getMembersByTeam(teamId: string): MemberSerializeData[] {
    const actors = this.memberManager.getMembersByTeam(teamId) as Actor<AnyStateMachine>[];
    return actors
      .map((actor) => {
        const id = actor.id;
        if (!id) return null;
        const entry = this.memberManager.getMemberEntry(id);
        if (!entry) return null;
        return this.serializeFrom(entry);
      })
      .filter((x): x is MemberSerializeData => !!x);
  }

  /**
   * 获取当前快照
   *
   * @returns 当前战斗快照
   */
  getCurrentSnapshot(): BattleSnapshot {
    const actors = this.memberManager.getAllMembers() as Actor<AnyStateMachine>[];
    const currentFrame = this.frameLoop.getFrameNumber();

    return {
      timestamp: performance.now(),
      frameNumber: currentFrame,
      members: actors.map((actor) => {
        const id = actor.id;
        const entry = id ? this.memberManager.getMemberEntry(id) : undefined;
        
        // 安全地获取属性值，避免快照为空的情况
        let attrs: Record<string, number> = {};
        try {
          const snapshot = actor.getSnapshot();
          if (snapshot?.context?.attrs) {
            attrs = (snapshot.context.attrs as ReactiveSystem<any>).exportFlatValues();
          } else if (entry?.attrs) {
            // 如果快照为空，直接从 entry 获取属性
            attrs = entry.attrs.exportFlatValues();
          }
        } catch (error) {
          console.warn(`⚠️ 获取成员 ${id} 属性失败:`, error);
          // 使用 entry 中的属性作为后备
          if (entry?.attrs) {
            attrs = entry.attrs.exportFlatValues();
          }
        }
        
        return {
          id: id || "",
          name: entry?.name || id || "",
          type: (entry?.type as string) || "",
          campId: entry?.campId || "",
          teamId: entry?.teamId || "",
          isActive: !!entry?.isActive,
          attrs,
        };
      }),
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

  /**
   * 从目录项与Actor快照构建可序列化的成员数据
   */
  private serializeFrom(entry: MemberManagerEntry): MemberSerializeData {
    // 直接从注册表保存的 ReactiveSystem 导出，避免依赖快照上下文
    const attrs = entry.attrs.exportNestedValues();
    
    // 获取状态机快照，用于调试
    let snap: any = null;
    try {
      snap = entry.actor.getSnapshot();
    } catch (error) {
      console.warn(`⚠️ 获取 Actor 快照失败: ${entry.name}`, error);
    }

    return {
      id: entry.id,
      name: entry.name,
      type: entry.type,
      isActive: entry.isActive,
      attrs,
      teamId: entry.teamId,
      campId: entry.campId,
    };
  }

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

  // ==================== 便捷访问方法 (依赖注入支持) ====================

  /**
   * 获取事件队列实例
   * 供Member等组件通过Engine访问
   */
  getEventQueue(): EventQueue {
    return this.eventQueue;
  }

  /**
   * 获取成员管理器实例
   * 供Member等组件通过Engine访问
   */
  getMemberManager(): MemberManager {
    return this.memberManager;
  }

  /**
   * 获取消息路由器实例
   * 供Member等组件通过Engine访问
   */
  getMessageRouter(): MessageRouter {
    return this.messageRouter;
  }

  /**
   * 获取帧循环实例
   * 供Member等组件通过Engine访问
   */
  getFrameLoop(): FrameLoop {
    return this.frameLoop;
  }

  // ==================== JS编译和执行 ====================

  /**
   * 编译JS脚本
   * 将self.xxx转换为_self.getValue('xxx')格式并缓存结果
   *
   * @param code 原始JS代码
   * @param memberId 成员ID
   * @param targetId 目标成员ID (可选)
   * @returns 编译后的代码
   */
  compileScript(code: string, memberId: string, targetId?: string): string {
    // 从目录项获取Schema
    const entry = this.memberManager.getMemberEntry(memberId);
    if (!entry) {
      throw new Error(`成员不存在: ${memberId}`);
    }
    const schema = entry.schema;

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

  // 容器模式：不包含业务逻辑方法
  // 战斗状态判断由外部系统负责

  // ==================== 私有初始化方法 ====================

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
