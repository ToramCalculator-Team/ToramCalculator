import { createLogger } from "~/lib/logger";
import { type EngineRunOutput, type ExecutionRecordingPolicy, RunOutputRecorder } from "./runOutput";
import type { EngineCheckpoint, GameEngineSnapshot, RuntimeConfig } from "./types";
import { createRealtimeConfig } from "./types";
import type { WorldScenarioData } from "./World/types";
import { World } from "./World/World";

const log = createLogger("GameEngine");

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
	private world: World; // 模拟状态容器（公开只读，供测试访问）

	// 引擎时间管理
	private tickIndex: number = 0; // 当前逻辑 tick 序号

	// 状态管理
	private shouldAdvance: boolean = false; // 是否应该推进tick循环
	private timer: ReturnType<typeof setTimeout> | null = null;
	private currentLoopStartAt: number = 0; // 当前轮次启动时间（用于在循环调度时校准延迟）
	private currentLoopStartIndex: number = 0; // 当前轮次启动时的TickIndex
	private stepMs: number; // tick步长

	// 输入输入接口（SAB），两个端口各一个缓冲区，端口内分状态区与事件区
	private inputBuffer: SharedArrayBuffer | null = null; // 引擎的输入端口
	private outputBuffer: SharedArrayBuffer | null = null; // 引擎的输出端口

	// 配置
	/** 存储场景配置参数，用于重置时复用 */
	private scenarioData: WorldScenarioData | null = null;
	/**引擎运行配置。默认值为实时模拟 */
	private runtimeConfig: RuntimeConfig;

	/** Worker 内当前运行产出；结束后只保留到 Session 明确认领。 */
	private readonly runOutput = new RunOutputRecorder();

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
	 * @param runtimeConfig 引擎配置
	 */
	constructor(runtimeConfig: RuntimeConfig) {
		// 🛡️ 安全检查：只允许在Worker线程中创建GameEngine
		this.validateWorkerContext();

		log.debug("GameEngine constructor");

		this.runtimeConfig = runtimeConfig ?? createRealtimeConfig();
		this.stepMs = 1000 / this.runtimeConfig.logicHz;

		// World 相关
		this.world = new World(this.getStepMs());
	}

	// ==================== 场景资源管理 ====================

	/**
	 *
	 */
	loadScenario(data: WorldScenarioData): void {
		this.world.loadScenario(data);
		log.info("GameEngine: 场景数据已加载");
	}

	/**
	 * 重置引擎
	 */
	reset(): void {
		// 停止循环
		this.stopLoop();

		// 重置模拟周期数据
		this.tickIndex = 0;

		// 重置世界数据
		this.world = new World(this.getStepMs());

		log.info("GameEngine: 引擎已重置");
	}

	// ==================== 生命周期管理 ====================

	/**
	 * 启动帧循环。仅在 ready / paused 状态下可调用。
	 */
	startLoop(): void {
		this.shouldAdvance = true;
		this.currentLoopStartAt = performance.now();
		this.currentLoopStartIndex = this.tickIndex;
		this.scheduleNext();
	}

	/**
	 * 停止帧循环。运行态/暂停态 → ready（若已有场景）或 idle。
	 */
	stopLoop(): void {
		this.shouldAdvance = false;
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}
	}

	/**
	 * 暂停帧循环
	 */
	pause(): void {
		if (this.runtimeConfig.driveMode !== "clocked") throw new Error("GameEngine: unclocked 执行不可暂停");
		this.stopLoop();
	}

	resume(): void {
		if (this.runtimeConfig.driveMode !== "clocked") throw new Error("GameEngine: unclocked 执行不可恢复");
		this.startLoop();
	}

	/**
	 * 单步推进帧。仅在 ready / paused 状态下可调用，被调用时不应该有timer
	 */
	step(): void {
		this.shouldAdvance = false;
		this.currentLoopStartAt = performance.now();
		this.currentLoopStartIndex = this.tickIndex;
		this.scheduleNext();
	}

	/**
	 * 获取当前配置中的fps
	 */
	getLogicHz() {
		return this.runtimeConfig.logicHz;
	}

	/**
	 * 获取当前逻辑 tick 序号
	 */
	getTickIndex(): number {
		return this.tickIndex;
	}

	/**
	 * 获取帧步长
	 */
	getStepMs() {
		return 1000 / this.getLogicHz();
	}

	/**
	 * 获取当前模拟时间（毫秒）
	 */
	getCurrentTimeMs(): number {
		return this.getTickIndex() * this.getStepMs();
	}

	// ==================== 单帧执行核心逻辑 ====================

	//
	private scheduleNext(): void {
		// 满足结束条件时，主动结束推进（手动操作时永远不结束）
		if (this.checkStopCondition()) {
			this.stopLoop();
			return;
		}

		// 当前帧实际开始时间
		const now = performance.now();

		// 本轮已推进的tick数
		const round = this.tickIndex - this.currentLoopStartIndex;

		// 当前帧预期开始时间
		const expectedTimeMs = this.currentLoopStartAt + round * this.stepMs;

		// 计算漂移误差（当前帧开始实际时间 - 预期开始时间）
		const drift = now - expectedTimeMs;

		// 如果误差过大（例如 Worker 被浏览器挂起后恢复），进行重置，防止追赶循环导致卡死
		if (drift > this.stepMs) {
			throw new Error("FrameLoop单步漂移大于间隔时间，需要降低tick耗时或者增加FrameLoop单步时长");
		}

		// 设置下一次tick时间
		if (this.shouldAdvance) {
			this.timer = setTimeout(() => this.scheduleNext(), this.stepMs - drift);
		}

		// 解析当前输入端口指令

		// 调用world.tick
		this.world.tick(
			{
				tickIndex: this.tickIndex,
				currentTimeMs: this.getCurrentTimeMs(),
				fixedStepMs: this.stepMs,
			},
			[
				// 解析InputSAB后得到的指令
			],
		);

		// 更新输出端口

		// tick + 1
		this.tickIndex++;
	}

	// ==================== 快照管理 ====================

	/**
	 * 获取当前快照
	 *
	 * @returns 当前战斗快照
	 */
	getCurrentSnapshot(): GameEngineSnapshot {
		const tickIndex = this.getTickIndex();
		const currentTimeMs = this.getCurrentTimeMs();

		return {
			tickIndex,
			currentTimeMs,
			world: "还没写好",
		};
	}

	/**
	 * 根据 RuntimeConfig.stopPolicy 检查是否应停止快进。
	 */
	private checkStopCondition(): boolean {
		const policy = this.runtimeConfig.stopPolicy;
		switch (policy.kind) {
			case "manual":
				return false; // 手动模式不自动停止
			case "untilTimeMs":
				return this.tickIndex * this.stepMs >= policy.targetTimeMs; // 超出最大模拟时间时停止
			case "untilBattleEnd": {
				const winner = this.world.getBattleResult().winner;
				return !winner; // 某一方获胜时停止
			}
			case "untilMemberActionEnds": {
				return false; // 成员行为结束后停止
			}
			default:
				return false;
		}
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
	 * 快进循环：在当前线程上连续执行逻辑 tick，直到 stopPolicy 触发或达到 tick 上限。
	 * 仅供预览/探针等短流程使用；不适用长时间实时模拟。
	 *
	 * @param options.maxTicks 最大总 tick 数保护上限（防止无限循环）
	 * @param options.maxDurationMs 最大模拟时间预算（毫秒）
	 * @returns 实际执行的逻辑 tick 数与推进的模拟时间
	 */
	fastForwardSync(options: { maxTicks: number; maxDurationMs: number }): {
		ticksRun: number;
		elapsedMs: number;
		reachedLimit: boolean;
	} {
		if (!this.scenarioData) throw new Error("fastForwardSync: 场景尚未加载");
		const maxTicks = options.maxTicks;
		const maxDurationMs = options.maxDurationMs;
		const startTimeMs = performance.now();
		let currentTick = 0;
		let completed = false;
		while (currentTick < maxTicks) {
			this.world.tick(
				{
					tickIndex: currentTick,
					currentTimeMs: currentTick * this.stepMs,
					fixedStepMs: this.stepMs,
				},
				[],
			);
			currentTick++;
			if (this.checkStopCondition() || performance.now() - startTimeMs < maxDurationMs) {
				completed = true;
				break;
			}
		}
		const elapsedMs = performance.now() - startTimeMs;
		const reachedLimit = !completed;
		return { ticksRun: currentTick, elapsedMs, reachedLimit };
	}

	// ==================== Checkpoint / Restore ====================

	captureCheckpoint(): EngineCheckpoint {
		return {
			tickIndex: this.tickIndex,
			currentTimeMs: this.tickIndex * this.stepMs,
			timestamp: performance.now(),
			world: this.world.captureCheckpoint(),
		};
	}

	restoreCheckpoint(checkpoint: EngineCheckpoint): void {
		this.tickIndex = checkpoint.tickIndex;
		this.world.restoreCheckpoint(checkpoint.world);
	}
}
