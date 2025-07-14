import { createSignal, createEffect, Show, onCleanup } from "solid-js";
import { Motion } from "solid-motionone";
import { Button } from "~/components/controls/button";
import { EnhancedSimulatorPool } from "~/components/module/simulator/SimulatorPool";
import { PlayerController } from "~/components/module/simulator/PlayerController";
import { RealtimePlayerController } from "~/components/module/simulator/RealtimePlayerController";
import { 
  RealtimeSimulatorManager, 
  RealtimeSimulatorState, 
  PauseReason,
  type RealtimeCallbacks,
  type PauseInfo
} from "~/components/module/simulator/RealtimeSimulatorManager";
import { store } from "~/store";

/**
 * 模拟器运行模式枚举
 */
export const enum SimulatorMode {
  /** 固定流程模式 - 批量计算，多Worker并行 */
  BATCH = "batch",
  /** 实时操作模式 - 单Worker，支持玩家交互和暂停 */
  REALTIME = "realtime",
}

/**
 * 模式选择器组件
 */
function ModeSelector(props: {
  selectedMode: SimulatorMode | null;
  onModeSelect: (mode: SimulatorMode) => void;
  disabled?: boolean;
}) {
  return (
    <div class="mx-auto max-w-4xl">
      <div class="mb-8 text-center">
        <h1 class="mb-4 text-3xl font-bold text-gray-900 dark:text-white">战斗模拟器</h1>
        <p class="mb-8 text-gray-600 dark:text-gray-400">选择模拟器运行模式以开始战斗计算或实时交互</p>
      </div>

      <div class="grid gap-6 md:grid-cols-2">
        {/* 固定流程模式 */}
        <Motion.div
          animate={{
            scale: props.selectedMode === SimulatorMode.BATCH ? [1, 1.02] : [1.02, 1],
            opacity: [0, 1],
          }}
          transition={{
            duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0,
          }}
          class="opacity-0"
        >
          <div
            class={`relative cursor-pointer overflow-hidden rounded-xl border-2 p-6 transition-all duration-300 ${
              props.selectedMode === SimulatorMode.BATCH
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
            } `}
            onClick={() => !props.disabled && props.onModeSelect(SimulatorMode.BATCH)}
          >
            <div class="text-center">
              <div class="mb-4 text-4xl">⚡</div>
              <h3 class="mb-2 text-xl font-semibold text-gray-900 dark:text-white">固定流程模式</h3>
              <p class="mb-4 text-gray-600 dark:text-gray-400">高性能批量计算，适合装备对比和DPS统计</p>

              <div class="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <div class="flex items-center justify-center space-x-2">
                  <span>🔄</span>
                  <span>多Worker并行计算</span>
                </div>
                <div class="flex items-center justify-center space-x-2">
                  <span>📊</span>
                  <span>最终结果输出</span>
                </div>
                <div class="flex items-center justify-center space-x-2">
                  <span>⚡</span>
                  <span>最高性能表现</span>
                </div>
              </div>
            </div>

            {props.selectedMode === SimulatorMode.BATCH && (
              <div class="pointer-events-none absolute inset-0 rounded-xl border-2 border-blue-500 opacity-50"></div>
            )}
          </div>
        </Motion.div>

        {/* 实时操作模式 */}
        <Motion.div
          animate={{
            scale: props.selectedMode === SimulatorMode.REALTIME ? [1, 1.02] : [1.02, 1],
            opacity: [0, 1],
          }}
          transition={{
            duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0,
            delay: 0.1,
          }}
          class="opacity-0"
        >
          <div
            class={`relative cursor-pointer overflow-hidden rounded-xl border-2 p-6 transition-all duration-300 ${
              props.selectedMode === SimulatorMode.REALTIME
                ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
            } `}
            onClick={() => !props.disabled && props.onModeSelect(SimulatorMode.REALTIME)}
          >
            <div class="text-center">
              <div class="mb-4 text-4xl">🎮</div>
              <h3 class="mb-2 text-xl font-semibold text-gray-900 dark:text-white">实时操作模式</h3>
              <p class="mb-4 text-gray-600 dark:text-gray-400">交互式战斗模拟，支持实时控制和策略验证</p>

              <div class="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <div class="flex items-center justify-center space-x-2">
                  <span>🎯</span>
                  <span>实时玩家控制</span>
                </div>
                <div class="flex items-center justify-center space-x-2">
                  <span>⏸️</span>
                  <span>智能暂停等待</span>
                </div>
                <div class="flex items-center justify-center space-x-2">
                  <span>📈</span>
                  <span>逐帧数据输出</span>
                </div>
              </div>
            </div>

            {props.selectedMode === SimulatorMode.REALTIME && (
              <div class="pointer-events-none absolute inset-0 rounded-xl border-2 border-green-500 opacity-50"></div>
            )}
          </div>
        </Motion.div>
      </div>

      <Show when={props.selectedMode}>
        <Motion.div
          animate={{ opacity: [0, 1], y: [20, 0] }}
          transition={{
            duration: store.settings.userInterface.isAnimationEnabled ? 0.4 : 0,
            delay: 0.2,
          }}
          class="mt-8 text-center opacity-0"
        >
          <Button
            onClick={() => {
              // 这里将触发模式启动逻辑
              console.log(`启动${props.selectedMode}模式`);
            }}
            disabled={props.disabled}
            class="rounded-lg bg-gradient-to-r from-blue-600 to-green-600 px-8 py-3 font-medium text-white transition-all duration-300 hover:from-blue-700 hover:to-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            启动 {props.selectedMode === SimulatorMode.BATCH ? "批量计算" : "实时模拟"}
          </Button>
        </Motion.div>
      </Show>
    </div>
  );
}

/**
 * 模拟器主页面组件
 */
export default function SimulatorPage() {
  const [selectedMode, setSelectedMode] = createSignal<SimulatorMode | null>(null);
  const [isInitializing, setIsInitializing] = createSignal(false);
  const [pool, setPool] = createSignal<EnhancedSimulatorPool | null>(null);
  const [realtimeManager, setRealtimeManager] = createSignal<RealtimeSimulatorManager | null>(null);
  const [realtimeState, setRealtimeState] = createSignal<RealtimeSimulatorState>(RealtimeSimulatorState.IDLE);
  const [error, setError] = createSignal<string | null>(null);
  
  // 批量计算模式的状态
  const [isSimulationActive, setIsSimulationActive] = createSignal(false);

  // 模式选择处理器
  const handleModeSelect = async (mode: SimulatorMode) => {
    setSelectedMode(mode);
    setError(null);

    // 根据模式进行不同的初始化
    if (mode === SimulatorMode.BATCH) {
      await initializeBatchMode();
    } else if (mode === SimulatorMode.REALTIME) {
      await initializeRealtimeMode();
    }
  };

  // 初始化批量计算模式
  const initializeBatchMode = async () => {
    setIsInitializing(true);

    try {
      console.log("初始化批量计算模式...");

      // 创建Worker池
      const newPool = new EnhancedSimulatorPool({
        maxWorkers: Math.min(navigator.hardwareConcurrency || 4, 8),
        idleTimeout: 5 * 60 * 1000,
        taskTimeout: 60 * 1000,
        maxRetries: 3,
        maxQueueSize: 1000,
        monitorInterval: 2000,
        enableBatching: true,
        batchSize: 4,
        batchDelay: 16,
      });

      setPool(newPool);
      setIsSimulationActive(true); // 设置批量模拟为活跃状态
      console.log("批量计算模式初始化完成");
    } catch (err: any) {
      console.error("批量计算模式初始化失败:", err);
      setError(err.message || "初始化失败");
      setSelectedMode(null);
    } finally {
      setIsInitializing(false);
    }
  };

  // 初始化实时操作模式
  const initializeRealtimeMode = async () => {
    setIsInitializing(true);

    try {
      console.log("初始化实时操作模式...");

      // 创建增强的实时模拟器回调配置
      const callbacks: RealtimeCallbacks = {
        onFrameUpdate: (data) => {
          console.log(`🎬 实时帧更新: Frame ${data.frame}`);
          // 帧更新将由RealtimePlayerController处理
        },
        
        onStateChange: (state, data) => {
          console.log(`🔄 实时状态变更: ${state}`, data);
          setRealtimeState(state);
        },
        
        onPlayerActionResult: (result) => {
          console.log(`🎮 玩家操作结果:`, result);
          // 操作结果将由RealtimePlayerController处理
        },
        
        onError: (error) => {
          console.error('❌ 实时模拟器错误:', error);
          setError(error);
        },
        
        onPauseRequest: (reason: PauseReason, pauseInfo: PauseInfo) => {
          console.log(`⏸️ 模拟器请求暂停: ${reason}`, pauseInfo);
          // 暂停请求将由RealtimePlayerController处理
        },
        
        onAutoResumeCountdown: (remainingTime: number, pauseInfo: PauseInfo) => {
          console.log(`🕒 自动恢复倒计时: ${remainingTime}ms`, pauseInfo);
          // 倒计时将由RealtimePlayerController处理
        },
        
        onPlayerIdleDetected: (playerId: string, idleTime: number) => {
          console.log(`😴 检测到玩家空闲: ${playerId}, ${idleTime}ms`);
          // 空闲检测将由RealtimePlayerController处理
        }
      };

      // 配置暂停/恢复参数
      const pauseResumeConfig = {
        playerIdleThreshold: 30000,     // 30秒空闲阈值
        autoResumeDelay: 3000,          // 3秒自动恢复延迟
        enableAutoResume: true,         // 启用自动恢复
        enableIdleDetection: true,      // 启用空闲检测
        idleCheckInterval: 5000,        // 5秒检测间隔
      };

      // 创建单Worker实时管理器
      const newManager = new RealtimeSimulatorManager(callbacks, pauseResumeConfig);
      
      // 创建测试数据用于实时模式
      const testSimulatorData = {
        id: "test-simulator-1",
        name: "测试模拟器",
        details: "用于测试实时模式的模拟器数据",
        statisticId: "test-statistic-1",
        updatedByAccountId: null,
        createdByAccountId: null,
        statistic: {
          id: "test-statistic-1",
          updatedAt: new Date(),
          createdAt: new Date(),
          usageTimestamps: [],
          viewTimestamps: [],
        },
        campA: [
          {
            id: "team-a-1",
            name: "玩家队伍",
            members: [
              {
                id: "player-1",
                name: "测试玩家1",
                sequence: 0,
                type: "player",
                playerId: "test-player-1",
                partnerId: null,
                mercenaryId: null,
                mobId: null,
                teamId: "team-a-1",
                weaponType: "sword",
                subWeaponType: "none",
                bodyArmorType: "light",
                // 状态相关字段会在Worker中初始化
              },
              {
                id: "player-2", 
                name: "测试玩家2",
                sequence: 1,
                type: "player",
                playerId: "test-player-2",
                partnerId: null,
                mercenaryId: null,
                mobId: null,
                teamId: "team-a-1",
                weaponType: "magic",
                subWeaponType: "none",
                bodyArmorType: "light",
              }
            ]
          }
        ],
        campB: [
          {
            id: "team-b-1",
            name: "敌方队伍", 
            members: [
              {
                id: "enemy-1",
                name: "测试敌人1",
                sequence: 0,
                type: "mob",
                playerId: null,
                partnerId: null,
                mercenaryId: null,
                mobId: "test-mob-1",
                teamId: "team-b-1",
                weaponType: "claw",
                subWeaponType: "none",
                bodyArmorType: "none",
              }
            ]
          }
        ]
      };
      
      // 初始化manager并传入测试数据
      await newManager.initialize(testSimulatorData as any);
      
      setRealtimeManager(newManager);
      
      console.log("✅ 实时操作模式初始化完成");
      
    } catch (err: any) {
      console.error("❌ 实时操作模式初始化失败:", err);
      setError(err.message || "初始化失败");
      setSelectedMode(null);
    } finally {
      setIsInitializing(false);
    }
  };

  // 重置选择
  const resetSelection = async () => {
    // 清理现有资源
    const currentPool = pool();
    const currentManager = realtimeManager();
    
    if (currentPool) {
      await currentPool.shutdown();
    }
    
    if (currentManager) {
      await currentManager.destroy();
    }
    
    setSelectedMode(null);
    setPool(null);
    setRealtimeManager(null);
    setRealtimeState(RealtimeSimulatorState.IDLE);
    setError(null);
    
    // 重置批量计算模式状态
    setIsSimulationActive(false);
  };

  // 批量模拟相关的控制现在完全由PlayerController组件处理

  // 清理资源
  onCleanup(async () => {
    const currentPool = pool();
    const currentManager = realtimeManager();
    
    if (currentPool) {
      await currentPool.shutdown();
      console.log("Worker池已清理");
    }
    
    if (currentManager) {
      await currentManager.destroy();
      console.log("实时管理器已清理");
    }
  });

  return (
    <Motion.div
      animate={{ opacity: [0, 1] }}
      transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.7 : 0 }}
      class="Client relative flex h-full w-full flex-col justify-between p-6 opacity-0"
    >
      <Show
        when={!pool() && !realtimeManager()}
        fallback={
          <div>
            {/* 显示对应模式的界面 */}
            <div class="mb-6 flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedMode() === SimulatorMode.BATCH ? "批量计算模式" : "实时操作模式"}
                </h2>
                <Show when={selectedMode() === SimulatorMode.REALTIME}>
                  <div class={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    realtimeState() === RealtimeSimulatorState.RUNNING 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : realtimeState() === RealtimeSimulatorState.WAITING_FOR_INPUT ||
                        realtimeState() === RealtimeSimulatorState.PAUSED ||
                        realtimeState() === RealtimeSimulatorState.AUTO_PAUSED
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      : realtimeState() === RealtimeSimulatorState.ERROR
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                  }`}>
                    {realtimeState() === RealtimeSimulatorState.RUNNING && '🟢'}
                    {(realtimeState() === RealtimeSimulatorState.WAITING_FOR_INPUT ||
                      realtimeState() === RealtimeSimulatorState.PAUSED ||
                      realtimeState() === RealtimeSimulatorState.AUTO_PAUSED) && '⏸️'}
                    {realtimeState() === RealtimeSimulatorState.ERROR && '❌'}
                    {realtimeState() === RealtimeSimulatorState.IDLE && '💤'}
                    {realtimeState() === RealtimeSimulatorState.INITIALIZING && '🔄'}
                    {realtimeState() === RealtimeSimulatorState.DESTROYED && '💥'}
                    <span class="ml-1">{realtimeState()}</span>
                  </div>
                </Show>
              </div>
              <Button onClick={resetSelection} class="text-sm">
                返回模式选择
              </Button>
            </div>

            <Show when={selectedMode() === SimulatorMode.REALTIME && realtimeManager()}>
              {/* 实时模式界面 - 使用RealtimePlayerController */}
              <RealtimePlayerController manager={realtimeManager()!} />
            </Show>

            <Show when={selectedMode() === SimulatorMode.BATCH && pool()}>
              {/* 批量计算模式界面 */}
              <div class="space-y-6">
                {/* 批量模拟状态概览 */}
                <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
                  <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                    ⚡ 批量模拟状态概览
                  </h3>

                  {/* 模拟状态显示 */}
                  <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div class="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
                      <p class="text-sm text-gray-600 dark:text-gray-400">Worker池状态</p>
                      <p class="font-medium text-gray-900 dark:text-white">
                        {pool()?.getStatus().activeWorkers || 0}/{pool()?.getStatus().totalWorkers || 0} Workers
                      </p>
                    </div>
                    
                    <div class="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
                      <p class="text-sm text-gray-600 dark:text-gray-400">模拟状态</p>
                      <p class={`font-medium ${
                        isSimulationActive() 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {isSimulationActive() ? '🟢 运行中' : '⭕ 空闲'}
                      </p>
                    </div>
                    
                    <div class="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
                      <p class="text-sm text-gray-600 dark:text-gray-400">队列长度</p>
                      <p class="font-medium text-gray-900 dark:text-white">
                        {pool()?.getStatus().queueLength || 0}
                      </p>
                    </div>
                  </div>

                  {/* 批量模拟功能说明 */}
                  <div class="mt-4 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                    <h4 class="mb-2 font-medium text-blue-900 dark:text-blue-200">
                      📋 批量计算模式特性
                    </h4>
                    <ul class="space-y-1 text-sm text-blue-700 dark:text-blue-300">
                      <li>• 🔄 多Worker并行处理，最大化计算性能</li>
                      <li>• 📊 适合大量数据对比和统计分析</li>
                      <li>• ⚡ 批量任务队列管理和负载均衡</li>
                      <li>• 📈 实时进度监控和结果汇总</li>
                    </ul>
                  </div>
                </div>

                {/* 集成PlayerController */}
                <PlayerController 
                  pool={pool()!} 
                  isSimulationActive={isSimulationActive()}
                />
              </div>
            </Show>
          </div>
        }
      >
        <div>
          {/* 错误显示 */}
          <Show when={error()}>
            <Motion.div
              animate={{ opacity: [0, 1], scale: [0.95, 1] }}
              transition={{ duration: 0.3 }}
              class="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-700 dark:bg-red-900 dark:text-red-300"
            >
              <h3 class="mb-2 font-medium">初始化失败</h3>
              <p class="text-sm">{error()}</p>
              <Button onClick={resetSelection} class="mt-3 text-sm">
                重试
              </Button>
            </Motion.div>
          </Show>

          {/* 初始化加载状态 */}
          <Show when={isInitializing()}>
            <Motion.div animate={{ opacity: [0, 1] }} transition={{ duration: 0.3 }} class="py-12 text-center">
              <div class="mb-4">
                <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-r-transparent"></div>
              </div>
              <h3 class="mb-2 text-lg font-medium text-gray-900 dark:text-white">
                正在初始化 {selectedMode() === SimulatorMode.BATCH ? "批量计算" : "实时操作"}模式
              </h3>
              <p class="text-gray-600 dark:text-gray-400">
                {selectedMode() === SimulatorMode.BATCH ? "正在创建Worker池..." : "正在启动实时引擎..."}
              </p>
            </Motion.div>
          </Show>

          {/* 模式选择器 */}
          <Show when={!isInitializing()}>
            <ModeSelector selectedMode={selectedMode()} onModeSelect={handleModeSelect} disabled={isInitializing()} />
          </Show>
        </div>
      </Show>
    </Motion.div>
  );
}
