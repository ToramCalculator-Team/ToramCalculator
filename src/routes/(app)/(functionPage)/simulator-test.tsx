import { createSignal, onMount, onCleanup } from "solid-js";
import { SimulatorExample } from "~/components/module/simulator/core/SimulatorExample";

/**
 * 模拟器测试页面
 * 用于测试和演示SimulatorExample的功能
 */
export default function SimulatorTestPage() {
  const [simulator, setSimulator] = createSignal<SimulatorExample | null>(null);
  const [isRunning, setIsRunning] = createSignal(false);
  const [systemStatus, setSystemStatus] = createSignal<any>({});
  const [logs, setLogs] = createSignal<string[]>([]);

  // 状态更新定时器
  let statusInterval: number | null = null;

  onMount(() => {
    try {
      // 创建模拟器实例
      const sim = new SimulatorExample();
      setSimulator(sim);
      
      // 启动状态监控
      startStatusMonitoring();
      
      addLog("✅ 模拟器实例创建成功");
    } catch (error) {
      addLog(`❌ 创建模拟器失败: ${error}`);
    }
  });

  onCleanup(() => {
    if (statusInterval) {
      clearInterval(statusInterval);
    }
    
    const sim = simulator();
    if (sim && isRunning()) {
      sim.stop();
    }
  });

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-49), `[${timestamp}] ${message}`]);
  };

  const startStatusMonitoring = () => {
    if (statusInterval) {
      clearInterval(statusInterval);
    }
    
    statusInterval = setInterval(() => {
      const sim = simulator();
      if (sim) {
        try {
          const status = sim.getSystemStatus();
          setSystemStatus(status);
          setIsRunning(status.isRunning);
        } catch (error) {
          addLog(`❌ 获取系统状态失败: ${error}`);
        }
      }
    }, 1000) as unknown as number;
  };

  const handleStart = () => {
    const sim = simulator();
    if (sim) {
      try {
        sim.start();
        addLog("🎮 模拟器启动");
      } catch (error) {
        addLog(`❌ 启动失败: ${error}`);
      }
    }
  };

  const handleStop = () => {
    const sim = simulator();
    if (sim) {
      try {
        sim.stop();
        addLog("⏹️ 模拟器停止");
      } catch (error) {
        addLog(`❌ 停止失败: ${error}`);
      }
    }
  };

  const handlePause = () => {
    const sim = simulator();
    if (sim) {
      try {
        sim.pause();
        addLog("⏸️ 模拟器暂停");
      } catch (error) {
        addLog(`❌ 暂停失败: ${error}`);
      }
    }
  };

  const handleResume = () => {
    const sim = simulator();
    if (sim) {
      try {
        sim.resume();
        addLog("▶️ 模拟器恢复");
      } catch (error) {
        addLog(`❌ 恢复失败: ${error}`);
      }
    }
  };

  const handleSkillCast = () => {
    const sim = simulator();
    if (sim) {
      try {
        sim.simulateSkillCast('player_1', 'fireball', 'monster_1');
        addLog("⚔️ 模拟技能释放: 火球术");
      } catch (error) {
        addLog(`❌ 技能释放失败: ${error}`);
      }
    }
  };

  const handleBuffApplication = () => {
    const sim = simulator();
    if (sim) {
      try {
        sim.simulateBuffApplication('monster_1', 'burn', 5);
        addLog("🔥 模拟Buff应用: 燃烧");
      } catch (error) {
        addLog(`❌ Buff应用失败: ${error}`);
      }
    }
  };

  const handleTimeScaleChange = (scale: number) => {
    const sim = simulator();
    if (sim) {
      try {
        sim.setTimeScale(scale);
        addLog(`⏱️ 时间倍率设置为: ${scale}x`);
      } catch (error) {
        addLog(`❌ 时间倍率设置失败: ${error}`);
      }
    }
  };

  const status = systemStatus();

  return (
    <div class="p-6 max-w-7xl mx-auto">
      <div class="mb-6">
        <h1 class="text-3xl font-bold mb-2">模拟器架构测试</h1>
        <p class="text-gray-600">测试和演示SimulatorExample的核心功能</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 控制面板 */}
        <div class="lg:col-span-1">
          <div class="bg-white rounded-lg shadow-md p-4 mb-4">
            <h2 class="text-xl font-semibold mb-4">控制面板</h2>
            
            <div class="space-y-3">
              <div class="flex gap-2">
                <button
                  onClick={handleStart}
                  disabled={isRunning()}
                  class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                >
                  启动
                </button>
                <button
                  onClick={handleStop}
                  disabled={!isRunning()}
                  class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                >
                  停止
                </button>
              </div>
              
              <div class="flex gap-2">
                <button
                  onClick={handlePause}
                  disabled={!isRunning()}
                  class="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
                >
                  暂停
                </button>
                <button
                  onClick={handleResume}
                  disabled={isRunning()}
                  class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  恢复
                </button>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow-md p-4 mb-4">
            <h2 class="text-xl font-semibold mb-4">模拟操作</h2>
            
            <div class="space-y-3">
              <button
                onClick={handleSkillCast}
                disabled={!isRunning()}
                class="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
              >
                🔥 释放技能
              </button>
              
              <button
                onClick={handleBuffApplication}
                disabled={!isRunning()}
                class="w-full px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
              >
                🔮 应用Buff
              </button>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow-md p-4">
            <h2 class="text-xl font-semibold mb-4">时间控制</h2>
            
            <div class="space-y-3">
              <div class="flex gap-2">
                <button
                  onClick={() => handleTimeScaleChange(0.5)}
                  class="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  0.5x
                </button>
                <button
                  onClick={() => handleTimeScaleChange(1)}
                  class="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  1x
                </button>
                <button
                  onClick={() => handleTimeScaleChange(2)}
                  class="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  2x
                </button>
                <button
                  onClick={() => handleTimeScaleChange(5)}
                  class="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  5x
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 状态显示 */}
        <div class="lg:col-span-2">
          <div class="bg-white rounded-lg shadow-md p-4 mb-4">
            <h2 class="text-xl font-semibold mb-4">系统状态</h2>
            
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <div class="flex justify-between">
                  <span class="font-medium">运行状态:</span>
                  <span class={isRunning() ? "text-green-600" : "text-red-600"}>
                    {isRunning() ? "运行中" : "已停止"}
                  </span>
                </div>
                
                <div class="flex justify-between">
                  <span class="font-medium">当前帧:</span>
                  <span class="text-blue-600">{status.frameNumber || 0}</span>
                </div>
                
                <div class="flex justify-between">
                  <span class="font-medium">帧循环状态:</span>
                  <span class="text-gray-600">{status.frameLoopState || 'unknown'}</span>
                </div>
              </div>
              
              <div class="space-y-2">
                <div class="flex justify-between">
                  <span class="font-medium">事件队列大小:</span>
                  <span class="text-purple-600">{status.eventQueueStats?.currentSize || 0}</span>
                </div>
                
                <div class="flex justify-between">
                  <span class="font-medium">已处理事件:</span>
                  <span class="text-green-600">{status.eventQueueStats?.totalProcessed || 0}</span>
                </div>
                
                <div class="flex justify-between">
                  <span class="font-medium">FSM转换:</span>
                  <span class="text-orange-600">{status.fsmBridgeStats?.successfulTransforms || 0}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow-md p-4">
            <h2 class="text-xl font-semibold mb-4">运行日志</h2>
            
            <div class="bg-gray-900 text-green-400 p-4 rounded-lg h-64 overflow-y-auto font-mono text-sm">
              {logs().length === 0 ? (
                <div class="text-gray-500">等待日志...</div>
              ) : (
                logs().map((log, index) => (
                  <div key={index} class="mb-1">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}