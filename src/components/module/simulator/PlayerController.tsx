import { createSignal, Show, For, onMount, onCleanup } from "solid-js";
import { Button } from "~/components/controls/button";
import { EnhancedSimulatorPool } from "~/components/module/simulator/SimulatorPool";

/**
 * 批量模拟配置接口
 */
interface BatchSimulationConfig {
  batchSize: number;     // 批量大小
  priority: 'high' | 'medium' | 'low';
  description?: string;  // 描述信息
}

/**
 * 批量结果统计接口
 */
interface BatchResult {
  batchId: string;
  completed: number;
  total: number;
  successRate: number;
  avgProcessingTime: number;
  errors: string[];
  startTime: number;
  endTime?: number;
}

interface PlayerControllerProps {
  pool: EnhancedSimulatorPool;
  isSimulationActive: boolean;
}

/**
 * 批量计算模式的控制器组件
 * 
 * 专注于批量战斗模拟的执行、监控和结果展示
 */
export function PlayerController(props: PlayerControllerProps) {
  const [batchConfig, setBatchConfig] = createSignal<BatchSimulationConfig>({
    batchSize: 50,
    priority: 'medium',
    description: '标准批量模拟'
  });
  const [batchResults, setBatchResults] = createSignal<BatchResult[]>([]);
  const [poolMetrics, setPoolMetrics] = createSignal(props.pool.getStatus());
  const [operationHistory, setOperationHistory] = createSignal<string[]>([]);
  const [isExecutingBatch, setIsExecutingBatch] = createSignal(false);

  // 监听批量任务进度
  onMount(() => {
    console.log('📊 BatchController mounted, setting up batch simulation monitoring');
    
    // 监听池状态变化
    const statusInterval = setInterval(() => {
      const status = props.pool.getStatus();
      setPoolMetrics(status);
    }, 2000);

    // 监听任务完成事件
    props.pool.on('task-completed', (data: any) => {
      addToHistory(`✅ 模拟完成: ${data.taskId}`);
      updateBatchResults(data);
    });

    props.pool.on('task-failed', (data: any) => {
      addToHistory(`❌ 模拟失败: ${data.taskId} - ${data.error}`);
      updateBatchResults(data);
    });

    props.pool.on('metrics', (metrics: any) => {
      console.log('📈 Pool metrics updated:', metrics);
    });

    onCleanup(() => {
      clearInterval(statusInterval);
    });
  });

  // 添加操作历史
  const addToHistory = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setOperationHistory(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };

  // 更新批量任务结果
  const updateBatchResults = (data: any) => {
    setBatchResults(prev => {
      const existing = prev.find(r => r.batchId === data.batchId);
      if (existing) {
        // 更新现有结果
        const updated = {
          ...existing,
          completed: existing.completed + 1,
          successRate: ((existing.successRate * (existing.completed - 1) + (data.success ? 100 : 0)) / existing.completed),
          avgProcessingTime: ((existing.avgProcessingTime * (existing.completed - 1) + (data.processingTime || 0)) / existing.completed),
          errors: data.success ? existing.errors : [...existing.errors, data.error || 'Unknown error']
        };
        
        // 如果批次完成，设置结束时间
        if (updated.completed >= updated.total) {
          updated.endTime = Date.now();
          setIsExecutingBatch(false);
          addToHistory(`🎉 批量模拟完成: ${updated.batchId} (${updated.total}个)`);
        }
        
        return prev.map(r => r.batchId === data.batchId ? updated : r);
      } else {
        // 添加新结果
        return [...prev, {
          batchId: data.batchId || `batch_${Date.now()}`,
          completed: 1,
          total: data.total || 1,
          successRate: data.success ? 100 : 0,
          avgProcessingTime: data.processingTime || 0,
          errors: data.success ? [] : [data.error || 'Unknown error'],
          startTime: Date.now()
        }];
      }
    });
  };

  // 启动批量模拟
  const startBatchSimulation = async () => {
    const config = batchConfig();
    const batchId = `batch_${Date.now()}`;
    
    try {
      setIsExecutingBatch(true);
      addToHistory(`🚀 启动批量模拟: ${config.batchSize}个任务 (${config.priority}优先级)`);
      
      // 创建基础模板数据，避免重复创建相同数据
      const baseSimulatorTemplate = {
        id: "test-simulator-template",
        name: "批量测试模拟器模板",
        details: "用于批量模式测试的模拟器数据模板",
        statisticId: "test-statistic-template",
        updatedByAccountId: null,
        createdByAccountId: null,
        statistic: {
          id: "test-statistic-template",
          updatedAt: new Date(),
          createdAt: new Date(),
          usageTimestamps: [],
          viewTimestamps: [],
        },
        campA: [
          {
            id: "team-a-template",
            name: "测试队伍A",
            gems: [],
            members: [
              {
                id: "player-a-template",
                name: "测试玩家A",
                sequence: 0,
                type: "player",
                playerId: "test-player-a",
                partnerId: null,
                mercenaryId: null,
                mobId: null,
                mobDifficultyFlag: "normal",
                actions: [],
                teamId: "team-a-template",
              }
            ]
          }
        ],
        campB: [
          {
            id: "team-b-template",
            name: "测试队伍B",
            gems: [],
            members: [
              {
                id: "enemy-b-template",
                name: "测试敌人B",
                sequence: 0,
                type: "mob",
                playerId: null,
                partnerId: null,
                mercenaryId: null,
                mobId: "test-mob-b",
                mobDifficultyFlag: "normal",
                actions: [],
                teamId: "team-b-template",
              }
            ]
          }
        ]
      };

      // 批量创建任务，使用浅拷贝提高性能
      const tasks = Array.from({ length: config.batchSize }, (_, i) => {
        // 使用对象展开和最小化的修改来创建唯一任务
        const taskData = {
          ...baseSimulatorTemplate,
          id: `test-simulator-batch-${i}`,
          name: `批量测试模拟器 ${i + 1}`,
          statisticId: `test-statistic-batch-${i}`,
          statistic: {
            ...baseSimulatorTemplate.statistic,
            id: `test-statistic-batch-${i}`
          }
        };

        return {
          type: 'start_simulation' as const,
          payload: taskData as any,
          priority: config.priority
        };
      });

      // 记录批次开始
      setBatchResults(prev => [...prev, {
        batchId,
        completed: 0,
        total: config.batchSize,
        successRate: 0,
        avgProcessingTime: 0,
        errors: [],
        startTime: Date.now()
      }]);

      // 执行批量任务
      const results = await props.pool.executeBatch(tasks);
      
      // 更新最终结果
      setBatchResults(prev => prev.map(r => 
        r.batchId === batchId 
          ? { ...r, completed: results.length, endTime: Date.now() }
          : r
      ));
      
      addToHistory(`✅ 批量模拟调度完成: ${results.length}个任务已提交`);
      
    } catch (error: any) {
      addToHistory(`❌ 批量模拟失败: ${error.message}`);
      console.error('批量模拟执行错误:', error);
    } finally {
      // 确保状态正确重置
      setIsExecutingBatch(false);
    }
  };

  // 清理结果数据
  const clearResults = () => {
    setBatchResults([]);
    setOperationHistory([]);
    addToHistory('🧹 清理历史数据');
  };

  // 更新批量配置
  const updateBatchSize = (size: number) => {
    setBatchConfig(prev => ({ ...prev, batchSize: Math.max(1, Math.min(1000, size)) }));
  };

  const updatePriority = (priority: 'high' | 'medium' | 'low') => {
    setBatchConfig(prev => ({ ...prev, priority }));
  };

  return (
    <div class="space-y-6">
      {/* 批量模拟控制面板 */}
      <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
        <h2 class="mb-4 text-xl font-bold text-gray-900 dark:text-white">
          📊 批量模拟控制器
        </h2>
        
        <Show 
          when={props.isSimulationActive}
          fallback={
            <div class="rounded-lg bg-gray-50 p-4 text-center dark:bg-gray-700">
              <p class="text-gray-600 dark:text-gray-400">
                请先启动批量模拟以使用批量计算功能
              </p>
            </div>
          }
        >
          {/* Worker池状态 */}
          <div class="mb-6">
            <h3 class="mb-3 font-semibold text-gray-900 dark:text-white">Worker池状态</h3>
            <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div class="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                <p class="text-xs text-blue-600 dark:text-blue-400">活跃Workers</p>
                <p class="text-lg font-bold text-blue-700 dark:text-blue-300">
                  {poolMetrics().activeWorkers}/{poolMetrics().totalWorkers}
                </p>
              </div>
              <div class="rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
                <p class="text-xs text-green-600 dark:text-green-400">队列等待</p>
                <p class="text-lg font-bold text-green-700 dark:text-green-300">
                  {poolMetrics().queueLength}
                </p>
              </div>
              <div class="rounded-lg bg-yellow-50 p-3 dark:bg-yellow-900/20">
                <p class="text-xs text-yellow-600 dark:text-yellow-400">正在处理</p>
                <p class="text-lg font-bold text-yellow-700 dark:text-yellow-300">
                  {poolMetrics().pendingTasks}
                </p>
              </div>
              
              {/* 批量执行状态显示 */}
              <Show when={poolMetrics().batchExecution?.isExecuting} fallback={
                <div class="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                  <p class="text-xs text-blue-600 dark:text-blue-400">当前批次</p>
                  <p class="text-lg font-bold text-blue-700 dark:text-blue-300">
                    {poolMetrics().queueLength + poolMetrics().pendingTasks}
                  </p>
                </div>
              }>
                <div class="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                  <p class="text-xs text-blue-600 dark:text-blue-400">
                    批次进度 ({poolMetrics().batchExecution?.currentBatchIndex}/{poolMetrics().batchExecution?.totalBatches})
                  </p>
                  <p class="text-lg font-bold text-blue-700 dark:text-blue-300">
                    {poolMetrics().batchExecution?.completedTasks}/{poolMetrics().batchExecution?.totalTasks}
                  </p>
                  <div class="mt-1 h-1 bg-blue-200 rounded-full dark:bg-blue-800">
                    <div 
                      class="h-1 bg-blue-500 rounded-full transition-all duration-300"
                      style={{ width: `${poolMetrics().batchExecution?.progress || 0}%` }}
                    ></div>
                  </div>
                </div>
              </Show>
              
              <div class="rounded-lg bg-purple-50 p-3 dark:bg-purple-900/20">
                <p class="text-xs text-purple-600 dark:text-purple-400">历史完成</p>
                <p class="text-lg font-bold text-purple-700 dark:text-purple-300">
                  {poolMetrics().workerMetrics.reduce((sum, w) => sum + w.tasksCompleted, 0)}
                </p>
              </div>
            </div>
          </div>

          {/* 批量配置 */}
          <div class="mb-6">
            <h3 class="mb-3 font-semibold text-gray-900 dark:text-white">批量模拟配置</h3>
            <div class="rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                
                {/* 批量大小 */}
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    批量大小
                  </label>
                  <input
                    type="number"
                    value={batchConfig().batchSize}
                    onInput={(e) => updateBatchSize(parseInt(e.target.value) || 50)}
                    class="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                    min="1"
                    max="1000"
                  />
                  <p class="mt-1 text-xs text-gray-500">1-1000个模拟任务</p>
                </div>

                {/* 优先级 */}
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    任务优先级
                  </label>
                  <select
                    value={batchConfig().priority}
                    onChange={(e) => updatePriority(e.target.value as any)}
                    class="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  >
                    <option value="high">高优先级</option>
                    <option value="medium">中优先级</option>
                    <option value="low">低优先级</option>
                  </select>
                </div>

                {/* 描述 */}
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    描述信息
                  </label>
                  <input
                    type="text"
                    value={batchConfig().description || ''}
                    onInput={(e) => setBatchConfig(prev => ({ ...prev, description: e.target.value }))}
                    class="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                    placeholder="可选描述..."
                  />
                </div>
              </div>

              <div class="mt-4 flex space-x-3">
                <Button
                  onClick={startBatchSimulation}
                  disabled={isExecutingBatch() || poolMetrics().queueLength > 100}
                  class="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
                >
                  {isExecutingBatch() ? '🔄 执行中...' : '🚀 启动批量模拟'}
                </Button>
                <Button
                  onClick={clearResults}
                  class="rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600"
                >
                  🧹 清理结果
                </Button>
              </div>
            </div>
          </div>
        </Show>
      </div>

      {/* 批量结果统计 */}
      <Show when={batchResults().length > 0}>
        <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <h3 class="mb-4 font-semibold text-gray-900 dark:text-white">批量模拟结果</h3>
          <div class="space-y-3">
            <For each={batchResults()}>
              {(result) => (
                <div class="rounded-lg border bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700">
                  <div class="flex items-center justify-between mb-2">
                    <div>
                      <h4 class="font-medium text-gray-900 dark:text-white">
                        批次 {result.batchId}
                        {result.endTime && (
                          <span class="ml-2 text-xs text-green-600">已完成</span>
                        )}
                      </h4>
                      <p class="text-sm text-gray-600 dark:text-gray-400">
                        进度: {result.completed}/{result.total} | 
                        成功率: {result.successRate.toFixed(1)}% | 
                        平均用时: {result.avgProcessingTime.toFixed(0)}ms
                      </p>
                      {result.endTime && (
                        <p class="text-xs text-gray-500">
                          总耗时: {((result.endTime - result.startTime) / 1000).toFixed(1)}秒
                        </p>
                      )}
                    </div>
                    <div class="text-right">
                      <div class="h-2 w-32 rounded-full bg-gray-200 dark:bg-gray-600">
                        <div 
                          class="h-2 rounded-full bg-blue-500 transition-all duration-300"
                          style={{ width: `${(result.completed / result.total) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* 错误信息 */}
                  <Show when={result.errors.length > 0}>
                    <div class="mt-2 text-xs text-red-600 dark:text-red-400">
                      错误: {result.errors.slice(0, 3).join(', ')}
                      {result.errors.length > 3 && ` (还有${result.errors.length - 3}个)`}
                    </div>
                  </Show>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>

      {/* 操作历史 */}
      <Show when={operationHistory().length > 0}>
        <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <h3 class="mb-4 font-semibold text-gray-900 dark:text-white">操作历史</h3>
          <div class="max-h-40 overflow-y-auto rounded border bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-700">
            <For each={operationHistory()}>
              {(entry) => (
                <div class="text-xs text-gray-600 dark:text-gray-400 font-mono border-b border-gray-200 dark:border-gray-600 pb-1 mb-1 last:border-b-0">
                  {entry}
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>
    </div>
  );
} 