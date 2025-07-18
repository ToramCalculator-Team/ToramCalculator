/**
 * 游戏引擎 - 核心运行时容器
 * 
 * 核心职责（根据架构文档）：
 * 1. 作为核心运行时容器，集成所有模块
 * 2. 协调MemberRegistry、MessageRouter、FrameLoop、EventQueue等模块
 * 3. 提供统一的引擎接口
 * 4. 管理引擎生命周期
 * 
 * 设计理念：
 * - 容器模式：引擎是容器，不直接处理业务逻辑
 * - 模块集成：协调各个模块的协作
 * - 统一接口：提供简洁的引擎API
 * - 生命周期管理：管理引擎的启动、运行、停止
 */

import { createSignal } from "solid-js";
import type { TeamWithRelations } from "~/repositories/team";
import type { MemberWithRelations } from "~/repositories/member";
import type { SimulatorWithRelations } from "~/repositories/simulator";
import { MemberRegistry } from "./MemberRegistry";
import { MessageRouter } from "./MessageRouter";
import { FrameLoop } from "./FrameLoop";
import { EventQueue } from "./EventQueue";
import { FSMEventBridge } from "./FSMEventBridge";
import { EventExecutor } from "./EventExecutor";
import { EventHandlerFactory } from "../handlers/EventHandlerFactory";
import type { IntentMessage, MessageProcessResult } from "./MessageRouter";
import type { FrameLoopState, FrameInfo } from "./FrameLoop";
import type { QueueEvent, EventPriority, EventHandler, BaseEvent, ExecutionContext, EventResult } from "./EventQueue";
import type { FSMEvent } from "./FSMEventBridge";
import type { ExpressionContext } from "./EventExecutor";
// 容器不直接依赖具体成员类型
import { Logger } from "~/utils/logger";

// ============================== 类型定义 ==============================

/**
 * 引擎状态枚举
 */
export type EngineState = 
  | "initialized"  // 已初始化
  | "running"      // 运行中
  | "paused"       // 已暂停
  | "stopped";     // 已停止

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
  /** 成员数量 */
  memberCount: number;
  /** 事件队列统计 */
  eventQueueStats: any;
  /** 帧循环统计 */
  frameLoopStats: any;
  /** 消息路由统计 */
  messageRouterStats: any;
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
  members: Array<{
    id: string;
    name: string;
    type: string;
    campId: string;
    teamId: string;
    isAlive: boolean;
    isActive: boolean;
    stats: any;
    state: any;
  }>;
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

  /** 成员注册表 - 管理所有实体 */
  private memberRegistry: MemberRegistry;

  /** 事件队列 - 管理时间片段事件 */
  private eventQueue: EventQueue;

  /** 消息路由器 - 分发外部指令 */
  private messageRouter: MessageRouter;

  /** 帧循环 - 推进时间和调度事件 */
  private frameLoop: FrameLoop;

  /** FSM事件桥接器 - 连接XState和EventQueue */
  private fsmEventBridge: FSMEventBridge;

  /** 事件执行器 - 处理复杂效果计算 */
  private eventExecutor: EventExecutor;

  /** 事件处理器工厂 - 创建和管理事件处理器 */
  private eventHandlerFactory: EventHandlerFactory;

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

  // ==================== 构造函数 ====================

  /**
   * 构造函数
   * 
   * @param config 引擎配置
   */
  constructor(config: Partial<EngineConfig> = {}) {
    // 设置默认配置
    this.config = {
      targetFPS: 60,
      maxSimulationTime: 120, // 120秒
      snapshotInterval: 60,   // 每60帧生成快照
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
      ...config
    };

    // 初始化核心模块
    this.memberRegistry = new MemberRegistry();
    this.eventQueue = new EventQueue(this.config.eventQueueConfig);
    this.messageRouter = new MessageRouter(this.memberRegistry);
    this.frameLoop = new FrameLoop(
      this.memberRegistry, 
      this.eventQueue,
      this.config.frameLoopConfig
    );

    // 初始化FSM事件桥接器
    this.fsmEventBridge = new FSMEventBridge(this.eventQueue);

    // 初始化事件执行器
    this.eventExecutor = new EventExecutor(this.config.frameLoopConfig.enablePerformanceMonitoring);

    // 初始化事件处理器工厂
    this.eventHandlerFactory = new EventHandlerFactory(this.eventExecutor, this.memberRegistry);

    // 初始化默认事件处理器
    this.initializeDefaultEventHandlers();

    Logger.info("GameEngine: 初始化完成");
  }

  // ==================== 公共接口 ====================

  /**
   * 启动引擎
   */
  start(): void {
    if (this.state === "running") {
      Logger.warn("GameEngine: 引擎已在运行中");
      return;
    }

    this.state = "running";
    this.startTime = performance.now();
    this.snapshots = [];

    // 启动帧循环
    this.frameLoop.start();

    Logger.info("GameEngine: 引擎已启动");
  }

  /**
   * 停止引擎
   */
  stop(): void {
    if (this.state === "stopped") {
      Logger.warn("GameEngine: 引擎已停止");
      return;
    }

    this.state = "stopped";

    // 停止帧循环
    this.frameLoop.stop();

    Logger.info("GameEngine: 引擎已停止");
  }

  /**
   * 暂停引擎
   */
  pause(): void {
    if (this.state === "paused") {
      Logger.warn("GameEngine: 引擎已暂停");
      return;
    }

    this.state = "paused";

    // 暂停帧循环
    this.frameLoop.pause();

    Logger.info("GameEngine: 引擎已暂停");
  }

  /**
   * 恢复引擎
   */
  resume(): void {
    if (this.state === "running") {
      Logger.warn("GameEngine: 引擎已在运行中");
      return;
    }

    this.state = "running";

    // 恢复帧循环
    this.frameLoop.resume();

    Logger.info("GameEngine: 引擎已恢复");
  }

  /**
   * 单步执行
   */
  step(): void {
    if (this.state === "running") {
      Logger.warn("GameEngine: 引擎正在运行，无法单步执行");
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
    Logger.debug(`GameEngine: 添加阵营: ${campId} - ${campName || '未命名'}`);
  }

  /**
   * 添加队伍
   * 
   * @param campId 阵营ID
   * @param teamData 队伍数据
   * @param teamName 队伍名称
   */
  addTeam(campId: string, teamData: TeamWithRelations, teamName?: string): void {
    Logger.debug(`GameEngine: 添加队伍: ${teamData.id} - ${teamName || teamData.name}`);
  }

  /**
   * 添加成员（委托给 MemberRegistry）
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
    this.memberRegistry.createAndRegister(memberData, campId, teamId, initialState);
  }

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
        error: "Realtime control disabled"
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
        error: "Realtime control disabled"
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
    if (success) {
      this.stats.totalEventsProcessed++;
    }
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
    Logger.debug(`GameEngine: 注册事件处理器: ${eventType}`);
  }

  /**
   * 处理FSM事件
   * 
   * @param fsmEvent FSM事件
   * @returns 处理是否成功
   */
  processFSMEvent(fsmEvent: FSMEvent): boolean {
    return this.fsmEventBridge.processFSMEvent(fsmEvent, this.frameLoop.getFrameNumber());
  }

  /**
   * 获取FSM事件桥接器
   * 
   * @returns FSM事件桥接器实例
   */
  getFSMEventBridge(): FSMEventBridge {
    return this.fsmEventBridge;
  }

  /**
   * 获取所有成员（委托给 MemberRegistry）
   * 
   * @returns 成员数组
   */
  getAllMembers(): any[] {
    return this.memberRegistry.getAllMembers();
  }

  /**
   * 查找成员（委托给 MemberRegistry）
   * 
   * @param memberId 成员ID
   * @returns 成员实例
   */
  findMember(memberId: string): any | null {
    return this.memberRegistry.getMember(memberId);
  }

  // ==================== 外部数据访问接口 ====================

  /**
   * 获取成员数据（外部使用 - 序列化）
   * 
   * @param memberId 成员ID
   * @returns 成员数据，如果不存在则返回null
   */
  getMemberData(memberId: string): any | null {
    const member = this.memberRegistry.getMember(memberId);
    if (!member) {
      return null;
    }

    const entry = this.memberRegistry.getMemberEntry(memberId);
    return {
      id: member.getId(),
      name: member.getName(),
      type: member.getType(),
      campId: entry?.campId || "",
      teamId: entry?.teamId || "",
      isAlive: member.isAlive(),
      isActive: member.isActive(),
      stats: member.getStats(),
      state: member.getCurrentState()
    };
  }

  /**
   * 获取所有成员数据（外部使用 - 序列化）
   * 
   * @returns 所有成员数据数组
   */
  getAllMemberData(): any[] {
    const members = this.memberRegistry.getAllMembers();
    return members.map(member => member.serialize());
  }

  /**
   * 按阵营获取成员数据（外部使用 - 序列化）
   * 
   * @param campId 阵营ID
   * @returns 指定阵营的成员数据数组
   */
  getMembersByCamp(campId: string): any[] {
    const members = this.memberRegistry.getMembersByCamp(campId);
    return members.map(member => {
      const entry = this.memberRegistry.getMemberEntry(member.getId());
      return {
        id: member.getId(),
        name: member.getName(),
        type: member.getType(),
        campId: entry?.campId || "",
        teamId: entry?.teamId || "",
        isAlive: member.isAlive(),
        isActive: member.isActive(),
        stats: member.getStats(),
        state: member.getCurrentState()
      };
    });
  }

  /**
   * 按队伍获取成员数据（外部使用 - 序列化）
   * 
   * @param teamId 队伍ID
   * @returns 指定队伍的成员数据数组
   */
  getMembersByTeam(teamId: string): any[] {
    const members = this.memberRegistry.getMembersByTeam(teamId);
    return members.map(member => {
      const entry = this.memberRegistry.getMemberEntry(member.getId());
      return {
        id: member.getId(),
        name: member.getName(),
        type: member.getType(),
        campId: entry?.campId || "",
        teamId: entry?.teamId || "",
        isAlive: member.isAlive(),
        isActive: member.isActive(),
        stats: member.getStats(),
        state: member.getCurrentState()
      };
    });
  }

  /**
   * 获取当前快照
   * 
   * @returns 当前战斗快照
   */
  getCurrentSnapshot(): BattleSnapshot {
    const members = this.memberRegistry.getAllMembers();
    const currentFrame = this.frameLoop.getFrameNumber();

    return {
      timestamp: performance.now(),
      frameNumber: currentFrame,
      members: members.map(member => ({
        id: member.getId(),
        name: member.getName(),
        type: member.getType(),
        campId: this.memberRegistry.getMemberEntry(member.getId())?.campId || "",
        teamId: this.memberRegistry.getMemberEntry(member.getId())?.teamId || "",
        isAlive: member.isAlive(),
        isActive: member.isActive(),
        stats: member.getStats(),
        state: member.getFSM()?.getState() || null,
      })),
      battleStatus: {
        isEnded: false, // 容器不判断战斗状态，由外部查询决定
        winner: undefined,
        reason: undefined,
      }
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
    return this.snapshots.map(snapshot => ({ ...snapshot }));
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
      memberCount: this.memberRegistry.size(),
      eventQueueStats: this.eventQueue.getStats(),
      frameLoopStats: this.frameLoop.getPerformanceStats(),
      messageRouterStats: this.messageRouter.getStats(),
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
    this.memberRegistry.clear();

    // 清理事件队列
    this.eventQueue.clear();

    // 重置FSM事件桥接器统计
    this.fsmEventBridge.resetStats();

    // 重置统计
    this.stats = {
      totalSnapshots: 0,
      totalEventsProcessed: 0,
      totalMessagesProcessed: 0,
    };

    console.log("🧹 引擎资源已清理");
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
    
    Logger.debug('GameEngine: 默认事件处理器初始化完成');
  }
}

// ============================== 导出 ==============================

export default GameEngine;