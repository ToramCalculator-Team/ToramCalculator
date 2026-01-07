import type { MemberWithRelations } from "@db/generated/repositories/member";
import type { SimulatorWithRelations } from "@db/generated/repositories/simulator";
import type { TeamWithRelations } from "@db/generated/repositories/team";
import { createId } from "@paralleldrive/cuid2";
import { createActor } from "xstate";
import { EventQueue } from "./EventQueue/EventQueue";
import type { QueueEvent } from "./EventQueue/types";
import { FrameLoop } from "./FrameLoop/FrameLoop";
import { type EngineControlMessage, GameEngineSM } from "./GameEngineSM";
import { JSProcessor } from "./JSProcessor/JSProcessor";
import type { ExpressionContext } from "./JSProcessor/types";
import type { MemberSerializeData } from "./Member/Member";
import type { Player } from "./Member/types/Player/Player";
import { ControlBindingManager } from "./Controller/ControlBindingManager";
import { ControllerRegistry } from "./Controller/ControllerEndpoint";
import { type IntentMessage, type MessageProcessResult, MessageRouter } from "./MessageRouter/MessageRouter";
import type {
	BuffViewDataSnapshot,
	ComputedSkillInfo,
	EngineConfig,
	EngineState,
	EngineStats,
	FrameSnapshot,
	FrameStepResult,
	GameEngineSnapshot,
} from "./types";
import { World } from "./World/World";

/**
 * 扩展 globalThis 类型，添加测试环境标记
 */
declare global {
	var __ALLOW_GAMEENGINE_IN_MAIN_THREAD: boolean | undefined;
}
/**
 * 游戏引擎类
 */
export class GameEngine {
	// ==================== 核心模块 ====================

	/** 引擎状态机 */
	private stateMachine: ReturnType<typeof createActor<typeof GameEngineSM>>;

	/** 世界 - 资产管理 */
	private world: World;

	/** 事件队列 - 管理时间片段事件 */
	private eventQueue: EventQueue;

	/** 消息路由器 - 分发外部指令 */
	private messageRouter: MessageRouter;

	/** 控制绑定管理器 */
	private bindingManager: ControlBindingManager;

	/** 控制器注册表 */
	private controllerRegistry: ControllerRegistry;

	/** 帧循环 - 推进时间和调度事件 */
	private frameLoop: FrameLoop;

	/** JS表达式处理器 - 负责编译JS代码 */
	private jsProcessor: JSProcessor;

	/** 引擎配置 */
	private config: EngineConfig;

	/** 开始时间戳 */
	private startTime: number = 0;

	/** 当前逻辑帧号 */
	private currentFrame: number = 0;

	/** 快照历史 */
	private snapshots: GameEngineSnapshot[] = [];

	/** 统计信息 */
	private stats = {
		totalSnapshots: 0,
		totalEventsProcessed: 0,
		totalMessagesProcessed: 0,
	};

	// ==================== 通信 ====================

	/** 渲染消息发送器 - 用于发送渲染指令到主线程 */
	private renderMessageSender: ((payload: unknown) => void) | null = null;
	/** 系统消息发送器 - 用于发送系统指令到主线程 */
	private systemMessageSender: ((payload: unknown) => void) | null = null;
	/** 帧快照发送器 - 用于发送帧快照到主线程 */
	private frameSnapshotSender: ((snapshot: FrameSnapshot) => void) | null = null;
	/** 对端通信发送器 - 用于向 controller 状态机发送消息 */
	private sendToPeer?: (command: EngineControlMessage) => void;

	/** 当前挂起的帧内任务数量（用于防止跨帧未完成任务） */
	private pendingFrameTasksCount: number = 0;

	// ==================== 静态方法 ====================

	/**
	 * 为测试环境启用GameEngine（仅用于测试）
	 * ⚠️ 警告：这会绕过安全检查，仅在测试中使用
	 */
	static enableForTesting(): void {
		globalThis.__ALLOW_GAMEENGINE_IN_MAIN_THREAD = true;
		console.warn("⚠️ GameEngine测试模式已启用 - 仅用于测试环境！");
	}

	/**
	 * 禁用测试环境的GameEngine（恢复安全检查）
	 */
	static disableForTesting(): void {
		delete globalThis.__ALLOW_GAMEENGINE_IN_MAIN_THREAD;
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
		this.eventQueue = new EventQueue(config.eventQueueConfig, () => this.currentFrame);
		
		// 初始化控制器相关组件
		this.bindingManager = new ControlBindingManager();
		this.controllerRegistry = new ControllerRegistry();
		
		// 注入引擎和绑定管理器到消息路由器
		this.messageRouter = new MessageRouter(this, this.bindingManager);
		this.frameLoop = new FrameLoop(this, this.config.frameLoopConfig); // 注入引擎
		this.jsProcessor = new JSProcessor(); // 初始化JS表达式处理器

		// World 相关

		this.world = new World(this.renderMessageSender);

		// 创建状态机 - executor 角色
		let seqCounter = 0;
		this.stateMachine = createActor(GameEngineSM, {
			input: {
				role: "executor",
				threadName: "worker", // 标识 Worker 线程
				peer: {
					send: (command: EngineControlMessage) => {
						if (this.sendToPeer) {
							this.sendToPeer(command);
						} else {
							console.warn(
								"GameEngine: sendToPeer 未设置，忽略命令:",
								command,
								"当前状态:",
								this.stateMachine.getSnapshot().value,
								);
						}
					},
				},
				engine: this,
				controller: undefined,
				nextSeq: () => ++seqCounter,
				newCorrelationId: () => createId(),
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
		this.world.clear();

		// 清理事件队列
		this.eventQueue.clear();

		// 清理渲染消息发送器
		this.renderMessageSender = null;
		this.systemMessageSender = null;
		this.frameSnapshotSender = null;

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
			case "initializing":
				return "unInitialized";
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

		// 引擎级状态
		const frameLoopStats = this.frameLoop.getFrameLoopStats();

		// 所有成员的高频视图
		const members = this.world.memberManager.getAllMembers().map((member) => {
			const hpCurrent = member.statContainer?.getValue("hp.current") ?? 0;
			const hpMax = member.statContainer?.getValue("hp.max") ?? 0;
			const mpCurrent = member.statContainer?.getValue("mp.current") ?? 0;
			const mpMax = member.statContainer?.getValue("mp.max") ?? 0;

			return {
				id: member.id,
				type: member.type,
				name: member.name,
				position: member.position,
				campId: member.campId,
				teamId: member.teamId,
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

		// 多控制器：按 controller 生成绑定成员视图（挂到同一个 FrameSnapshot 上，作为可选字段）
		// 注意：controllerId 的来源必须以 binding 为准（绑定即存在），而不是 ControllerRegistry（那是 endpoint 注册表）
		const controllerIds = this.bindingManager.getAllControllerIds();
		const byController: NonNullable<FrameSnapshot["byController"]> = {};
		for (const controllerId of controllerIds) {
			const boundMemberId = this.bindingManager.getBoundMemberId(controllerId) ?? null;

			let boundMemberDetail:
				| {
						attrs: Record<string, unknown>;
						buffs?: BuffViewDataSnapshot[];
				  }
				| null = null;
			let boundMemberSkills: ComputedSkillInfo[] = [];

			if (boundMemberId) {
				const boundMember = this.world.memberManager.getMember(boundMemberId);
				if (boundMember) {
					try {
						const serialized = boundMember.serialize();
						boundMemberDetail = { attrs: serialized.attrs };
					} catch (error) {
						console.warn(`创建控制器 ${controllerId} 绑定成员详细快照失败:`, error);
					}

					// 计算技能（仅 Player 类型）
					if (boundMember.type === "Player") {
						const player = boundMember as Player;
						boundMemberSkills = this.computePlayerSkills(player, frameNumber);
					}
				}
			}

			byController[controllerId] = {
				boundMemberId,
				boundMemberDetail,
				boundMemberSkills,
			};
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
			byController: controllerIds.length > 0 ? byController : undefined,
		};
	}

	/**
	 * 发送帧快照到主线程
	 * 通过注入的发送器发送帧快照
	 */
	public sendFrameSnapshot(snapshot: FrameSnapshot): void {
		if (!this.frameSnapshotSender) {
			console.warn("GameEngine: 帧快照发送器未设置，无法发送帧快照");
			return;
		}

		try {
			this.frameSnapshotSender(snapshot);
		} catch (error) {
			console.error("GameEngine: 发送帧快照失败:", error);
		}
	}


	/**
	 * 发送命令到引擎状态机
	 */
	sendCommand(command: EngineControlMessage): void {
		this.stateMachine.send(command);
	}

	/**
	 * 设置对端通信发送器
	 */
	setMirrorSender(sender: (command: EngineControlMessage) => void): void {
		this.sendToPeer = sender;
	}

	/**
	 * 设置渲染消息发送器
	 *
	 * @param sender 渲染消息发送函数，通常由Worker环境中的MessagePort提供
	 */
	setRenderMessageSender(sender: (payload: unknown) => void): void {
		this.renderMessageSender = sender;
	}

	/**
	 * 设置系统消息发送器
	 *
	 * @param sender 系统消息发送函数，用于发送系统级事件到控制器
	 */
	setSystemMessageSender(sender: (payload: unknown) => void): void {
		this.systemMessageSender = sender;
	}

	/**
	 * 设置帧快照发送器
	 *
	 * @param sender 帧快照发送函数，用于发送帧快照到主线程
	 */
	setFrameSnapshotSender(sender: (snapshot: FrameSnapshot) => void): void {
		this.frameSnapshotSender = sender;
	}

	/**
	 * 发送渲染指令到主线程
	 *
	 * @param payload 渲染指令负载，可以是单个指令或指令数组
	 */
	postRenderMessage(payload: unknown): void {
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
	postSystemMessage(payload: unknown): void {
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
		this.world.memberManager.addCamp(campId);
	}

	/**
	 * 添加队伍
	 *
	 * @param campId 阵营ID
	 * @param teamData 队伍数据
	 */
	addTeam(campId: string, teamData: TeamWithRelations): void {
		this.world.memberManager.addTeam(campId, teamData);
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
		this.world.memberManager.createAndRegister(memberData, campId, teamId, characterIndex);
	}

	/**
	 * 获取所有成员
	 *
	 * @returns 成员数组
	 */
	getAllMembers() {
		return this.world.memberManager.getAllMembers();
	}

	/**
	 * 查找成员
	 *
	 * @param memberId 成员ID
	 * @returns 成员实例
	 */
	getMember(memberId: string) {
		return this.world.memberManager.getMember(memberId);
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
	 * 计算表达式
	 *
	 * @param expression 表达式字符串（可以是 transform 后的，也可以包含 self/target 访问）
	 * @param context 计算上下文
	 * @returns 计算结果
	 */
	evaluateExpression(expression: string, context: ExpressionContext): number | boolean {
		try {
			const memberId = context.casterId;
			if (!memberId) {
				throw new Error("缺少成员ID");
			}

			const self = this.world.memberManager.getMember(memberId);
			if (!self) {
				throw new Error(`成员不存在: ${memberId}`);
			}

			const target = context.targetId
				? this.world.memberManager.getMember(context.targetId)
				: undefined;

			// 表达式用的对象包装：避免直接污染 Member 实例，同时保留原型链/方法
			const selfExpr = Object.create(self) as typeof self & {
				hasBuff?: (id: string) => boolean;
				hasDebuff?: (id: string) => boolean;
			};
			selfExpr.hasBuff = (id: string) => self.btManager.hasBuff(id);
			selfExpr.hasDebuff = (_id: string) => false;

			const targetExpr = target
				? (Object.create(target) as typeof target & {
						hasBuff?: (id: string) => boolean;
						hasDebuff?: (id: string) => boolean;
					})
				: undefined;
			if (targetExpr && target) {
				targetExpr.hasBuff = (id: string) => target.btManager.hasBuff(id);
				targetExpr.hasDebuff = (_id: string) => false;
			}

			// 确保 context 包含 engine/self/target 引用（表达式里可直接使用 self/target）
			const executionContext: ExpressionContext = {
				...context,
				engine: this,
				self: selfExpr,
				target: targetExpr,
				/**
				 * 表达式运行时 API：查询 Buff 状态
				 *
				 * 约定：
				 * - `hasBuff('id')` 默认查询 self（施法者/当前计算主体）
				 * - `self.hasBuff('id')` / `target.hasBuff('id')` 也可用（向后兼容写法）
				 */
				hasBuff: (id: string): boolean => self.btManager.hasBuff(id),
				hasDebuff: (_id: string): boolean => false,
			};

			const evalResult = this.jsProcessor.evaluateNumberOrBoolean(
				expression,
				executionContext,
				{
					cacheScope: `${memberId}_${context.targetId ?? "-"}`,
					schemas: {
						self: self.dataSchema,
						target: target?.dataSchema,
					},
				},
			);
			if (!evalResult.success) {
				throw new Error(evalResult.error ?? "表达式求值失败");
			}
			return evalResult.result ?? 0;
		} catch (error) {
			console.error(`表达式计算失败: ${expression}`, error);
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
	 * @param meta          调试元信息（例如 source）
	 */
	dispatchMemberEvent(
		memberId: string,
		eventType: string,
		payload?: Record<string, unknown>,
		delayFrames: number = 0,
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
				targetMemberId: memberId,
				fsmEventType: eventType,
			source: meta?.source ?? "未知来源",
			payload,
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
		const maxEvents = options?.maxEvents ?? 100;

		// 1. 处理当前帧需要执行的事件（目前统一为 member_fsm_event）
		const eventsForFrame = this.eventQueue.getByFrame(frameNumber);
		let eventsProcessed = 0;

		for (const event of eventsForFrame) {
			if (eventsProcessed >= maxEvents) {
				break;
			}

			switch (event.type) {
				case "member_fsm_event":
					{
						const payload = event.payload;
						const targetMemberId = event.targetMemberId;
						const fsmEventType = event.fsmEventType;

					const member = this.world.memberManager.getMember(targetMemberId);
					if (member) {
						// 将队列事件转发为 FSM 事件，由成员自己的状态机处理
							member.actor.send({ type: fsmEventType, data: payload });
					} else {
						console.warn(`⚠️ stepFrame: 目标成员不存在: ${targetMemberId}`);
					}
				}
					break;
				default:
				console.warn(`⚠️ stepFrame: 未知事件类型: ${event.type}`);
					break;
			}

			this.eventQueue.markAsProcessed(event.id);
			eventsProcessed++;
		}

		// 2. 成员/区域更新（驱动 BT/SM/Buff 等）
		this.world.tick(frameNumber);
		const membersUpdated = this.world.memberManager.getAllMembers().length;

		const duration = performance.now() - frameStartTime;

		// 3. 检查是否还有本帧待处理事件，禁止往当前帧插入事件的情况下，目前只需要考虑maxEvents限流
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
		const members = this.world.memberManager.getAllMembers();
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
		return this.world.memberManager.getMember(memberId)?.serialize();
	}

	/**
	 * 获取所有成员数据（外部使用 - 序列化）
	 *
	 * @returns 所有成员数据数组
	 */
	getAllMemberData(): MemberSerializeData[] {
		return this.world.memberManager.getAllMembers().map((member) => member.serialize());
	}

	/**
	 * 按阵营获取成员数据（外部使用 - 序列化）
	 *
	 * @param campId 阵营ID
	 * @returns 指定阵营的成员数据数组
	 */
	getMembersByCamp(campId: string): MemberSerializeData[] {
		return this.world.memberManager.getMembersByCamp(campId).map((member) => member.serialize());
	}

	/**
	 * 按队伍获取成员数据（外部使用 - 序列化）
	 *
	 * @param teamId 队伍ID
	 * @returns 指定队伍的成员数据数组
	 */
	getMembersByTeam(teamId: string): MemberSerializeData[] {
		return this.world.memberManager.getMembersByTeam(teamId).map((member) => member.serialize());
	}

	// ==================== 依赖注入支持 ====================

	/**
	 * 获取事件队列实例
	 */
	getEventQueue(): EventQueue {
		return this.eventQueue;
	}

	/**
	 * 获取世界实例
	 */
	getWorld(): World {
		return this.world;
	}

	/**
	 * 获取控制绑定管理器
	 */
	getBindingManager(): ControlBindingManager {
		return this.bindingManager;
	}

	/**
	 * 获取控制器注册表
	 */
	getControllerRegistry(): ControllerRegistry {
		return this.controllerRegistry;
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
			typeof globalThis !== "undefined" && globalThis.__ALLOW_GAMEENGINE_IN_MAIN_THREAD === true;

		// 检查是否在沙盒Worker中（有safeAPI标记）
		const isSandboxWorker = typeof globalThis !== "undefined" && globalThis.safeAPI;

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
			const skillList = player.runtimeContext.skillList ?? [];
			const skillCooldowns = player.runtimeContext.skillCooldowns ?? [];
			const currentMp = player.statContainer?.getValue("mp.current") ?? 0;
			const currentHp = player.statContainer?.getValue("hp.current") ?? 0;

		return skillList.map((skill, index) => {
				const skillName = skill.template?.name ?? "未知技能";
				const skillLevel = skill.lv ?? 0;

				// 查找适用的技能效果
			const effect = skill.template?.effects?.find((e) => {
					try {
					const result = this.evaluateExpression(e.condition, {
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
			let castingRange = 0;

				if (effect) {
				const mpCostResult = this.evaluateExpression(effect.mpCost ?? "0", {
							currentFrame,
							casterId: player.id,
							skillLv: skillLevel,
						});
				if (typeof mpCostResult !== "number") {
					throw new Error(`表达式: ${effect.mpCost} 执行结果不是数字`);
					}
				mpCost = mpCostResult;
				const hpCostResult = this.evaluateExpression(effect.hpCost ?? "0", {
							currentFrame,
							casterId: player.id,
							skillLv: skillLevel,
						});
				if (typeof hpCostResult !== "number") {
					throw new Error(`表达式: ${effect.hpCost} 执行结果不是数字`);
				}
				hpCost = hpCostResult;
				const castingRangeResult = this.evaluateExpression(effect.castingRange ?? "0", {
					currentFrame,
					casterId: player.id,
					skillLv: skillLevel,
				});
				if (typeof castingRangeResult !== "number") {
					throw new Error(`表达式: ${effect.castingRange} 执行结果不是数字`);
				}
				castingRange = castingRangeResult;
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
	}
}

// // 透出类型给主线程 UI 使用
export type { ComputedSkillInfo, FrameSnapshot } from "./types";
