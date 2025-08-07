import { Component, createSignal, onMount, onCleanup } from "solid-js";
import { WorkerPool } from "~/lib/utils/workerPool";
import poolWorkerUrl from "~/lib/utils/poolWorker?worker&url";

// 定义事件类型
interface TaskCompletedEvent {
  taskId: string;
  result: any;
  metrics?: {
    duration: number;
    memoryUsage?: number;
  };
  workerId: string;
}

interface TaskFailedEvent {
  taskId: string;
  error: string;
  workerId?: string;
}

interface TaskRetryEvent {
  taskId: string;
  retryCount: number;
}

interface PoolStatus {
  totalWorkers: number;
  busyWorkers: number;
  availableWorkers: number;
  queueStatus: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  };
}

interface TestResult {
  taskId: string;
  type: string;
  success: boolean;
  duration: number;
  error?: string;
  workerId?: string;
}

interface PerformanceMetrics {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageDuration: number;
  totalDuration: number;
  tasksPerSecond: number;
}

const WorkerPoolTest: Component = () => {
  const [pool, setPool] = createSignal<WorkerPool | null>(null);
  const [isRunning, setIsRunning] = createSignal(false);
  const [results, setResults] = createSignal<TestResult[]>([]);
  const [metrics, setMetrics] = createSignal<PerformanceMetrics>({
    totalTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    averageDuration: 0,
    totalDuration: 0,
    tasksPerSecond: 0,
  });
  const [poolStatus, setPoolStatus] = createSignal<PoolStatus | null>(null);
  const [config, setConfig] = createSignal({
    maxWorkers: 4,
    taskCount: 100,
    taskTypes: ["processData", "calculateSum", "sortArray"],
    priorities: ["critical", "high", "medium", "low"],
  });

  let startTime = 0;
  let completedCount = 0;
  let failedCount = 0;
  let totalDuration = 0;

  onMount(() => {
    initializePool();
  });

  onCleanup(() => {
    if (pool()) {
      pool()!.shutdown();
    }
  });

  const initializePool = () => {
    const newPool = new WorkerPool(poolWorkerUrl, {
      maxWorkers: config().maxWorkers,
      defaultTimeout: 30000,
      defaultRetries: 2,
      queueLimit: 1000,
      monitorInterval: 1000,
    });

    // 监听事件
    newPool.on("task-completed", (event: TaskCompletedEvent) => {
      handleTaskCompleted(event.taskId, true, event.metrics?.duration || 0, undefined, event.workerId);
    });

    newPool.on("task-failed", (event: TaskFailedEvent) => {
      handleTaskCompleted(event.taskId, false, 0, event.error, event.workerId);
    });

    newPool.on("task-retry", (event: TaskRetryEvent) => {
      console.log(`Task ${event.taskId} retry ${event.retryCount}`);
    });

    newPool.on("metrics", (status: PoolStatus) => {
      setPoolStatus(status);
    });

    setPool(newPool);
  };

  const handleTaskCompleted = (
    taskId: string,
    success: boolean,
    duration: number,
    error?: string,
    workerId?: string,
  ) => {
    completedCount++;
    if (!success) failedCount++;
    totalDuration += duration;

    const newResult: TestResult = {
      taskId,
      type: "unknown", // 可以从某处获取任务类型
      success,
      duration,
      error,
      workerId,
    };

    setResults((prev) => [...prev, newResult]);

    // 更新性能指标
    const avgDuration = totalDuration / completedCount;
    const elapsed = (Date.now() - startTime) / 1000;
    const tps = elapsed > 0 ? completedCount / elapsed : 0;

    setMetrics({
      totalTasks: config().taskCount,
      completedTasks: completedCount,
      failedTasks: failedCount,
      averageDuration: avgDuration,
      totalDuration,
      tasksPerSecond: tps,
    });

    // 检查是否所有任务都完成了
    if (completedCount + failedCount >= config().taskCount) {
      setIsRunning(false);
      console.log("All tasks completed!");
    }
  };

  const generateTestData = (type: string) => {
    switch (type) {
      case "processData":
        return {
          data: Array.from({ length: 1000 }, () => Math.random() * 100 - 50),
          operation: ["filter", "map", "reduce"][Math.floor(Math.random() * 3)],
        };
      case "calculateSum":
        return {
          numbers: Array.from({ length: 10000 }, () => Math.random() * 1000),
        };
      case "sortArray":
        return {
          array: Array.from({ length: 5000 }, () => Math.floor(Math.random() * 10000)),
          ascending: Math.random() > 0.5,
        };
      default:
        return { data: [] };
    }
  };

  const runTest = async () => {
    if (!pool() || isRunning()) return;

    setIsRunning(true);
    setResults([]);

    // 重置计数器
    completedCount = 0;
    failedCount = 0;
    totalDuration = 0;
    startTime = Date.now();

    const { taskCount, taskTypes, priorities } = config();

    console.log(`Starting test with ${taskCount} tasks...`);

    // 并发提交任务
    const promises: Promise<any>[] = [];

    for (let i = 0; i < taskCount; i++) {
      const taskType = taskTypes[Math.floor(Math.random() * taskTypes.length)];
      const priority = priorities[Math.floor(Math.random() * priorities.length)];
      const payload = generateTestData(taskType);

      const promise = pool()!
        .executeTask(taskType, payload, {
          priority: priority as any,
          timeout: 30000,
          retries: 2,
        })
        .catch((error) => {
          console.error(`Task ${i} failed:`, error);
          handleTaskCompleted(`task_${i}`, false, 0, error.message);
        });

      promises.push(promise);
    }

    // 等待所有任务完成
    await Promise.allSettled(promises);
  };

  const stopTest = () => {
    setIsRunning(false);
  };

  const resetTest = () => {
    setResults([]);
    setMetrics({
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      averageDuration: 0,
      totalDuration: 0,
      tasksPerSecond: 0,
    });
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div class="container flex h-full w-full flex-col gap-4 overflow-y-auto">
      <h1 class="mb-6 text-3xl font-bold">Worker Pool 性能测试</h1>

      {/* 配置面板 */}
      <div class="mb-6 rounded-lg bg-white p-6 shadow-md">
        <h2 class="mb-4 text-xl font-semibold">测试配置</h2>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label class="mb-2 block text-sm font-medium">Worker数量</label>
            <input
              type="number"
              min="1"
              max="8"
              value={config().maxWorkers}
              onChange={(e) => setConfig({ ...config(), maxWorkers: parseInt(e.target.value) })}
              class="w-full rounded-md border px-3 py-2"
              disabled={isRunning()}
            />
          </div>
          <div>
            <label class="mb-2 block text-sm font-medium">任务数量</label>
            <input
              type="number"
              min="10"
              max="1000"
              value={config().taskCount}
              onChange={(e) => setConfig({ ...config(), taskCount: parseInt(e.target.value) })}
              class="w-full rounded-md border px-3 py-2"
              disabled={isRunning()}
            />
          </div>
          <div>
            <label class="mb-2 block text-sm font-medium">任务类型</label>
            <select
              multiple
              value={config().taskTypes}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                setConfig({ ...config(), taskTypes: selected });
              }}
              class="w-full rounded-md border px-3 py-2"
              disabled={isRunning()}
            >
              <option value="processData">数据处理</option>
              <option value="calculateSum">求和计算</option>
              <option value="sortArray">数组排序</option>
            </select>
          </div>
          <div>
            <label class="mb-2 block text-sm font-medium">优先级</label>
            <select
              multiple
              value={config().priorities}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                setConfig({ ...config(), priorities: selected });
              }}
              class="w-full rounded-md border px-3 py-2"
              disabled={isRunning()}
            >
              <option value="critical">紧急</option>
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </div>
        </div>
      </div>

      {/* 控制按钮 */}
      <div class="mb-6 rounded-lg bg-white p-6 shadow-md">
        <div class="flex gap-4">
          <button
            onClick={runTest}
            disabled={isRunning() || !pool()}
            class="rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isRunning() ? "测试中..." : "开始测试"}
          </button>
          <button
            onClick={stopTest}
            disabled={!isRunning()}
            class="rounded-md bg-red-600 px-6 py-2 text-white hover:bg-red-700 disabled:opacity-50"
          >
            停止测试
          </button>
          <button onClick={resetTest} class="rounded-md bg-gray-600 px-6 py-2 text-white hover:bg-gray-700">
            重置结果
          </button>
        </div>
      </div>

      {/* 性能指标 */}
      <div class="mb-6 rounded-lg bg-white p-6 shadow-md">
        <h2 class="mb-4 text-xl font-semibold">性能指标</h2>
        <div class="grid grid-cols-2 gap-4 md:grid-cols-6">
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-600">{metrics().totalTasks}</div>
            <div class="text-sm text-gray-600">总任务数</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-green-600">{metrics().completedTasks}</div>
            <div class="text-sm text-gray-600">已完成</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-red-600">{metrics().failedTasks}</div>
            <div class="text-sm text-gray-600">失败</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-purple-600">{formatDuration(metrics().averageDuration)}</div>
            <div class="text-sm text-gray-600">平均耗时</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-orange-600">{formatDuration(metrics().totalDuration)}</div>
            <div class="text-sm text-gray-600">总耗时</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-indigo-600">{metrics().tasksPerSecond.toFixed(2)}</div>
            <div class="text-sm text-gray-600">任务/秒</div>
          </div>
        </div>
      </div>

      {/* 线程池状态 */}
      {poolStatus() && (
        <div class="mb-6 rounded-lg bg-white p-6 shadow-md">
          <h2 class="mb-4 text-xl font-semibold">线程池状态</h2>
          <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <span class="font-medium">总Worker数:</span> {poolStatus()!.totalWorkers}
            </div>
            <div>
              <span class="font-medium">忙碌Worker:</span> {poolStatus()!.busyWorkers}
            </div>
            <div>
              <span class="font-medium">可用Worker:</span> {poolStatus()!.availableWorkers}
            </div>
            <div>
              <span class="font-medium">队列任务:</span> {poolStatus()!.queueStatus.total}
            </div>
          </div>
          <div class="mt-4">
            <h3 class="mb-2 font-medium">队列状态:</h3>
            <div class="grid grid-cols-4 gap-2 text-sm">
              <div>紧急: {poolStatus()!.queueStatus.critical}</div>
              <div>高: {poolStatus()!.queueStatus.high}</div>
              <div>中: {poolStatus()!.queueStatus.medium}</div>
              <div>低: {poolStatus()!.queueStatus.low}</div>
            </div>
          </div>
        </div>
      )}

      {/* 测试结果 */}
      <div class="rounded-lg bg-white p-6 shadow-md">
        <h2 class="mb-4 text-xl font-semibold">测试结果</h2>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b">
                <th class="py-2 text-left">任务ID</th>
                <th class="py-2 text-left">类型</th>
                <th class="py-2 text-left">状态</th>
                <th class="py-2 text-left">耗时</th>
                <th class="py-2 text-left">Worker</th>
                <th class="py-2 text-left">错误</th>
              </tr>
            </thead>
            <tbody>
              {results()
                .slice(-20)
                .reverse()
                .map((result, index) => (
                  <tr class="border-b hover:bg-gray-50">
                    <td class="py-2 font-mono text-xs">{result.taskId}</td>
                    <td class="py-2">{result.type}</td>
                    <td class="py-2">
                      <span
                        class={`rounded px-2 py-1 text-xs ${
                          result.success ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}
                      >
                        {result.success ? "成功" : "失败"}
                      </span>
                    </td>
                    <td class="py-2">{formatDuration(result.duration)}</td>
                    <td class="py-2 font-mono text-xs">{result.workerId}</td>
                    <td class="py-2 text-xs text-red-600">{result.error}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {results().length === 0 && <div class="py-8 text-center text-gray-500">暂无测试结果</div>}
      </div>
    </div>
  );
};

export default WorkerPoolTest;
