import { createId } from "@paralleldrive/cuid2";
import type { SimulatorWithRelations } from "@db/repositories/simulator";
import type { IntentMessage } from "./messages";

import simulationWorker from "./Simulation.worker?worker&url";
import { WorkerSystemMessageSchema } from "./messages";
import { EngineStats } from "../GameEngine";
import { MemberSerializeData } from "../member/Member";

// ==================== 类型定义 ====================

/**
 * 通用任务结果接口
 */
export interface TaskResult {
  success: boolean; // 任务是否成功
  data?: any; // 任务返回的数据
  error?: string; // 错误信息
}

/**
 * 通用任务执行结果
 */
export interface TaskExecutionResult {
  success: boolean; // 任务是否成功
  data?: any; // 任务返回的数据
  error?: string; // 错误信息
  metrics?: {
    duration: number; // 执行时长（毫秒）
    memoryUsage: number; // 内存使用量
  };
}

/**
 * 事件发射器 - 基于Node.js ThreadPool的EventEmitter思路
 *
 * 提供事件订阅/发布机制，用于监听线程池的各种状态变化：
 * - task-completed: 任务完成
 * - task-failed: 任务失败
 * - task-retry: 任务重试
 * - queue-full: 队列满载
 * - worker-replaced: Worker替换
 * - metrics: 性能指标更新
 * - shutdown: 池关闭
 */
class EventEmitter {
  private events: { [key: string]: Function[] } = {}; // 事件监听器映射表

  /**
   * 注册事件监听器
   * @param event 事件名称
   * @param listener 监听器函数
   */
  on(event: string, listener: Function): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
    // console.log(`📡 EventEmitter: 注册事件监听器 "${event}"，当前监听器数量: ${this.events[event].length}`);
  }

  /**
   * 发射事件，触发所有监听器
   * @param event 事件名称
   * @param args 事件参数
   */
  emit(event: string, ...args: any[]): void {
    // 减少引擎状态更新事件的日志噪音
    if (event !== "engine_state_update") {
      // console.log(`📡 EventEmitter: 发射事件 "${event}"，监听器数量: ${this.events[event]?.length || 0}`);
    }
    if (this.events[event]) {
      this.events[event].forEach((listener) => listener(...args));
    }
  }

  /**
   * 移除事件监听器
   * @param event 事件名称
   * @param listener 可选的特定监听器，不传则移除所有
   */
  off(event: string, listener?: Function): void {
    if (!this.events[event]) return;

    if (listener) {
      this.events[event] = this.events[event].filter((l) => l !== listener);
    } else {
      delete this.events[event];
    }
  }
}

// Semaphore 类已移除 - 遵循 YAGNI 原则，线程池本身已提供并发控制

/**
 * 类型安全的消息序列化器
 *
 * 使用泛型提供类型安全的Worker消息序列化功能，确保：
 * 1. 消息结构可预测
 * 2. 类型信息不丢失
 * 3. Transferable对象正确处理
 * 4. 编译时类型检查
 * 5. 保持通用性，不包含业务逻辑
 */
class MessageSerializer {
  /**
   * 检查对象是否为可传输对象
   * @param obj 要检查的对象
   * @returns 是否为Transferable对象
   */
  static isTransferable(obj: unknown): obj is Transferable {
    return obj instanceof ArrayBuffer || obj instanceof MessagePort;
  }

  /**
   * 递归查找消息中的所有可传输对象
   * @param obj 要扫描的对象
   * @returns 找到的所有Transferable对象数组
   */
  static findTransferables(obj: unknown): Transferable[] {
    const transferables = new Set<Transferable>();

    function scan(item: unknown): void {
      if (!item || typeof item !== "object") return;

      if (MessageSerializer.isTransferable(item)) {
        transferables.add(item);
        return;
      }

      if (Array.isArray(item)) {
        (item as unknown[]).forEach(scan);
        return;
      }

      if (item && typeof item === "object" && item !== null) {
        for (const value of Object.values(item)) {
          scan(value);
        }
      }
    }

    scan(obj);
    return Array.from(transferables);
  }

  /**
   * 类型安全的消息传输准备
   *
   * @param message 要传输的消息
   * @returns 包含消息和可传输对象列表的传输结果
   *
   * 设计原则：
   * - 类型安全：保持原始消息的类型信息
   * - 性能优化：自动检测和处理Transferable对象
   * - 结构可预测：返回结果结构明确
   * - 通用性：不包含特定业务逻辑
   */
  static prepareForTransfer<T>(message: T): { message: T; transferables: Transferable[] } {
    const transferables = this.findTransferables(message);
    return {
      message,
      transferables,
    };
  }
}

/**
 * 通用任务类型 - 使用泛型保持类型安全
 *
 * 设计原则：
 * - 类型安全：通过泛型保持payload类型信息
 * - 通用性：不包含特定业务逻辑
 * - 可扩展性：支持任意任务类型
 * - 可预测性：任务结构明确
 */
interface Task<TType extends string = string, TPayload = unknown> {
  id: string; // 任务唯一标识
  type: TType; // 任务类型（类型安全）
  payload: TPayload; // 任务数据（类型安全）
  priority: "high" | "medium" | "low"; // 任务优先级
  timestamp: number; // 任务创建时间戳
  timeout: number; // 任务超时时间（毫秒）
  retriesLeft: number; // 剩余重试次数
  originalRetries: number; // 原始重试次数（用于统计）
}

/**
 * 优先级任务队列
 *
 * 实现三级优先级的任务队列：高优先级 > 中优先级 > 低优先级
 * 确保重要任务能够优先执行，提高系统响应性能。
 *
 * 核心算法：
 * - enqueue: 根据优先级将任务添加到对应队列末尾
 * - dequeue: 按优先级顺序从队列头部取出任务
 * - unshift: 将任务添加到对应优先级队列头部（用于重试）
 */
class PriorityTaskQueue {
  private queues = {
    high: [] as Task<string, unknown>[], // 高优先级队列
    medium: [] as Task<string, unknown>[], // 中优先级队列
    low: [] as Task<string, unknown>[], // 低优先级队列
  };

  /**
   * 将任务加入队列
   * @param task 要加入的任务
   */
  enqueue(task: Task<string, unknown>): void {
    this.queues[task.priority].push(task); // 添加到对应优先级队列末尾
  }

  /**
   * 从队列中取出下一个任务
   * 按优先级顺序：high -> medium -> low
   * @returns 下一个要执行的任务，如果队列为空则返回null
   */
  dequeue(): Task<string, unknown> | null {
    for (const priority of ["high", "medium", "low"] as const) {
      if (this.queues[priority].length > 0) {
        return this.queues[priority].shift() || null; // 从队列头部取出任务
      }
    }
    return null; // 所有队列都为空
  }

  /**
   * 将任务添加到对应优先级队列头部
   * 主要用于任务重试，确保重试任务能够优先执行
   * @param task 要添加的任务
   */
  unshift(task: Task<string, unknown>): void {
    this.queues[task.priority].unshift(task); // 添加到队列头部
  }

  /**
   * 检查是否有待处理任务
   * @returns 是否有任务在队列中
   */
  hasTask(): boolean {
    return Object.values(this.queues).some((queue) => queue.length > 0); // 检查任意队列是否有任务
  }

  /**
   * 获取队列中任务总数
   * @returns 所有优先级队列的任务总数
   */
  size(): number {
    return Object.values(this.queues).reduce((sum, queue) => sum + queue.length, 0); // 计算所有队列的任务总数
  }
}

// Worker性能指标
interface WorkerMetrics {
  tasksCompleted: number; // 已完成任务数
  errors: number; // 错误次数
  avgProcessingTime: number; // 平均处理时间
  lastActive: number; // 最后活跃时间
  totalProcessingTime: number; // 总处理时间
}

// Worker包装器
interface WorkerWrapper {
  worker: Worker; // Web Worker实例
  port: MessagePort; // 通信端口
  busy: boolean; // 是否忙碌
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
export interface PoolConfig {
  maxWorkers?: number; // 最大Worker数量
  taskTimeout?: number; // 任务超时时间
  idleTimeout?: number; // 空闲超时时间
  maxRetries?: number; // 最大重试次数
  maxQueueSize?: number; // 最大队列大小
  monitorInterval?: number; // 监控间隔
}

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
 * 设计原则：
 * - 遵循 KISS 原则：保持设计简洁
 * - 遵循 YAGNI 原则：只实现当前需要的功能
 * - 遵循 SOLID 原则：单一职责，开闭原则
 * - 容错性：Worker故障自动替换
 * - 性能优化：零拷贝传输和优先级调度
 *
 * 使用场景：
 * - 通用计算任务处理
 * - 高性能并行计算
 * - 实时任务调度
 */
export class WorkerPool extends EventEmitter {
  // ==================== 私有属性 ====================

  /** Worker包装器数组 - 管理所有活跃的Worker实例 */
  private workers: WorkerWrapper[] = [];

  /** 优先级任务队列 - 实现三级优先级调度 */
  private taskQueue = new PriorityTaskQueue();

  /**
   * 任务映射表 - 跟踪所有正在执行的任务
   * Key: 任务ID, Value: 任务回调信息（Promise解析器、超时定时器、任务对象）
   */
  private taskMap = new Map<
    string,
    {
      resolve: (result: any) => void; // Promise解析函数
      reject: (error: Error) => void; // Promise拒绝函数
      timeout: NodeJS.Timeout; // 超时定时器
      task: Task<string, unknown>; // 任务对象
    }
  >();

  /** 任务与Worker的映射关系，用于精确错误归属与统计 */
  private taskToWorkerId = new Map<string, string>();

  /** 线程池配置 - 运行时不可变，确保配置一致性 */
  private readonly config: Required<PoolConfig>;

  /** 资源清理定时器 - 定期清理超时任务和空闲Worker */
  private cleanupInterval?: NodeJS.Timeout;

  /** 性能监控定时器 - 定期收集和上报性能指标 */
  private monitorInterval?: NodeJS.Timeout;

  /** 池状态标志 - 控制是否接受新任务 */
  private accepting = true;

  /** Worker初始化状态 - 控制延迟初始化 */
  private workersInitialized = false;

  /**
   * 构造函数
   *
   * 初始化通用线程池，设置配置参数并启动后台服务
   *
   * @param config 线程池配置参数
   *
   * 设计原则：
   * - 延迟初始化：Worker只在首次使用时创建，节省资源
   * - 配置验证：确保所有配置参数有效
   * - 后台服务：启动监控和清理进程，确保系统健康
   */
  constructor(config: PoolConfig = {}) {
    super();
    this.validateConfig(config);

    // 合并用户配置和默认配置
    // 应用KISS原则：保持配置简单
    this.config = {
      maxWorkers: config.maxWorkers || 1, // 默认单Worker
      taskTimeout: config.taskTimeout || 30000, // 30秒超时
      idleTimeout: config.idleTimeout || 300000, // 5分钟空闲超时
      maxRetries: config.maxRetries || 3, // 最多重试3次
      maxQueueSize: config.maxQueueSize || 1000, // 队列上限1000
      monitorInterval: config.monitorInterval || 5000, // 5秒监控间隔
      ...config, // 用户配置覆盖默认值
    };

    // 启动后台服务（不依赖Worker初始化）
    // 应用KISS原则：分离关注点，简化初始化流程
    this.startCleanupProcess(); // 资源清理服务
    this.startMonitoring(); // 性能监控服务

    // 延迟初始化Worker
    // 应用YAGNI原则：只在需要时创建资源
    this.workersInitialized = false;
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
  private validateConfig(config: PoolConfig): void {
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

  /**
   * 确保Worker已初始化
   *
   * 实现延迟初始化模式，只在首次使用时创建Worker
   * 应用YAGNI原则：避免不必要的资源消耗
   */
  private ensureWorkersInitialized(): void {
    if (!this.workersInitialized) {
      this.initializeWorkers();
      this.workersInitialized = true;
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
  private createWorker(): WorkerWrapper {
    // 创建Web Worker实例
    const worker = new Worker(simulationWorker, { type: "module" });

    // 创建MessageChannel用于专用通信
    const channel = new MessageChannel();

    // 创建Worker包装器
    const wrapper: WorkerWrapper = {
      worker,
      port: channel.port2, // 主线程持有port2
      busy: false, // 初始状态为空闲
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
      const parsed = WorkerSystemMessageSchema.safeParse(event.data);
      if (parsed.success) {
        const sys = parsed.data;
        this.emit("worker-message", { worker: wrapper, event: { type: sys.type, data: sys.data, taskId: sys.taskId } });
        return;
      }
      this.handleWorkerMessage(wrapper, event);
    };

    // 统一使用 MessageChannel 处理所有消息
    // 遵循 Artem 的设计原则：单层通信

    // 设置错误处理
    worker.onerror = (error) => {
      console.error(`Worker ${wrapper.id} 错误:`, error);
      this.handleWorkerError(wrapper, error);
    };

    // 将Worker添加到池中
    this.workers.push(wrapper);
    return wrapper;
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
  private handleWorkerMessage(worker: WorkerWrapper, event: MessageEvent): void {
    const { taskId, result, error, metrics, type, data, cmd, cmds } = event.data as any;

    // 发射原始消息事件，让子类处理业务逻辑
    this.emit("worker-message", { worker, event: { taskId, result, error, metrics, type, data, cmd, cmds } });

    // 处理任务结果
    const taskCallback = this.taskMap.get(taskId);
    if (!taskCallback) {
      // 任务不存在（可能已超时或被清理），忽略此消息
      return;
    }

    const { resolve, reject, timeout, task } = taskCallback;
    const processingTime = metrics?.duration || 0;

    // 清除任务超时定时器，防止内存泄漏
    clearTimeout(timeout);

    // 更新Worker性能指标，用于负载均衡和故障检测
    this.updateWorkerMetrics(worker, error ? "error" : "success", processingTime);

    if (error) {
      // 任务执行失败，实现智能重试机制
      if (task.retriesLeft > 0) {
        task.retriesLeft--;
        this.taskQueue.unshift(task); // 重试任务优先执行，提高成功率
        this.emit("task-retry", { taskId, retriesLeft: task.retriesLeft, error });
      } else {
        // 重试次数用完，任务最终失败
        this.taskMap.delete(taskId);
        reject(new Error(error));
        this.emit("task-failed", { taskId, error });
      }
    } else {
      // 任务执行成功，返回结果和性能指标
      this.taskMap.delete(taskId);
      const taskResult = {
        success: true,
        data: result,
        metrics,
      } as TaskExecutionResult;

      resolve(taskResult);
      this.emit("task-completed", { taskId, result, metrics });
    }

    // 响应式任务分配：释放Worker并立即处理下一个任务
    // 这是Node.js ThreadPool设计的核心思想，确保系统的高响应性
    worker.busy = false;
    worker.lastUsed = Date.now();
    // 清理任务与worker的绑定
    if (taskId) {
      this.taskToWorkerId.delete(taskId);
    }
    this.processNextTask(); // 立即尝试处理队列中的下一个任务
  }

  private handleWorkerError(worker: WorkerWrapper, error: ErrorEvent): void {
    this.updateWorkerMetrics(worker, "error");

    // 查找该worker正在处理的任务
    // 从映射表查找该 worker 当前处理的任务
    const activeTask = Array.from(this.taskToWorkerId.entries()).find(([, workerId]) => workerId === worker.id);

    if (activeTask) {
      const [taskId] = activeTask;
      const callback = this.taskMap.get(taskId);
      if (callback) {
        const { task } = callback;
        clearTimeout(callback.timeout);

        // 重试机制
        if (task.retriesLeft > 0) {
          task.retriesLeft--;
          this.taskQueue.unshift(task);
          this.emit("task-retry", { taskId, retriesLeft: task.retriesLeft, error: error.message });
        } else {
          this.taskMap.delete(taskId);
          callback.reject(new Error(`Worker error: ${error.message}`));
          this.emit("task-failed", { taskId, error: error.message });
        }
      }
      this.taskToWorkerId.delete(taskId);
    }

    // 替换worker
    this.replaceWorker(worker);
    this.processNextTask();
  }

  private handleWorkerExit(worker: WorkerWrapper): void {
    const index = this.workers.indexOf(worker);
    if (index !== -1) {
      this.workers.splice(index, 1);

      if (this.accepting) {
        const newWorker = this.createWorker();
        this.workers.splice(index, 0, newWorker);
        this.emit("worker-replaced", { oldId: worker.id, newId: newWorker.id });
      }
    }
  }

  private replaceWorker(worker: WorkerWrapper): void {
    const index = this.workers.indexOf(worker);
    if (index !== -1) {
      this.workers.splice(index, 1);
      try {
        worker.worker.terminate();
      } catch (error) {
        // 忽略终止错误
      }

      if (this.accepting) {
        const newWorker = this.createWorker();
        this.workers.splice(index, 0, newWorker);
        this.emit("worker-replaced", { oldId: worker.id, newId: newWorker.id });
      }
    }
  }

  private getWorkerForTask(task: Task<string, unknown>): WorkerWrapper | null {
    // 通过 taskToWorkerId 映射进行精确查找
    const workerId = this.taskToWorkerId.get(task.id);
    if (!workerId) return null;
    return this.workers.find((w) => w.id === workerId) || null;
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
   * 执行通用任务
   */
  async executeTask(type: string, payload: any, priority: Task["priority"] = "medium"): Promise<TaskExecutionResult> {
    if (!this.accepting) {
      throw new Error("Pool is shutting down");
    }

    const task: Task = {
      id: createId(),
      type,
      payload,
      priority,
      timestamp: Date.now(),
      timeout: this.config.taskTimeout,
      retriesLeft: this.config.maxRetries,
      originalRetries: this.config.maxRetries,
    };

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
  private async processTask(task: Task<string, unknown>): Promise<TaskExecutionResult> {
    return new Promise((resolve, reject) => {
      // 设置任务超时处理机制
      const timeout = setTimeout(() => {
        const callback = this.taskMap.get(task.id);
        if (callback) {
          // 超时重试逻辑：优先重试，提高成功率
          if (task.retriesLeft > 0) {
            task.retriesLeft--;
            this.taskQueue.unshift(task); // 重试任务优先执行
            this.emit("task-retry", { taskId: task.id, retriesLeft: task.retriesLeft, error: "timeout" });
          } else {
            // 重试次数用完，任务最终失败
            this.taskMap.delete(task.id);
            reject(new Error("Task timeout"));
            this.emit("task-failed", { taskId: task.id, error: "timeout" });
          }
        }
      }, task.timeout);

      // 注册任务回调信息，用于后续处理
      this.taskMap.set(task.id, { resolve, reject, timeout, task });

      // 队列大小检查，防止内存溢出
      // 应用防御性编程原则，确保系统稳定性
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
  private assignTaskToWorker(worker: WorkerWrapper, task: Task<string, unknown>): void {
    // 标记Worker为忙碌状态，防止重复分配
    worker.busy = true;

    // 准备发送给Worker的消息格式（与simulation.worker.ts匹配）
    // 应用类型安全原则，确保消息格式正确
    let workerMessage;

    // 准备消息传输，处理Transferable对象
    // 应用性能优化原则，实现零拷贝传输
    const workerMessageWithTaskId = {
      taskId: task.id,

      type: task.type,
      data: task.payload,
    };
    const { message, transferables } = MessageSerializer.prepareForTransfer(workerMessageWithTaskId);

    try {
      // 通过MessageChannel发送任务到Worker
      // console.log("🔄 SimulatorPool: 发送任务到Worker", message);
      // 记录绑定关系
      this.taskToWorkerId.set(task.id, worker.id);
      worker.port.postMessage(message, transferables);
    } catch (error) {
      // 发送失败，释放Worker状态
      worker.busy = false;

      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorObj = error instanceof Error ? error : new Error(errorMessage);

      // 任务发送失败重试机制
      // 应用容错原则，提高系统可靠性
      if (task.retriesLeft > 0) {
        task.retriesLeft--;
        this.taskQueue.unshift(task); // 重试任务优先执行
        this.emit("task-retry", { taskId: task.id, retriesLeft: task.retriesLeft, error: errorMessage });
      } else {
        // 重试次数用完，任务最终失败
        const callback = this.taskMap.get(task.id);
        if (callback) {
          this.taskMap.delete(task.id);
          callback.reject(errorObj);
          this.emit("task-failed", { taskId: task.id, error: errorMessage });
        }
      }
      this.taskToWorkerId.delete(task.id);

      // 关键：即使发送失败也要尝试处理下一个任务
      // 应用响应性原则，确保系统的持续响应性
      this.processNextTask();
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
    // 确保workers已初始化
    this.ensureWorkersInitialized();
    return this.workersInitialized && this.workers.length > 0;
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
      for (const [taskId, callback] of this.taskMap) {
        if (callback && callback.task && now - callback.task.timestamp > callback.task.timeout * 2) {
          clearTimeout(callback.timeout);
          this.taskMap.delete(taskId);
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
  async shutdown(): Promise<void> {
    // 停止接受新任务，防止资源竞争
    this.accepting = false;

    // 等待所有活跃任务完成
    // 应用优雅关闭原则，不强制中断正在执行的任务
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

    // 清理后台服务
    // 应用资源管理原则，确保定时器被正确清理
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }

    // 终止所有Worker实例
    // 应用防御性编程原则，确保Worker被正确终止
    await Promise.all(
      this.workers.map((worker) => {
        try {
          return worker.worker.terminate();
        } catch (error) {
          // 忽略终止错误，确保关闭流程继续
          return Promise.resolve();
        }
      }),
    );

    // 清理内存和状态
    // 应用状态一致性原则，确保所有状态被正确清理
    this.workers.length = 0;
    this.taskMap.clear();

    // 通知外部系统关闭完成
    this.emit("shutdown");
  }
}

// ==================== 模拟器专用扩展 ====================

/**
 * 模拟器线程池 - 基于通用 WorkerPool 的模拟器专用实现
 *
 * 提供模拟器业务特定的 API，同时保持通用线程池的核心功能
 */
export class SimulatorPool extends WorkerPool {
  constructor(config: PoolConfig = {}) {
    super(config);

    // 设置模拟器专用的事件处理器
    this.on("worker-message", (data: { worker: WorkerWrapper; event: any }) => {
      const { type, data: eventData, cmd, cmds } = data.event;

      // 处理引擎状态更新事件
      if (type === "engine_state_update") {
        this.emit("engine_state_update", { workerId: data.worker.id, event: eventData });
      }
      // 处理系统事件
      else if (type === "system_event") {
        this.emit("system_event", { workerId: data.worker.id, event: eventData });
      }
      // 已选中成员状态更新
      else if (type === "member_state_update") {
        this.emit("member_state_update", { workerId: data.worker.id, event: eventData });
      }
      // 低频全量引擎状态
      else if (type === "engine_stats_full") {
        this.emit("engine_stats_full", { workerId: data.worker.id, event: eventData });
      }
      // 渲染指令透传（由 RealtimeController 订阅并转发给渲染控制器）
      else if (type === "render:cmd" || type === "render:cmds") {
        this.emit("render_cmd", { workerId: data.worker.id, type, cmd, cmds });
      }
    });
  }

  /**
   * 启动模拟
   */
  async startSimulation(simulatorData: SimulatorWithRelations): Promise<TaskExecutionResult> {
    return this.executeTask("start_simulation", simulatorData, "high");
  }

  /**
   * 停止模拟
   */
  async stopSimulation(): Promise<TaskExecutionResult> {
    return this.executeTask("stop_simulation", null, "high");
  }

  /**
   * 暂停模拟
   */
  async pauseSimulation(): Promise<TaskExecutionResult> {
    return this.executeTask("pause_simulation", null, "medium");
  }

  /**
   * 恢复模拟
   */
  async resumeSimulation(): Promise<TaskExecutionResult> {
    return this.executeTask("resume_simulation", null, "medium");
  }

  /**
   * 发送意图消息
   */
  async sendIntent(intent: IntentMessage): Promise<{ success: boolean; error?: string }> {
    const result = await this.executeTask("send_intent", intent, "high");
    return {
      success: result.success,
      error: result.error,
    };
  }

  /**
   * 获取成员信息
   */
  async getMembers(): Promise<MemberSerializeData[]> {
    const result = await this.executeTask("get_members", null, "low");
    // console.log("🔍 SimulatorPool.getMembers: 原始结果:", result);

    // 统一扁平结构：result.data 直接是 WorkerTaskResult
    const task = result.data as { success: boolean; data?: MemberSerializeData[] } | undefined;
    if (result.success && task?.success && Array.isArray(task.data)) {
      console.log("🔍 SimulatorPool.getMembers: 解析成功，成员数量:", task.data.length);
      return task.data;
    }

    console.log("🔍 SimulatorPool.getMembers: 解析失败，返回空数组");
    return [];
  }

  /**
   * 获取引擎统计信息
   */
  async getEngineStats(): Promise<{ success: boolean; data?: EngineStats; error?: string }> {
    const result = await this.executeTask("get_stats", null, "low");
    return {
      success: result.success,
      data: result.data,
      error: result.error,
    };
  }

  /** 订阅某个成员的 FSM 状态变化 */
  async watchMember(memberId: string): Promise<{ success: boolean; error?: string }> {
    const result = await this.executeTask("watch_member", { memberId }, "medium");
    return { success: result.success, error: result.error };
  }

  /** 取消订阅某个成员的 FSM 状态变化 */
  async unwatchMember(memberId: string): Promise<{ success: boolean; error?: string }> {
    const result = await this.executeTask("unwatch_member", { memberId }, "low");
    return { success: result.success, error: result.error };
  }

  /** 拉取单个成员的当前 FSM 状态（即时同步一次） */
  async getMemberState(memberId: string): Promise<{ success: boolean; value?: string; error?: string }> {
    const result = await this.executeTask("get_member_state", { memberId }, "low");
    if (result.success && result.data?.success) {
      return { success: true, value: result.data.data?.value };
    }
    return { success: false, error: result.data?.error || result.error };
  }
}

// ==================== 实例导出 ====================

// 实时模拟实例 - 单Worker，适合实时控制
export const realtimeSimulatorPool = new SimulatorPool({
  maxWorkers: 1, // 单Worker用于实时模拟
  taskTimeout: 30000, // 实时模拟需要更快的响应
  maxRetries: 1, // 实时模拟减少重试次数
  maxQueueSize: 10, // 实时模拟减少队列大小
  monitorInterval: 5000, // 实时模拟更频繁的监控
});

// 批量计算实例 - 多Worker，适合并行计算
export const batchSimulatorPool = new SimulatorPool({
  maxWorkers: Math.min(navigator.hardwareConcurrency || 4, 6), // 多Worker用于并行计算
  taskTimeout: 60000, // 增加超时时间，战斗模拟可能需要更长时间
  maxRetries: 2, // 减少重试次数
  maxQueueSize: 100, // 减少队列大小
  monitorInterval: 10000, // 增加监控间隔
});

// 导出通用线程池类
export default WorkerPool;
