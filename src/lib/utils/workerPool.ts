// ==================== 类型定义 ====================

/**
 * 任务配置选项
 */
export interface TaskOptions {
  priority?: "critical" | "high" | "medium" | "low";
  timeout?: number;
  retries?: number;
}

/**
 * 任务结果
 */
export interface TaskResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metrics?: {
    duration: number;
    memoryUsage?: number;
  };
}

/**
 * 线程池配置
 */
export interface PoolConfig {
  maxWorkers?: number;
  defaultTimeout?: number;
  defaultRetries?: number;
  queueLimit?: number;
  idleTimeout?: number;
  monitorInterval?: number;
}

/**
 * Worker指标
 */
interface WorkerMetrics {
  tasksCompleted: number;
  errors: number;
  totalProcessingTime: number;
  averageProcessingTime: number;
  lastActive: number;
}

/**
 * Worker包装器
 */
interface WorkerWrapper {
  id: string;
  worker: Worker;
  port: MessagePort;
  busy: boolean;
  lastUsed: number;
  metrics: WorkerMetrics;
}

/**
 * 任务回调信息
 */
interface TaskCallback {
  resolve: (result: TaskResult) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
  retryCount: number;
  maxRetries: number;
  priority: TaskOptions["priority"];
  startTime: number;
}

/**
 * 内部任务表示
 */
interface InternalTask {
  id: string;
  type: string;
  payload: any;
  priority: TaskOptions["priority"];
  timeout: number;
  maxRetries: number;
  currentRetry: number;
  timestamp: number;
}

// ==================== 消息序列化器（基于Artem的设计） ====================

/**
 * 消息序列化和验证器
 * 基于Artem文章中的MessageSerializer实现
 */
class MessageSerializer {
  /**
   * 检查对象是否为可传输对象
   */
  static isTransferable(obj: any): boolean {
    return (
      obj instanceof ArrayBuffer ||
      obj instanceof MessagePort ||
      (typeof ImageBitmap !== "undefined" && obj instanceof ImageBitmap) ||
      (typeof OffscreenCanvas !== "undefined" && obj instanceof OffscreenCanvas)
    );
  }

  /**
   * 递归查找可传输对象
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
   * 验证消息是否可序列化
   */
  static validateMessage(message: any): { isValid: boolean; invalidTypes: string[] } {
    const invalidTypes: string[] = [];

    function validate(item: any): boolean {
      if (item === null || item === undefined) return true;

      const type = typeof item;
      if (type === "function") {
        invalidTypes.push("Function");
        return false;
      }

      if (type === "symbol") {
        invalidTypes.push("Symbol");
        return false;
      }

      if (item instanceof Error) {
        invalidTypes.push("Error");
        return false;
      }

      // 浏览器环境检查DOM节点
      if (typeof window !== "undefined" && item instanceof Node) {
        invalidTypes.push("DOM Node");
        return false;
      }

      if (type === "object" && item !== null) {
        return Object.values(item).every(validate);
      }

      return true;
    }

    const isValid = validate(message);
    return { isValid, invalidTypes: [...new Set(invalidTypes)] };
  }

  /**
   * 准备消息进行传输
   */
  static prepareForTransfer(message: any): { message: any; transferables: Transferable[] } {
    const { isValid, invalidTypes } = this.validateMessage(message);

    if (!isValid) {
      console.warn("Message contains invalid types:", invalidTypes);
      // 可以选择抛出错误或清理消息
    }

    const transferables = this.findTransferables(message);
    return { message, transferables };
  }
}

// ==================== 优先级队列（基于Artem的设计） ====================

/**
 * 优先级任务队列
 * 基于Artem文章中的PriorityMessageQueue实现
 */
class PriorityTaskQueue {
  private queues = {
    critical: [] as InternalTask[],
    high: [] as InternalTask[],
    medium: [] as InternalTask[],
    low: [] as InternalTask[],
  };

  /**
   * 将任务加入队列
   */
  enqueue(task: InternalTask): void {
    const priority = task.priority || "medium";
    this.queues[priority].push(task);
  }

  /**
   * 从队列中取出下一个任务（按优先级顺序）
   */
  dequeue(): InternalTask | null {
    for (const priority of ["critical", "high", "medium", "low"] as const) {
      if (this.queues[priority].length > 0) {
        return this.queues[priority].shift() || null;
      }
    }
    return null;
  }

  /**
   * 将任务重新放入队列头部（用于重试）
   */
  unshift(task: InternalTask): void {
    const priority = task.priority || "medium";
    this.queues[priority].unshift(task);
  }

  /**
   * 检查是否有待处理任务
   */
  hasTask(): boolean {
    return Object.values(this.queues).some((queue) => queue.length > 0);
  }

  /**
   * 获取队列中任务总数
   */
  size(): number {
    return Object.values(this.queues).reduce((sum, queue) => sum + queue.length, 0);
  }

  /**
   * 获取队列状态
   */
  getStatus() {
    return {
      critical: this.queues.critical.length,
      high: this.queues.high.length,
      medium: this.queues.medium.length,
      low: this.queues.low.length,
      total: this.size(),
    };
  }
}

// ==================== 事件发射器 ====================

/**
 * 简单的事件发射器
 */
class EventEmitter {
  private events: { [key: string]: Function[] } = {};

  on(event: string, listener: Function): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }

  emit(event: string, ...args: any[]): void {
    if (this.events[event]) {
      this.events[event].forEach((listener) => {
        try {
          listener(...args);
        } catch (error) {
          console.error(`Event listener error for ${event}:`, error);
        }
      });
    }
  }

  off(event: string, listener?: Function): void {
    if (!this.events[event]) return;

    if (listener) {
      this.events[event] = this.events[event].filter((l) => l !== listener);
    } else {
      delete this.events[event];
    }
  }

  removeAllListeners(): void {
    this.events = {};
  }
}

// ==================== 主要的线程池类 ====================

/**
 * 通用线程池
 * 基于Artem Khrienov文章中的设计模式实现
 */
export class WorkerPool extends EventEmitter {
  private workers: WorkerWrapper[] = [];
  private taskQueue = new PriorityTaskQueue();
  private taskMap = new Map<string, TaskCallback>();
  private config: Required<PoolConfig>;
  private accepting = true;
  private cleanupInterval?: NodeJS.Timeout;
  private monitorInterval?: NodeJS.Timeout;

  constructor(
    private workerScript: string,
    config: PoolConfig = {},
  ) {
    super();

    this.config = {
      maxWorkers: config.maxWorkers || Math.min(navigator.hardwareConcurrency || 4, 4),
      defaultTimeout: config.defaultTimeout || 30000,
      defaultRetries: config.defaultRetries || 2,
      queueLimit: config.queueLimit || 1000,
      idleTimeout: config.idleTimeout || 300000, // 5分钟
      monitorInterval: config.monitorInterval || 10000, // 10秒
      ...config,
    };

    this.initializeWorkers();
    this.startMonitoring();
    this.startCleanup();
  }

  /**
   * 执行任务 - 主要的公共接口
   */
  async executeTask<T = any>(type: string, payload: any, options: TaskOptions = {}): Promise<TaskResult<T>> {
    if (!this.accepting) {
      throw new Error("Worker pool is shutting down");
    }

    const taskId = this.generateTaskId();
    const priority = options.priority || "medium";
    const timeout = options.timeout || this.getTimeoutForPriority(priority);
    const maxRetries = options.retries ?? this.getRetriesForPriority(priority);

    const task: InternalTask = {
      id: taskId,
      type,
      payload,
      priority,
      timeout,
      maxRetries,
      currentRetry: 0,
      timestamp: Date.now(),
    };

    return this.processTask(task);
  }

  /**
   * 获取池状态
   */
  getStatus() {
    return {
      accepting: this.accepting,
      totalWorkers: this.workers.length,
      busyWorkers: this.workers.filter((w) => w.busy).length,
      availableWorkers: this.workers.filter((w) => !w.busy).length,
      queueStatus: this.taskQueue.getStatus(),
      pendingTasks: this.taskMap.size,
      workerMetrics: this.workers.map((w) => ({
        id: w.id,
        busy: w.busy,
        tasksCompleted: w.metrics.tasksCompleted,
        errors: w.metrics.errors,
        averageProcessingTime: w.metrics.averageProcessingTime,
        lastActive: w.metrics.lastActive,
      })),
    };
  }

  /**
   * 优雅关闭
   */
  async shutdown(): Promise<void> {
    this.accepting = false;

    // 等待所有正在执行的任务完成
    const pendingPromises = Array.from(this.taskMap.values()).map((callback) => {
      return new Promise<void>((resolve) => {
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
      });
    });

    await Promise.all(pendingPromises);

    // 清理定时器
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }

    // 终止所有Worker
    await Promise.all(
      this.workers.map((worker) => {
        try {
          return worker.worker.terminate();
        } catch {
          return Promise.resolve();
        }
      }),
    );

    this.workers = [];
    this.taskMap.clear();
    this.removeAllListeners();

    this.emit("shutdown");
  }

  // ==================== 私有方法 ====================

  /**
   * 初始化Worker池
   */
  private initializeWorkers(): void {
    for (let i = 0; i < this.config.maxWorkers; i++) {
      this.createWorker();
    }
  }

  /**
   * 创建单个Worker - 基于Artem的单层MessageChannel设计
   */
  private createWorker(): WorkerWrapper {
    const worker = new Worker(this.workerScript, { type: "module" });
    const channel = new MessageChannel();

    const wrapper: WorkerWrapper = {
      id: this.generateWorkerId(),
      worker,
      port: channel.port2, // 主线程使用port2
      busy: false,
      lastUsed: Date.now(),
      metrics: {
        tasksCompleted: 0,
        errors: 0,
        totalProcessingTime: 0,
        averageProcessingTime: 0,
        lastActive: Date.now(),
      },
    };

    // 只在初始化时使用worker.postMessage传递MessageChannel的port1
    worker.postMessage({ type: "init", port: channel.port1 }, [channel.port1]);

    // 只监听MessageChannel，基于Artem的简洁设计
    channel.port2.onmessage = (event) => {
      this.handleWorkerMessage(wrapper, event);
    };

    // Worker错误处理
    worker.onerror = (error) => {
      console.error(`Worker ${wrapper.id} error:`, error);
      this.handleWorkerError(wrapper, error);
    };

    this.workers.push(wrapper);
    this.emit("worker-created", { workerId: wrapper.id });

    return wrapper;
  }

  /**
   * 处理Worker消息 - 基于Artem的简洁设计
   */
  private handleWorkerMessage(worker: WorkerWrapper, event: MessageEvent): void {
    const { taskId, result, error, metrics } = event.data;

    // 获取任务回调 - Artem的简洁方式
    const taskCallback = this.taskMap.get(taskId);
    if (!taskCallback) {
      return; // 任务可能已超时被清理
    }

    const { resolve, reject, timeout } = taskCallback;
    const processingTime = metrics?.duration || 0;

    // 清理超时定时器
    clearTimeout(timeout);

    // 更新Worker指标
    this.updateWorkerMetrics(worker, error ? "error" : "success", processingTime);

    if (error) {
      // 实现重试机制
      if (taskCallback.retryCount < taskCallback.maxRetries) {
        this.retryTask(taskId, taskCallback);
        return;
      } else {
        // 最终失败
        this.taskMap.delete(taskId);
        reject(new Error(error));
        this.emit("task-failed", { taskId, error, workerId: worker.id });
      }
    } else {
      // 任务成功
      this.taskMap.delete(taskId);
      resolve({
        success: true,
        data: result,
        metrics,
      });
      this.emit("task-completed", { taskId, result, metrics, workerId: worker.id });
    }

    // 标记Worker可用并处理下一个任务 - Artem的响应式分配
    worker.busy = false;
    worker.lastUsed = Date.now();
    this.processNextTask();
  }

  /**
   * 处理任务 - 基于Artem的Promise模式
   */
  private async processTask(task: InternalTask): Promise<TaskResult> {
    return new Promise((resolve, reject) => {
      // 队列容量检查
      if (this.taskQueue.size() >= this.config.queueLimit) {
        reject(new Error("Task queue is full"));
        return;
      }

      // 设置超时
      const timeout = setTimeout(() => {
        this.handleTaskTimeout(task.id);
      }, task.timeout);

      // 存储任务回调
      const taskCallback: TaskCallback = {
        resolve,
        reject,
        timeout,
        retryCount: 0,
        maxRetries: task.maxRetries,
        priority: task.priority,
        startTime: Date.now(),
      };

      this.taskMap.set(task.id, taskCallback);

      // Artem的响应式分配：优先立即执行
      const availableWorker = this.workers.find((w) => !w.busy);
      if (availableWorker) {
        this.assignTaskToWorker(availableWorker, task);
      } else {
        this.taskQueue.enqueue(task);
      }
    });
  }

  /**
   * 响应式处理下一个任务 - 基于Artem的设计
   */
  private processNextTask(): void {
    if (!this.taskQueue.hasTask()) return;

    const availableWorker = this.workers.find((w) => !w.busy);
    if (!availableWorker) return;

    const task = this.taskQueue.dequeue();
    if (task) {
      this.assignTaskToWorker(availableWorker, task);
    }
  }

  /**
   * 分配任务给Worker
   */
  private assignTaskToWorker(worker: WorkerWrapper, task: InternalTask): void {
    worker.busy = true;

    const message = {
      taskId: task.id,
      type: task.type,
      payload: task.payload,
    };

    const { message: preparedMessage, transferables } = MessageSerializer.prepareForTransfer(message);

    try {
      worker.port.postMessage(preparedMessage, transferables);
    } catch (error) {
      // 发送失败，释放Worker并重试任务
      worker.busy = false;
      const taskCallback = this.taskMap.get(task.id);

      if (taskCallback && taskCallback.retryCount < taskCallback.maxRetries) {
        this.retryTask(task.id, taskCallback);
      } else if (taskCallback) {
        this.taskMap.delete(task.id);
        taskCallback.reject(error instanceof Error ? error : new Error(String(error)));
      }

      this.processNextTask();
    }
  }

  /**
   * 重试任务
   */
  private retryTask(taskId: string, callback: TaskCallback): void {
    callback.retryCount++;

    // 重新构建任务并优先处理
    const retryTask: InternalTask = {
      id: taskId,
      type: "", // 这里需要从某处获取，或者重构数据结构
      payload: null,
      priority: callback.priority,
      timeout: this.getTimeoutForPriority(callback.priority),
      maxRetries: callback.maxRetries,
      currentRetry: callback.retryCount,
      timestamp: Date.now(),
    };

    // 优先重试
    this.taskQueue.unshift(retryTask);
    this.emit("task-retry", { taskId, retryCount: callback.retryCount });
    this.processNextTask();
  }

  /**
   * 处理任务超时
   */
  private handleTaskTimeout(taskId: string): void {
    const taskCallback = this.taskMap.get(taskId);
    if (!taskCallback) return;

    if (taskCallback.retryCount < taskCallback.maxRetries) {
      this.retryTask(taskId, taskCallback);
    } else {
      this.taskMap.delete(taskId);
      taskCallback.reject(new Error("Task timeout"));
      this.emit("task-timeout", { taskId });
    }
  }

  /**
   * 处理Worker错误
   */
  private handleWorkerError(worker: WorkerWrapper, error: ErrorEvent): void {
    this.updateWorkerMetrics(worker, "error");

    // 查找该Worker正在处理的任务
    const activeTask = Array.from(this.taskMap.entries()).find(([_, callback]) => {
      // 这里需要更好的方式来跟踪哪个Worker在处理哪个任务
      return true; // 简化实现
    });

    if (activeTask) {
      const [taskId, callback] = activeTask;
      if (callback.retryCount < callback.maxRetries) {
        this.retryTask(taskId, callback);
      } else {
        this.taskMap.delete(taskId);
        callback.reject(new Error(`Worker error: ${error.message}`));
      }
    }

    // 替换出错的Worker
    this.replaceWorker(worker);
  }

  /**
   * 替换Worker
   */
  private replaceWorker(worker: WorkerWrapper): void {
    const index = this.workers.indexOf(worker);
    if (index === -1) return;

    // 移除旧Worker
    this.workers.splice(index, 1);
    try {
      worker.worker.terminate();
    } catch (error) {
      console.warn("Error terminating worker:", error);
    }

    // 创建新Worker（如果池仍在接受任务）
    if (this.accepting) {
      const newWorker = this.createWorker();
      this.workers.splice(index, 0, newWorker);
      this.emit("worker-replaced", { oldId: worker.id, newId: newWorker.id });
    }

    this.processNextTask();
  }

  /**
   * 更新Worker指标
   */
  private updateWorkerMetrics(worker: WorkerWrapper, status: "success" | "error", processingTime: number = 0): void {
    const metrics = worker.metrics;

    if (status === "success") {
      metrics.tasksCompleted++;
      metrics.totalProcessingTime += processingTime;
      metrics.averageProcessingTime = metrics.totalProcessingTime / metrics.tasksCompleted;
    } else {
      metrics.errors++;
    }

    metrics.lastActive = Date.now();
  }

  /**
   * 基于优先级获取超时时间
   */
  private getTimeoutForPriority(priority: TaskOptions["priority"]): number {
    const timeouts = {
      critical: 2000, // 2秒
      high: 5000, // 5秒
      medium: 15000, // 15秒
      low: 30000, // 30秒
    };
    return timeouts[priority || "medium"] || this.config.defaultTimeout;
  }

  /**
   * 基于优先级获取重试次数
   */
  private getRetriesForPriority(priority: TaskOptions["priority"]): number {
    const retries = {
      critical: 0, // 紧急任务不重试
      high: 1, // 高优先级少量重试
      medium: 2, // 标准重试
      low: 1, // 低优先级减少重试
    };
    return retries[priority || "medium"] || this.config.defaultRetries;
  }

  /**
   * 启动监控
   */
  private startMonitoring(): void {
    this.monitorInterval = setInterval(() => {
      const status = this.getStatus();
      this.emit("metrics", status);

      // 检查是否有Worker长时间无响应
      const now = Date.now();
      this.workers.forEach((worker) => {
        if (worker.busy && now - worker.metrics.lastActive > 60000) {
          // 1分钟无响应
          console.warn(`Worker ${worker.id} appears unresponsive`);
          this.emit("worker-unresponsive", { workerId: worker.id });
        }
      });
    }, this.config.monitorInterval);
  }

  /**
   * 启动清理过程
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();

      // 清理超时的任务（防御性）
      for (const [taskId, callback] of this.taskMap) {
        const timeoutMs = typeof callback.timeout === 'number' ? callback.timeout : 30000;
        if (now - callback.startTime > timeoutMs * 2) {
          console.warn(`Cleaning up stale task: ${taskId}`);
          clearTimeout(callback.timeout);
          this.taskMap.delete(taskId);
          callback.reject(new Error("Task cleanup timeout"));
        }
      }
    }, 60000); // 每分钟清理一次
  }

  /**
   * 生成任务ID
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成Worker ID
   */
  private generateWorkerId(): string {
    return `worker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ==================== 导出 ====================

export default WorkerPool;

// 使用示例
/*
  // 创建线程池
  const pool = new WorkerPool('my-worker.js', {
    maxWorkers: 4,
    defaultTimeout: 30000,
    defaultRetries: 2
  });
  
  // 监听事件
  pool.on('task-completed', ({ taskId, result, workerId }) => {
    console.log(`Task ${taskId} completed by worker ${workerId}`);
  });
  
  pool.on('task-failed', ({ taskId, error }) => {
    console.error(`Task ${taskId} failed:`, error);
  });
  
  // 执行任务
  try {
    const result = await pool.executeTask('processData', { data: [1, 2, 3] }, {
      priority: 'high',
      timeout: 10000
    });
    console.log('Task result:', result);
  } catch (error) {
    console.error('Task failed:', error);
  }
  
  // 获取池状态
  const status = pool.getStatus();
  console.log('Pool status:', status);
  
  // 关闭池
  await pool.shutdown();
  */
