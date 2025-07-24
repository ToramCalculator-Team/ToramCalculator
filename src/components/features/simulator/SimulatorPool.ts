import { createId } from "@paralleldrive/cuid2";
import type { SimulatorWithRelations } from "@db/repositories/simulator";
import type { IntentMessage } from "./core/MessageRouter";
import type { MemberSerializeData } from "./core/Member";
import simulationWorker from "./Simulation.worker?worker&url";
import { EngineStats } from "./core/GameEngine";

// ==================== 类型定义 ====================

/**
 * 任务结果接口 - 对应不同任务类型的返回结果
 */
export interface TaskResult {
  start_simulation: { success: boolean };
  stop_simulation: { success: boolean };
  pause_simulation: { success: boolean };
  resume_simulation: { success: boolean };
  process_intent: { success: boolean; message: string; error?: string };
  get_snapshot: any; // 快照类型较复杂，暂时保持any
  get_stats: { success: boolean; data: EngineStats };
  get_members: { success: boolean; data: MemberSerializeData[] };
  send_intent: { success: boolean; error?: string };
}

/**
 * 模拟结果接口 - 根据任务类型返回对应的结果
 */
export interface SimulationResult<T extends keyof TaskResult = keyof TaskResult> {
  success: boolean;
  data?: TaskResult[T];
  error?: string;
  metrics?: {
    duration: number;
    memoryUsage: number;
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
  private events: { [key: string]: Function[] } = {};

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
  }

  /**
   * 发射事件，触发所有监听器
   * @param event 事件名称
   * @param args 事件参数
   */
  emit(event: string, ...args: any[]): void {
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

/**
 * 同步原语 - 基于文章中的Semaphore实现
 *
 * 信号量用于控制同时访问资源的数量，确保不会超过最大并发数。
 * 在本线程池中主要用于内部资源管理和并发控制。
 *
 * 核心原理：
 * - acquire(): 获取许可，如果没有可用许可则等待
 * - release(): 释放许可，唤醒等待的请求
 */
class Semaphore {
  private current = 0; // 当前已获取的许可数
  private queue: Array<() => void> = []; // 等待队列

  constructor(private maxConcurrent: number = 1) {}

  /**
   * 获取许可
   * 如果当前许可数未达到最大值，立即返回
   * 否则进入等待队列
   */
  async acquire(): Promise<void> {
    if (this.current < this.maxConcurrent) {
      this.current++;
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }

  /**
   * 释放许可
   * 减少当前许可数，并唤醒等待队列中的下一个请求
   */
  release(): void {
    this.current--;
    if (this.queue.length > 0 && this.current < this.maxConcurrent) {
      this.current++;
      const next = this.queue.shift();
      next?.();
    }
  }
}

/**
 * 消息序列化器
 *
 * 处理主线程与Worker线程之间的消息传递，特别是Transferable对象的处理。
 * Transferable对象（如ArrayBuffer、MessagePort）可以在线程间零拷贝传输，
 * 提高性能并避免数据序列化/反序列化的开销。
 */
class MessageSerializer {
  /**
   * 检查对象是否为可传输对象
   * @param obj 要检查的对象
   * @returns 是否为Transferable对象
   */
  static isTransferable(obj: any): boolean {
    return obj instanceof ArrayBuffer || obj instanceof MessagePort;
  }

  /**
   * 递归查找消息中的所有可传输对象
   * @param obj 要扫描的对象
   * @returns 找到的所有Transferable对象数组
   */
  static findTransferables(obj: any): Transferable[] {
    const transferables = new Set<Transferable>();

    function scan(item: any): void {
      if (!item || typeof item !== "object") return;

      if (MessageSerializer.isTransferable(item)) {
        transferables.add(item);
        return;
      }

      if (Array.isArray(item)) {
        item.forEach(scan);
        return;
      }

      Object.values(item).forEach(scan);
    }

    scan(obj);
    return Array.from(transferables);
  }

  /**
   * 准备消息用于传输
   * @param message 要传输的消息
   * @returns 包含消息和可传输对象列表的对象
   */
  static prepareForTransfer(message: any): { message: any; transferables: Transferable[] } {
    const transferables = this.findTransferables(message);
    return { message, transferables };
  }
}

/**
 * 模拟任务类型 - 简化后与Worker实现匹配
 */
type SimulationTaskType =
  | "start_simulation" // 启动战斗模拟
  | "stop_simulation" // 停止模拟
  | "pause_simulation" // 暂停模拟
  | "resume_simulation"; // 恢复模拟

/**
 * 任务接口 - 简化版，专注于战斗模拟
 */
interface SimulationTask {
  id: string; // 任务唯一标识
  type: SimulationTaskType; // 任务类型
  payload: SimulatorWithRelations | null; // 模拟器数据（仅start_simulation需要）
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
    high: [] as SimulationTask[], // 高优先级队列
    medium: [] as SimulationTask[], // 中优先级队列
    low: [] as SimulationTask[], // 低优先级队列
  };

  /**
   * 将任务加入队列
   * @param task 要加入的任务
   */
  enqueue(task: SimulationTask): void {
    this.queues[task.priority].push(task);
  }

  /**
   * 从队列中取出下一个任务
   * 按优先级顺序：high -> medium -> low
   * @returns 下一个要执行的任务，如果队列为空则返回null
   */
  dequeue(): SimulationTask | null {
    for (const priority of ["high", "medium", "low"] as const) {
      if (this.queues[priority].length > 0) {
        return this.queues[priority].shift() || null;
      }
    }
    return null;
  }

  /**
   * 将任务添加到对应优先级队列头部
   * 主要用于任务重试，确保重试任务能够优先执行
   * @param task 要添加的任务
   */
  unshift(task: SimulationTask): void {
    this.queues[task.priority].unshift(task);
  }

  /**
   * 检查是否有待处理任务
   * @returns 是否有任务在队列中
   */
  hasTask(): boolean {
    return Object.values(this.queues).some((queue) => queue.length > 0);
  }

  /**
   * 获取队列中任务总数
   * @returns 所有优先级队列的任务总数
   */
  size(): number {
    return Object.values(this.queues).reduce((sum, queue) => sum + queue.length, 0);
  }
}

// Worker指标
interface WorkerMetrics {
  tasksCompleted: number;
  errors: number;
  avgProcessingTime: number;
  lastActive: number;
  totalProcessingTime: number;
}

// Worker包装器
interface WorkerWrapper {
  worker: Worker;
  port: MessagePort;
  busy: boolean;
  id: string;
  lastUsed: number;
  metrics: WorkerMetrics;
}

// 池健康指标
export interface PoolHealthMetrics {
  activeWorkers: number;
  totalWorkers: number;
  queueLength: number;
  pendingTasks: number;
  workerMetrics: Array<{
    workerId: string;
    tasksCompleted: number;
    errors: number;
    avgProcessingTime: number;
    lastActive: number;
  }>;
  // 批量执行状态
  batchExecution?: {
    isExecuting: boolean;
    totalTasks: number;
    submittedTasks: number;
    completedTasks: number;
    currentBatchIndex: number;
    totalBatches: number;
    progress: number; // 完成百分比
  };
}

// 配置接口
export interface SimulationConfig {
  maxWorkers?: number;
  taskTimeout?: number;
  idleTimeout?: number;
  enableBatching?: boolean;
  batchSize?: number;
  batchDelay?: number;
  maxRetries?: number;
  maxQueueSize?: number;
  monitorInterval?: number;
}

/**
 * 增强版模拟器线程池
 *
 * 专门用于战斗模拟计算，基于XState模拟器引擎：
 * - 启动/停止/暂停/恢复战斗模拟
 * - 任务重试机制
 * - 性能监控与指标
 * - 事件发射
 * - 优雅关闭
 */
export class EnhancedSimulatorPool extends EventEmitter {
  private workers: WorkerWrapper[] = [];
  private taskQueue = new PriorityTaskQueue();
  // private semaphore: Semaphore; // 暂时不使用，使用 Worker 池本身来控制并发
  private taskMap = new Map<
    string,
    {
      resolve: (result: SimulationResult) => void;
      reject: (error: Error) => void;
      timeout: NodeJS.Timeout;
      task: SimulationTask;
    }
  >();

  private readonly config: Required<SimulationConfig>;
  private cleanupInterval?: NodeJS.Timeout;
  private monitorInterval?: NodeJS.Timeout;
  private accepting = true;

  // 批量执行状态跟踪
  private batchExecutionState = {
    isExecuting: false,
    totalTasks: 0,
    submittedTasks: 0,
    completedTasks: 0,
    currentBatchIndex: 0,
    totalBatches: 0,
  };

  private workersInitialized = false;
  private workersReady = new Set<string>(); // 跟踪哪些worker已经准备好

  constructor(config: SimulationConfig = {}) {
    super();
    this.validateConfig(config);

    // 合并用户配置和默认配置
    this.config = {
      maxWorkers: config.maxWorkers || 1, // 默认启动1个worker，可手动控制
      taskTimeout: config.taskTimeout || 30000,
      idleTimeout: config.idleTimeout || 300000,
      enableBatching: config.enableBatching || true,
      batchSize: config.batchSize || 10,
      batchDelay: config.batchDelay || 16,
      maxRetries: config.maxRetries || 3,
      maxQueueSize: config.maxQueueSize || 1000,
      monitorInterval: config.monitorInterval || 5000,
      ...config,
    };

    // 注意：Semaphore现在主要用于内部资源管理
    // 我们使用Worker池本身来控制并发，而不是额外的信号量
    // this.semaphore = new Semaphore(this.config.maxWorkers);

    // 启动资源清理进程和性能监控（不依赖worker）
    this.startCleanupProcess();
    this.startMonitoring();

    // 延迟初始化worker，只在第一次使用时创建
    this.workersInitialized = false;
  }

  private validateConfig(config: SimulationConfig): void {
    if (config.maxWorkers !== undefined && (config.maxWorkers < 1 || !Number.isInteger(config.maxWorkers))) {
      throw new Error("Invalid maxWorkers: must be a positive integer");
    }

    if (config.taskTimeout !== undefined && config.taskTimeout <= 0) {
      throw new Error("Invalid taskTimeout: must be positive");
    }

    if (config.maxRetries !== undefined && (config.maxRetries < 0 || !Number.isInteger(config.maxRetries))) {
      throw new Error("Invalid maxRetries: must be a non-negative integer");
    }

    if (config.maxQueueSize !== undefined && (config.maxQueueSize < 1 || !Number.isInteger(config.maxQueueSize))) {
      throw new Error("Invalid maxQueueSize: must be a positive integer");
    }
  }

  private ensureWorkersInitialized(): void {
    if (!this.workersInitialized) {
      this.initializeWorkers();
      this.workersInitialized = true;
    }
  }

  private initializeWorkers(): void {
    for (let i = 0; i < this.config.maxWorkers; i++) {
      this.createWorker();
    }
  }

  private createWorker(): WorkerWrapper {
    const worker = new Worker(simulationWorker, { type: "module" });

    const channel = new MessageChannel();
    const wrapper: WorkerWrapper = {
      worker,
      port: channel.port2,
      busy: false,
      id: createId(),
      lastUsed: Date.now(),
      metrics: {
        tasksCompleted: 0,
        errors: 0,
        avgProcessingTime: 0,
        lastActive: Date.now(),
        totalProcessingTime: 0,
      },
    };

    // 设置专用通信通道
    worker.postMessage({ type: "init", port: channel.port1 }, [channel.port1]);

    // 设置消息处理 - 监听MessageChannel端口用于任务相关消息
    channel.port2.onmessage = (event) => {
      this.handleWorkerMessage(wrapper, event);
    };

    // 监听Worker直接消息用于系统消息（如worker_ready）
    worker.onmessage = (event) => {
      this.handleWorkerDirectMessage(wrapper, event);
    };

    // 错误处理
    worker.onerror = (error) => {
      console.error(`Worker ${wrapper.id} error:`, error);
      this.handleWorkerError(wrapper, error);
    };

    this.workers.push(wrapper);
    return wrapper;
  }

  /**
   * 处理Worker直接消息（系统消息）
   *
   * @param worker Worker包装器
   * @param event 消息事件
   */
  private handleWorkerDirectMessage(worker: WorkerWrapper, event: MessageEvent): void {
    // 处理系统消息（如worker_ready）
    if (event.data && event.data.type === "worker_ready") {
      console.log(`Worker ${worker.id} is ready`);
      this.workersReady.add(worker.id); // 标记worker为已准备好
      return;
    }

    // 其他系统消息可以在这里处理
    console.log(`Worker ${worker.id} direct message:`, event.data);
  }

  /**
   * 处理Worker返回的消息（通过MessageChannel）
   *
   * 这是任务完成处理的核心方法：
   * 1. 解析Worker返回的结果
   * 2. 处理任务成功或失败的情况
   * 3. 实现任务重试机制
   * 4. 更新Worker指标
   * 5. 释放Worker并触发下一个任务处理
   *
   * @param worker Worker包装器
   * @param event 消息事件
   */
  private handleWorkerMessage(worker: WorkerWrapper, event: MessageEvent): void {
    const { taskId, result, error, metrics } = event.data;

    // 获取任务回调信息
    const taskCallback = this.taskMap.get(taskId);
    if (!taskCallback) {
      // 任务不存在（可能已超时），忽略此消息
      return;
    }

    const { resolve, reject, timeout, task } = taskCallback;
    const processingTime = metrics?.duration || 0;

    // 清除任务超时定时器
    clearTimeout(timeout);

    // 更新Worker性能指标
    this.updateWorkerMetrics(worker, error ? "error" : "success", processingTime);

    if (error) {
      // 任务执行失败，尝试重试
      if (task.retriesLeft > 0) {
        task.retriesLeft--;
        this.taskQueue.unshift(task); // 重试任务优先执行
        this.emit("task-retry", { taskId, retriesLeft: task.retriesLeft, error });
      } else {
        // 重试次数用完，任务最终失败
        this.taskMap.delete(taskId);
        reject(new Error(error));
        this.emit("task-failed", { taskId, error });
      }
    } else {
      // 任务执行成功
      this.taskMap.delete(taskId);
      resolve({
        success: true,
        data: result,
        metrics,
      });
      this.emit("task-completed", { taskId, result, metrics });
    }

    // 🔑 关键：释放Worker并立即处理下一个任务
    // 这是Node.js ThreadPool"响应式分配"的核心体现
    worker.busy = false;
    worker.lastUsed = Date.now();
    this.processNextTask(); // 立即尝试处理队列中的下一个任务
  }

  private handleWorkerError(worker: WorkerWrapper, error: ErrorEvent): void {
    this.updateWorkerMetrics(worker, "error");

    // 查找该worker正在处理的任务
    const activeTask = Array.from(this.taskMap.entries()).find(
      ([_, callback]) => callback.task && this.getWorkerForTask(callback.task) === worker,
    );

    if (activeTask) {
      const [taskId, callback] = activeTask;
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

    // 替换worker
    this.replaceWorker(worker);
    this.processNextTask();
  }

  private handleWorkerExit(worker: WorkerWrapper): void {
    const index = this.workers.indexOf(worker);
    if (index !== -1) {
      this.workers.splice(index, 1);
      this.workersReady.delete(worker.id); // 清理ready状态

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
      this.workersReady.delete(worker.id); // 清理ready状态
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

  private getWorkerForTask(task: SimulationTask): WorkerWrapper | null {
    // 简化的实现，实际可能需要更复杂的逻辑
    return this.workers.find((w) => w.busy) || null;
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
   * 启动战斗模拟
   */
  async startSimulation(
    simulatorData: SimulatorWithRelations,
    priority: SimulationTask["priority"] = "high",
  ): Promise<SimulationResult> {
    this.ensureWorkersInitialized();
    return await this.executeTask("start_simulation", simulatorData, priority);
  }

  /**
   * 停止战斗模拟
   */
  async stopSimulation(priority: SimulationTask["priority"] = "medium"): Promise<SimulationResult> {
    return await this.executeTask("stop_simulation", null, priority);
  }

  /**
   * 暂停战斗模拟
   */
  async pauseSimulation(priority: SimulationTask["priority"] = "medium"): Promise<SimulationResult> {
    return await this.executeTask("pause_simulation", null, priority);
  }

  /**
   * 恢复战斗模拟
   */
  async resumeSimulation(priority: SimulationTask["priority"] = "medium"): Promise<SimulationResult> {
    return await this.executeTask("resume_simulation", null, priority);
  }

  /**
   * 执行模拟任务
   */
  async executeTask(
    type: SimulationTaskType,
    payload: SimulatorWithRelations | null,
    priority: SimulationTask["priority"] = "medium",
  ): Promise<SimulationResult> {
    if (!this.accepting) {
      throw new Error("Pool is shutting down");
    }

    const task: SimulationTask = {
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
   * 实现了Node.js ThreadPool的"响应式分配"设计模式：
   * 1. 任务提交时立即尝试分配给可用Worker
   * 2. 如果没有可用Worker，则将任务放入优先级队列等待
   * 3. 设置超时机制和重试逻辑
   *
   * @param task 要处理的任务
   * @returns Promise<SimulationResult> 任务执行结果
   */
  private async processTask(task: SimulationTask): Promise<SimulationResult> {
    return new Promise((resolve, reject) => {
      // 设置任务超时处理
      const timeout = setTimeout(() => {
        const callback = this.taskMap.get(task.id);
        if (callback) {
          // 超时重试逻辑
          if (task.retriesLeft > 0) {
            task.retriesLeft--;
            this.taskQueue.unshift(task); // 重试任务优先执行
            this.emit("task-retry", { taskId: task.id, retriesLeft: task.retriesLeft, error: "timeout" });
          } else {
            // 重试次数用完，任务失败
            this.taskMap.delete(task.id);
            reject(new Error("Task timeout"));
            this.emit("task-failed", { taskId: task.id, error: "timeout" });
          }
        }
      }, task.timeout);

      // 注册任务回调
      this.taskMap.set(task.id, { resolve, reject, timeout, task });

      // 队列大小检查，防止内存溢出
      if (this.taskQueue.size() > this.config.maxQueueSize) {
        this.emit("queue-full", this.taskQueue.size());
      }

      // 🔑 核心算法：Node.js ThreadPool的"响应式分配"
      // 任务提交时立即尝试分配给可用Worker
      const availableWorker = this.workers.find((w) => !w.busy);
      if (availableWorker) {
        // 有可用Worker，立即分配任务
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
   * 这是Node.js ThreadPool"响应式分配"的核心实现：
   * - 在任务完成时立即调用
   * - 一次只处理一个任务（不是批量处理）
   * - 保证任务按优先级顺序执行
   *
   * 调用时机：
   * 1. Worker完成任务后
   * 2. Worker发生错误后
   * 3. 任务重试时
   *
   * 核心思想：响应式而非贪婪式，保证系统的响应性
   */
  private processNextTask(): void {
    // 🔑 Node.js ThreadPool设计：一次只处理一个任务
    // 这确保了响应性，避免了批量处理的延迟
    if (this.taskQueue.size() === 0) {
      return; // 没有任务可处理
    }

    const availableWorker = this.workers.find((w) => !w.busy);
    if (!availableWorker) {
      return; // 没有可用的Worker
    }

    // 从优先级队列中取出下一个任务
    const task = this.taskQueue.dequeue();
    if (task) {
      // 立即分配任务给可用Worker
      this.assignTaskToWorker(availableWorker, task);
    }
  }

  /**
   * 将任务分配给指定Worker
   *
   * 这是任务分配的最终执行方法：
   * 1. 标记Worker为忙碌状态
   * 2. 准备消息并通过MessageChannel发送
   * 3. 处理发送过程中的错误和重试
   *
   * @param worker 目标Worker包装器
   * @param task 要分配的任务
   */
  private assignTaskToWorker(worker: WorkerWrapper, task: SimulationTask): void {
    // 标记Worker为忙碌状态
    worker.busy = true;

    // 准备发送给Worker的消息格式（与simulation.worker.ts匹配）
    let workerMessage;
    if (task.type === "start_simulation" && task.payload) {
      workerMessage = {
        type: "start_simulation" as const,
        data: task.payload,
      };
    } else {
      workerMessage = {
        type: task.type,
      };
    }

    // 准备消息传输，处理Transferable对象
    const { message, transferables } = MessageSerializer.prepareForTransfer({
      taskId: task.id,
      ...workerMessage,
    });

    try {
      // 通过MessageChannel发送任务到Worker
      worker.port.postMessage(message, transferables);
    } catch (error) {
      // 发送失败，释放Worker状态
      worker.busy = false;

      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorObj = error instanceof Error ? error : new Error(errorMessage);

      // 任务发送失败重试机制
      if (task.retriesLeft > 0) {
        task.retriesLeft--;
        this.taskQueue.unshift(task); // 重试任务优先执行
        this.emit("task-retry", { taskId: task.id, retriesLeft: task.retriesLeft, error: errorMessage });
      } else {
        // 重试次数用完，任务失败
        const callback = this.taskMap.get(task.id);
        if (callback) {
          this.taskMap.delete(task.id);
          callback.reject(errorObj);
          this.emit("task-failed", { taskId: task.id, error: errorMessage });
        }
      }

      // 🔑 关键：即使发送失败也要尝试处理下一个任务
      // 这确保了系统的持续响应性
      this.processNextTask();
    }
  }

  /**
   * 批量执行模拟任务（简化版）
   * 战斗模拟通常不需要批处理，但保留接口以兼容现有代码
   */
  async executeBatch(
    tasks: Array<{
      type: SimulationTaskType;
      payload: SimulatorWithRelations | null;
      priority?: SimulationTask["priority"];
    }>,
  ): Promise<SimulationResult[]> {
    // 初始化批量执行状态
    const batchSize = Math.min(this.config.maxWorkers * 2, 20);
    const totalBatches = Math.ceil(tasks.length / batchSize);

    this.batchExecutionState = {
      isExecuting: true,
      totalTasks: tasks.length,
      submittedTasks: 0,
      completedTasks: 0,
      currentBatchIndex: 0,
      totalBatches,
    };

    console.log(`🚀 开始批量执行: ${tasks.length}个任务，分${totalBatches}批，每批${batchSize}个`);

    const results: SimulationResult[] = [];

    try {
      for (let i = 0; i < tasks.length; i += batchSize) {
        const batch = tasks.slice(i, i + batchSize);
        this.batchExecutionState.currentBatchIndex = Math.floor(i / batchSize) + 1;
        this.batchExecutionState.submittedTasks = Math.min(i + batchSize, tasks.length);

        console.log(
          `📦 处理批次 ${this.batchExecutionState.currentBatchIndex}/${totalBatches}，提交${batch.length}个任务`,
        );

        const batchResults = await Promise.all(
          batch.map(async (task) => {
            const result = await this.executeTask(task.type, task.payload, task.priority);
            this.batchExecutionState.completedTasks++;
            return result;
          }),
        );
        results.push(...batchResults);

        console.log(
          `✅ 批次 ${this.batchExecutionState.currentBatchIndex} 完成，总进度: ${this.batchExecutionState.completedTasks}/${tasks.length}`,
        );

        // 小延迟，让Worker有时间处理
        if (i + batchSize < tasks.length) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }
    } finally {
      // 重置批量执行状态
      this.batchExecutionState.isExecuting = false;
      console.log(`🎉 批量执行完成: ${results.length}/${tasks.length}个任务`);
    }

    return results;
  }

  /**
   * 获取池状态
   */
  getStatus(): PoolHealthMetrics {
    const baseMetrics = {
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

    // 如果正在执行批量任务，添加批量执行状态
    if (this.batchExecutionState.isExecuting) {
      const progress =
        this.batchExecutionState.totalTasks > 0
          ? (this.batchExecutionState.completedTasks / this.batchExecutionState.totalTasks) * 100
          : 0;

      return {
        ...baseMetrics,
        batchExecution: {
          isExecuting: true,
          progress: Math.round(progress),
          completedTasks: this.batchExecutionState.completedTasks,
          totalTasks: this.batchExecutionState.totalTasks,
          submittedTasks: this.batchExecutionState.submittedTasks,
          currentBatchIndex: this.batchExecutionState.currentBatchIndex,
          totalBatches: this.batchExecutionState.totalBatches,
        },
      };
    }

    return {
      ...baseMetrics,
      batchExecution: {
        isExecuting: false,
        progress: 0,
        completedTasks: 0,
        totalTasks: 0,
        submittedTasks: 0,
        currentBatchIndex: 0,
        totalBatches: 0,
      },
    };
  }

  // ==================== 控制器功能 ====================

  /**
   * 获取成员数据
   * 控制器通过此方法获取当前模拟的成员信息
   */
  async getMembers(): Promise<MemberSerializeData[]> {
    try {
      this.ensureWorkersInitialized();

      // 找到任何可用的worker（不一定是busy状态，因为模拟可能已经启动完成）
      const availableWorker = this.workers.find((w) => w.worker && w.port);
      if (!availableWorker) {
        console.warn("SimulatorPool: 没有找到可用的worker");
        return [];
      }

      // console.log(`🔍 [SimulatorPool] 使用worker ${availableWorker.id} 获取成员数据`);

      // 发送获取成员数据的请求
      const taskId = createId();
      const result = await new Promise<{ 
        success: boolean; 
        data?: MemberSerializeData[]; 
        error?: string 
      }>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Get members timeout"));
        }, 5000);

        // 通过MessagePort发送获取成员数据的消息
        availableWorker.port.postMessage({
          type: "get_members",
          taskId,
        });

        // 监听响应
        const handleMessage = (event: MessageEvent) => {
          if (event.data && event.data.taskId === taskId) {
            clearTimeout(timeout);
            availableWorker.port.removeEventListener("message", handleMessage);
            // 兼容worker返回格式
            if (event.data.error) {
              resolve({ success: false, error: event.data.error });
            } else {
              resolve(event.data.result || { success: false, error: "No result data" });
            }
          }
        };

        availableWorker.port.addEventListener("message", handleMessage);
      });

      if (result.success) {
        // console.log(`SimulatorPool: 成功获取成员数据: ${result.data?.length || 0} 个成员`);
        return result.data || [];
      } else {
        console.error(`SimulatorPool: 获取成员数据失败: ${result.error}`);
        return [];
      }
    } catch (error) {
      console.error("SimulatorPool: 获取成员数据异常:", error);
      return [];
    }
  }

  /**
   * 获取引擎状态
   * 控制器通过此方法获取当前引擎的状态信息
   */
  async getEngineStats(): Promise<{
    success: boolean;
    data?: EngineStats;
    error?: string;
  }> {
    try {
      this.ensureWorkersInitialized();

      const availableWorker = this.workers.find((w) => w.worker && w.port);
      if (!availableWorker) {
        console.warn("SimulatorPool: 没有找到可用的worker");
        return { success: false, error: "No available worker" };
      }

      const taskId = createId();
      const result = await new Promise<{ 
        success: boolean; 
        data?: EngineStats; 
        error?: string 
      }>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Get engine stats timeout"));
        }, 5000);

        availableWorker.port.postMessage({
          type: "get_stats",
          taskId,
        });

        const handleMessage = (event: MessageEvent) => {
          if (event.data && event.data.taskId === taskId) {
            clearTimeout(timeout);
            availableWorker.port.removeEventListener("message", handleMessage);
            if (event.data.error) {
              resolve({ success: false, error: event.data.error });
            } else {
              resolve(event.data.result || { success: false, error: "No result data" });
            }
          }
        };

        availableWorker.port.addEventListener("message", handleMessage);
      });

      return result;
    } catch (error) {
      console.error("SimulatorPool: 获取引擎状态异常:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }

  /**
   * 发送意图消息
   * 控制器通过此方法向Worker发送意图消息
   */
  async sendIntent(intent: IntentMessage): Promise<{ success: boolean; error?: string }> {
    try {
      this.ensureWorkersInitialized();

      // 找到任何可用的worker（不一定是busy状态，因为模拟可能已经启动完成）
      const availableWorker = this.workers.find((w) => w.worker && w.port);
      if (!availableWorker) {
        console.warn("SimulatorPool: 没有找到可用的worker");
        return { success: false, error: "No available worker" };
      }

      console.log(`SimulatorPool: 使用worker ${availableWorker.id} 发送意图消息`);
      console.log(`SimulatorPool: 意图数据:`, intent);

      // 发送意图消息
      const taskId = createId();
      const result = await new Promise<{ success: boolean; error?: string }>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Send intent timeout"));
        }, 5000);

        // 通过MessagePort发送意图消息
        const message = {
          type: "send_intent",
          taskId,
          data: intent,
        };
        console.log(`SimulatorPool: 发送消息:`, message);
        availableWorker.port.postMessage(message);

        // 监听响应
        const handleMessage = (event: MessageEvent) => {
          if (event.data && event.data.taskId === taskId) {
            clearTimeout(timeout);
            availableWorker.port.removeEventListener("message", handleMessage);
            // 兼容worker返回格式
            if (event.data.error) {
              resolve({ success: false, error: event.data.error });
            } else {
              resolve(event.data.result || { success: false, error: "No result data" });
            }
          }
        };

        availableWorker.port.addEventListener("message", handleMessage);
      });

      if (result.success) {
        console.log(`SimulatorPool: 成功发送意图消息`);
      } else {
        console.error(`SimulatorPool: 发送意图消息失败: ${result.error}`);
      }

      return result;
    } catch (error) {
      console.error("SimulatorPool: 发送意图消息异常:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }

  /**
   * 检查worker是否已准备好
   * @returns 是否已准备好
   */
  isReady(): boolean {
    return this.workersInitialized && this.workers.length > 0 && this.workersReady.size > 0;
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
   * 优雅关闭
   */
  async shutdown(): Promise<void> {
    this.accepting = false;

    // 等待所有活跃任务完成
    const activePromises = Array.from(this.taskMap.values()).map(
      (callback) =>
        new Promise<void>((resolve) => {
          const originalResolve = callback.resolve;
          const originalReject = callback.reject;

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

    await Promise.all(activePromises);

    // 清理资源
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }

    // 终止所有worker
    await Promise.all(
      this.workers.map((worker) => {
        try {
          return worker.worker.terminate();
        } catch (error) {
          return Promise.resolve();
        }
      }),
    );

    this.workers.length = 0;
    this.workersReady.clear(); // 清理所有ready状态
    this.taskMap.clear();

    this.emit("shutdown");
  }
}

// 多线程模式 - 用于批量计算和并行处理
export const enhancedSimulatorPool = new EnhancedSimulatorPool({
  maxWorkers: Math.min(navigator.hardwareConcurrency || 4, 6), // 多Worker用于并行计算
  taskTimeout: 60000, // 增加超时时间，战斗模拟可能需要更长时间
  enableBatching: false, // 战斗模拟通常不需要批处理
  maxRetries: 2, // 减少重试次数
  maxQueueSize: 100, // 减少队列大小
  monitorInterval: 10000, // 增加监控间隔
});

// 单线程模式 - 专门用于实时模拟控制器
export const realtimeSimulatorPool = new EnhancedSimulatorPool({
  maxWorkers: 1, // 单Worker用于实时模拟
  taskTimeout: 30000, // 实时模拟需要更快的响应
  enableBatching: false, // 实时模拟不需要批处理
  maxRetries: 1, // 实时模拟减少重试次数
  maxQueueSize: 10, // 实时模拟减少队列大小
  monitorInterval: 5000, // 实时模拟更频繁的监控
});
