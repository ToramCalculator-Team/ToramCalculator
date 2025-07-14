import { onMount, onCleanup, createSignal, Show, For } from "solid-js";
import {
  EnhancedSimulatorPool,
  type PoolHealthMetrics,
  type SimulationResult,
} from "~/components/module/simulator/SimulatorPool";
import { PlayerController } from "~/components/module/simulator/PlayerController";
import { Motion } from "solid-motionone";
import { store } from "~/store";
import { Button } from "~/components/controls/button";
import { SimulatorWithRelations } from "~/repositories/simulator";
import { MemberType, MobDifficultyFlag } from "../../../db/enums";

// 扩展仪表板组件
function PoolDashboard(props: { pool: EnhancedSimulatorPool; metrics: PoolHealthMetrics | null }) {
  const [isRunningTest, setIsRunningTest] = createSignal(false);
  const [testResults, setTestResults] = createSignal<SimulationResult[]>([]);
  const [simulationActive, setSimulationActive] = createSignal(false);
  const [activeTab, setActiveTab] = createSignal<"messageChannel" | "comlink">("messageChannel");

  // 创建模拟数据 - 符合SimulatorWithRelations类型
  const createMockSimulatorData = (): SimulatorWithRelations => ({
    id: `sim_${Date.now()}`,
    name: "测试战斗模拟",
    details: "XState模拟器测试",
    statisticId: "stat_1",
    updatedByAccountId: null,
    createdByAccountId: "admin",
    campA: [
      {
        id: "teamA1",
        name: "A队",
        members: [
          {
            id: "playerA1",
            type: "Player",
            playerId: "player1",
            mercenaryId: null,
            partnerId: null,
            mobId: null,
            teamId: "teamA1",
            name: "",
            sequence: 0,
            mobDifficultyFlag: "Easy",
            actions: undefined,
          },
        ],
        gems: [],
      },
    ],
    campB: [
      {
        id: "teamB1",
        name: "B队",
        members: [
          {
            id: "mobB1",
            name: "怪物B1",
            sequence: 1,
            type: "Mob" as MemberType,
            playerId: null,
            mercenaryId: null,
            partnerId: null,
            mobId: "mob1",
            mobDifficultyFlag: "Normal" as MobDifficultyFlag,
            actions: {},
            teamId: "teamB1",
          },
        ],
        gems: [],
      },
    ],
    statistic: {
      id: "stat_1",
      updatedAt: new Date(),
      createdAt: new Date(),
      usageTimestamps: [],
      viewTimestamps: [],
    },
  });

  // 启动战斗模拟
  const startSimulation = async () => {
    setIsRunningTest(true);
    try {
      const simulatorData = createMockSimulatorData();

      const result = await props.pool.startSimulation(simulatorData, "high");

      setTestResults((prev) => [result, ...prev.slice(0, 4)]);
      setSimulationActive(true);
      console.log("战斗模拟结果:", result);
    } catch (error) {
      console.error("战斗模拟失败:", error);
    } finally {
      setIsRunningTest(false);
    }
  };

  // 停止模拟
  const stopSimulation = async () => {
    try {
      const result = await props.pool.stopSimulation("high");
      setSimulationActive(false);
      console.log("模拟已停止:", result);
    } catch (error) {
      console.error("停止模拟失败:", error);
    }
  };

  // 暂停模拟
  const pauseSimulation = async () => {
    try {
      const result = await props.pool.pauseSimulation("high");
      console.log("模拟已暂停:", result);
    } catch (error) {
      console.error("暂停模拟失败:", error);
    }
  };

  // 恢复模拟
  const resumeSimulation = async () => {
    try {
      const result = await props.pool.resumeSimulation("high");
      console.log("模拟已恢复:", result);
    } catch (error) {
      console.error("恢复模拟失败:", error);
    }
  };

  // 运行批量测试
  const runBatchTest = async () => {
    setIsRunningTest(true);
    try {
      const tasks = Array.from({ length: 3 }, () => ({
        type: "start_simulation" as const,
        payload: createMockSimulatorData(),
        priority: "medium" as const,
      }));

      const results = await props.pool.executeBatch(tasks);
      setTestResults((prev) => [...results, ...prev].slice(0, 10));
      console.log("批量模拟结果:", results);
    } catch (error) {
      console.error("批量模拟失败:", error);
    } finally {
      setIsRunningTest(false);
    }
  };

  return (
    <div class="min-h-screen overflow-y-auto bg-gray-50 p-6 dark:bg-gray-900">
      <div class="mx-auto max-w-6xl">
        <div class="mb-8">
          <h1 class="mb-2 text-3xl font-bold text-gray-900 dark:text-white">XState模拟器池管理</h1>
          <p class="text-gray-600 dark:text-gray-400">监控和测试XState战斗模拟器的性能表现</p>
        </div>

        {/* 状态概览 */}
        <div class="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
          <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">活跃Workers</h3>
            <p class="text-2xl font-bold text-blue-600">{props.metrics?.activeWorkers || 0}</p>
          </div>
          <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">总Workers</h3>
            <p class="text-2xl font-bold text-green-600">{props.metrics?.totalWorkers || 0}</p>
          </div>
          <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">队列长度</h3>
            <p class="text-2xl font-bold text-orange-600">{props.metrics?.queueLength || 0}</p>
          </div>
          <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">待处理任务</h3>
            <p class="text-2xl font-bold text-red-600">{props.metrics?.pendingTasks || 0}</p>
          </div>
        </div>

        {/* 模拟控制面板 */}
        <div class="mb-8 rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">战斗模拟控制</h3>

          <div class="mb-4 flex gap-4">
            <Button
              onClick={startSimulation}
              disabled={isRunningTest() || simulationActive()}
              class="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isRunningTest() ? "启动中..." : "启动战斗模拟"}
            </Button>

            <Button
              onClick={stopSimulation}
              disabled={!simulationActive()}
              class="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              停止模拟
            </Button>

            <Button
              onClick={pauseSimulation}
              disabled={!simulationActive()}
              class="inline-flex items-center rounded-lg bg-yellow-600 px-4 py-2 font-medium text-white hover:bg-yellow-700 disabled:opacity-50"
            >
              暂停模拟
            </Button>

            <Button
              onClick={resumeSimulation}
              disabled={!simulationActive()}
              class="inline-flex items-center rounded-lg bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              恢复模拟
            </Button>
          </div>

          <div class="border-t pt-4">
            <Button
              onClick={runBatchTest}
              disabled={isRunningTest()}
              class="inline-flex items-center rounded-lg bg-purple-600 px-4 py-2 font-medium text-white hover:bg-purple-700 disabled:opacity-50"
            >
              {isRunningTest() ? "运行中..." : "批量测试(3个模拟)"}
            </Button>
          </div>

          {/* 模拟状态指示器 */}
          <Show when={simulationActive()}>
            <div class="mt-4 rounded-lg bg-green-50 p-4 dark:bg-green-900">
              <div class="flex items-center">
                <div class="mr-3 h-3 w-3 animate-pulse rounded-full bg-green-500"></div>
                <span class="font-medium text-green-700 dark:text-green-300">战斗模拟正在运行中...</span>
              </div>
            </div>
          </Show>
        </div>

        {/* 测试结果 */}
        <Show when={testResults().length > 0}>
          <div class="mb-8 rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">最近模拟结果</h3>
            <div class="space-y-2">
              <For each={testResults()}>
                {(result, index) => (
                  <div class="flex items-center justify-between rounded border p-3">
                    <span class="text-sm font-medium">战斗模拟 #{index() + 1}</span>
                    <span class={`text-sm ${result.success ? "text-green-600" : "text-red-600"}`}>
                      {result.success ? "✅ 成功" : "❌ 失败"}
                    </span>
                    <span class="text-xs text-gray-500">
                      {result.metrics?.duration ? `${result.metrics.duration.toFixed(2)}ms` : "N/A"}
                    </span>
                    <Show when={result.success && result.data?.type === "simulation_complete"}>
                      <span class="text-xs text-blue-600">已完成</span>
                    </Show>
                    <Show when={result.error}>
                      <span class="max-w-xs truncate text-xs text-red-600">{result.error}</span>
                    </Show>
                  </div>
                )}
              </For>
            </div>
          </div>
        </Show>

        <PlayerController pool={props.pool} isSimulationActive={simulationActive()} />

        {/* Worker 指标 */}
        <Show when={props.metrics?.workerMetrics}>
          <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Worker 详细指标</h3>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b">
                    <th class="pb-2 text-left">Worker ID</th>
                    <th class="pb-2 text-left">完成任务数</th>
                    <th class="pb-2 text-left">错误次数</th>
                    <th class="pb-2 text-left">平均处理时间</th>
                    <th class="pb-2 text-left">最后活跃时间</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={props.metrics?.workerMetrics || []}>
                    {(worker) => (
                      <tr class="border-b">
                        <td class="py-2 font-mono text-xs">{worker.workerId.slice(-8)}</td>
                        <td class="py-2">{worker.tasksCompleted}</td>
                        <td class="py-2">{worker.errors}</td>
                        <td class="py-2">{worker.avgProcessingTime.toFixed(2)}ms</td>
                        <td class="py-2">{new Date(worker.lastActive).toLocaleTimeString()}</td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
}

export default function EvaluatePage() {
  const [pool, setPool] = createSignal<EnhancedSimulatorPool | null>(null);
  const [isInitializing, setIsInitializing] = createSignal(false);
  const [initError, setInitError] = createSignal<string | null>(null);
  const [metrics, setMetrics] = createSignal<PoolHealthMetrics | null>(null);

  // 初始化模拟器池
  const initializePool = async () => {
    if (isInitializing()) return;

    setIsInitializing(true);
    setInitError(null);

    try {
      console.log("开始创建XState模拟器池...");

      // 创建增强版模拟器池，专门处理XState模拟
      const newPool = new EnhancedSimulatorPool({
        maxWorkers: 4,
        idleTimeout: 5 * 60 * 1000,
        taskTimeout: 60 * 1000, // 增加到60秒以支持长时间模拟
        maxRetries: 3,
        maxQueueSize: 1000,
        monitorInterval: 2000,
        enableBatching: true,
        batchSize: 3, // 减少批量大小以优化XState模拟性能
        batchDelay: 16,
      });

      console.log("XState模拟器池创建成功，设置事件监听器...");

      // 设置事件监听器
      newPool.on("metrics", (poolMetrics: PoolHealthMetrics) => {
        setMetrics(poolMetrics);
      });

      newPool.on("task-completed", (data: any) => {
        console.log("XState任务完成:", data.taskId);
      });

      newPool.on("task-failed", (data: any) => {
        console.error("XState任务失败:", data.taskId, data.error);
      });

      newPool.on("task-retry", (data: any) => {
        console.warn("XState任务重试:", data.taskId, "剩余重试次数:", data.retriesLeft);
      });

      setPool(newPool);
      console.log("XState模拟器池初始化完成！");
    } catch (error: any) {
      console.error("初始化XState模拟器池失败:", error);
      setInitError(error.message || "初始化失败");
    } finally {
      setIsInitializing(false);
    }
  };

  onCleanup(async () => {
    // 清理资源
    const currentPool = pool();
    if (currentPool) {
      await currentPool.shutdown();
      console.log("XState模拟器池已清理");
    }
  });

  return (
    <Motion.div
      animate={{ opacity: [0, 1] }}
      transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.7 : 0 }}
      class={`Client relative flex h-full w-full flex-col justify-between opacity-0`}
    >
      <Show
        when={pool()}
        fallback={
          <div class="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div class="mx-4 max-w-md text-center">
              <div class="mb-8">
                <div class="mb-4 text-6xl">🎮</div>
                <h1 class="mb-2 text-2xl font-bold text-gray-900 dark:text-white">XState模拟器池管理</h1>
                <p class="text-gray-600 dark:text-gray-400">点击下方按钮初始化XState模拟器池，支持实时模式和玩家控制</p>
              </div>

              {initError() && (
                <div class="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-700 dark:bg-red-900 dark:text-red-300">
                  <h3 class="mb-2 font-medium">初始化失败</h3>
                  <p class="text-sm">{initError()}</p>
                </div>
              )}

              <Button
                onClick={initializePool}
                disabled={isInitializing()}
                class="inline-flex items-center rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isInitializing() ? (
                  <>
                    <div class="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                    初始化中...
                  </>
                ) : (
                  <>
                    <span class="mr-2">🚀</span>
                    初始化XState模拟器池
                  </>
                )}
              </Button>

              {isInitializing() && (
                <div class="mt-6 text-sm text-gray-500 dark:text-gray-400">
                  <p>正在创建 XState Worker 进程...</p>
                  <p>请稍候，这可能需要几秒钟</p>
                </div>
              )}
            </div>
          </div>
        }
      >
        {(poolInstance) => {
          return <PoolDashboard pool={poolInstance()} metrics={metrics()} />;
        }}
      </Show>
    </Motion.div>
  );
}
