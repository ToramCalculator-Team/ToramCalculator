import { createId } from "@paralleldrive/cuid2";
import type { EventObject } from "xstate";
import { createLogger } from "~/lib/Logger";
import { Random } from "~/lib/random";
import { ControlBindingManager } from "./Controller/ControlBindingManager";
import { ControllerRegistry } from "./Controller/ControllerEndpoint";
import { ControllerEventProjector } from "./DomainEvents/ControllerEventProjector";
import { DomainEventBus } from "./DomainEvents/DomainEventBus";
import type { EventCatalog } from "./Event/EventCatalog";
import { EventQueue } from "./EventQueue/EventQueue";
import type { QueueEvent } from "./EventQueue/types";
import { ExpressionEvaluator } from "./Expression/ExpressionEvaluator";
import type { EngineMember, EngineTeam } from "./engineScenarioSchema";
import { FrameLoop } from "./FrameLoop/FrameLoop";
import type { FrameLoopSnapshot, FrameLoopStats, FrameLoopTick } from "./FrameLoop/types";
import type { JSProcessor } from "./JSProcessor/JSProcessor";
import type { ExpressionContext } from "./JSProcessor/types";
import { type IntentMessage, type MessageProcessResult, MessageRouter } from "./MessageRouter/MessageRouter";
import type { PipelineCatalog } from "./Pipeline/PipelineCatalog";
import type { PipelineResolverService } from "./Pipeline/PipelineResolverService";
import {
	type EngineRunOutput,
	type ExecutionRecordingPolicy,
	RunInputActionSchema,
	RunOutputRecorder,
} from "./runOutput";
import type { RenderSnapshot, RenderSnapshotArea } from "./thread/RendererProtocol";
import type {
	BuffViewDataSnapshot,
	ControllerDomainEvent,
	EngineCheckpoint,
	EngineConfig,
	EngineInfrastructure,
	EngineScenarioData,
	EngineStats,
	FrameSnapshot,
	GameEngineSnapshot,
	MemberDomainEvent,
	RuntimeConfig,
	TickStepResult,
} from "./types";
import { createRealtimeConfig } from "./types";
import type { MemberSnapshot } from "./World/Member/Member";
import { computeMemberFormation } from "./World/Member/memberFormation";
import type { MemberControlEvent } from "./World/Member/runtime/StateMachine/types";
import { Player } from "./World/Member/types/Player/Player";
import { World } from "./World/World";

const log = createLogger("GameEngine");

export type FastForwardSyncOptions = {
	maxTicks?: number;
	maxDurationMs?: number;
};

export type FastForwardSyncResult = {
	ticksRun: number;
	elapsedMs: number;
	reachedLimit: boolean;
};

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

	/** tick 循环 - 推进时间和调度事件 */
	private frameLoop: FrameLoop;

	/** JS表达式处理器 - 负责编译JS代码 */
	private jsProcessor: JSProcessor;
	/** 表达式求值器 - 负责 self/target/world 绑定 */
	private expressionEvaluator: ExpressionEvaluator;
	/** 新的冻结 Catalog */
	private pipelineCatalog: PipelineCatalog;
	/** 新的 Resolver（含 overlay + 编译缓存） */
	private pipelineResolverService: PipelineResolverService;
	/** 事件目录：订阅系统位索引 + payload schema */
	private eventCatalog: EventCatalog;

	/** 引擎配置 */
	private config: EngineConfig;

	/** 确定性随机数生成器（seeded xorshift128），可 checkpoint */
	random: Random;

	/** 存储场景配置参数，用于重置时复用 */
	private scenarioData: EngineScenarioData | null = null;

	/**
	 * 引擎运行配置。
	 * 它决定“连续运行由谁驱动”，而不是简单透传给底层时钟。
	 */
	private runtimeConfig: RuntimeConfig = createRealtimeConfig();

	/** 开始时间戳 */
	private startTime: number = 0;

	/** 当前逻辑 tick 序号 */
	private tickIndex: number = 0;

	/** 当前模拟时间（毫秒），规则系统读取的唯一时间源 */
	private currentTimeMs: number = 0;

	/** 当前 tick 的模拟时间跨度（毫秒） */
	private deltaTimeMs: number = 0;

	/**
	 * 引擎级循环统计。
	 * 说明：
	 * - 对外暴露“实际完成了多少逻辑 tick”
	 * - 与 FrameLoop 的底层时钟统计分离，但复用同一个结构以保持接口兼容
	 */
	private frameLoopStats: FrameLoopStats = {
		averageTicksPerSecond: 0,
		totalTicks: 0,
		totalRunTime: 0,
		clockKind: "manual",
		skippedTicks: 0,
		timeoutTicks: 0,
	};

	/** 快照历史 */
	private snapshots: GameEngineSnapshot[] = [];

	/** Worker 内当前运行产出；结束后只保留到 Session 明确认领。 */
	private readonly runOutput = new RunOutputRecorder();

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
	/** 当前挂起的 tick 内任务数量（用于防止跨 tick 未完成任务） */
	private pendingTickTasksCount: number = 0;

	/**
	 * 快照观察器。
	 * 说明：
	 * - 快照节流属于引擎观察职责，不再放在底层时钟里
	 * - 第一轮仍保持默认关闭，避免引入额外高频负载
	 */
	private snapshotObserver = {
		snapshotHz: 0,
		snapshotIntervalMs: Number.POSITIVE_INFINITY,
		lastSnapshotTime: 0,
	};

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
	 * @param infra 长期驻留的基础设施（JSProcessor、PipelineCatalog、PipelineResolverService），由 Worker 级持有
	 */
	constructor(config: EngineConfig, infra: EngineInfrastructure) {
		log.debug("GameEngine constructor");

		// 🛡️ 安全检查：只允许在Worker线程中创建GameEngine
		this.validateWorkerContext();

		this.config = config;

		this.random = new Random();

		// 接收外部注入的基础设施（跨 reset/cleanup 存活）
		this.jsProcessor = infra.jsProcessor;
		this.pipelineCatalog = infra.pipelineCatalog;
		this.pipelineResolverService = infra.pipelineResolverService;
		this.eventCatalog = infra.eventCatalog;

		// 初始化核心模块 - 按依赖顺序
		this.eventQueue = new EventQueue(config.eventQueueConfig, () => this.currentTimeMs);

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
		// 设置表达式求值器到 MemberManager（成员创建时会注入到成员 context.expressionEvaluator）
		this.world.memberManager.setEvaluateExpression((expression, context) =>
			this.expressionEvaluator.evaluateNumberOrBoolean(expression, context),
		);

		// 设置域事件发射器到 MemberManager
		this.world.memberManager.setDomainEventSender((event) => {
			this.emitDomainEvent(event);
		});
		this.world.memberManager.setControlInputRecorder((memberId, event) => {
			this.recordMemberControlInput(memberId, event);
		});
		// 设置引擎时间读取函数到 MemberManager（引擎时间为唯一真相）
		this.world.memberManager.setGetCurrentTimeMs(() => this.getCurrentTimeMs());
		this.world.memberManager.setGetTickIndex(() => this.getTickIndex());
		// 设置伤害请求处理器到 MemberManager（成员创建时会注入到成员 context.damageRequestHandler）
		this.world.memberManager.setDamageRequestHandler((damageRequest) => {
			this.world.areaManager.damageAreaSystem.add(damageRequest);
		});
		// 设置引擎级 pipeline resolver 到 MemberManager（成员创建时注入到成员）
		this.world.memberManager.setPipelineResolverService(this.pipelineResolverService);
		// 设置引擎级 EventCatalog 到 MemberManager（每成员据此构造独立 ProcBus）
		this.world.memberManager.setEventCatalog(this.eventCatalog);

		// 注入引擎级确定性随机数生成器
		this.world.memberManager.setRandom(() => this.random.value());
	}

	// ==================== 生命周期管理 ====================

	/**
	 * 加载仿真场景数据，将引擎从 idle 转为 ready。
	 * 重建仿真层（World、EventQueue 等），但复用 Infrastructure 的编译缓存。
	 */
	loadScenario(data: EngineScenarioData): void {
		this.runOutput.assertScenarioChangeAllowed();
		this.stop();

		this.scenarioData = data;
		this.random.setSeed(data.scenario.randomSeed);
		this.setRuntimeConfig({ ...this.runtimeConfig, logicHz: data.scenario.logicHz });

		this.startTime = performance.now();
		this.tickIndex = 0;
		this.currentTimeMs = 0;
		this.deltaTimeMs = 0;
		this.pendingTickTasksCount = 0;
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
		this.domainEventBus.reset();
		this.controllerEventProjector.clear();

		// 计算成员初始队形（唯一真相源，与渲染层共用同一纯函数）。
		const formation = computeMemberFormation(data.scenario.campA, data.scenario.campB);

		// 添加阵营A
		this.addCamp("campA");
		data.scenario.campA.forEach((team) => {
			this.addTeam("campA", team);
			team.members.forEach((member) => {
				this.addMember("campA", team.id, member, formation.get(member.id)?.position);
			});
		});

		// 添加阵营B
		this.addCamp("campB");
		data.scenario.campB.forEach((team) => {
			this.addTeam("campB", team);
			team.members.forEach((member) => {
				this.addMember("campB", team.id, member, formation.get(member.id)?.position);
			});
		});
		this.world.memberManager.setPrimaryMember(data.scenario.primaryMemberId);
		this.world.memberManager.initializeMemberTargets(data.scenario.initialTargetIds);

		log.info("GameEngine: 场景数据已加载，引擎就绪");
	}

	/**
	 * 重置引擎：清理仿真层，保留 Infrastructure 编译缓存。
	 * 如果有存储的场景数据则重新加载（→ ready），否则回到 idle。
	 */
	reset(): void {
		this.runOutput.assertScenarioChangeAllowed();
		this.stop();

		if (this.scenarioData) {
			this.loadScenario(this.scenarioData);
		} else {
			this.world.clear();
			this.eventQueue.clear();
			this.tickIndex = 0;
			this.currentTimeMs = 0;
			this.deltaTimeMs = 0;
			this.snapshots = [];
		}

		log.info("GameEngine: 引擎已重置");
	}

	/**
	 * 显式卸载交互会话场景。与 reset 不同，此操作不重新加载旧输入；与 cleanup 不同，
	 * 它保留 Worker 通信 sender 和长期 Infrastructure，供下一会话继续复用。
	 */
	unloadScenario(): void {
		this.runOutput.assertScenarioChangeAllowed();
		this.stop();
		this.world.clear();
		this.eventQueue.clear();
		this.scenarioData = null;
		this.snapshots = [];
		this.tickIndex = 0;
		this.currentTimeMs = 0;
		this.deltaTimeMs = 0;
		this.pendingTickTasksCount = 0;
	}

	/**
	 * 切换仿真配置描述符（mode/stop/output/probe 等）。
	 * 仅在 idle / ready 状态下允许切换，运行中切换需先 stop。
	 */
	setRuntimeConfig(config: RuntimeConfig): void {
		this.runtimeConfig = config;
		this.config.frameLoopConfig.logicHz = config.logicHz;
		this.config.frameLoopConfig.timeScale = config.timeScale;
		this.config.frameLoopConfig.maxTickSkip = config.maxTickSkip;
		this.frameLoop.setLogicHz(config.logicHz);
		this.frameLoop.setTimeScale(config.timeScale);
		this.frameLoop.setTickSkipConfig({ maxTickSkip: config.maxTickSkip });
		log.info(`GameEngine: runtimeConfig 已切换 (driveMode=${config.driveMode})`);
	}

	/** 一次性模拟任务只切换执行宿主策略；逻辑频率保留场景加载时确立的唯一值。 */
	setRuntimePolicy(policy: Omit<RuntimeConfig, "logicHz">): void {
		this.setRuntimeConfig({ ...policy, logicHz: this.runtimeConfig.logicHz });
	}

	/** 设置仅影响主线程实时投影的快照频率；权威每 Tick 记录不读取此值。 */
	setRealtimeSnapshotHz(snapshotHz: number): void {
		if (!Number.isFinite(snapshotHz) || snapshotHz < 0) throw new Error("snapshotHz 必须是非负有限数");
		this.snapshotObserver.snapshotHz = snapshotHz;
		this.resetSnapshotObserver();
	}

	getRuntimeConfig(): RuntimeConfig {
		return { ...this.runtimeConfig };
	}

	/**
	 * 清理仿真层资源，保留 Infrastructure（JSProcessor、PipelineCatalog、PipelineResolverService）。
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
		this.tickIndex = 0;
		this.currentTimeMs = 0;
		this.deltaTimeMs = 0;
		this.stats = {
			totalSnapshots: 0,
			totalEventsProcessed: 0,
			totalMessagesProcessed: 0,
		};

		log.info("GameEngine: 仿真层资源已清理，Infrastructure 保留");
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
	public createFrameSnapshot(completedTick?: { tickIndex: number; currentTimeMs: number }): FrameSnapshot {
		const tickIndex = completedTick?.tickIndex ?? this.getTickIndex();
		const currentTimeMs = completedTick?.currentTimeMs ?? this.getCurrentTimeMs();
		const timestamp = currentTimeMs;

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
				attrs: member.statContainer.exportAttributeSnapshot(),
			};
		});

		// 多控制器：按 controller 生成绑定成员视图（挂到同一个 FrameSnapshot 上，作为可选字段）
		// 注意：controllerId 的来源必须以 binding 为准（绑定即存在），而不是 ControllerRegistry（那是 endpoint 注册表）
		const controllerIds = this.bindingManager.getAllControllerIds();
		const byController: NonNullable<FrameSnapshot["byController"]> = {};
		for (const controllerId of controllerIds) {
			const boundMemberId = this.bindingManager.getBoundMemberId(controllerId) ?? null;

			let boundMemberDetail: {
				attrs: FrameSnapshot["members"][number]["attrs"];
				buffs?: BuffViewDataSnapshot[];
			} | null = null;

			if (boundMemberId) {
				const boundMember = this.world.memberManager.getMember(boundMemberId);
				if (boundMember) {
					try {
						const serialized = boundMember.serialize();
						boundMemberDetail = { attrs: serialized.attrs };
					} catch (error) {
						log.warn(`创建控制器 ${controllerId} 绑定成员详细快照失败:`, error);
					}
				}
			}

			byController[controllerId] = {
				boundMemberId,
				boundMemberDetail,
			};
		}

		const snapshot: FrameSnapshot = {
			tickIndex,
			currentTimeMs,
			timestamp,
			engine: {
				tickIndex,
				currentTimeMs,
				runTime: currentTimeMs,
				ticksPerSecond: this.runtimeConfig.logicHz,
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
					tickIndex: number;
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

	/**
	 * 获取引擎统计信息
	 *
	 * @returns 统计信息
	 */
	getStats(): EngineStats {
		const runTime = performance.now() - this.startTime;

		return {
			tickIndex: this.getTickIndex(),
			currentTimeMs: this.getCurrentTimeMs(),
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
		if (!(member instanceof Player)) return [];

		const skillList = member.runtime.skillList;
		if (!skillList.length) {
			log.debug(`getMemberSkillList: empty skillList member=${memberId} character=${member.data.id ?? "null"}`);
		}

		return skillList.map((skill) => ({
			id: skill.id,
			name: skill.template.name,
			level: skill.lv,
		}));
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
		if (!this.scenarioData) throw new Error("GameEngine: 场景尚未加载");
		if (this.runtimeConfig.driveMode !== "clocked") {
			throw new Error("GameEngine: unclocked 执行必须使用 fastForwardSync");
		}

		this.startTime = performance.now();
		this.resetEngineFrameLoopStats("raf");
		this.resetSnapshotObserver();
		this.frameLoop.start((tick) => {
			this.handleFrameLoopTick(tick);
		});
		this.syncFrameLoopDriverStats();
	}

	/**
	 * 停止帧循环。运行态/暂停态 → ready（若已有场景）或 idle。
	 */
	stop(): void {
		if (this.frameLoop.isRunning() || this.frameLoop.isPaused()) {
			this.frameLoop.stop();
		}
		this.syncFrameLoopDriverStats();
	}

	/**
	 * 暂停帧循环
	 */
	pause(): void {
		if (this.runtimeConfig.driveMode !== "clocked") throw new Error("GameEngine: unclocked 执行不可暂停");
		this.frameLoop.pause();
		this.syncFrameLoopDriverStats();
	}

	resume(): void {
		if (this.runtimeConfig.driveMode !== "clocked") throw new Error("GameEngine: unclocked 执行不可恢复");
		this.frameLoop.resume();
		this.syncFrameLoopDriverStats();
	}

	/**
	 * 单步推进帧。仅在 ready / paused 状态下可调用。
	 */
	step(): void {
		if (!this.scenarioData) throw new Error("GameEngine: 场景尚未加载");
		this.runSingleTick("manual", this.getLogicStepMs());
	}

	/**
	 * 获取当前逻辑 tick 序号
	 */
	getTickIndex(): number {
		return this.tickIndex;
	}

	/**
	 * 获取当前模拟时间（毫秒）
	 */
	getCurrentTimeMs(): number {
		return this.currentTimeMs;
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
	addTeam(campId: string, teamData: EngineTeam): void {
		this.world.memberManager.addTeam(campId, teamData);
	}

	/**
	 * 添加成员（委托给 memberManager）
	 *
	 * @param campId 阵营ID
	 * @param teamId 队伍ID
	 * @param memberData 成员数据
	 */
	addMember(
		campId: string,
		teamId: string,
		memberData: EngineMember,
		position?: { x: number; y: number; z: number },
	): void {
		// 容器只负责委托，不处理具体创建逻辑
		this.world.memberManager.createAndRegister(memberData, campId, teamId, position);
	}

	/**
	 * 增量更新成员配置（热替换）。
	 * 销毁旧成员实例并以新数据重建，供调用方在成员配置变化后刷新运行时结构。
	 * 替换过程保留 memberId 和主控目标，避免相机跟随在同一成员热替换时短暂切到 null。
	 * 仅在 idle / ready 状态下允许操作。
	 */
	patchMemberConfig(memberId: string, newData: EngineMember): boolean {
		const existing = this.getMember(memberId);
		if (!existing) {
			log.warn(`GameEngine: patchMemberConfig 未找到成员 ${memberId}`);
			return false;
		}

		if (!this.world.memberManager.replaceMember(memberId, newData)) {
			return false;
		}

		if (this.scenarioData) {
			this.patchInitializationData(memberId, newData);
		}

		log.info(`GameEngine: 成员 ${memberId} 配置已热替换`);
		return true;
	}

	/**
	 * 同步更新存储的场景数据中对应成员，确保 reset 后使用最新配置。
	 */
	private patchInitializationData(memberId: string, newData: EngineMember): void {
		if (!this.scenarioData) return;

		for (const camp of [this.scenarioData.scenario.campA, this.scenarioData.scenario.campB]) {
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

	/**
	 * 已创建伤害区域总数。
	 * 预览分支用它区分“技能没有生成伤害流程”和“生成伤害流程但最终伤害为 0”。
	 */
	getDamageAreaCreatedCount(): number {
		return this.world.areaManager.damageAreaSystem.getCreatedAreaCount();
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
		const isMemberControlInput = message.type !== "绑定控制对象" && message.type !== "解绑控制对象";
		const inputWindowOpen = this.runOutput.isRecording();
		if (isMemberControlInput && !inputWindowOpen) {
			return {
				success: false,
				message: "运行输入窗口尚未打开",
				error: "Member control input is not accepted before the run starts",
			};
		}

		const memberId = this.bindingManager.getBoundMemberId(message.controllerId) ?? null;
		const shouldRecord = this.runOutput.isRecording() && !["绑定控制对象", "解绑控制对象"].includes(message.type);
		if (shouldRecord) {
			this.runOutput.appendInput({
				inputId: message.id,
				memberId,
				timeMs: this.getCurrentTimeMs(),
				action: RunInputActionSchema.parse({ type: message.type, payload: structuredClone(message.data) }),
			});
		}

		const result = await this.messageRouter.processMessage(message);
		if (shouldRecord && !result.success) {
			this.runOutput.rejectInput(message.id, this.getCurrentTimeMs(), result.error ?? result.message);
		} else if (shouldRecord && message.type !== "使用技能" && message.type !== "切换目标") {
			this.runOutput.acceptInput(message.id, this.getCurrentTimeMs());
		}
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
		const results: MessageProcessResult[] = [];
		for (const message of messages) results.push(await this.processIntent(message));
		return results;
	}

	// ==================== 子组件功能封装：JS编译和执行 ====================

	/**
	 * 登记 member-flow 提交的控制输入。
	 * 成员会在登记完成后同步交给 FSM，最终状态只由 FSM 的领域事实封闭。
	 */
	private recordMemberControlInput(memberId: string, event: MemberControlEvent): void {
		if (!this.runOutput.isRecording()) return;
		this.runOutput.appendInput({
			inputId: event.id,
			memberId,
			timeMs: this.getCurrentTimeMs(),
			action: RunInputActionSchema.parse({ type: event.type, payload: structuredClone(event.data) }),
		});
	}

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
	 * 开始一个 tick 内任务，返回任务ID
	 *
	 * 目前作为简单计数器实现，用于防止跨 tick 未完成任务；后续可按需扩展来源追踪等调试信息。
	 */
	beginTickTask(taskId?: string, _meta: { source?: string } = {}): string {
		const id = taskId ?? createId();
		this.pendingTickTasksCount += 1;
		return id;
	}

	/**
	 * 标记 tick 内任务完成
	 */
	endTickTask(_taskId: string): void {
		if (this.pendingTickTasksCount > 0) {
			this.pendingTickTasksCount -= 1;
		}
	}

	/**
	 * 分发成员跨模拟时间调度事件
	 *
	 * 说明：
	 * - 这是从主线程 / 行为树等地方向成员 FSM 发送跨帧调度事件的统一入口
	 * - 实际上是往 EventQueue 写入一条 `member_fsm_event`，由 `stepTick` 在对应时间片消费
	 *
	 * @param memberId      目标成员ID
	 * @param event         已由生产者构造完成的 FSM 事件
	 * @param delayMs       延迟毫秒（默认 0，表示当前时间片）
	 * @param meta          调试元信息（例如 source）
	 */
	dispatchMemberEvent(memberId: string, event: EventObject, delayMs: number = 0, meta?: { source?: string }): void {
		const currentTimeMs = this.getCurrentTimeMs();
		const executeAtMs = currentTimeMs + Math.max(0, delayMs);

		this.eventQueue.insert({
			id: createId(),
			type: "member_fsm_event",
			executeAtMs,
			insertedAtMs: currentTimeMs,
			processed: false,
			targetMemberId: memberId,
			fsmEvent: event,
			source: meta?.source ?? "未知来源",
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
		if (event.type === "hit" && this.runOutput.isRecording()) {
			this.runOutput.appendDamage({
				sourceMemberId: event.sourceMemberId,
				targetMemberId: event.memberId,
				sourceSkillId: event.sourceSkillId,
				damage: event.damage,
				timeMs: this.getCurrentTimeMs(),
			});
		} else if (event.type === "skill_cast_accepted" && this.runOutput.isRecording()) {
			this.runOutput.appendSkillRelease({
				memberId: event.memberId,
				skillId: event.skillId,
				timeMs: this.getCurrentTimeMs(),
			});
			if (event.inputId && this.runOutput.hasPendingInput(event.inputId)) {
				this.runOutput.acceptInput(event.inputId, this.getCurrentTimeMs());
			}
		} else if (event.type === "skill_input_rejected" && this.runOutput.isRecording()) {
			if (event.inputId && this.runOutput.hasPendingInput(event.inputId)) {
				this.runOutput.rejectInput(event.inputId, this.getCurrentTimeMs(), event.reason);
			}
		} else if (event.type === "target_selection_accepted" && this.runOutput.hasPendingInput(event.inputId)) {
			this.runOutput.acceptInput(event.inputId, this.getCurrentTimeMs());
		} else if (event.type === "target_selection_rejected" && this.runOutput.hasPendingInput(event.inputId)) {
			this.runOutput.rejectInput(event.inputId, this.getCurrentTimeMs(), event.reason);
		}
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
	 * 执行一个逻辑 tick：事件处理 + 成员更新
	 *
	 * 由 FrameLoop 调度调用，是引擎级的单 tick 入口。
	 */
	stepTick(options?: { maxEvents?: number; deltaTimeMs?: number }): TickStepResult {
		const tickIndex = this.getTickIndex();
		const currentTimeMs = this.getCurrentTimeMs();
		const tickStartTime = performance.now();
		const maxEvents = options?.maxEvents ?? 100;
		const deltaTimeMs = options?.deltaTimeMs ?? this.getLogicStepMs();
		this.deltaTimeMs = deltaTimeMs;

		// 1. 处理当前时间片需要执行的事件（目前统一为 member_fsm_event）
		const eventsForTick = this.eventQueue.getDue(currentTimeMs);
		let eventsProcessed = 0;

		for (const event of eventsForTick) {
			if (event.processed) {
				continue;
			}
			if (eventsProcessed >= maxEvents) {
				break;
			}

			switch (event.type) {
				case "member_fsm_event":
					{
						const targetMemberId = event.targetMemberId;

						const member = this.world.memberManager.getMember(targetMemberId);
						if (member) {
							// 将队列事件转发为 FSM 事件，由成员自己的状态机处理
							member.actor.send(event.fsmEvent);
						} else {
							log.warn(`⚠️ stepTick: 目标成员不存在: ${targetMemberId}`);
						}
					}
					break;
				default:
					log.warn(`⚠️ stepTick: 未知事件类型: ${event.type}`);
					break;
			}

			this.eventQueue.markAsProcessed(event.id);
			eventsProcessed++;
		}

		// 2. 成员/区域更新（驱动 BT/SM/Buff 等）
		this.world.tick({ tickIndex, currentTimeMs, deltaTimeMs });
		const membersUpdated = this.world.memberManager.getAllMembers().length;

		const duration = performance.now() - tickStartTime;

		// 3. 刷新域事件总线（分发事件并投影到控制器）
		this.domainEventBus.flush(tickIndex);
		this.controllerEventProjector.flush(tickIndex);

		// 4. 检查是否还有当前时间片待处理事件，目前主要由 maxEvents 限流造成。
		const hasPendingEvents = eventsForTick.some((event) => !event.processed);

		const pendingTickTasks = this.pendingTickTasksCount;

		// 5. 如果当前时间片事件和 tick 内任务都处理完毕，推进逻辑时间并清理已完成事件。
		if (!hasPendingEvents && pendingTickTasks === 0) {
			this.tickIndex = tickIndex + 1;
			this.currentTimeMs = currentTimeMs + deltaTimeMs;
			this.eventQueue.removeProcessedDue(currentTimeMs);
		}

		return {
			tickIndex,
			currentTimeMs,
			duration,
			eventsProcessed,
			membersUpdated,
			hasPendingEvents,
			pendingTickTasks,
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
		const tickIndex = this.getTickIndex();
		const currentTimeMs = this.getCurrentTimeMs();

		return {
			timestamp: performance.now(),
			tickIndex,
			currentTimeMs,
			members: members.map((member) => member.serialize()),
			engine: {
				tickIndex,
				currentTimeMs,
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

		log.info(`📸 生成快照 #${this.stats.totalSnapshots} - tick: ${snapshot.tickIndex}`);
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
	getAllMemberData(): MemberSnapshot[] {
		return this.world.memberManager.getAllMembers().map((member) => member.serialize());
	}

	/**
	 * 获取当前世界渲染快照（供渲染层首次同步用，与 getCurrentSnapshot / createFrameSnapshot 等逻辑快照区分）。
	 * 渲染层晚于引擎就绪时拉取，用于首次全量状态同步。
	 * @param includeAreas 是否包含区域状态，默认 false
	 */
	getRenderSnapshot(includeAreas = false): RenderSnapshot {
		const tickIndex = this.getTickIndex();
		const currentTimeMs = this.getCurrentTimeMs();
		const members = this.world.memberManager.getAllMembers().map((member) => {
			const lastAction = member.renderState?.lastAction;
			let animation: { name: string; progress: number } | undefined;
			if (lastAction) {
				const elapsed = currentTimeMs - lastAction.ts;
				const rawDurationMs = lastAction.params?.duration;
				const durationMs = typeof rawDurationMs === "number" && rawDurationMs > 0 ? rawDurationMs : 1000;
				const progress = Math.min(1, Math.max(0, elapsed / durationMs));
				animation = { name: lastAction.name, progress };
			}
			return {
				id: member.id,
				position: member.position,
				yaw: 0,
				...(animation && { animation }),
			};
		});
		const areas = includeAreas ? this.collectRenderAreaSnapshot() : [];
		const cameraFollowEntityId = this.world.memberManager.getPrimaryMemberId();
		return {
			tickIndex,
			currentTimeMs,
			members,
			areas,
			cameraFollowEntityId,
		};
	}

	/** 收集当前存活区域状态，用于构建渲染快照（供 getRenderSnapshot 使用，与逻辑快照区分） */
	private collectRenderAreaSnapshot(): RenderSnapshotArea[] {
		const currentTimeMs = this.getCurrentTimeMs();
		const damage = this.world.areaManager.damageAreaSystem.getAreaSnapshot(currentTimeMs).map((a) => ({
			id: a.id,
			type: "damage",
			position: a.position,
			shape: a.shape,
			remainingTimeMs: a.remainingTimeMs,
		}));
		return damage;
	}

	/**
	 * 按阵营获取成员数据（外部使用 - 序列化）
	 *
	 * @param campId 阵营ID
	 * @returns 指定阵营的成员数据数组
	 */
	getMembersByCamp(campId: string): MemberSnapshot[] {
		return this.world.memberManager.getMembersByCamp(campId).map((member) => member.serialize());
	}

	/**
	 * 按队伍获取成员数据（外部使用 - 序列化）
	 *
	 * @param teamId 队伍ID
	 * @returns 指定队伍的成员数据数组
	 */
	getMembersByTeam(teamId: string): MemberSnapshot[] {
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
	 * 重置引擎级循环统计。
	 * 目的：
	 * - 把“逻辑 tick 推进统计”收回到 GameEngine
	 * - 让对外 ticksPerSecond / totalTicks 反映真实 stepTick 执行结果
	 */
	private resetEngineFrameLoopStats(clockKind: FrameLoopStats["clockKind"]): void {
		this.frameLoopStats = {
			averageTicksPerSecond: 0,
			totalTicks: 0,
			totalRunTime: 0,
			clockKind,
			skippedTicks: 0,
			timeoutTicks: 0,
		};
	}

	/**
	 * 重置快照观察器。
	 * 第一轮仍默认关闭快照节流发送，但职责已经回到引擎侧。
	 */
	private resetSnapshotObserver(): void {
		this.snapshotObserver.lastSnapshotTime = 0;
		this.snapshotObserver.snapshotIntervalMs =
			this.snapshotObserver.snapshotHz > 0 ? 1000 / this.snapshotObserver.snapshotHz : Number.POSITIVE_INFINITY;
	}

	/**
	 * 把底层时钟驱动统计同步到引擎级统计里。
	 * 说明：
	 * - clockKind / skippedTicks / timeoutTicks 仍来自底层 FrameLoop
	 * - totalTicks / averageTicksPerSecond / totalRunTime 由引擎自己根据 stepTick 结果维护
	 */
	private syncFrameLoopDriverStats(): void {
		const driverStats = this.frameLoop.getFrameLoopStats();
		this.frameLoopStats.clockKind = driverStats.clockKind;
		this.frameLoopStats.skippedTicks = driverStats.skippedTicks;
		this.frameLoopStats.timeoutTicks = driverStats.timeoutTicks;
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
		this.frameLoopStats.totalTicks = this.tickIndex;

		const seconds = runTime / 1000;
		this.frameLoopStats.averageTicksPerSecond = seconds > 0 ? this.tickIndex / seconds : 0;
	}

	/**
	 * 统一组装兼容旧接口的循环快照。
	 */
	private createFrameLoopSnapshot(): FrameLoopSnapshot {
		return {
			tickIndex: this.getTickIndex(),
			ticksPerSecond: this.frameLoopStats.averageTicksPerSecond,
		};
	}

	private getLogicStepMs(): number {
		return 1000 / this.config.frameLoopConfig.logicHz;
	}

	/**
	 * realtime 驱动入口。
	 * FrameLoop 只负责告诉我们“建议推进多少 tick”，真正的循环控制在这里。
	 */
	private handleFrameLoopTick(tick: FrameLoopTick): void {
		this.syncFrameLoopDriverStats();

		for (let index = 0; index < tick.dueTicks; index++) {
			this.runSingleTick(tick.clockKind, tick.logicStepMs);
		}

		this.syncFrameLoopDriverStats();
	}

	/**
	 * 执行一次引擎级单 tick 事务，并统一更新统计/快照。
	 * 这样 manual step、realtime、fast-forward 就能复用一套收尾逻辑。
	 */
	private runSingleTick(clockKind: FrameLoopStats["clockKind"], deltaTimeMs: number): TickStepResult {
		const stepResult = this.stepTick({
			maxEvents: this.config.frameLoopConfig.maxEventsPerTick,
			deltaTimeMs,
		});

		this.stats.totalEventsProcessed += stepResult.eventsProcessed;
		this.updateEngineFrameLoopStats(clockKind);
		const completedTick = {
			tickIndex: stepResult.tickIndex,
			currentTimeMs: this.getCurrentTimeMs(),
		};
		if (this.runOutput.isRecording()) {
			this.runOutput.appendTick(
				completedTick.tickIndex,
				completedTick.currentTimeMs,
				this.world.memberManager.getAllMembers(),
			);
		}
		this.emitFrameSnapshotIfNeeded(completedTick);

		return stepResult;
	}

	/**
	 * 根据 RuntimeConfig.stopPolicy 检查是否应停止快进。
	 */
	private checkStopCondition(): boolean {
		const policy = this.runtimeConfig.stopPolicy;
		switch (policy.kind) {
			case "manual":
				return false;
			case "untilTimeMs":
				return this.currentTimeMs >= policy.targetTimeMs;
			case "untilBattleEnd": {
				const allMembers = this.world.memberManager.getAllMembers();
				if (allMembers.length === 0) return true;
				const camps = new Set<string>();
				for (const m of allMembers) {
					if (m.statContainer.getValue("hp.current") > 0) {
						camps.add(m.campId);
					}
				}
				return camps.size <= 1;
			}
			case "untilSequencesDone": {
				const allMembers = this.world.memberManager.getAllMembers();
				if (allMembers.length === 0) return true;
				for (const m of allMembers) {
					const runtime = m.runtime as { actionQueue?: { length: number } };
					if (runtime.actionQueue && runtime.actionQueue.length > 0) {
						return false;
					}
					if (m.btManager.hasRunningParallelBt()) {
						return false;
					}
				}
				return true;
			}
			case "untilMemberActionEnds": {
				const m = this.world.memberManager.getMember(policy.memberId);
				if (!m) return true;
				const runtime = m.runtime as { actionQueue?: { length: number } };
				const hasQueuedAction = !!runtime.actionQueue && runtime.actionQueue.length > 0;
				const hasActiveEffectBt = m.btManager.hasActiveEffectBt();
				return !hasQueuedAction && !hasActiveEffectBt;
			}
			case "untilMemberFlowEnds": {
				const member = this.world.memberManager.getMember(policy.memberId);
				if (!member) return true;
				return !member.btManager.isParallelBtRunning("member-flow");
			}
			default:
				return false;
		}
	}

	/**
	 * 引擎侧快照节流。
	 * 这层负责决定“每完成一个 tick 后是否需要对外发高频快照”。
	 */
	private emitFrameSnapshotIfNeeded(completedTick: { tickIndex: number; currentTimeMs: number }): void {
		if (this.snapshotObserver.snapshotHz <= 0 || !this.frameSnapshotSender) {
			return;
		}

		const now = performance.now();
		if (now - this.snapshotObserver.lastSnapshotTime < this.snapshotObserver.snapshotIntervalMs) {
			return;
		}

		this.sendFrameSnapshot(this.createFrameSnapshot(completedTick));
		this.snapshotObserver.lastSnapshotTime = now;
	}

	/** 开始收集当前运行的权威原始产出。 */
	startRunOutput(runId: string, policy: ExecutionRecordingPolicy): void {
		this.runOutput.start(runId, this.getTickIndex(), this.getCurrentTimeMs(), policy);
	}

	/** 幂等封闭当前运行；在确认移交前重复调用返回同一结果。 */
	finishRunOutput(runId: string): EngineRunOutput {
		return this.runOutput.finish(runId, this.getCurrentTimeMs());
	}

	/** 验证启动尚未提交成功时释放活动收集器。 */
	cancelRunOutput(runId: string): void {
		this.runOutput.cancel(runId);
	}

	/** 调用方确认收到结果后释放 Engine 的待移交产出。 */
	acknowledgeRunOutput(runId: string): void {
		this.runOutput.acknowledgeTransfer(runId);
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
		const isSandboxWorker =
			typeof globalThis !== "undefined" && typeof globalThis === "object" && "safeAPI" in globalThis;

		// 检查是否在Worker环境中（有self但没有window）
		const isWorkerEnvironment = typeof self !== "undefined" && !isMainThread;

		// 只有在浏览器主线程中才阻止创建
		if (isMainThread && !isTestEnvironment) {
			const error = new Error(
				"🛡️ 安全限制：GameEngine禁止在浏览器主线程中运行！\n" +
					"请使用SimulationWorkerPool启动Worker中的GameEngine实例。\n" +
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
	 * 同步快进：在当前线程上连续执行逻辑 tick，直到 stopPolicy 触发或达到 tick 上限。
	 * 仅供预览/探针等短流程使用；不适用长时间实时模拟。
	 *
	 * @param options.maxTicks 最大总 tick 数保护上限（防止无限循环）
	 * @param options.maxDurationMs 最大模拟时间预算（毫秒）
	 * @returns 实际执行的逻辑 tick 数与推进的模拟时间
	 */
	fastForwardSync(options: FastForwardSyncOptions = {}): FastForwardSyncResult {
		if (!this.scenarioData) throw new Error("fastForwardSync: 场景尚未加载");
		if (this.frameLoop.isRunning() || this.frameLoop.isPaused()) {
			throw new Error("fastForwardSync: clocked 驱动活动时不能同步推进");
		}
		const maxTicks = options.maxTicks ?? Number.POSITIVE_INFINITY;
		const maxDurationMs = options.maxDurationMs ?? Number.POSITIVE_INFINITY;
		const startTimeMs = this.currentTimeMs;
		let totalTicks = 0;
		let completed = false;
		while (totalTicks < maxTicks && this.currentTimeMs - startTimeMs < maxDurationMs) {
			this.runSingleTick("manual", this.getLogicStepMs());
			totalTicks++;
			if (this.checkStopCondition()) {
				completed = true;
				break;
			}
		}
		const elapsedMs = this.currentTimeMs - startTimeMs;
		const reachedLimit = !completed && (totalTicks >= maxTicks || elapsedMs >= maxDurationMs);
		return { ticksRun: totalTicks, elapsedMs, reachedLimit };
	}

	// ==================== Checkpoint / Restore ====================

	captureCheckpoint(): EngineCheckpoint {
		return {
			tickIndex: this.tickIndex,
			currentTimeMs: this.currentTimeMs,
			timestamp: performance.now(),
			eventQueue: this.eventQueue.captureCheckpoint(),
			world: this.world.captureCheckpoint(),
			domainEventBus: this.domainEventBus.captureCheckpoint(),
			controllerEventProjector: this.controllerEventProjector.captureCheckpoint(),
			randomState: this.random.getState(),
		};
	}

	restoreCheckpoint(checkpoint: EngineCheckpoint): void {
		if (this.frameLoop.isRunning() || this.frameLoop.isPaused()) {
			throw new Error("restoreCheckpoint: 必须先停止 clocked 驱动");
		}

		this.tickIndex = checkpoint.tickIndex;
		this.currentTimeMs = checkpoint.currentTimeMs;
		this.deltaTimeMs = 0;
		this.eventQueue.restoreCheckpoint(checkpoint.eventQueue);
		this.world.restoreCheckpoint(checkpoint.world);
		this.domainEventBus.restoreCheckpoint(checkpoint.domainEventBus);
		this.controllerEventProjector.restoreCheckpoint(checkpoint.controllerEventProjector);
		if (checkpoint.randomState) {
			this.random.setState(checkpoint.randomState);
		}
	}
}

// 透出类型给主线程 UI 使用
export type { FrameSnapshot } from "./types";
