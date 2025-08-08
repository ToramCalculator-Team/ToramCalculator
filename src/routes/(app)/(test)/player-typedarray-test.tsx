import { Component, createSignal, createResource, Show, createEffect, on } from "solid-js";
import { findMemberWithRelations } from "@db/repositories/member";
import { findSimulatorWithRelations } from "@db/repositories/simulator";
import { realtimeSimulatorPool } from "~/components/features/simulator/core/thread/SimulatorPool";

const PlayerTypedArrayTest: Component = () => {
  const [consoleOutput, setConsoleOutput] = createSignal<string[]>([]);
  const [isRunning, setIsRunning] = createSignal(false);
  const [poolStatus, setPoolStatus] = createSignal<any>(null);

  // 预加载数据库数据
  const [memberData] = createResource(() => findMemberWithRelations("defaultMember1Id"));
  const [simulatorData] = createResource(() => findSimulatorWithRelations("defaultSimulatorId"));

  // 捕获控制台输出
  let originalConsoleLog = console.log;
  let originalConsoleWarn = console.warn;
  let originalConsoleError = console.error;

  const captureConsole = () => {
    console.log = (...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      setConsoleOutput(prev => [message, ...prev.slice(0, 99)]);
      originalConsoleLog(...args);
    };

    console.warn = (...args: any[]) => {
      const message = `⚠️ ${args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ')}`;
      setConsoleOutput(prev => [message, ...prev.slice(0, 99)]);
      originalConsoleWarn(...args);
    };

    console.error = (...args: any[]) => {
      const message = `❌ ${args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ')}`;
      setConsoleOutput(prev => [message, ...prev.slice(0, 99)]);
      originalConsoleError(...args);
    };
  };

  const restoreConsole = () => {
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  };

  // 监听池状态变化
  createEffect(() => {
    const interval = setInterval(() => {
      if (realtimeSimulatorPool.isReady()) {
        setPoolStatus(realtimeSimulatorPool.getStatus());
      }
    }, 1000);

    return () => clearInterval(interval);
  });

  const runPerformanceTest = async () => {
    if (isRunning()) return;
    
    setIsRunning(true);
    captureConsole();

    try {
      console.log("🚀 开始TypedArray性能测试 (Worker模式)");

      // 等待池准备就绪
      if (!realtimeSimulatorPool.isReady()) {
        console.log("⏳ 等待SimulatorPool准备就绪...");
        await new Promise(resolve => {
          const checkReady = () => {
            if (realtimeSimulatorPool.isReady()) {
              resolve(true);
            } else {
              setTimeout(checkReady, 100);
            }
          };
          checkReady();
        });
      }

      console.log("✅ SimulatorPool已准备就绪");

      // 启动模拟
      const simulator = simulatorData();
      if (!simulator) {
        throw new Error("模拟器数据未加载");
      }

      console.log("🎮 启动战斗模拟...");
      const startResult = await realtimeSimulatorPool.startSimulation(simulator);
      if (!startResult.success) {
        throw new Error(`启动模拟失败: ${startResult.error}`);
      }

      console.log("✅ 战斗模拟启动成功");

      // 等待引擎初始化
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 获取初始成员数据
      console.log("📊 获取初始成员数据...");
      const initialMembers = await realtimeSimulatorPool.getMembers();
      console.log(`📊 初始成员数量: ${initialMembers.length}`);

      if (initialMembers.length === 0) {
        throw new Error("没有找到成员数据");
      }

      // 执行所有测试，但不立即输出结果
      let addModifierTime = 0;
      let removeModifierTime = 0;
      let getMembersTime = 0;
      let successCount = 0;
      let errorCount = 0;

      // 测试修饰符操作性能 - 批量添加
      const addStartTime = performance.now();
      for (let i = 0; i < 1000; i++) {
        const intent = {
          id: `add_modifier_${i}`,
          type: "add_modifier" as const,
          targetMemberId: initialMembers[0].id,
          timestamp: Date.now(),
          data: {
            attributePath: "ability.str",
            modifierType: "staticFixed",
            value: i,
            source: {
              id: `test${i}`,
              name: `test${i}`,
              type: "system" as const,
            }
          }
        };

        const result = await realtimeSimulatorPool.sendIntent(intent);
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
        }
      }
      addModifierTime = performance.now() - addStartTime;

      // 测试修饰符批量移除性能
      const removeStartTime = performance.now();
      for (let i = 0; i < 1000; i++) {
        const intent = {
          id: `remove_modifier_${i}`,
          type: "remove_modifier" as const,
          targetMemberId: initialMembers[0].id,
          timestamp: Date.now(),
          data: {
            attributePath: "ability.str",
            modifierType: "staticFixed",
            sourceId: `test${i}`
          }
        };

        const result = await realtimeSimulatorPool.sendIntent(intent);
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
        }
      }
      removeModifierTime = performance.now() - removeStartTime;

      // 测试批量属性获取性能
      const getMembersStartTime = performance.now();
      for (let i = 0; i < 1000; i++) {
        const members = await realtimeSimulatorPool.getMembers();
        if (members.length === 0) {
          throw new Error("获取成员数据失败");
        }
      }
      getMembersTime = performance.now() - getMembersStartTime;

      // 获取引擎统计信息
      const statsResult = await realtimeSimulatorPool.getEngineStats();
      const finalMembers = await realtimeSimulatorPool.getMembers();

      // ==================== 性能评估报告 ====================
      console.log("\n" + "=".repeat(60));
      console.log("🎯 TYPEDARRAY WORKER 性能测试报告");
      console.log("=".repeat(60));
      
      console.log(`📊 修饰符批量添加性能: ${addModifierTime.toFixed(2)}ms (1000次操作)`);
      console.log(`📊 修饰符批量移除性能: ${removeModifierTime.toFixed(2)}ms (1000次操作)`);
      console.log(`📊 批量属性获取性能: ${getMembersTime.toFixed(2)}ms (1000次操作)`);
      
      console.log(`\n📈 详细性能指标:`);
      console.log(`   • 添加修饰符: ${(addModifierTime / 1000).toFixed(3)}ms/次`);
      console.log(`   • 移除修饰符: ${(removeModifierTime / 1000).toFixed(3)}ms/次`);
      console.log(`   • 获取成员: ${(getMembersTime / 1000).toFixed(3)}ms/次`);
      
      console.log(`\n✅ 操作统计:`);
      console.log(`   • 成功操作: ${successCount} 次`);
      console.log(`   • 失败操作: ${errorCount} 次`);
      console.log(`   • 成功率: ${((successCount / (successCount + errorCount)) * 100).toFixed(1)}%`);
      
      console.log(`\n💾 系统状态:`);
      console.log(`   • 最终成员数量: ${finalMembers.length}`);
      if (statsResult.success && statsResult.data) {
        console.log(`   • 引擎统计:`, statsResult.data);
      }
      
      console.log("\n" + "=".repeat(60));
      console.log("✅ 性能测试完成");
      console.log("=".repeat(60) + "\n");

    } catch (error) {
      console.error("❌ 性能测试失败:", error);
    } finally {
      // 停止模拟
      try {
        await realtimeSimulatorPool.stopSimulation();
        console.log("🛑 模拟已停止");
      } catch (error) {
        console.error("停止模拟失败:", error);
      }

      restoreConsole();
      setIsRunning(false);
    }
  };

  const clearConsole = () => {
    setConsoleOutput([]);
  };

  return (
    <div class="p-6 max-w-6xl mx-auto">
      <div class="bg-white rounded-lg shadow-lg p-6">
        <h1 class="text-2xl font-bold mb-6">TypedArray性能测试 (Worker模式)</h1>
        
        {/* 控制按钮 */}
        <div class="mb-6 space-x-4">
          <button
            onClick={runPerformanceTest}
            disabled={isRunning()}
            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {isRunning() ? "测试中..." : "开始性能测试"}
          </button>
          
          <button
            onClick={clearConsole}
            class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            清空日志
          </button>
        </div>

        {/* 池状态显示 */}
        <Show when={poolStatus()}>
          <div class="mb-6 p-4 bg-gray-100 rounded">
            <h3 class="font-semibold mb-2">SimulatorPool状态:</h3>
            <pre class="text-sm overflow-auto">
              {JSON.stringify(poolStatus(), null, 2)}
            </pre>
          </div>
        </Show>

        {/* 控制台输出 */}
        <div class="bg-black text-green-400 p-4 rounded font-mono text-sm h-96 overflow-y-auto">
          <Show when={consoleOutput().length > 0} fallback={<span class="text-gray-500">等待测试开始...</span>}>
                         {consoleOutput().map((line, index) => (
               <div class="whitespace-pre-wrap">{line}</div>
             ))}
          </Show>
        </div>
      </div>
    </div>
  );
};

export default PlayerTypedArrayTest;
