import type { MemberWithRelations } from "@db/generated/repositories/member";
import type { TeamWithRelations } from "@db/generated/repositories/team";
import { createId } from "@paralleldrive/cuid2";
import { type Actor, createActor } from "xstate";
import { createLogger } from "~/lib/Logger";
import type { RenderSnapshot, RenderSnapshotArea } from "../render/RendererProtocol";
import { ControlBindingManager } from "./Controller/ControlBindingManager";
import { ControllerRegistry } from "./Controller/ControllerEndpoint";
import { ControllerEventProjector } from "./DomainEvents/ControllerEventProjector";
import { DomainEventBus } from "./DomainEvents/DomainEventBus";
import { EventQueue } from "./EventQueue/EventQueue";
import type { QueueEvent } from "./EventQueue/types";
import { ExpressionEvaluator } from "./Expression/ExpressionEvaluator";
import { FrameLoop } from "./FrameLoop/FrameLoop";
import type { FrameLoopSnapshot, FrameLoopStats, FrameLoopTick } from "./FrameLoop/types";
import { type EngineControlMessage, GameEngineSM } from "./GameEngineSM";
import type { JSProcessor } from "./JSProcessor/JSProcessor";
import type { ExpressionContext } from "./JSProcessor/types";
import { type IntentMessage, type MessageProcessResult, MessageRouter } from "./MessageRouter/MessageRouter";
import type { PipelineRegistry } from "./Pipline/PipelineRegistry";
import type { StagePool } from "./Pipline/types";
import type {
	BuffViewDataSnapshot,
	ComputedSkillInfo,
	ControllerDomainEvent,
	EngineCheckpoint,
	EngineConfig,
	EngineInfrastructure,
	EngineScenarioData,
	EngineState,
	EngineStats,
	FrameSnapshot,
	FrameStepResult,
	GameEngineSnapshot,
	MemberDomainEvent,
	RuntimeConfig,
} from "./types";
import { createRealtimeConfig } from "./types";
import type { MemberSerializeData } from "./World/Member/Member";
import type { MemberContext } from "./World/Member/MemberContext";
import type { Player } from "./World/Member/types/Player/Player";
import { World } from "./World/World";

const log = createLogger("GameEngine");

/**
 * FAST_FORWARD 使用分片推进，避免长时间独占 Worker 事件循环。
 * 说明：
 * - 每个 slice 最多推进固定数量的逻辑帧
 * - 每个 slice 也受真实时间预算约束，保证 pause / stop 能尽快生效
 */
const FAST_FORWARD_MAX_FRAMES_PER_SLICE = 120;
const FAST_FORWARD_MAX_SLICE_TIME_MS = 8;

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
	private stateMachine: Actor<typeof GameEngineSM>;

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

	/** 域事件总线 */
	private domainEventBus: DomainEventBus;

	/** 控制器事件投影器 */
	private controllerEventProjector: ControllerEventProjector;

	/** 帧循环 - 推进时间和调度事件 */
	private frameLoop: FrameLoop;

	/** JS表达式处理器 - 负责编译JS代码 */
	private jsProcessor: JSProcessor;
	/** 表达式求值器 - 负责 self/target/world 绑定 */
	private expressionEvaluator: ExpressionEvaluator;
	/** 引擎级管线定义仓库 */
	private pipelineRegistry: PipelineRegistry<MemberContext, StagePool<MemberContext>>;

	/** 引擎配置 */
	private config: EngineConfig;

	/** 存储场景配置参数，用于重置时复用 */
	private scenarioData: EngineScenarioData | null = null;

	/**
	 * 引擎运行配置。
	 * 它决定“连续运行由谁驱动”，而不是简单透传给底层时钟。
	 */
	private runtimeConfig: RuntimeConfig = createRealtimeConfig();

	/**
	 * 引擎运行会话状态。
	 * - idle: 已构造，Infrastructure 就绪，未加载仿真数据（可响应静态查询）
	 * - ready: 已加载场景数据（loadScenario 完成），等待 start
	 * - running: 正在运行仿真
	 * - paused: 仿真暂停
	 */
	private runState: "idle" | "ready" | "running" | "paused" = "idle";

	/** 开始时间戳 */
	private startTime: number = 0;

	/** 当前逻辑帧号 */
	private currentFrame: number = 0;

	/**
	 * 引擎级循环统计。
	 * 说明：
	 * - 对外暴露“实际完成了多少逻辑帧”
	 * - 与 FrameLoop 的底层时钟统计分离，但复用同一个结构以保持接口兼容
	 */
	private frameLoopStats: FrameLoopStats = {
		averageFPS: 0,
		totalFrames: 0,
		totalRunTime: 0,
		clockKind: "manual",
		skippedFrames: 0,
		timeoutFrames: 0,
	};

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

	/**
	 * 快照观察器。
	 * 说明：
	 * - 快照节流属于引擎观察职责，不再放在底层时钟里
	 * - 第一轮仍保持默认关闭，避免引入额外高频负载
	 */
	private snapshotObserver = {
		snapshotFPS: 0,
		snapshotIntervalMs: Number.POSITIVE_INFINITY,
		lastSnapshotTime: 0,
	};

	/**
	 * fast-forward 使用的分片定时器。
	 * 用 setTimeout(0) 而不是无限 while，是为了让 pause / stop 有机会插队生效。
	 */
	private fastForwardTimer: number | null = null;

	// ==================== 静态方法 ====================

	/**
	 * 为测试环境启用GameEngine（仅用于测试）
	 * ⚠️ 警告：这会绕过安全检查，仅在测试中使用
	 */
	static enableForTesting(): void {
		globalThis.__ALLOW_GAMEENGINE_IN_MAIN_THREAD = true;
		log.warn("⚠️ GameEngine测试模式已启用 - 仅用于测试环境！");
	}

	/**
	 * 禁用测试环境的GameEngine（恢复安全检查）
	 */
	static disableForTesting(): void {
		delete globalThis.__ALLOW_GAMEENGINE_IN_MAIN_THREAD;
		log.info("✅ GameEngine安全检查已恢复");
	}

	// ==================== 构造函数 ====================

	/**
	 * 构造函数
	 *
	 * @param config 引擎配置
	 * @param infra 长期驻留的基础设施（JSProcessor、PipelineRegistry），由 Worker 级持有
	 */
	constructor(config: EngineConfig, infra: EngineInfrastructure) {
		console.log("================= GameEngine constructor ==================");

		// 🛡️ 安全检查：只允许在Worker线程中创建GameEngine
		this.validateWorkerContext();

		this.config = config;

		// 接收外部注入的基础设施（跨 reset/cleanup 存活）
		this.jsProcessor = infra.jsProcessor;
		this.pipelineRegistry = infra.pipelineRegistry;

		// 初始化核心模块 - 按依赖顺序
		this.eventQueue = new EventQueue(config.eventQueueConfig, () => this.currentFrame);

		// 初始化控制器相关组件
		this.bindingManager = new ControlBindingManager();
		this.controllerRegistry = new ControllerRegistry();

		// 初始化域事件系统
		this.domainEventBus = new DomainEventBus();
		this.controllerEventProjector = new ControllerEventProjector(this.bindingManager);

		// 订阅域事件总线，将事件投影为控制器事件
		this.domainEventBus.subscribe((event) => {
			this.controllerEventProjector.project(event);
		});

		// 注入引擎和绑定管理器到消息路由器
		this.messageRouter = new MessageRouter(this, this.bindingManager);
		this.frameLoop = new FrameLoop(this.config.frameLoopConfig);

		// World 相关
		this.world = new World(this.renderMessageSender);

		// 初始化表达式求值器（把 world/self/target 绑定收敛到一个服务）
		this.expressionEvaluator = new ExpressionEvaluator({
			jsProcessor: this.jsProcessor,
			getMemberById: (id) => this.world.memberManager.getMember(id),
		});

		// 设置域事件发射器到 MemberManager
		this.world.memberManager.setDomainEventSender((event) => {
			this.emitDomainEvent(event);
		});
		// 设置表达式求值器到 MemberManager（成员创建时会注入到成员 context.expressionEvaluator）
		this.world.memberManager.setEvaluateExpression((expression, context) =>
			this.expressionEvaluator.evaluateNumberOrBoolean(expression, context),
		);
		// 设置引擎帧号读取函数到 MemberManager（引擎帧号为唯一真相）
		this.world.memberManager.setGetCurrentFrame(() => this.getCurrentFrame());
		// 设置伤害请求处理器到 MemberManager（成员创建时会注入到成员 context.damageRequestHandler）
		this.world.memberManager.setDamageRequestHandler((damageRequest) => {
			this.world.areaManager.damageAreaSystem.add(damageRequest);
		});
		// 设置引擎级 pipeline registry 到 MemberManager（成员创建时会注入到成员级执行器）
		this.world.memberManager.setPipelineRegistry(this.pipelineRegistry);

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
							log.warn(
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

	/**
	 * 加载仿真场景数据，将引擎从 idle 转为 ready。
	 * 重建仿真层（World、EventQueue 等），但复用 Infrastructure 的编译缓存。
	 */
	loadScenario(data: EngineScenarioData): void {
		if (this.runState === "running" || this.runState === "paused") {
			this.stop();
		}

		this.scenarioData = data;

		this.startTime = performance.now();
		this.currentFrame = 0;
		this.pendingFrameTasksCount = 0;
		this.resetEngineFrameLoopStats("manual");
		this.resetSnapshotObserver();
		this.snapshots = [];
		this.stats = {
			totalSnapshots: 0,
			totalEventsProcessed: 0,
			totalMessagesProcessed: 0,
		};

		// 清理上一个场景的世界数据
		this.world.clear();
		this.eventQueue.clear();

		// 添加阵营A
		this.addCamp("campA");
		data.simulator.campA.forEach((team) => {
			this.addTeam("campA", team);
			team.members.forEach((member) => {
				this.addMember("campA", team.id, member, 0);
			});
		});

		// 添加阵营B
		this.addCamp("campB");
		data.simulator.campB.forEach((team) => {
			this.addTeam("campB", team);
			team.members.forEach((member) => {
				this.addMember("campB", team.id, member, 0);
			});
		});

		this.runState = "ready";
		log.info("GameEngine: 场景数据已加载，引擎就绪");
	}

	/**
	 * 重置引擎：清理仿真层，保留 Infrastructure 编译缓存。
	 * 如果有存储的场景数据则重新加载（→ ready），否则回到 idle。
	 */
	reset(): void {
		this.stop();

		if (this.scenarioData) {
			this.loadScenario(this.scenarioData);
		} else {
			this.world.clear();
			this.eventQueue.clear();
			this.currentFrame = 0;
			this.snapshots = [];
			this.runState = "idle";
		}

		log.info("GameEngine: 引擎已重置");
	}

	/**
	 * 切换仿真配置描述符（mode/stop/output/probe 等）。
	 * 仅在 idle / ready 状态下允许切换，运行中切换需先 stop。
	 */
	setRuntimeConfig(config: RuntimeConfig): void {
		if (this.runState === "running" || this.runState === "paused") {
			log.warn("GameEngine: 运行中/暂停中无法切换 runtimeConfig，请先 stop");
			return;
		}
		this.runtimeConfig = config;
		log.info(`GameEngine: runtimeConfig 已切换 (driveMode=${config.driveMode}, exec=${config.executionSemantics})`);
	}

	getRuntimeConfig(): RuntimeConfig {
		return { ...this.runtimeConfig };
	}

	/**
	 * 清理仿真层资源，保留 Infrastructure（JSProcessor、PipelineRegistry）。
	 * 清理后引擎回到 idle 状态。
	 */
	cleanup(): void {
		this.stop();

		this.world.clear();
		this.eventQueue.clear();

		this.renderMessageSender = null;
		this.systemMessageSender = null;
		this.frameSnapshotSender = null;

		this.scenarioData = null;
		this.snapshots = [];
		this.currentFrame = 0;
		this.stats = {
			totalSnapshots: 0,
			totalEventsProcessed: 0,
			totalMessagesProcessed: 0,
		};

		this.runState = "idle";
		log.info("GameEngine: 仿真层资源已清理，Infrastructure 保留");
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
	public getInitializationData(): EngineScenarioData | null {
		return this.scenarioData;
	}

	// ===============================  外部方法 ===============================

	/**
	 * 创建当前帧的高频快照
	 * 用于 frame_snapshot 通道（UI 实时渲染 & 技能栏状态）
	 */
	public createFrameSnapshot(): FrameSnapshot {
		const frameNumber = this.getCurrentFrame();
		const timestamp = performance.now();
		const frameLoopStats = this.getFrameLoopStats();

		// 引擎级状态
		// 引擎级循环统计：这里读取的是 GameEngine 汇总后的逻辑帧统计，而不是底层时钟回调次数。

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

			let boundMemberDetail: {
				attrs: Record<string, unknown>;
				buffs?: BuffViewDataSnapshot[];
			} | null = null;
			let boundMemberSkills: ComputedSkillInfo[] = [];

			if (boundMemberId) {
				const boundMember = this.world.memberManager.getMember(boundMemberId);
				if (boundMember) {
					try {
						const serialized = boundMember.serialize();
						boundMemberDetail = { attrs: serialized.attrs };
					} catch (error) {
						log.warn(`创建控制器 ${controllerId} 绑定成员详细快照失败:`, error);
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

		const snapshot: FrameSnapshot = {
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

		return snapshot;
	}

	/**
	 * 发送帧快照到主线程
	 * 通过注入的发送器发送帧快照
	 */
	public sendFrameSnapshot(snapshot: FrameSnapshot): void {
		if (!this.frameSnapshotSender) {
			log.warn("GameEngine: 帧快照发送器未设置，无法发送帧快照");
			return;
		}

		try {
			this.frameSnapshotSender(snapshot);
		} catch (error) {
			log.error("GameEngine: 发送帧快照失败:", error);
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
	setSystemMessageSender(sender: ((payload: unknown) => void) | null): void {
		this.systemMessageSender = sender;
	}

	/**
	 * 设置领域事件批发送器
	 *
	 * 用于直接发送 domain_event_batch 顶层消息（不再嵌套在 system_event 中）
	 * @param sender 领域事件批发送函数
	 */
	setDomainEventBatchSender(
		sender:
			| ((payload: {
					type: "controller_domain_event_batch";
					frameNumber: number;
					events: ControllerDomainEvent[];
			  }) => void)
			| null,
	): void {
		this.controllerEventProjector.setDomainEventBatchSender(sender);
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
			log.warn("GameEngine: 渲染消息发送器未设置，无法发送渲染指令");
			return;
		}

		try {
			this.renderMessageSender(payload);
		} catch (error) {
			log.error("GameEngine: 发送渲染指令失败:", error);
		}
	}

	/**
	 * 发送系统消息到主线程
	 *
	 * @param payload 系统消息负载
	 */
	postSystemMessage(payload: unknown): void {
		if (!this.systemMessageSender) {
			log.warn("GameEngine: 系统消息发送器未设置，无法发送系统消息");
			return;
		}

		try {
			this.systemMessageSender(payload);
		} catch (error) {
			log.error("GameEngine: 发送系统消息失败:", error);
		}
	}

	// ==================== 状态查询 ====================

	isRunning(): boolean {
		return this.runState === "running";
	}

	getRunState(): "idle" | "ready" | "running" | "paused" {
		return this.runState;
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
			frameLoopStats: this.getFrameLoopStats(),
			messageRouterStats: this.messageRouter.getStats(),
		};
	}

	/**
	 * 获取引擎级循环统计（轻量）。
	 * 目的：
	 * - 给 worker 遥测、快照、调试接口提供统一入口
	 * - 避免外部再深拿到底层 FrameLoop 的内部统计
	 */
	getFrameLoopStats(): FrameLoopStats {
		return { ...this.frameLoopStats };
	}

	/**
	 * 获取引擎运行时间（毫秒）
	 * 轻量：不触发成员序列化
	 */
	getRunTimeMs(): number {
		return performance.now() - this.startTime;
	}

	/**
	 * 获取成员数量（轻量）
	 */
	getMemberCount(): number {
		return this.world.memberManager.getAllMembers().length;
	}

	/**
	 * 获取成员技能静态列表（轻量，用于技能栏按钮渲染）
	 * 只用于 UI 的“列表展示”，不做可用性/条件计算
	 */
	getMemberSkillList(memberId: string): Array<{ id: string; name: string; level: number }> {
		const member = this.getMember(memberId);
		if (!member || member.type !== "Player") return [];

		const context = (member as { context?: { skillList?: unknown } }).context;
		const skillList = Array.isArray(context?.skillList) ? context?.skillList : [];
		return skillList.map((s) => {
			const skill = s as { id?: unknown; lv?: unknown; template?: { name?: unknown } };
			return {
				id: String(skill.id ?? ""),
				name: String(skill.template?.name ?? skill.id ?? "未知技能"),
				level: Number(skill.lv ?? 0),
			};
		});
	}

	/**
	 * 获取成员当前帧的预计算技能信息（动态消耗、冷却、可用性等）。
	 * 仅 Player 有技能列表；其他类型返回空数组。
	 */
	getComputedSkillInfos(memberId: string): ComputedSkillInfo[] {
		const member = this.getMember(memberId);
		if (!member || member.type !== "Player") {
			return [];
		}
		return this.computePlayerSkills(member as Player, this.getCurrentFrame());
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
	 * 启动帧循环。仅在 ready / paused 状态下可调用。
	 */
	start(): void {
		if (this.runState === "running") {
			log.warn("GameEngine: 引擎已在运行中");
			return;
		}
		if (this.runState === "idle") {
			log.warn("GameEngine: 引擎未加载场景数据，无法启动。请先调用 loadScenario()");
			return;
		}

		this.startTime = performance.now();
		this.runState = "running";

		if (this.runtimeConfig.driveMode === "clocked") {
			this.resetEngineFrameLoopStats("raf");
			this.resetSnapshotObserver();
			this.frameLoop.start((tick) => {
				this.handleFrameLoopTick(tick);
			});
			this.syncFrameLoopDriverStats();
		} else {
			this.resetEngineFrameLoopStats("manual");
			this.resetSnapshotObserver();
			if (this.frameLoop.isRunning() || this.frameLoop.isPaused()) {
				this.frameLoop.stop();
			}
			this.scheduleFastForwardSlice();
		}
	}

	/**
	 * 停止帧循环。运行态/暂停态 → ready（若已有场景）或 idle。
	 */
	stop(): void {
		if (this.runState === "idle" || this.runState === "ready") {
			return;
		}

		this.cancelFastForwardSlice();
		if (this.frameLoop.isRunning() || this.frameLoop.isPaused()) {
			this.frameLoop.stop();
		}
		this.syncFrameLoopDriverStats();
		this.runState = this.scenarioData ? "ready" : "idle";
	}

	/**
	 * 暂停帧循环
	 */
	pause(): void {
		if (this.runState === "paused") {
			log.warn("GameEngine: 引擎已暂停");
			return;
		}
		if (this.runState !== "running") {
			log.warn("GameEngine: 寮曟搸鏈繍琛岋紝鏃犳硶鏆傚仠");
			return;
		}

		this.runState = "paused";

		if (this.runtimeConfig.driveMode === "unclocked") {
			this.cancelFastForwardSlice();
		} else {
			this.frameLoop.pause();
			this.syncFrameLoopDriverStats();
		}
	}

	resume(): void {
		if (this.runState === "running") {
			log.warn("GameEngine: 引擎已在运行中");
			return;
		}
		if (this.runState !== "paused") {
			log.warn("GameEngine: 寮曟搸鏈殏鍋滐紝鏃犳硶鎭㈠");
			return;
		}

		this.runState = "running";

		if (this.runtimeConfig.driveMode === "unclocked") {
			this.scheduleFastForwardSlice();
		} else {
			this.frameLoop.resume();
			this.syncFrameLoopDriverStats();
		}
	}

	/**
	 * 单步推进帧。仅在 ready / paused 状态下可调用。
	 */
	step(): void {
		if (this.runState === "idle") {
			log.warn("GameEngine: 引擎未加载场景数据，无法单步执行");
			return;
		}
		if (this.runState === "running") {
			log.warn("GameEngine: 引擎正在运行，无法单步执行");
			return;
		}

		this.runSingleFrame("manual");
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
	 * 增量更新成员配置（热替换）。
	 * 销毁旧成员实例并以新数据重建，用于 Character 页面配置变更后快速刷新。
	 * 仅在 idle / ready 状态下允许操作。
	 */
	patchMemberConfig(memberId: string, newData: MemberWithRelations): boolean {
		if (this.runState === "running" || this.runState === "paused") {
			log.warn("GameEngine: 运行中无法 patchMemberConfig，请先 stop");
			return false;
		}

		const existing = this.getMember(memberId);
		if (!existing) {
			log.warn(`GameEngine: patchMemberConfig 未找到成员 ${memberId}`);
			return false;
		}

		const { campId, teamId } = existing;

		this.world.memberManager.unregisterMember(memberId);
		this.world.memberManager.createAndRegister(newData, campId, teamId, 0);

		if (this.scenarioData) {
			this.patchInitializationData(memberId, newData);
		}

		log.info(`GameEngine: 成员 ${memberId} 配置已热替换`);
		return true;
	}

	/**
	 * 同步更新存储的场景数据中对应成员，确保 reset 后使用最新配置。
	 */
	private patchInitializationData(memberId: string, newData: MemberWithRelations): void {
		if (!this.scenarioData) return;

		for (const camp of [this.scenarioData.simulator.campA, this.scenarioData.simulator.campB]) {
			for (const team of camp) {
				const idx = team.members.findIndex((m) => m.id === memberId);
				if (idx !== -1) {
					team.members[idx] = newData;
					return;
				}
			}
		}
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
		if (!this.runtimeConfig.acceptExternalIntents) {
			return {
				success: false,
				message: "意图输入已禁用",
				error: "Intent input disabled by runtimeConfig.acceptExternalIntents",
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
		if (!this.runtimeConfig.acceptExternalIntents) {
			return messages.map(() => ({
				success: false,
				message: "意图输入已禁用",
				error: "Intent input disabled by runtimeConfig.acceptExternalIntents",
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
		return this.expressionEvaluator.evaluateNumberOrBoolean(expression, context);
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
		log.info("🧹 JS编译缓存已清理");
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

	/**
	 * 发出域事件
	 *
	 * 供成员/系统在状态变化时调用，事件会被投影到对应的控制器
	 *
	 * @param event 域事件
	 */
	emitDomainEvent(event: MemberDomainEvent): void {
		this.domainEventBus.emit(event);
	}

	/**
	 * 发出相机跟随事件
	 *
	 * 供绑定管理器在绑定/解绑时调用
	 *
	 * @param controllerId 控制器ID
	 * @param memberId 成员ID
	 */
	emitCameraFollowEvent(controllerId: string, memberId: string): void {
		this.controllerEventProjector.emitCameraFollow(controllerId, memberId);
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
							member.actor.send({ type: fsmEventType, data: payload as Record<string, unknown> });
						} else {
							log.warn(`⚠️ stepFrame: 目标成员不存在: ${targetMemberId}`);
						}
					}
					break;
				default:
					log.warn(`⚠️ stepFrame: 未知事件类型: ${event.type}`);
					break;
			}

			this.eventQueue.markAsProcessed(event.id);
			eventsProcessed++;
		}

		// 2. 成员/区域更新（驱动 BT/SM/Buff 等）
		this.world.tick(frameNumber);
		const membersUpdated = this.world.memberManager.getAllMembers().length;

		const duration = performance.now() - frameStartTime;

		// 3. 刷新域事件总线（分发事件并投影到控制器）
		this.domainEventBus.flush(frameNumber);
		this.controllerEventProjector.flush(frameNumber);

		// 4. 检查是否还有本帧待处理事件，禁止往当前帧插入事件的情况下，目前只需要考虑maxEvents限流
		// eventsForFrame 已是当前帧分桶，避免重复取队列
		const hasPendingEvents = eventsForFrame.some((event) => !event.processed);

		const pendingFrameTasks = this.pendingFrameTasksCount;

		// 5. 如果当前帧事件和帧内任务都处理完毕，推进逻辑帧号
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
		const currentFrame = this.getCurrentFrame();

		return {
			timestamp: performance.now(),
			frameNumber: currentFrame,
			members: members.map((member) => member.serialize()),
			engine: {
				frameNumber: currentFrame,
				runTime: performance.now() - this.startTime,
				frameLoop: this.createFrameLoopSnapshot(),
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

		log.info(`📸 生成快照 #${this.stats.totalSnapshots} - 帧: ${snapshot.frameNumber}`);
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
	 * 获取当前世界渲染快照（供渲染层首次同步用，与 getCurrentSnapshot / createFrameSnapshot 等逻辑快照区分）。
	 * 渲染层晚于引擎就绪时拉取，用于首次全量状态同步。
	 * @param includeAreas 是否包含区域状态，默认 false
	 */
	getRenderSnapshot(includeAreas = false): RenderSnapshot {
		const frameNumber = this.getCurrentFrame();
		const engineNowTs = Date.now();
		const members = this.world.memberManager.getAllMembers().map((member) => {
			const ctx = member.context as Record<string, unknown>;
			const __render = ctx.__render as
				| { lastAction?: { name: string; ts: number; params?: Record<string, unknown> } }
				| undefined;
			const lastAction = __render?.lastAction;
			let animation: { name: string; progress: number } | undefined;
			if (lastAction) {
				const elapsed = engineNowTs - lastAction.ts;
				const durationMs = 1000;
				const progress = Math.min(1, Math.max(0, elapsed / durationMs));
				animation = { name: lastAction.name, progress };
			}
			return {
				id: member.id,
				name: member.name,
				position: member.position,
				yaw: 0,
				...(animation && { animation }),
			};
		});
		const areas = includeAreas ? this.collectRenderAreaSnapshot() : [];
		const cameraFollowEntityId = this.world.memberManager.getPrimaryMemberId();
		return {
			frameNumber,
			engineNowTs,
			members,
			areas,
			cameraFollowEntityId,
		};
	}

	/** 收集当前存活区域状态，用于构建渲染快照（供 getRenderSnapshot 使用，与逻辑快照区分） */
	private collectRenderAreaSnapshot(): RenderSnapshotArea[] {
		const frame = this.getCurrentFrame();
		const damage = this.world.areaManager.damageAreaSystem.getAreaSnapshot(frame).map((a) => ({
			id: a.id,
			type: "damage",
			position: a.position,
			shape: a.shape,
			remainingTime: a.remainingTime,
		}));
		return damage;
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

	/**
	 * 获取引擎级 pipeline registry。
	 */
	getPipelineRegistry(): PipelineRegistry<MemberContext, StagePool<MemberContext>> {
		return this.pipelineRegistry;
	}

	// ==================== 私有方法 ====================

	/**
	 * 重置引擎级循环统计。
	 * 目的：
	 * - 把“逻辑帧推进统计”收回到 GameEngine
	 * - 让对外 FPS / totalFrames 反映真实 stepFrame 执行结果
	 */
	private resetEngineFrameLoopStats(clockKind: FrameLoopStats["clockKind"]): void {
		this.frameLoopStats = {
			averageFPS: 0,
			totalFrames: 0,
			totalRunTime: 0,
			clockKind,
			skippedFrames: 0,
			timeoutFrames: 0,
		};
	}

	/**
	 * 重置快照观察器。
	 * 第一轮仍默认关闭快照节流发送，但职责已经回到引擎侧。
	 */
	private resetSnapshotObserver(): void {
		this.snapshotObserver.lastSnapshotTime = 0;
		this.snapshotObserver.snapshotIntervalMs =
			this.snapshotObserver.snapshotFPS > 0 ? 1000 / this.snapshotObserver.snapshotFPS : Number.POSITIVE_INFINITY;
	}

	/**
	 * 把底层时钟驱动统计同步到引擎级统计里。
	 * 说明：
	 * - clockKind / skippedFrames / timeoutFrames 仍来自底层 FrameLoop
	 * - totalFrames / averageFPS / totalRunTime 由引擎自己根据 stepFrame 结果维护
	 */
	private syncFrameLoopDriverStats(): void {
		const driverStats = this.frameLoop.getFrameLoopStats();
		this.frameLoopStats.clockKind = driverStats.clockKind;
		this.frameLoopStats.skippedFrames = driverStats.skippedFrames;
		this.frameLoopStats.timeoutFrames = driverStats.timeoutFrames;
	}

	/**
	 * 基于引擎当前状态更新循环统计。
	 */
	private updateEngineFrameLoopStats(clockKind?: FrameLoopStats["clockKind"]): void {
		if (clockKind) {
			this.frameLoopStats.clockKind = clockKind;
		}

		const runTime = performance.now() - this.startTime;
		this.frameLoopStats.totalRunTime = runTime;
		this.frameLoopStats.totalFrames = this.currentFrame;

		const seconds = runTime / 1000;
		this.frameLoopStats.averageFPS = seconds > 0 ? this.currentFrame / seconds : 0;
	}

	/**
	 * 统一组装兼容旧接口的循环快照。
	 */
	private createFrameLoopSnapshot(): FrameLoopSnapshot {
		return {
			currentFrame: this.getCurrentFrame(),
			fps: this.frameLoopStats.averageFPS,
		};
	}

	/**
	 * realtime 驱动入口。
	 * FrameLoop 只负责告诉我们“建议推进多少帧”，真正的循环控制在这里。
	 */
	private handleFrameLoopTick(tick: FrameLoopTick): void {
		if (this.runState !== "running") {
			return;
		}

		this.syncFrameLoopDriverStats();

		for (let index = 0; index < tick.dueSteps; index++) {
			this.runSingleFrame(tick.clockKind);
		}

		this.syncFrameLoopDriverStats();
	}

	/**
	 * 执行一次引擎级单帧事务，并统一更新统计/快照。
	 * 这样 manual step、realtime、fast-forward 就能复用一套收尾逻辑。
	 */
	private runSingleFrame(clockKind: FrameLoopStats["clockKind"]): FrameStepResult {
		const stepResult = this.stepFrame({
			maxEvents: this.config.frameLoopConfig.maxEventsPerFrame,
		});

		this.stats.totalEventsProcessed += stepResult.eventsProcessed;
		this.updateEngineFrameLoopStats(clockKind);
		this.emitFrameSnapshotIfNeeded();

		return stepResult;
	}

	/**
	 * 安排下一段 fast-forward 分片。
	 * 使用 setTimeout(0) 是为了让 pause / stop / worker 消息有机会插入。
	 */
	private scheduleFastForwardSlice(): void {
		if (this.runState !== "running" || this.fastForwardTimer !== null) {
			return;
		}

		this.fastForwardTimer = setTimeout(() => {
			this.fastForwardTimer = null;
			this.processFastForwardSlice();
		}, 0) as unknown as number;
	}

	private cancelFastForwardSlice(): void {
		if (this.fastForwardTimer === null) {
			return;
		}

		clearTimeout(this.fastForwardTimer);
		this.fastForwardTimer = null;
	}

	/**
	 * fast-forward 分片推进。
	 * 说明：
	 * - 不依赖底层 wall-clock
	 * - 由引擎主动重复调用 stepFrame
	 * - 通过帧数预算 + 时间预算避免长时间独占线程
	 */
	private processFastForwardSlice(): void {
		if (this.runState !== "running") {
			return;
		}

		const sliceStartTime = performance.now();
		let framesExecuted = 0;

		while (this.runState === "running" && framesExecuted < FAST_FORWARD_MAX_FRAMES_PER_SLICE) {
			this.runSingleFrame("manual");
			framesExecuted += 1;

			if (performance.now() - sliceStartTime >= FAST_FORWARD_MAX_SLICE_TIME_MS) {
				break;
			}
		}

		if (this.runState === "running") {
			this.scheduleFastForwardSlice();
		}
	}

	/**
	 * 引擎侧快照节流。
	 * 这层负责决定“每完成一帧后是否需要对外发高频快照”。
	 */
	private emitFrameSnapshotIfNeeded(): void {
		if (this.snapshotObserver.snapshotFPS <= 0 || !this.frameSnapshotSender) {
			return;
		}

		const now = performance.now();
		if (now - this.snapshotObserver.lastSnapshotTime < this.snapshotObserver.snapshotIntervalMs) {
			return;
		}

		this.sendFrameSnapshot(this.createFrameSnapshot());
		this.snapshotObserver.lastSnapshotTime = now;
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
			log.error(error.message);
			throw error;
		}

		// 记录运行环境
		if (isSandboxWorker) {
			// 默认环境，不需要输出日志
			// console.log("🛡️ GameEngine正在沙盒Worker线程中安全运行");
		} else if (isWorkerEnvironment) {
			log.info("🛡️ GameEngine正在Worker线程中运行");
		} else if (isNode) {
			log.info("🛡️ GameEngine在Node.js环境中运行（测试模式）");
		} else if (isTestEnvironment) {
			log.info("🛡️ GameEngine在测试环境中运行（已标记允许）");
		}
	}

	/**
	 * 计算 Player 的技能数据
	 * 为每个技能计算当前的消耗值和可用性
	 */
	private computePlayerSkills(player: Player, currentFrame: number): ComputedSkillInfo[] {
		const skillList = (player.context as { skillList?: unknown }).skillList ?? [];
		const skillCooldowns = player.context.skillCooldowns ?? [];
		const currentMp = player.statContainer?.getValue("mp.current") ?? 0;
		const currentHp = player.statContainer?.getValue("hp.current") ?? 0;

		return (Array.isArray(skillList) ? skillList : []).map((skill: unknown, index: number) => {
			const s = skill as { id?: unknown; lv?: unknown; template?: { name?: unknown; variants?: unknown[] } };
			const template = s.template as { name?: unknown; variants?: unknown[] } | undefined;
			const skillName = String(template?.name ?? "未知技能");
			const skillLevel = Number(s.lv ?? 0);

			// 查找适用的技能效果
			const effect = (
				template?.variants as
					| Array<{ condition?: string; mpCost?: string; hpCost?: string; castingRange?: number }>
					| undefined
			)?.find((e: { condition?: string }) => {
				try {
					const result = this.evaluateExpression(e.condition ?? "false", {
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
				const castingRangeResult = this.evaluateExpression(String(effect.castingRange ?? "0"), {
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
				id: String((skill as { id?: unknown }).id ?? ""),
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

	// ==================== Checkpoint / Restore ====================

	captureCheckpoint(): EngineCheckpoint {
		return {
			frameNumber: this.currentFrame,
			timestamp: performance.now(),
			eventQueue: this.eventQueue.captureCheckpoint(),
			world: this.world.captureCheckpoint(),
			domainEventBus: this.domainEventBus.captureCheckpoint(),
			controllerEventProjector: this.controllerEventProjector.captureCheckpoint(),
		};
	}

	restoreCheckpoint(checkpoint: EngineCheckpoint): void {
		const wasRunning = this.runState === "running";
		if (wasRunning) {
			this.pause();
		}

		this.currentFrame = checkpoint.frameNumber;
		this.eventQueue.restoreCheckpoint(checkpoint.eventQueue);
		this.world.restoreCheckpoint(checkpoint.world);
		this.domainEventBus.restoreCheckpoint(checkpoint.domainEventBus);
		this.controllerEventProjector.restoreCheckpoint(checkpoint.controllerEventProjector);

		if (wasRunning) {
			this.resume();
		}
	}
}

// 透出类型给主线程 UI 使用
export type { ComputedSkillInfo, FrameSnapshot } from "./types";
