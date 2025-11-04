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

import type { Team, TeamWithRelations } from "@db/generated/repositories/team";
import type { MemberWithRelations } from "@db/generated/repositories/member";
import { MemberManager } from "./member/MemberManager";
import { MessageRouter } from "./MessageRouter";
import { FrameLoop, FrameLoopConfig, PerformanceStats } from "./FrameLoop";
import { EventQueue } from "./EventQueue";
import { EventHandlerFactory } from "./handlers/EventHandlerFactory";
import type { IntentMessage, MessageProcessResult, MessageRouterStats } from "./MessageRouter";
import type { EventPriority, EventHandler, BaseEvent, QueueStats, EventQueueConfig } from "./EventQueue";
import { type MemberSerializeData } from "./member/Member";
import { type MemberType } from "@db/schema/enums";
import { JSProcessor, type CompilationContext } from "./astProcessor/JSProcessor";
import { z } from "zod/v4";
import { createActor } from "xstate";
import { gameEngineSM, type EngineCommand, type EngineSMContext } from "./GameEngineSM";
import { SimulatorWithRelations } from "@db/generated/repositories/simulator";

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
  skillLv?: number;
  /** 环境变量 */
  environment?: any;
  /** 自定义变量 */
  [key: string]: any;
}

/**
 * 引擎状态枚举
 */
export type EngineState =
  | "unInitialized" // 未初始化
  | "initialized" // 已初始化
  | "running" // 运行中
  | "paused" // 已暂停
  | "stopped"; // 已停止

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
 * 引擎视图类型
 * 高频KPI数据，用于实时监控引擎性能
 * 这是引擎对外暴露的状态快照
 */
export interface EngineView {
  frameNumber: number;
  runTime: number;
  frameLoop: {
    averageFPS: number;
    averageFrameTime: number;
    totalFrames: number;
    totalRunTime: number;
    clockKind?: "raf" | "timeout";
    skippedFrames?: number;
    frameBudgetMs?: number;
  };
  eventQueue: {
    currentSize: number;
    totalProcessed: number;
    totalInserted: number;
    overflowCount: number;
  };
}

/**
 * 帧快照接口 - 包含引擎和所有成员的完整状态
 */
export interface FrameSnapshot {
  frameNumber: number;
  timestamp: number;
  engine: {
    frameNumber: number;
    runTime: number;
    frameLoop: {
      averageFPS: number;
      averageFrameTime: number;
      totalFrames: number;
      totalRunTime: number;
      clockKind?: "raf" | "timeout";
      skippedFrames?: number;
      frameBudgetMs?: number;
    };
    eventQueue: {
      currentSize: number;
      totalProcessed: number;
      totalInserted: number;
      overflowCount: number;
    };
    memberCount: number;
    activeMemberCount: number;
  };
  members: Array<{
    id: string;
    type: MemberType;
    name: string;
    state: any; // 状态机状态
    attrs: Record<string, unknown>; // rs数据
    isAlive: boolean;
    position: { x: number; y: number; z: number };
    campId: string;
    teamId: string;
    targetId: string;
  }>;
}

/**
 * 引擎视图Schema
 */
export const EngineViewSchema = z.object({
  frameNumber: z.number(),
  runTime: z.number(),
  frameLoop: z.object({
    averageFPS: z.number(),
    averageFrameTime: z.number(),
    totalFrames: z.number(),
    totalRunTime: z.number(),
    clockKind: z.enum(["raf", "timeout"]).optional(),
    skippedFrames: z.number().optional(),
    frameBudgetMs: z.number().optional(),
  }),
  eventQueue: z.object({
    currentSize: z.number(),
    totalProcessed: z.number(),
    totalInserted: z.number(),
    overflowCount: z.number(),
  }),
});

/**
 * 帧快照Schema
 */
export const FrameSnapshotSchema = z.object({
  frameNumber: z.number(),
  timestamp: z.number(),
  engine: z.object({
    frameNumber: z.number(),
    runTime: z.number(),
    frameLoop: z.object({
      averageFPS: z.number(),
      averageFrameTime: z.number(),
      totalFrames: z.number(),
      totalRunTime: z.number(),
      clockKind: z.enum(["raf", "timeout"]).optional(),
      skippedFrames: z.number().optional(),
      frameBudgetMs: z.number().optional(),
    }),
    eventQueue: z.object({
      currentSize: z.number(),
      totalProcessed: z.number(),
      totalInserted: z.number(),
      overflowCount: z.number(),
    }),
    memberCount: z.number(),
    activeMemberCount: z.number(),
  }),
  members: z.array(
    z.object({
      id: z.string(),
      type: z.string(), // 这里保持 z.string() 因为 Zod 不支持从外部类型推断
      name: z.string(),
      state: z.any(),
      attrs: z.record(z.string(), z.unknown()),
      isAlive: z.boolean(),
      position: z.object({
        x: z.number(),
        y: z.number(),
        z: z.number(),
      }),
      campId: z.string(),
      teamId: z.string(),
      targetId: z.string(),
    }),
  ),
});

/**
 * 引擎统计完整类型
 * 扩展的引擎统计信息，支持动态属性
 */
export const EngineStatsFullSchema = z
  .object({
    currentFrame: z.number(),
  })
  .passthrough();

export type EngineStatsFull = z.infer<typeof EngineStatsFullSchema>;

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
  private jsProcessor: JSProcessor;

  /** 编译缓存 - 存储编译后的JS代码 */
  private compiledScripts: Map<string, string> = new Map();

  // ==================== 引擎状态 ====================

  /** 引擎状态机 */
  private stateMachine: ReturnType<typeof createActor<typeof gameEngineSM>>;

  /** 获取当前引擎状态（通过状态机）*/
  public getState(): EngineState {
    const machineState = this.stateMachine.getSnapshot().value;

    // 映射状态机状态到引擎状态
    switch (machineState) {
      case "idle":
        return "unInitialized";
      case "initializing":
        return "initialized";
      case "running":
        return "running";
      case "paused":
      case "pausing":
      case "resuming":
        return "paused";
      case "stopped":
      case "stopping":
        return "stopped";
      default:
        return "unInitialized";
    }
  }

  /**
   * 获取初始化数据
   */
  getInitializationData(): SimulatorWithRelations | null {
    return this.initializationData;
  }

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

  // ==================== 渲染通信 ====================

  /** 渲染消息发送器 - 用于发送渲染指令到主线程 */
  private renderMessageSender: ((payload: any) => void) | null = null;
  private systemMessageSender: ((payload: any) => void) | null = null;

  /** 镜像通信发送器 - 用于向镜像状态机发送消息 */
  private sendToMirror?: (command: EngineCommand) => void;

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
    this.jsProcessor = new JSProcessor(); // 初始化JS表达式处理器

    // 创建状态机 - 使用动态获取mirror sender的方式
    this.stateMachine = createActor(gameEngineSM, {
      input: {
        mirror: { 
          send: (command: EngineCommand) => {
            if (this.sendToMirror) {
              this.sendToMirror(command);
            } else {
              console.warn("GameEngine: sendToMirror 未设置，忽略命令:", command, "当前状态:", this.stateMachine.getSnapshot().value);
              // 如果是在初始化过程中，延迟重试
              if (command.type === "RESULT" && command.command === "INIT") {
                console.warn("GameEngine: RESULT(INIT) 命令被忽略，可能导致状态机超时");
              }
            }
          }
        },
        engine: this,
        controller: undefined,
      },
    });
    this.stateMachine.start();

    // 初始化默认事件处理器
    this.initializeDefaultEventHandlers();
  }

  // ==================== 生命周期管理 ====================
  
  /** 存储初始化参数，用于重置时复用 */
  private initializationData: SimulatorWithRelations | null = null;

  /**
   * 初始化引擎（必须提供数据）
   */
  initialize(data: SimulatorWithRelations): void {
    if (this.getState() === "initialized") {
      console.warn("GameEngine: 引擎已初始化");
      return;
    }
    
    // 存储初始化参数
    this.initializationData = data;
    
    // 设置基本状态
    this.startTime = performance.now();
    this.snapshots = [];
    
    // 添加阵营A
    this.addCamp("campA");
    data.campA.forEach((team) => {
      this.addTeam("campA", team);
      team.members.forEach((member) => {
        this.addMember("campA", team.id, member);
      });
    });

    // 添加阵营B
    this.addCamp("campB");
    data.campB.forEach((team) => {
      this.addTeam("campB", team);
      team.members.forEach((member) => {
        this.addMember("campB", team.id, member);
      });
    });
    
    // 自动选择主控目标
    this.memberManager.autoSelectPrimaryTarget();
    
    console.log("GameEngine: 数据初始化完成");
  }

  /**
   * 发送命令到引擎状态机
   */
  sendCommand(command: EngineCommand): void {
    this.stateMachine.send(command);
  }

  /**
   * 设置镜像通信发送器
   */
  setMirrorSender(sender: (command: EngineCommand) => void): void {
    this.sendToMirror = sender;
  }

  /**
   * 启动引擎
   */
  start(): void {
    if (this.getState() === "running") {
      console.warn("GameEngine: 引擎已在运行中");
      return;
    }

    this.startTime = performance.now();

    // 启动帧循环
    this.frameLoop.start();
  }

  /**
   * 停止引擎
   */
  stop(): void {
    if (this.getState() === "stopped") {
      console.log("GameEngine: 引擎已停止");
      return;
    }

    // 停止帧循环
    this.frameLoop.stop();
  }

  /**
   * 重置引擎到初始状态
   */
  reset(): void {
    this.stop();
    
    // 使用存储的初始化参数重新初始化
    if (this.initializationData) {
      this.initialize(this.initializationData);
    } else {
      console.warn("GameEngine: 没有存储的初始化参数，无法重置");
    }
    
    console.log("GameEngine: 引擎已重置");
  }

  /**
   * 暂停引擎
   */
  pause(): void {
    if (this.getState() === "paused") {
      console.warn("GameEngine: 引擎已暂停");
      return;
    }

    // 暂停帧循环
    this.frameLoop.pause();
  }

  /**
   * 恢复引擎
   */
  resume(): void {
    if (this.getState() === "running") {
      console.warn("GameEngine: 引擎已在运行中");
      return;
    }

    // 恢复帧循环
    this.frameLoop.resume();
  }

  

  /**
   * 单步执行
   */
  step(): void {
    if (this.getState() === "running") {
      console.warn("GameEngine: 引擎正在运行，无法单步执行");
      return;
    }

    this.frameLoop.step();
  }

  /**
   * 设置渲染消息发送器
   *
   * @param sender 渲染消息发送函数，通常由Worker环境中的MessagePort提供
   */
  setRenderMessageSender(sender: (payload: any) => void): void {
    this.renderMessageSender = sender;
  }

  /**
   * 设置系统消息发送器
   *
   * @param sender 系统消息发送函数，用于发送系统级事件到控制器
   */
  setSystemMessageSender(sender: (payload: any) => void): void {
    this.systemMessageSender = sender;
  }

  /**
   * 发送渲染指令到主线程
   *
   * @param payload 渲染指令负载，可以是单个指令或指令数组
   */
  postRenderMessage(payload: any): void {
    if (!this.renderMessageSender) {
      console.warn("GameEngine: 渲染消息发送器未设置，无法发送渲染指令");
      return;
    }

    try {
      this.renderMessageSender(payload);
    } catch (error) {
      console.error("GameEngine: 发送渲染指令失败:", error);
    }
  }

  /**
   * 发送系统消息到主线程
   *
   * @param payload 系统消息负载
   */
  postSystemMessage(payload: any): void {
    if (!this.systemMessageSender) {
      console.warn("GameEngine: 系统消息发送器未设置，无法发送系统消息");
      return;
    }

    try {
      this.systemMessageSender(payload);
    } catch (error) {
      console.error("GameEngine: 发送系统消息失败:", error);
    }
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

    // 清理渲染消息发送器
    this.renderMessageSender = null;
    this.systemMessageSender = null;

    // 重置统计
    this.stats = {
      totalSnapshots: 0,
      totalEventsProcessed: 0,
      totalMessagesProcessed: 0,
    };

    console.log("🧹 引擎资源已清理");
  }

  // ==================== 状态查询 ====================

  // getState() 方法已在上面定义，这里是重复定义，需要删除

  /**
   * 检查引擎是否正在运行
   *
   * @returns 是否运行中
   */
  isRunning(): boolean {
    return this.getState() === "running";
  }

  /**
   * 获取引擎统计信息
   *
   * @returns 统计信息
   */
  getStats(): EngineStats {
    const runTime = performance.now() - this.startTime;

    return {
      state: this.getState(),
      currentFrame: this.frameLoop.getFrameNumber(),
      runTime,
      members: this.getAllMemberData(),
      eventQueueStats: this.eventQueue.getStats(),
      frameLoopStats: this.frameLoop.getPerformanceStats(),
      messageRouterStats: this.messageRouter.getStats(),
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
   * 事件处理器现在似乎是插入到成员状态机的update事件中
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
  addTeam(campId: string, teamData: TeamWithRelations): void {
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
  getMember(memberId: string) {
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
    const schema = member.dataSchema;

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

      // 在安全的沙盒环境中执行编译后的代码
      const runner = new Function("ctx", compiledCode);

      // 确保 context 包含 engine 引用，供生成的代码使用
      const executionContext = {
        ...context,
        engine: this,
      };

      const result = runner.call(null, executionContext);

      // console.log(`✅ JS脚本执行成功: ${memberId}, 结果:`, result);
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

      // 使用 JSExpressionProcessor 编译表达式
      const compiledResult = this.jsProcessor.compile(expression, {
        memberId,
        targetId: context.targetId,
        schema: member.dataSchema,
        options: { enableValidation: true },
      });

      if (!compiledResult.success) {
        throw new Error(`表达式编译失败: ${compiledResult.error}`);
      }

      // 执行编译后的表达式，确保 context 包含 engine 引用
      const executionContext = {
        ...context,
        engine: this,
      };

      const result = this.executeScript(compiledResult.compiledCode, executionContext);
      // console.log(`🔧 GameEngine.evaluateExpression: 执行结果: ${result} (类型: ${typeof result})`);

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
   * 创建当前帧的完整快照
   * 包含引擎状态和所有成员的完整信息
   */
  public createFrameSnapshot(): FrameSnapshot {
    const currentFrame = this.frameLoop.getFrameNumber();
    const currentTime = performance.now();

    // 获取引擎状态
    const frameLoopStats = this.frameLoop.getPerformanceStats();
    const eventQueueStats = this.eventQueue.getStats();

    // 获取所有成员数据
    const members = this.memberManager.getAllMembers().map((member) => {
      const actorSnapshot = member.actor.getSnapshot();
      const memberData = member.serialize();

      return {
        id: member.id,
        type: member.type,
        name: member.name,
        state: actorSnapshot, // 状态机状态
        attrs: memberData.attrs, // rs数据
        isAlive: member.isAlive,
        position: member.position,
        campId: member.campId,
        teamId: member.teamId,
        targetId: member.targetId,
      };
    });

    return {
      frameNumber: currentFrame,
      timestamp: currentTime,
      engine: {
        frameNumber: currentFrame,
        runTime: frameLoopStats.totalRunTime / 1000, // 使用frameLoop的总运行时间（秒）
        frameLoop: frameLoopStats,
        eventQueue: eventQueueStats,
        memberCount: members.length,
        activeMemberCount: members.filter((m) => m.isAlive).length,
      },
      members,
    };
  }

  /**
   * 发送帧快照到主线程
   * 直接通过Worker线程发送，不需要回调
   */
  public sendFrameSnapshot(snapshot: FrameSnapshot): void {
    // 通过全局变量发送帧快照
    if (typeof (globalThis as any).sendFrameSnapshot === "function") {
      (globalThis as any).sendFrameSnapshot(snapshot);
    }
  }

  /**
   * 事件处理器现在似乎是插入到成员状态机的update事件中
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
