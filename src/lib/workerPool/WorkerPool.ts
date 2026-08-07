import { createId } from "@paralleldrive/cuid2";
import { EventEmitter } from "./EventEmitter";
import { prepareForTransfer } from "./MessageSerializer";
import { PriorityTaskQueue } from "./PriorityTaskQueue";
import {
	type Result,
	type Task,
	type WorkerMessage,
	type WorkerSystemMessageEnvelope,
	WorkerSystemMessageEnvelopeSchema,
	WorkerTaskResponseEnvelopeSchema,
} from "./type";

// Worker性能指标
interface WorkerMetrics {
	tasksCompleted: number; // 已完成任务数
	errors: number; // 错误次数
	avgProcessingTime: number; // 平均处理时间
	lastActive: number; // 最后活跃时间
	totalProcessingTime: number; // 总处理时间
}

// Worker包装器
export interface WorkerWrapper {
	worker: Worker; // Web Worker实例
	port: MessagePort; // 通信端口
	busy: boolean; // 是否忙碌
	/** 是否已完成初始化握手（ready） */
	ready: boolean;
	id: string; // Worker唯一标识
	lastUsed: number; // 最后使用时间
	metrics: WorkerMetrics; // 性能指标
}

// 池健康指标
export interface PoolHealthMetrics {
	activeWorkers: number; // 活跃Worker数量
	totalWorkers: number; // 总Worker数量
	queueLength: number; // 队列长度
	pendingTasks: number; // 待处理任务数
	workerMetrics: Array<{
		workerId: string; // Worker标识
		tasksCompleted: number; // 已完成任务数
		errors: number; // 错误次数
		avgProcessingTime: number; // 平均处理时间
		lastActive: number; // 最后活跃时间
	}>;
}

// 配置接口
export interface PoolConfig<TPriority extends string> {
	priority: TPriority[]; // 任务优先级
	workerUrl: string; // Worker URL
	maxWorkers?: number; // 最大Worker数量
	taskTimeout?: number; // 任务超时时间
	idleTimeout?: number; // 空闲超时时间
	maxRetries?: number; // 最大重试次数
	maxQueueSize?: number; // 最大队列大小
	monitorInterval?: number; // 监控间隔
	/**
	 * 系统消息信封 schema（用于识别 worker 主动 push 的消息）
	 *
	 * lib 层默认使用 WorkerSystemMessageEnvelopeSchema（只校验形状）
	 */
	systemMessageEnvelopeSchema?: typeof WorkerSystemMessageEnvelopeSchema;
	/**
	 * 判定某条系统消息是否代表“worker ready”（业务层注入）
	 *
	 * 如果不提供，默认不做 ready 判定（worker 将保持不可用）
	 */
	isWorkerReadyMessage?: (sys: WorkerSystemMessageEnvelope) => boolean;
}

type WorkerPoolLifecycle = "configured" | "started" | "stopping" | "stopped";

/**
 * 通用线程池
 *
 * 基于 Artem Khrienov 设计原则的通用线程池实现：
 *
 * 核心功能：
 * - 通用任务执行和调度
 * - 任务重试机制和优先级队列
 * - 性能监控与指标收集
 * - 事件驱动的状态管理
 * - 优雅关闭和资源清理
 *
 * 架构设计：
 * - 采用单层 MessageChannel 通信机制
 * - 实现响应式任务分配（Node.js ThreadPool模式）
 * - 支持多Worker并行处理
 * - 提供类型安全的API接口
 *
 * 泛型参数：
 * - TTaskTypeMap: 任务类型映射表 { [taskType: string]: PayloadType }
 * - TPriority: 优先级类型
 */
export class WorkerPool<
	TTaskType extends string,
	TTaskTypeMap extends Record<TTaskType, unknown>,
	TPriority extends string,
> extends EventEmitter {
	// ==================== 私有属性 ====================

	/** Worker包装器数组 - 管理所有活跃的Worker实例 */
	private workers: WorkerWrapper[] = [];

	/** 优先级任务队列 - 实现三级优先级调度 */
	private taskQueue: PriorityTaskQueue<TTaskType, TTaskTypeMap[keyof TTaskTypeMap], TPriority>;

	/**
	 * 任务映射表 - 跟踪所有正在执行的任务
	 * Key: 任务ID, Value: 任务回调信息（Promise解析器、超时定时器、任务对象）
	 */
	private taskMap = new Map<
		string,
		{
			resolve: (result: Result<unknown>) => void; // Promise解析函数
			reject: (error: Error) => void; // Promise拒绝函数
			timeout: NodeJS.Timeout; // 超时定时器
			task: Task<TTaskType, TTaskTypeMap[keyof TTaskTypeMap], TPriority>; // 任务对象
		}
	>();

	/** 任务与Worker的映射关系，用于精确错误归属与统计 */
	private taskToWorkerId = new Map<string, string>();

	/** 线程池配置 - 运行时不可变，确保配置一致性 */
	private readonly config: Required<PoolConfig<TPriority>>;

	/** 资源清理定时器 - 定期清理超时任务和空闲Worker */
	private cleanupInterval?: NodeJS.Timeout;

	/** 性能监控定时器 - 定期收集和上报性能指标 */
	private monitorInterval?: NodeJS.Timeout;

	private lifecycle: WorkerPoolLifecycle = "configured";
	private shutdownPromise: Promise<void> | null = null;

	/**
	 * 构造函数
	 *
	 * 初始化通用线程池配置；物理 Worker 和后台服务只由 start() 创建。
	 *
	 * @param config 线程池配置参数
	 *
	 * 设计原则：
	 * - 配置验证：确保所有配置参数有效
	 * - 显式生命周期：构造和读取都不能偷偷创建资源
	 */
	constructor(config: PoolConfig<TPriority>) {
		super();
		// 验证配置参数
		this.validateConfig(config);

		// 根据传入对象确定优先级队列
		this.taskQueue = new PriorityTaskQueue<TTaskType, TTaskTypeMap[keyof TTaskTypeMap], TPriority>(config.priority);

		// 合并用户配置和默认配置
		this.config = {
			maxWorkers: config.maxWorkers || 1, // 默认单Worker
			taskTimeout: config.taskTimeout || 30000, // 30秒超时
			idleTimeout: config.idleTimeout || 300000, // 5分钟空闲超时
			maxRetries: config.maxRetries || 3, // 最多重试3次
			maxQueueSize: config.maxQueueSize || 1000, // 队列上限1000
			monitorInterval: config.monitorInterval || 5000, // 5秒监控间隔
			...config, // 用户配置覆盖默认值
			// 系统消息信封 schema：默认使用库层通用 schema（只校验形状）
			systemMessageEnvelopeSchema: config.systemMessageEnvelopeSchema ?? WorkerSystemMessageEnvelopeSchema,
			// ready 判定：默认不做判定（业务层应注入）
			isWorkerReadyMessage: config.isWorkerReadyMessage ?? (() => false),
		};
	}

	/**
	 * 验证配置参数
	 *
	 * 确保所有配置参数在有效范围内，防止运行时错误
	 *
	 * @param config 待验证的配置对象
	 * @throws Error 当配置参数无效时抛出错误
	 *
	 * 验证规则：
	 * - maxWorkers: 必须为正整数
	 * - taskTimeout: 必须为正数
	 * - maxRetries: 必须为非负整数
	 * - maxQueueSize: 必须为正整数
	 */
	private validateConfig(config: PoolConfig<TPriority>): void {
		// 验证Worker数量
		if (config.maxWorkers !== undefined && (config.maxWorkers < 1 || !Number.isInteger(config.maxWorkers))) {
			throw new Error("无效的maxWorkers：必须为正整数");
		}

		// 验证任务超时时间
		if (config.taskTimeout !== undefined && config.taskTimeout <= 0) {
			throw new Error("无效的taskTimeout：必须为正数");
		}

		// 验证重试次数
		if (config.maxRetries !== undefined && (config.maxRetries < 0 || !Number.isInteger(config.maxRetries))) {
			throw new Error("无效的maxRetries：必须为非负整数");
		}

		// 验证队列大小
		if (config.maxQueueSize !== undefined && (config.maxQueueSize < 1 || !Number.isInteger(config.maxQueueSize))) {
			throw new Error("无效的maxQueueSize：必须为正整数");
		}
	}

	/** 唯一显式启动入口；构造、查询和任务提交都不会补启动。 */
	start(): void {
		if (this.lifecycle === "started") return;
		if (this.lifecycle !== "configured") {
			throw new Error(`WorkerPool 无法从 ${this.lifecycle} 状态启动`);
		}

		this.lifecycle = "started";
		try {
			this.initializeWorkers();
			this.startCleanupProcess();
			this.startMonitoring();
		} catch (error) {
			this.stopBackgroundServices();
			for (const worker of this.workers) {
				worker.port.close();
				worker.worker.terminate();
			}
			this.workers.length = 0;
			this.lifecycle = "stopped";
			throw error;
		}
	}

	/**
	 * 初始化Worker池
	 *
	 * 根据配置创建指定数量的Worker实例
	 * 每个Worker都是独立的计算单元，支持并行处理
	 */
	private initializeWorkers(): void {
		for (let i = 0; i < this.config.maxWorkers; i++) {
			this.createWorker();
		}
	}

	/**
	 * 创建新的Worker实例
	 *
	 * 创建Worker包装器，设置通信通道和事件处理
	 *
	 * @returns WorkerWrapper 新创建的Worker包装器
	 *
	 * 设计要点：
	 * - 单层通信：统一使用MessageChannel
	 * - 唯一标识：每个Worker有独立的ID
	 * - 性能监控：跟踪任务完成情况和处理时间
	 * - 错误处理：Worker故障时自动替换
	 */
	private createWorker(insertAt?: number): WorkerWrapper {
		// 创建Web Worker实例
		const worker = new Worker(this.config.workerUrl, { type: "module" });

		// 创建MessageChannel用于专用通信
		const channel = new MessageChannel();

		// 创建Worker包装器
		const wrapper: WorkerWrapper = {
			worker,
			port: channel.port2, // 主线程持有port2
			busy: true, // 初始状态为忙碌（不可分配任务），等待 ready 握手
			ready: false,
			id: createId(), // 生成唯一ID
			lastUsed: Date.now(), // 记录最后使用时间
			metrics: {
				tasksCompleted: 0, // 已完成任务数
				errors: 0, // 错误次数
				avgProcessingTime: 0, // 平均处理时间
				lastActive: Date.now(), // 最后活跃时间
				totalProcessingTime: 0, // 总处理时间
			},
		};

		// 设置专用通信通道
		// 将port1传递给Worker，实现双向通信
		worker.postMessage({ type: "init", port: channel.port1 }, [channel.port1]);

		// 设置MessageChannel消息处理 - 用于任务相关消息
		channel.port2.onmessage = (event) => {
			// 尝试根据系统消息 schema 进行解析（若匹配则直接透传系统事件）
			const parsed = this.config.systemMessageEnvelopeSchema.safeParse(event.data);
			if (parsed.success) {
				const sys = parsed.data;

				// 检查是否是 Worker 初始化完成的消息（由业务层注入判定规则）
				if (!wrapper.ready && this.config.isWorkerReadyMessage(sys)) {
					// console.log(`✅ Worker ${wrapper.id} 初始化完成，标记为可用`);
					wrapper.ready = true;
					wrapper.busy = false;
					// 初始化完成后，处理队列中的任务
					this.processNextTask();
					return;
				}

				this.emit("worker-message", {
					worker: wrapper,
					event: { type: sys.type, data: sys.data, belongToTaskId: sys.belongToTaskId },
				});
				return;
			}
			this.handleWorkerMessage(wrapper, event);
		};

		// 统一使用 MessageChannel 处理所有消息

		// 设置错误处理
		worker.onerror = (error) => {
			console.error(`Worker ${wrapper.id} 错误:`, error);
			this.handleWorkerError(wrapper, error);
		};

		// 初始化追加，故障替换则原位插入，避免同一个 wrapper 被登记两次。
		if (insertAt === undefined) {
			this.workers.push(wrapper);
		} else {
			this.workers.splice(insertAt, 0, wrapper);
		}
		return wrapper;
	}

	private activeTaskIdForWorker(worker: WorkerWrapper): string | undefined {
		return Array.from(this.taskToWorkerId.entries()).find(([, workerId]) => workerId === worker.id)?.[0];
	}

	/**
	 * 统一结束一次基础设施失败，保证任务、Worker 占用和重试定时器同时收敛。
	 * 协议信封非法时不重试原任务；超时、发送失败和 Worker 崩溃可以按通用配置重试。
	 */
	private failTask(
		belongToTaskId: string,
		error: Error,
		options: { retryable: boolean; replaceWorker: boolean },
	): void {
		const callback = this.taskMap.get(belongToTaskId);
		if (!callback) return;

		clearTimeout(callback.timeout);
		const workerId = this.taskToWorkerId.get(belongToTaskId);
		const worker = workerId ? this.workers.find((candidate) => candidate.id === workerId) : undefined;
		this.taskToWorkerId.delete(belongToTaskId);
		this.taskQueue.remove(belongToTaskId);

		if (options.retryable && callback.task.retriesLeft > 0) {
			callback.task.retriesLeft--;
			callback.timeout = this.createTaskTimeout(callback.task);
			this.taskQueue.unshift(callback.task);
			this.emit("task-retry", {
				belongToTaskId,
				retriesLeft: callback.task.retriesLeft,
				error: error.message,
			});
		} else {
			this.taskMap.delete(belongToTaskId);
			callback.reject(error);
			this.emit("task-failed", { belongToTaskId, error: error.message });
		}

		if (worker) {
			this.updateWorkerMetrics(worker, "error");
			if (options.replaceWorker) {
				this.replaceWorker(worker);
			} else {
				worker.busy = false;
				worker.lastUsed = Date.now();
			}
		}
		this.processNextTask();
	}

	private createTaskTimeout(task: Task<TTaskType, TTaskTypeMap[keyof TTaskTypeMap], TPriority>): NodeJS.Timeout {
		return setTimeout(() => {
			this.failTask(task.id, new Error("Task timeout"), { retryable: true, replaceWorker: true });
		}, task.timeout);
	}

	/**
	 * 处理Worker返回的消息（通过MessageChannel）
	 *
	 * 这是任务完成处理的核心方法，实现了完整的任务生命周期管理：
	 * 1. 解析Worker返回的结果和性能指标
	 * 2. 处理任务成功或失败的情况
	 * 3. 实现智能重试机制
	 * 4. 更新Worker性能指标
	 * 5. 释放Worker并触发响应式任务分配
	 *
	 * @param worker Worker包装器
	 * @param event 消息事件
	 *
	 * 设计原则：
	 * - 响应式分配：任务完成后立即处理下一个任务
	 * - 容错处理：支持任务重试和错误恢复
	 * - 性能监控：收集处理时间和成功率指标
	 * - 事件驱动：通过事件通知外部系统状态变化
	 */
	private handleWorkerMessage(worker: WorkerWrapper, event: MessageEvent<unknown>): void {
		// console.log("收到worker消息", event.data);
		const parsed = WorkerTaskResponseEnvelopeSchema.safeParse(event.data);
		if (!parsed.success) {
			const activeTaskId = this.activeTaskIdForWorker(worker);
			if (activeTaskId) {
				this.failTask(activeTaskId, new Error(`Worker returned an invalid task response: ${parsed.error.message}`), {
					retryable: false,
					replaceWorker: true,
				});
			} else {
				this.replaceWorker(worker);
				this.processNextTask();
			}
			return;
		}
		const messageData = parsed.data;
		const { belongToTaskId, result, error, metrics } = messageData;

		// 发射原始消息事件，让子类处理业务逻辑
		// 只传递实际需要的字段，避免传递未定义的字段
		this.emit("worker-message", {
			worker,
			event: {
				belongToTaskId,
				result,
				error,
				metrics,
			},
		});

		// 处理任务结果
		const taskCallback = this.taskMap.get(belongToTaskId);
		if (!taskCallback) {
			const activeTaskId = this.activeTaskIdForWorker(worker);
			if (activeTaskId) {
				this.failTask(activeTaskId, new Error(`Worker returned an unknown task id: ${belongToTaskId}`), {
					retryable: false,
					replaceWorker: true,
				});
			} else {
				this.replaceWorker(worker);
				this.processNextTask();
			}
			return;
		}

		const { resolve, timeout } = taskCallback;
		const processingTime = metrics?.duration || 0;

		// 清除任务超时定时器，防止内存泄漏
		clearTimeout(timeout);

		// 更新Worker性能指标，用于负载均衡和故障检测
		this.updateWorkerMetrics(worker, error ? "error" : "success", processingTime);

		if (error !== undefined && error !== null) {
			this.failTask(belongToTaskId, new Error(error), { retryable: true, replaceWorker: true });
			return;
		} else {
			// 任务执行成功，返回结果和性能指标
			this.taskMap.delete(belongToTaskId);
			const taskResult: Result<unknown> = {
				success: true,
				data: result,
				metrics,
			};

			resolve(taskResult);
			this.emit("task-completed", { belongToTaskId, result, metrics });
		}

		// 响应式任务分配：释放Worker并立即处理下一个任务
		// 这是Node.js ThreadPool设计的核心思想，确保系统的高响应性
		worker.busy = false;
		worker.lastUsed = Date.now();
		// 清理任务与worker的绑定
		if (belongToTaskId) {
			this.taskToWorkerId.delete(belongToTaskId);
		}
		this.processNextTask(); // 立即尝试处理队列中的下一个任务
	}

	private handleWorkerError(worker: WorkerWrapper, error: ErrorEvent): void {
		const activeTaskId = this.activeTaskIdForWorker(worker);
		if (activeTaskId) {
			this.failTask(activeTaskId, new Error(`Worker error: ${error.message}`), {
				retryable: true,
				replaceWorker: true,
			});
			return;
		}
		this.updateWorkerMetrics(worker, "error");
		this.replaceWorker(worker);
		this.processNextTask();
	}

	private replaceWorker(worker: WorkerWrapper): void {
		const index = this.workers.indexOf(worker);
		if (index !== -1) {
			this.workers.splice(index, 1);
			try {
				worker.worker.terminate();
			} catch {
				// 忽略终止错误
			}

			if (this.lifecycle === "started" || (this.lifecycle === "stopping" && this.taskMap.size > 0)) {
				const newWorker = this.createWorker(index);
				this.emit("worker-replaced", { oldId: worker.id, newId: newWorker.id });
			}
		}
	}

	private updateWorkerMetrics(worker: WorkerWrapper, status: "success" | "error", processingTime: number = 0): void {
		const metrics = worker.metrics;

		if (status === "success") {
			metrics.tasksCompleted++;
			metrics.totalProcessingTime += processingTime;
			metrics.avgProcessingTime = metrics.totalProcessingTime / metrics.tasksCompleted;
		} else if (status === "error") {
			metrics.errors++;
		}

		metrics.lastActive = Date.now();
	}

	/**
	 * 执行任务（类型安全版本）
	 *
	 * 通过泛型约束确保任务类型和 payload 类型匹配
	 *
	 * @param type 任务类型（必须是 TTaskTypeMap 的键）
	 * @param payload 任务数据（类型与 TTaskTypeMap[type] 匹配）
	 * @param priority 任务优先级
	 * @returns 任务执行结果
	 *
	 * @example
	 * // ✅ 类型安全：只能发送 EngineControlMessage
	 * pool.executeTask("engine_command", engineCmd, "high");
	 *
	 * // ❌ 编译错误：类型不匹配
	 * pool.executeTask("engine_command", dataQueryCmd, "high");
	 */
	async executeTask<K extends TTaskType>(
		type: K,
		payload: TTaskTypeMap[K],
		priority: TPriority,
	): Promise<Result<unknown>> {
		if (this.lifecycle !== "started") {
			throw new Error(`WorkerPool 尚未启动或已关闭: ${this.lifecycle}`);
		}

		// 构建任务对象
		const task: Task<K, TTaskTypeMap[K], TPriority> = {
			id: createId(),
			type,
			payload,
			priority,
			timestamp: Date.now(),
			timeout: this.config.taskTimeout,
			retriesLeft: this.config.maxRetries,
			originalRetries: this.config.maxRetries,
		};

		// console.log("🔄 WorkerPool: executeTask - 任务已创建:", { type, taskId: task.id, priority });
		return await this.processTask(task);
	}

	/**
	 * 处理单个任务的核心方法
	 *
	 * 实现了Node.js ThreadPool的"响应式分配"设计模式，这是整个系统的核心算法：
	 * 1. 任务提交时立即尝试分配给可用Worker（响应式）
	 * 2. 如果没有可用Worker，则将任务放入优先级队列等待
	 * 3. 设置超时机制和智能重试逻辑
	 * 4. 实现完整的任务生命周期管理
	 *
	 * @param task 要处理的任务
	 * @returns Promise<TaskExecutionResult> 任务执行结果
	 *
	 * 设计原则：
	 * - 响应式分配：优先立即执行，避免不必要的排队
	 * - 优先级调度：高优先级任务优先处理
	 * - 容错机制：超时重试和错误恢复
	 * - 资源管理：防止内存溢出和资源泄漏
	 */
	private async processTask<K extends TTaskType>(task: Task<K, TTaskTypeMap[K], TPriority>): Promise<Result<unknown>> {
		return new Promise((resolve, reject) => {
			// 注册任务回调信息，用于后续处理
			this.taskMap.set(task.id, { resolve, reject, timeout: this.createTaskTimeout(task), task });

			// 队列大小检查，防止内存溢出
			if (this.taskQueue.size() > this.config.maxQueueSize) {
				this.emit("queue-full", this.taskQueue.size());
			}

			// 核心算法：Node.js ThreadPool的"响应式分配"
			// 优先立即执行，避免不必要的排队延迟
			const availableWorker = this.workers.find((w) => !w.busy);
			if (availableWorker) {
				// 有可用Worker，立即分配任务（响应式）
				this.assignTaskToWorker(availableWorker, task);
			} else {
				// 无可用Worker，将任务放入优先级队列等待
				this.taskQueue.enqueue(task);
			}
		});
	}

	/**
	 * 处理队列中的下一个任务
	 *
	 * 这是Node.js ThreadPool"响应式分配"的核心实现，确保系统的高响应性：
	 * - 在任务完成时立即调用，实现响应式调度
	 * - 一次只处理一个任务，避免批量处理的延迟
	 * - 保证任务按优先级顺序执行，满足业务需求
	 *
	 * 调用时机：
	 * 1. Worker完成任务后 - 立即处理下一个任务
	 * 2. Worker发生错误后 - 处理重试或失败任务
	 * 3. 任务重试时 - 重新分配任务
	 *
	 * 核心思想：响应式而非贪婪式，保证系统的响应性和公平性
	 *
	 * 设计原则：
	 * - 响应式调度：任务完成后立即处理下一个
	 * - 优先级保证：高优先级任务优先执行
	 * - 资源优化：避免Worker空闲，提高利用率
	 */
	private processNextTask(): void {
		// Node.js ThreadPool设计：一次只处理一个任务
		// 这确保了响应性，避免了批量处理的延迟和复杂性
		if (this.taskQueue.size() === 0) {
			return; // 没有任务可处理，直接返回
		}

		// 查找可用的Worker
		const availableWorker = this.workers.find((w) => !w.busy);
		if (!availableWorker) {
			return; // 没有可用的Worker，等待下次调用
		}

		// 从优先级队列中取出下一个任务
		// 优先级顺序：high -> medium -> low
		const task = this.taskQueue.dequeue();
		if (task) {
			// 立即分配任务给可用Worker，实现响应式分配
			this.assignTaskToWorker(availableWorker, task);
		}
	}

	/**
	 * 将任务分配给指定Worker
	 *
	 * 这是任务分配的最终执行方法，负责将任务安全地发送到Worker：
	 * 1. 标记Worker为忙碌状态，防止重复分配
	 * 2. 准备消息并通过MessageChannel发送
	 * 3. 处理发送过程中的错误和重试
	 * 4. 确保系统的持续响应性
	 *
	 * @param worker 目标Worker包装器
	 * @param task 要分配的任务
	 *
	 * 设计原则：
	 * - 原子性：任务分配要么成功要么失败，无中间状态
	 * - 容错性：发送失败时自动重试
	 * - 响应性：即使失败也要继续处理其他任务
	 * - 性能优化：使用Transferable对象实现零拷贝传输
	 */
	private assignTaskToWorker(
		worker: WorkerWrapper,
		task: Task<TTaskType, TTaskTypeMap[keyof TTaskTypeMap], TPriority>,
	): void {
		// 标记Worker为忙碌状态，防止重复分配
		worker.busy = true;

		// 构建类型安全的 Worker 消息
		const workerMessage: WorkerMessage<TTaskTypeMap[keyof TTaskTypeMap], TPriority> = {
			belongToTaskId: task.id,
			payload: task.payload,
			priority: task.priority,
		};

		// 准备消息传输，处理Transferable对象
		const { message, transferables } = prepareForTransfer(workerMessage);

		try {
			// 通过MessageChannel发送任务到Worker
			// console.log("🔄 WorkerPool: 发送任务到Worker", message);
			// 记录绑定关系
			this.taskToWorkerId.set(task.id, worker.id);
			worker.port.postMessage(message, transferables);
		} catch (error) {
			const errorObj = error instanceof Error ? error : new Error(String(error));
			this.failTask(task.id, errorObj, { retryable: true, replaceWorker: true });
		}
	}

	/**
	 * 获取池状态
	 */
	getStatus(): PoolHealthMetrics {
		return {
			activeWorkers: this.workers.filter((w) => w.busy).length,
			totalWorkers: this.workers.length,
			queueLength: this.taskQueue.size(),
			pendingTasks: this.taskMap.size,
			workerMetrics: this.workers.map((w) => ({
				workerId: w.id,
				tasksCompleted: w.metrics.tasksCompleted,
				errors: w.metrics.errors,
				avgProcessingTime: w.metrics.avgProcessingTime,
				lastActive: w.metrics.lastActive,
			})),
		};
	}

	/**
	 * 检查worker是否已准备好
	 * @returns 是否已准备好
	 */
	isReady(): boolean {
		return this.lifecycle === "started" && this.workers.length > 0 && this.workers.every((worker) => worker.ready);
	}

	/**
	 * 获取活跃的worker列表
	 * 返回当前正在运行模拟的worker信息
	 *
	 * @returns 活跃worker信息数组
	 */
	getActiveWorkers(): Array<{
		id: string;
		busy: boolean;
		lastUsed: number;
		tasksCompleted: number;
		errors: number;
	}> {
		return this.workers.map((worker) => ({
			id: worker.id,
			busy: worker.busy,
			lastUsed: worker.lastUsed,
			tasksCompleted: worker.metrics.tasksCompleted,
			errors: worker.metrics.errors,
		}));
	}

	/**
	 * 获取指定worker的详细信息
	 *
	 * @param workerId worker ID
	 * @returns worker详细信息，如果不存在则返回null
	 */
	getWorkerInfo(workerId: string): {
		id: string;
		busy: boolean;
		lastUsed: number;
		metrics: WorkerMetrics;
	} | null {
		const worker = this.workers.find((w) => w.id === workerId);
		if (!worker) {
			return null;
		}

		return {
			id: worker.id,
			busy: worker.busy,
			lastUsed: worker.lastUsed,
			metrics: worker.metrics,
		};
	}

	/**
	 * 开始监控
	 */
	private startMonitoring(): void {
		this.monitorInterval = setInterval(() => {
			const metrics = this.getStatus();
			this.emit("metrics", metrics);
		}, this.config.monitorInterval);
	}

	/**
	 * 清理资源
	 */
	private startCleanupProcess(): void {
		this.cleanupInterval = setInterval(() => {
			const now = Date.now();

			// 清理超时的任务
			for (const [belongToTaskId, callback] of this.taskMap) {
				if (callback?.task && now - callback.task.timestamp > callback.task.timeout * 2) {
					clearTimeout(callback.timeout);
					this.taskMap.delete(belongToTaskId);
					callback.reject(new Error("Task cleanup timeout"));
				}
			}

			// 清理空闲的worker（可选）
			this.workers.forEach((worker) => {
				if (!worker.busy && now - worker.lastUsed > this.config.idleTimeout) {
					// 可以考虑减少worker数量来节省资源
				}
			});
		}, 60000); // 每分钟清理一次
	}

	private stopBackgroundServices(): void {
		if (this.cleanupInterval) clearInterval(this.cleanupInterval);
		if (this.monitorInterval) clearInterval(this.monitorInterval);
		this.cleanupInterval = undefined;
		this.monitorInterval = undefined;
	}

	/**
	 * 优雅关闭线程池
	 *
	 * 实现优雅关闭模式，确保所有任务完成后再释放资源：
	 * 1. 停止接受新任务
	 * 2. 等待所有活跃任务完成
	 * 3. 清理定时器和后台服务
	 * 4. 终止所有Worker实例
	 * 5. 清理内存和状态
	 *
	 * @returns Promise<void> 关闭完成
	 *
	 * 设计原则：
	 * - 优雅关闭：不强制中断正在执行的任务
	 * - 资源清理：确保所有资源都被正确释放
	 * - 状态一致性：清理所有内部状态
	 * - 事件通知：通知外部系统关闭完成
	 */
	shutdown(): Promise<void> {
		if (this.shutdownPromise) return this.shutdownPromise;
		if (this.lifecycle === "stopped") return Promise.resolve();
		if (this.lifecycle === "configured") {
			this.lifecycle = "stopped";
			return Promise.resolve();
		}

		this.lifecycle = "stopping";
		const shutdownPromise = this.shutdownStartedPool().finally(() => {
			this.lifecycle = "stopped";
			this.shutdownPromise = null;
		});
		this.shutdownPromise = shutdownPromise;
		return shutdownPromise;
	}

	private async shutdownStartedPool(): Promise<void> {
		// 等待所有活跃任务完成
		const activePromises = Array.from(this.taskMap.values()).map(
			(callback) =>
				new Promise<void>((resolve) => {
					const originalResolve = callback.resolve;
					const originalReject = callback.reject;

					// 包装回调函数，确保任务完成后通知关闭流程
					callback.resolve = (result) => {
						originalResolve(result);
						resolve();
					};

					callback.reject = (error) => {
						originalReject(error);
						resolve();
					};
				}),
		);

		// 等待所有任务完成（成功或失败）
		await Promise.all(activePromises);

		this.stopBackgroundServices();

		// 终止所有Worker实例
		await Promise.all(
			this.workers.map((worker) => {
				try {
					return worker.worker.terminate();
				} catch (error) {
					console.error("终止Worker实例失败，workerId:", worker.id, error);
					// 忽略终止错误，确保关闭流程继续
					return Promise.resolve();
				}
			}),
		);

		// 清理内存和状态
		this.workers.length = 0;
		this.taskMap.clear();
		this.taskToWorkerId.clear();

		// 通知外部系统关闭完成
		this.emit("shutdown");
	}
}
