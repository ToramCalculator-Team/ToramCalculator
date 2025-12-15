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
import { createId } from "@paralleldrive/cuid2";
import { MemberManager } from "./Member/MemberManager";
import { MessageRouter } from "./MessageRouter/MessageRouter";
import { FrameLoop } from "./FrameLoop/FrameLoop";
import { EventQueue } from "./EventQueue/EventQueue";
import type { IntentMessage, MessageProcessResult } from "./MessageRouter/MessageRouter";
import { type MemberSerializeData } from "./Member/Member";
import { JSProcessor, type CompilationContext } from "./JSProcessor/JSProcessor";
import { createActor } from "xstate";
import { GameEngineSM, type EngineCommand, type EngineSMContext } from "./GameEngineSM";
import { SimulatorWithRelations } from "@db/generated/repositories/simulator";
import {
  ComputedSkillInfo,
  EngineConfig,
  EngineState,
  EngineStats,
  FrameStepResult,
  GameEngineSnapshot,
  FrameSnapshot,
} from "./types";
import { QueueEvent } from "./EventQueue/types";
import type { ExpressionContext } from "./JSProcessor/JSProcessor";
import IntentBuffer from "./IntentSystem/IntentBuffer";
import Resolver from "./IntentSystem/Resolver";
import World from "./World/World";
import SpaceManager from "./World/SpaceManager";
import AreaManager from "./World/AreaManager";
import { Player } from "./Member/types/Player/Player";

/**
 * 游戏引擎类
 * 核心运行时容器，集成所有模块
 */
export class GameEngine {
  // ==================== 核心模块 ====================

  /** 引擎状态机 */
  private stateMachine: ReturnType<typeof createActor<typeof GameEngineSM>>;

  /** 成员管理器 - 管理所有成员的生命周期 */
  private memberManager: MemberManager;

  /** 事件队列 - 管理时间片段事件 */
  private eventQueue: EventQueue;

  /** 消息路由器 - 分发外部指令 */
  private messageRouter: MessageRouter;

  /** 帧循环 - 推进时间和调度事件 */
  private frameLoop: FrameLoop;

  /** JS表达式处理器 - 负责编译JS代码 */
  private jsProcessor: JSProcessor;

  /** 引擎配置 */
  private config: EngineConfig;

  /** 开始时间戳 */
  private startTime: number = 0;

  /** 快照历史 */
  private snapshots: GameEngineSnapshot[] = [];

  /** 统计信息 */
  private stats = {
    totalSnapshots: 0,
    totalEventsProcessed: 0,
    totalMessagesProcessed: 0,
  };

  // ==================== Intent/Resolver/World 层 ====================
  private intentBuffer: IntentBuffer;
  private resolver: Resolver;
  private spaceManager: SpaceManager;
  private areaManager: AreaManager;
  private world: World;

  // ==================== 渲染通信 ====================

  /** 渲染消息发送器 - 用于发送渲染指令到主线程 */
  private renderMessageSender: ((payload: any) => void) | null = null;
  private systemMessageSender: ((payload: any) => void) | null = null;

  /** 镜像通信发送器 - 用于向镜像状态机发送消息 */
  private sendToMirror?: (command: EngineCommand) => void;

  /** 当前逻辑帧号（由引擎维护，FrameLoop 通过 stepFrame 驱动） */
  private currentFrame: number = 0;

  /** 当前挂起的帧内任务数量（用于防止跨帧未完成任务） */
  private pendingFrameTasksCount: number = 0;

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
  constructor(config: EngineConfig) {
    // 🛡️ 安全检查：只允许在Worker线程中创建GameEngine
    this.validateWorkerContext();

    this.config = config;

    // 初始化核心模块 - 按依赖顺序
    this.eventQueue = new EventQueue(this, config.eventQueueConfig);
    this.memberManager = new MemberManager(this); // 注入自身引用
    this.messageRouter = new MessageRouter(this); // 注入引擎
    this.frameLoop = new FrameLoop(this, this.config.frameLoopConfig); // 注入引擎
    this.jsProcessor = new JSProcessor(); // 初始化JS表达式处理器

    // Intent/Resolver/World 相关
    this.intentBuffer = new IntentBuffer();
    this.resolver = new Resolver();
    this.spaceManager = new SpaceManager();
    this.areaManager = new AreaManager(this.spaceManager, this.memberManager);
    this.world = new World(this.memberManager, this.spaceManager, this.areaManager, this.intentBuffer, this.resolver);

    // 创建状态机 - 使用动态获取mirror sender的方式
    this.stateMachine = createActor(GameEngineSM, {
      input: {
        threadName: "worker", // 标识 Worker 线程
        mirror: {
          send: (command: EngineCommand) => {
            if (this.sendToMirror) {
              this.sendToMirror(command);
            } else {
              console.warn(
                "GameEngine: sendToMirror 未设置，忽略命令:",
                command,
                "当前状态:",
                this.stateMachine.getSnapshot().value,
              );
              // 如果是在初始化过程中，延迟重试
              if (command.type === "RESULT" && command.command === "INIT") {
                console.warn("GameEngine: RESULT(INIT) 命令被忽略，可能导致状态机超时");
              }
            }
          },
        },
        engine: this,
        controller: undefined,
      },
    });
    this.stateMachine.start();
  }

  // ==================== 生命周期管理 ====================

  /** 存储初始化参数，用于重置时复用 */
  private initializationData: SimulatorWithRelations | null = null;

  /**
   * 初始化引擎（必须提供数据）
   */
  initialize(data: SimulatorWithRelations): void {
    if (this.getSMState() === "initialized") {
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
        this.addMember("campA", team.id, member, 0);
      });
    });

    // 添加阵营B
    this.addCamp("campB");
    data.campB.forEach((team) => {
      this.addTeam("campB", team);
      team.members.forEach((member) => {
        this.addMember("campB", team.id, member, 0);
      });
    });

    console.log("GameEngine: 数据初始化完成");
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

  /**
   * 获取当前引擎状态机状态
   *
   * */
  public getSMState(): EngineState {
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
  public getInitializationData(): SimulatorWithRelations | null {
    return this.initializationData;
  }

  // ===============================  外部方法 ===============================

  /**
   * 创建当前帧的高频快照
   * 用于 frame_snapshot 通道（UI 实时渲染 & 技能栏状态）
   */
  public createFrameSnapshot(): FrameSnapshot {
    const frameNumber = this.getCurrentFrame();
    const timestamp = performance.now();

    const primaryTargetId = this.memberManager.getPrimaryTarget();

    // 引擎级状态
    const frameLoopStats = this.frameLoop.getFrameLoopStats();

    // 所有成员的高频视图
    const members = this.memberManager.getAllMembers().map((member) => {
      const hpCurrent = member.statContainer?.getValue("hp.current") ?? 0;
      const hpMax = member.statContainer?.getValue("hp.max") ?? 0;
      const mpCurrent = member.statContainer?.getValue("mp.current") ?? 0;
      const mpMax = member.statContainer?.getValue("mp.max") ?? 0;

      return {
        id: member.id,
        type: member.type,
        name: member.name,
        isAlive: member.isAlive,
        position: member.position,
        campId: member.campId,
        teamId: member.teamId,
        targetId: member.targetId ?? null,
        hp: {
          current: hpCurrent,
          max: hpMax,
        },
        mp: {
          current: mpCurrent,
          max: mpMax,
        },
      };
    });

    // 当前选中成员详细视图（属性 + Buff）
    let selectedMemberDetail: { attrs: Record<string, unknown>; buffs?: any[] } | null = null;
    if (primaryTargetId) {
      const selectedMember = this.memberManager.getMember(primaryTargetId);
      if (selectedMember) {
        try {
          const serialized = selectedMember.serialize();
          selectedMemberDetail = {
            attrs: serialized.attrs,
            buffs: serialized.buffs,
          };
        } catch (error) {
          console.warn("创建选中成员详细快照失败:", error);
        }
      }
    }

    let selectedMemberSkills: ComputedSkillInfo[] = [];

    if (primaryTargetId) {
      const member = this.memberManager.getMember(primaryTargetId);
      if (member && member.type === "Player") {
        const player = member as Player;
        try {
          selectedMemberSkills = this.computePlayerSkills(player, frameNumber);
        } catch (error) {
          console.warn("计算选中成员技能数据失败:", error);
          selectedMemberSkills = [];
        }
      }
    }

    return {
      frameNumber,
      timestamp,
      engine: {
        frameNumber,
        runTime: performance.now() - this.startTime,
        fps: frameLoopStats.averageFPS,
      },
      members,
      selectedMemberId: primaryTargetId ?? null,
      selectedMemberSkills,
      selectedMemberDetail,
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

  // ==================== 状态查询 ====================

  /**
   * 检查引擎是否正在运行
   *
   * @returns 是否运行中
   */
  isRunning(): boolean {
    return this.getSMState() === "running";
  }

  /**
   * 获取引擎统计信息
   *
   * @returns 统计信息
   */
  getStats(): EngineStats {
    const runTime = performance.now() - this.startTime;

    return {
      SMState: this.getSMState(),
      currentFrame: this.getCurrentFrame(),
      runTime,
      members: this.getAllMemberData(),
      eventQueueStats: this.eventQueue.getStats(),
      frameLoopStats: this.frameLoop.getFrameLoopStats(),
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
  insertEvent(event: QueueEvent): boolean {
    return this.eventQueue.insert(event);
  }

  // ==================== 子组件功能封装：帧推进功能 ====================

  /**
   * 启动帧循环
   */
  start(): void {
    if (this.getSMState() === "running") {
      console.warn("GameEngine: 引擎已在运行中");
      return;
    }

    this.startTime = performance.now();

    // 启动帧循环
    this.frameLoop.start();
  }

  /**
   * 停止帧循环
   */
  stop(): void {
    if (this.getSMState() === "stopped") {
      console.log("GameEngine: 引擎已停止");
      return;
    }

    // 停止帧循环
    this.frameLoop.stop();
  }

  /**
   * 暂停帧循环
   */
  pause(): void {
    if (this.getSMState() === "paused") {
      console.warn("GameEngine: 引擎已暂停");
      return;
    }

    // 暂停帧循环
    this.frameLoop.pause();
  }

  /**
   * 恢复帧循环
   */
  resume(): void {
    if (this.getSMState() === "running") {
      console.warn("GameEngine: 引擎已在运行中");
      return;
    }

    // 恢复帧循环
    this.frameLoop.resume();
  }

  /**
   * 单步推进帧
   */
  step(): void {
    if (this.getSMState() === "running") {
      console.warn("GameEngine: 引擎正在运行，无法单步执行");
      return;
    }

    this.frameLoop.step();
  }

  /**
   * 获取当前帧号
   */
  getCurrentFrame(): number {
    return this.currentFrame;
  }

  // ==================== 子组件功能封装：成员管理 ====================

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
   * @param characterIndex 角色索引
   */
  addMember(campId: string, teamId: string, memberData: MemberWithRelations, characterIndex: number): void {
    // 容器只负责委托，不处理具体创建逻辑
    const member = this.memberManager.createAndRegister(memberData, campId, teamId, characterIndex);
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

  // ==================== 子组件功能封装：消息路由 ====================

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

  // ==================== 子组件功能封装：JS编译和执行 ====================

  /**
   * 编译脚本代码为可执行的 JS 片段（仅负责编译，不执行）
   *
   * 用于引擎内部脚本执行场景：
   * - 输入原始 JS 片段和成员/目标信息
   * - 基于成员的 dataSchema 进行属性访问重写与验证
   * - 返回可直接在运行时执行的 compiledCode 字符串
   */
  compileScript(code: string, memberId: string, targetId?: string): string {
    const member = this.memberManager.getMember(memberId);
    if (!member) {
      throw new Error(`成员不存在: ${memberId}`);
    }

    const compiledResult = this.jsProcessor.compileWithCache(code, {
      memberId,
      targetId,
      schema: member.dataSchema,
      options: { enableValidation: true },
    });

    if (!compiledResult.success) {
      throw new Error(`脚本编译失败: ${compiledResult.error}`);
    }

    return compiledResult.compiledCode;
  }

  /**
   * 执行JS代码，若未缓存，则先编译再执行
   *
   * @param code 编译后的代码
   * @param context 执行上下文
   * @returns 执行结果
   */
  executeScript(code: string, context: ExpressionContext): any {
    try {
      const memberId = context.casterId;
      const targetId = context.targetId;

      if (!memberId) {
        throw new Error("缺少成员ID");
      }

      // 在统一的运行时包装下执行（使用 with(ctx) 暴露字段）
      const runner = this.createExpressionRunner(code);
      const result = runner(context);

      // console.log(`✅ JS脚本执行成功: ${memberId}, 结果:`, result);
      return result;
    } catch (error) {
      console.error("JS脚本执行失败:", error);
      console.error("编译后的代码:", code);
      console.error("执行上下文:", context);
      throw new Error(`脚本执行失败: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * 为编译后的 JS 代码创建统一的执行函数
   *
   * 约定：
   * - 所有由 JSProcessor 编译得到的代码，签名均为 (ctx) => any
   * - 这里统一使用 `with (ctx) { ... }` 将 ctx 的字段暴露为“局部变量”
   *   这样表达式既可以写 `ctx.currentFrame`，也可以直接写 `currentFrame`
   */
  createExpressionRunner(compiledCode: string): (ctx: ExpressionContext) => any {
    const wrappedCode = `
      with (ctx) {
        ${compiledCode}
      }
    `;
    // new Function 用于在 Worker 沙盒中执行已编译代码，受 JSProcessor 约束
    return new Function("ctx", wrappedCode) as (ctx: ExpressionContext) => any;
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

      // 使用 JSProcessor 编译表达式（带内部缓存）
      const compiledResult = this.jsProcessor.compileWithCache(expression, {
        memberId,
        targetId: context.targetId,
        schema: member.dataSchema,
        options: { enableValidation: true },
      });

      if (!compiledResult.success) {
        throw new Error(`表达式编译失败: ${compiledResult.error}`);
      }

      // 执行编译后的表达式，确保 context 包含 engine 引用
      // 注意：self 对象已由 JSProcessor 在编译时注入，可直接使用 self.buffManager
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
    const stats = this.jsProcessor.getCacheStats();
    // 目前只暴露 cacheSize，cacheKeys 保持为空列表以兼容旧接口
    return {
      cacheSize: stats.cacheSize,
      cacheKeys: [],
    };
  }

  /**
   * 清理编译缓存
   * 用于内存管理
   */
  clearCompilationCache(): void {
    this.jsProcessor.clearCache();
    console.log("🧹 JS编译缓存已清理");
  }

  /**
   * 开始一个帧内任务，返回任务ID
   *
   * 目前作为简单计数器实现，用于防止跨帧未完成任务；后续可按需扩展来源追踪等调试信息。
   */
  beginFrameTask(taskId?: string, _meta: { source?: string } = {}): string {
    const id = taskId ?? createId();
    this.pendingFrameTasksCount += 1;
    return id;
  }

  /**
   * 标记帧内任务完成
   */
  endFrameTask(_taskId: string): void {
    if (this.pendingFrameTasksCount > 0) {
      this.pendingFrameTasksCount -= 1;
    }
  }

  /**
   * 分发成员跨帧调度事件
   *
   * 说明：
   * - 这是从主线程 / 行为树等地方向成员 FSM 发送跨帧调度事件的统一入口
   * - 实际上是往 EventQueue 写入一条 `member_fsm_event`，由 `stepFrame` 在对应帧消费
   *
   * @param memberId      目标成员ID
   * @param eventType     FSM 事件类型（需与状态机定义保持一致）
   * @param payload       附加数据（可选）
   * @param delayFrames   延迟帧数（默认 0，表示当前帧）
   * @param skillId       关联技能ID（可选，用于调试）
   * @param meta          调试元信息（例如 source）
   */
  dispatchMemberEvent(
    memberId: string,
    eventType: string,
    payload?: any,
    delayFrames: number = 0,
    skillId?: string,
    meta?: { source?: string },
  ): void {
    const currentFrame = this.getCurrentFrame();
    const executeFrame = currentFrame + Math.max(0, delayFrames);

    this.eventQueue.insert({
      id: createId(),
      type: "member_fsm_event",
      executeFrame,
      insertFrame: currentFrame,
      processed: false,
      payload: {
        targetMemberId: memberId,
        fsmEventType: eventType,
        skillId,
        source: meta?.source ?? "engine.dispatchMemberEvent",
        ...payload,
      },
    });
  }

  // ==================== 单帧执行核心逻辑 ====================

  /**
   * 执行一帧逻辑：事件处理 + 成员更新
   *
   * 由 FrameLoop 调度调用，是引擎级的单帧入口。
   */
  stepFrame(options?: { maxEvents?: number }): FrameStepResult {
    const frameNumber = this.getCurrentFrame();
    const frameStartTime = performance.now();
    const maxEvents = options?.maxEvents ?? Number.MAX_SAFE_INTEGER;

    // 1. 处理当前帧需要执行的事件（目前统一为 member_fsm_event）
    const eventsForFrame = this.eventQueue.getByFrame(frameNumber);
    let eventsProcessed = 0;

    for (const event of eventsForFrame) {
      if (eventsProcessed >= maxEvents) {
        break;
      }

      if (event.type === "member_fsm_event") {
        const payload = (event.payload ?? {}) as any;
        const targetMemberId = payload.targetMemberId as string | undefined;
        const fsmEventType = payload.fsmEventType as string | undefined;

        if (targetMemberId && fsmEventType) {
          const member = this.memberManager.getMember(targetMemberId);
          if (member) {
            // 将队列事件转发为 FSM 事件，由成员自己的状态机处理
            member.actor.send({ type: fsmEventType, data: payload } as any);
          } else {
            console.warn(`⚠️ stepFrame: 目标成员不存在: ${targetMemberId}`);
          }
        } else {
          console.warn("⚠️ stepFrame: member_fsm_event 缺少 targetMemberId 或 fsmEventType", event);
        }
      } else {
        console.warn(`⚠️ stepFrame: 未知事件类型: ${event.type}`);
      }

      this.eventQueue.markAsProcessed(event.id);
      eventsProcessed++;
    }

    // 2. 成员/区域更新（驱动 BT/SM/Buff 等），统一产出 Intent 并执行
    this.world.tick(frameNumber);
    const membersUpdated = this.memberManager.getAllMembers().length;

    const duration = performance.now() - frameStartTime;

    // 3. 检查是否还有本帧待处理事件
    // eventsForFrame 已是当前帧分桶，避免重复取队列
    const hasPendingEvents = eventsForFrame.some((event) => !event.processed);

    const pendingFrameTasks = this.pendingFrameTasksCount;

    // 4. 如果当前帧事件和帧内任务都处理完毕，推进逻辑帧号
    if (!hasPendingEvents && pendingFrameTasks === 0) {
      this.currentFrame = frameNumber + 1;
    }

    return {
      frameNumber,
      duration,
      eventsProcessed,
      membersUpdated,
      hasPendingEvents,
      pendingFrameTasks,
    };
  }

  // ==================== 快照管理 ====================

  /**
   * 获取当前快照
   *
   * @returns 当前战斗快照
   */
  getCurrentSnapshot(): GameEngineSnapshot {
    const members = this.memberManager.getAllMembers();
    const currentFrame = this.frameLoop.getFrameNumber();

    return {
      timestamp: performance.now(),
      frameNumber: currentFrame,
      members: members.map((member) => member.serialize()),
      engine: {
        frameNumber: currentFrame,
        runTime: performance.now() - this.startTime,
        frameLoop: this.frameLoop.getSnapshot(),
        eventQueue: this.eventQueue.getSnapshot(),
        memberCount: members.length,
        activeMemberCount: members.filter((m) => m.isAlive).length,
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
  getSnapshots(): GameEngineSnapshot[] {
    return structuredClone(this.snapshots);
  }

  // ==================== 序列化数据 ====================

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
   * 计算 Player 的技能数据
   * 为每个技能计算当前的消耗值和可用性
   */
  private computePlayerSkills(player: Player, currentFrame: number): ComputedSkillInfo[] {
    try {
      const skillList = player.actionContext.skillList ?? [];
      const skillCooldowns = player.actionContext.skillCooldowns ?? [];
      const currentMp = player.statContainer?.getValue("mp.current") ?? 0;
      const currentHp = player.statContainer?.getValue("hp.current") ?? 0;

      return skillList.map((skill: any, index: number) => {
        const skillName = skill.template?.name ?? "未知技能";
        const skillLevel = skill.lv ?? 0;

        // 查找适用的技能效果
        const effect = skill.template?.effects?.find((e: any) => {
          try {
            const result = this.evaluateExpression(e.condition ?? "true", {
              currentFrame,
              casterId: player.id,
              skillLv: skillLevel,
            });
            return !!result;
          } catch {
            return false;
          }
        });

        // 计算消耗
        let mpCost = 0;
        let hpCost = 0;
        let castingRange: string | null = null;

        if (effect) {
          try {
            mpCost = this.evaluateExpression(effect.mpCost ?? "0", {
              currentFrame,
              casterId: player.id,
              skillLv: skillLevel,
            });
          } catch {
            mpCost = 0;
          }

          try {
            hpCost = this.evaluateExpression(effect.hpCost ?? "0", {
              currentFrame,
              casterId: player.id,
              skillLv: skillLevel,
            });
          } catch {
            hpCost = 0;
          }

          castingRange = effect.castingRange ?? null;
        }

        // 获取冷却状态
        const cooldownRemaining = skillCooldowns[index] ?? 0;

        // 判断是否可用
        const isAvailable = cooldownRemaining <= 0 && currentMp >= mpCost && currentHp >= hpCost;

        return {
          id: skill.id,
          name: skillName,
          level: skillLevel,
          computed: {
            mpCost,
            hpCost,
            castingRange,
            cooldownRemaining,
            isAvailable,
          },
        };
      });
    } catch (error) {
      console.warn("计算玩家技能数据失败:", error);
      return [];
    }
  }
}

// ============================== 导出 ==============================

export default GameEngine;

// 透出类型给主线程 UI 使用
export type { FrameSnapshot as FrameSnapshot, ComputedSkillInfo } from "./types";
