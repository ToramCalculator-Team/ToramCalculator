import { Component, createSignal, onMount, onCleanup } from "solid-js";
import { WorkerPool } from "~/lib/utils/workerPool";
import { SimulatorPool } from "~/components/features/simulator/core/thread/SimulatorPool";
import poolWorkerUrl from "~/lib/utils/poolWorker?worker&url";

// 定义事件类型
interface TaskCompletedEvent {
  taskId: string;
  result: any;
  metrics?: {
    duration: number;
    memoryUsage?: number;
  };
  workerId?: string;
}

interface TaskFailedEvent {
  taskId: string;
  error: string;
  workerId?: string;
}

interface ComparisonResult {
  poolType: "WorkerPool" | "SimulatorPool";
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageDuration: number;
  totalDuration: number;
  tasksPerSecond: number;
  memoryUsage?: number;
  workerUtilization: number;
}

const WorkerPoolComparison: Component = () => {
  const [workerPool, setWorkerPool] = createSignal<WorkerPool | null>(null);
  const [simulatorPool, setSimulatorPool] = createSignal<SimulatorPool | null>(null);
  const [isRunning, setIsRunning] = createSignal(false);
  const [results, setResults] = createSignal<ComparisonResult[]>([]);
  const [config, setConfig] = createSignal({
    maxWorkers: 4,
    taskCount: 50,
    testDuration: 30, // 秒
  });

  let startTime = 0;
  let workerPoolMetrics = {
    completed: 0,
    failed: 0,
    totalDuration: 0,
    startTime: 0,
  };
  let simulatorPoolMetrics = {
    completed: 0,
    failed: 0,
    totalDuration: 0,
    startTime: 0,
  };

  onMount(() => {
    initializePools();
  });

  onCleanup(() => {
    if (workerPool()) {
      workerPool()!.shutdown();
    }
    if (simulatorPool()) {
      simulatorPool()!.shutdown();
    }
  });

  const initializePools = () => {
    // 初始化WorkerPool
    const wp = new WorkerPool(poolWorkerUrl, {
      maxWorkers: config().maxWorkers,
      defaultTimeout: 30000,
      defaultRetries: 2,
      queueLimit: 1000,
      monitorInterval: 1000,
    });

    wp.on("task-completed", (event: TaskCompletedEvent) => {
      handleWorkerPoolTaskCompleted(true, event.metrics?.duration || 0);
    });

    wp.on("task-failed", (event: TaskFailedEvent) => {
      handleWorkerPoolTaskCompleted(false, 0);
    });

    setWorkerPool(wp);

    // 初始化SimulatorPool
    const sp = new SimulatorPool({
      maxWorkers: config().maxWorkers,
      taskTimeout: 30000,
      maxRetries: 2,
      maxQueueSize: 1000,
      monitorInterval: 1000,
    });

    sp.on("task-completed", (event: TaskCompletedEvent) => {
      handleSimulatorPoolTaskCompleted(true, event.metrics?.duration || 0);
    });

    sp.on("task-failed", (event: TaskFailedEvent) => {
      handleSimulatorPoolTaskCompleted(false, 0);
    });

    setSimulatorPool(sp);
  };

  const handleWorkerPoolTaskCompleted = (success: boolean, duration: number) => {
    workerPoolMetrics.completed++;
    if (!success) workerPoolMetrics.failed++;
    workerPoolMetrics.totalDuration += duration;
  };

  const handleSimulatorPoolTaskCompleted = (success: boolean, duration: number) => {
    simulatorPoolMetrics.completed++;
    if (!success) simulatorPoolMetrics.failed++;
    simulatorPoolMetrics.totalDuration += duration;
  };

  const generateTestData = () => {
    return {
      data: Array.from({ length: 1000 }, () => Math.random() * 100 - 50),
      operation: ["filter", "map", "reduce"][Math.floor(Math.random() * 3)],
    };
  };

  const runComparisonTest = async () => {
    if (!workerPool() || !simulatorPool() || isRunning()) return;

    setIsRunning(true);
    setResults([]);

    // 重置指标
    workerPoolMetrics = { completed: 0, failed: 0, totalDuration: 0, startTime: Date.now() };
    simulatorPoolMetrics = { completed: 0, failed: 0, totalDuration: 0, startTime: Date.now() };
    startTime = Date.now();

    console.log("Starting comparison test...");

    // 并发运行两个池的测试
    const [workerPoolResult, simulatorPoolResult] = await Promise.all([runWorkerPoolTest(), runSimulatorPoolTest()]);

    // 计算最终结果
    const elapsed = (Date.now() - startTime) / 1000;

    const workerPoolFinal = {
      poolType: "WorkerPool" as const,
      totalTasks: config().taskCount,
      completedTasks: workerPoolMetrics.completed,
      failedTasks: workerPoolMetrics.failed,
      averageDuration:
        workerPoolMetrics.completed > 0 ? workerPoolMetrics.totalDuration / workerPoolMetrics.completed : 0,
      totalDuration: workerPoolMetrics.totalDuration,
      tasksPerSecond: elapsed > 0 ? workerPoolMetrics.completed / elapsed : 0,
      workerUtilization: workerPool()!.getStatus().busyWorkers / workerPool()!.getStatus().totalWorkers,
    };

    const simulatorPoolFinal = {
      poolType: "SimulatorPool" as const,
      totalTasks: config().taskCount,
      completedTasks: simulatorPoolMetrics.completed,
      failedTasks: simulatorPoolMetrics.failed,
      averageDuration:
        simulatorPoolMetrics.completed > 0 ? simulatorPoolMetrics.totalDuration / simulatorPoolMetrics.completed : 0,
      totalDuration: simulatorPoolMetrics.totalDuration,
      tasksPerSecond: elapsed > 0 ? simulatorPoolMetrics.completed / elapsed : 0,
      workerUtilization: simulatorPool()!.getStatus().activeWorkers / simulatorPool()!.getStatus().totalWorkers,
    };

    setResults([workerPoolFinal, simulatorPoolFinal]);
    setIsRunning(false);
  };

  const runWorkerPoolTest = async () => {
    const promises: Promise<any>[] = [];

    for (let i = 0; i < config().taskCount; i++) {
      const payload = generateTestData();
      const promise = workerPool()!
        .executeTask("processData", payload, {
          priority: "medium",
          timeout: 30000,
          retries: 2,
        })
        .catch((error) => {
          console.error(`WorkerPool task ${i} failed:`, error);
        });

      promises.push(promise);
    }

    await Promise.allSettled(promises);
  };

  const runSimulatorPoolTest = async () => {
    const promises: Promise<any>[] = [];

    for (let i = 0; i < config().taskCount; i++) {
      // 使用SimulatorPool的现有任务类型
      const promise = simulatorPool()!
        .executeTask("start_simulation", null, "medium")
        .catch((error) => {
          console.error(`SimulatorPool task ${i} failed:`, error);
        });

      promises.push(promise);
    }

    await Promise.allSettled(promises);
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getWinner = () => {
    if (results().length < 2) return null;

    const wp = results().find((r) => r.poolType === "WorkerPool");
    const sp = results().find((r) => r.poolType === "SimulatorPool");

    if (!wp || !sp) return null;

    // 比较任务完成率和吞吐量
    const wpScore = wp.tasksPerSecond * (wp.completedTasks / wp.totalTasks);
    const spScore = sp.tasksPerSecond * (sp.completedTasks / sp.totalTasks);

    return wpScore > spScore ? "WorkerPool" : "SimulatorPool";
  };

  return (
    <div class="container mx-auto max-w-7xl p-6">
      <h1 class="mb-6 text-3xl font-bold">线程池性能对比测试</h1>

      {/* 配置面板 */}
      <div class="mb-6 rounded-lg bg-white p-6 shadow-md">
        <h2 class="mb-4 text-xl font-semibold">测试配置</h2>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
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
              max="200"
              value={config().taskCount}
              onChange={(e) => setConfig({ ...config(), taskCount: parseInt(e.target.value) })}
              class="w-full rounded-md border px-3 py-2"
              disabled={isRunning()}
            />
          </div>
          <div>
            <label class="mb-2 block text-sm font-medium">测试时长（秒）</label>
            <input
              type="number"
              min="10"
              max="120"
              value={config().testDuration}
              onChange={(e) => setConfig({ ...config(), testDuration: parseInt(e.target.value) })}
              class="w-full rounded-md border px-3 py-2"
              disabled={isRunning()}
            />
          </div>
        </div>
      </div>

      {/* 控制按钮 */}
      <div class="mb-6 rounded-lg bg-white p-6 shadow-md">
        <div class="flex gap-4">
          <button
            onClick={runComparisonTest}
            disabled={isRunning()}
            class="rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isRunning() ? "测试中..." : "开始对比测试"}
          </button>
        </div>
      </div>

      {/* 对比结果 */}
      {results().length > 0 && (
        <div class="mb-6 rounded-lg bg-white p-6 shadow-md">
          <h2 class="mb-4 text-xl font-semibold">对比结果</h2>

          {/* 获胜者 */}
          {getWinner() && (
            <div class="mb-6 rounded-lg border border-green-300 bg-green-100 p-4">
              <h3 class="text-lg font-semibold text-green-800">🏆 获胜者: {getWinner()}</h3>
              <p class="text-green-700">基于任务完成率和吞吐量的综合评分</p>
            </div>
          )}

          {/* 结果表格 */}
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b">
                  <th class="py-2 text-left">指标</th>
                  <th class="py-2 text-left">WorkerPool</th>
                  <th class="py-2 text-left">SimulatorPool</th>
                  <th class="py-2 text-left">差异</th>
                </tr>
              </thead>
              <tbody>
                {results().map((result) => {
                  const otherResult = results().find((r) => r.poolType !== result.poolType);
                  if (!otherResult) return null;

                  const metrics = [
                    {
                      name: "总任务数",
                      wp: result.poolType === "WorkerPool" ? result.totalTasks : otherResult.totalTasks,
                      sp: result.poolType === "SimulatorPool" ? result.totalTasks : otherResult.totalTasks,
                    },
                    {
                      name: "完成任务数",
                      wp: result.poolType === "WorkerPool" ? result.completedTasks : otherResult.completedTasks,
                      sp: result.poolType === "SimulatorPool" ? result.completedTasks : otherResult.completedTasks,
                    },
                    {
                      name: "失败任务数",
                      wp: result.poolType === "WorkerPool" ? result.failedTasks : otherResult.failedTasks,
                      sp: result.poolType === "SimulatorPool" ? result.failedTasks : otherResult.failedTasks,
                    },
                    {
                      name: "平均耗时",
                      wp: result.poolType === "WorkerPool" ? result.averageDuration : otherResult.averageDuration,
                      sp: result.poolType === "SimulatorPool" ? result.averageDuration : otherResult.averageDuration,
                      format: formatDuration,
                    },
                    {
                      name: "总耗时",
                      wp: result.poolType === "WorkerPool" ? result.totalDuration : otherResult.totalDuration,
                      sp: result.poolType === "SimulatorPool" ? result.totalDuration : otherResult.totalDuration,
                      format: formatDuration,
                    },
                    {
                      name: "任务/秒",
                      wp: result.poolType === "WorkerPool" ? result.tasksPerSecond : otherResult.tasksPerSecond,
                      sp: result.poolType === "SimulatorPool" ? result.tasksPerSecond : otherResult.tasksPerSecond,
                      format: (val: number) => val.toFixed(2),
                    },
                    {
                      name: "Worker利用率",
                      wp: result.poolType === "WorkerPool" ? result.workerUtilization : otherResult.workerUtilization,
                      sp:
                        result.poolType === "SimulatorPool" ? result.workerUtilization : otherResult.workerUtilization,
                      format: (val: number) => `${(val * 100).toFixed(1)}%`,
                    },
                  ];

                  return metrics.map((metric) => {
                    const wpValue = metric.format ? metric.format(metric.wp) : metric.wp;
                    const spValue = metric.format ? metric.format(metric.sp) : metric.sp;
                    const diff = metric.wp - metric.sp;
                    const diffPercent = metric.sp !== 0 ? (diff / metric.sp) * 100 : 0;

                    return (
                      <tr class="border-b hover:bg-gray-50">
                        <td class="py-2 font-medium">{metric.name}</td>
                        <td class="py-2">{wpValue}</td>
                        <td class="py-2">{spValue}</td>
                        <td class="py-2">
                          <span
                            class={`rounded px-2 py-1 text-xs ${
                              diff > 0
                                ? "bg-green-100 text-green-800"
                                : diff < 0
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {diff > 0 ? "+" : ""}
                            {metric.format ? metric.format(diff) : diff}
                            {metric.name !== "Worker利用率" &&
                              ` (${diffPercent > 0 ? "+" : ""}${diffPercent.toFixed(1)}%)`}
                          </span>
                        </td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 详细结果 */}
      {results().length > 0 && (
        <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
          {results().map((result, index) => (
            <div class="rounded-lg bg-white p-6 shadow-md">
              <h3 class="mb-4 text-lg font-semibold">{result.poolType} 详细结果</h3>
              <div class="space-y-3">
                <div class="flex justify-between">
                  <span>总任务数:</span>
                  <span class="font-medium">{result.totalTasks}</span>
                </div>
                <div class="flex justify-between">
                  <span>完成任务:</span>
                  <span class="font-medium text-green-600">{result.completedTasks}</span>
                </div>
                <div class="flex justify-between">
                  <span>失败任务:</span>
                  <span class="font-medium text-red-600">{result.failedTasks}</span>
                </div>
                <div class="flex justify-between">
                  <span>平均耗时:</span>
                  <span class="font-medium">{formatDuration(result.averageDuration)}</span>
                </div>
                <div class="flex justify-between">
                  <span>总耗时:</span>
                  <span class="font-medium">{formatDuration(result.totalDuration)}</span>
                </div>
                <div class="flex justify-between">
                  <span>吞吐量:</span>
                  <span class="font-medium">{result.tasksPerSecond.toFixed(2)} 任务/秒</span>
                </div>
                <div class="flex justify-between">
                  <span>Worker利用率:</span>
                  <span class="font-medium">{(result.workerUtilization * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 测试说明 */}
      <div class="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-6">
        <h3 class="mb-2 text-lg font-semibold text-blue-800">测试说明</h3>
        <ul class="space-y-1 text-sm text-blue-700">
          <li>
            • <strong>WorkerPool:</strong> 基于Artem文章设计的通用线程池，使用单层MessageChannel通信
          </li>
          <li>
            • <strong>SimulatorPool:</strong> 现有的模拟器专用线程池，使用双层通信机制
          </li>
          <li>
            • <strong>测试任务:</strong> 数据处理、数组排序、数值计算等CPU密集型任务
          </li>
          <li>
            • <strong>评估指标:</strong> 任务完成率、平均耗时、吞吐量、Worker利用率
          </li>
          <li>
            • <strong>获胜判定:</strong> 基于吞吐量和任务完成率的综合评分
          </li>
        </ul>
      </div>
    </div>
  );
};

export default WorkerPoolComparison;
