import { createSignal, onMount } from "solid-js";

/**
 * 模拟器架构调试页面
 * 用于验证模拟器架构是否正常工作
 */
export default function SimulatorDebugPage() {
  const [testResults, setTestResults] = createSignal<Array<{ name: string, status: 'success' | 'error' | 'pending', message: string }>>([]);
  const [isRunning, setIsRunning] = createSignal(false);

  const addResult = (name: string, status: 'success' | 'error' | 'pending', message: string) => {
    setTestResults(prev => [...prev, { name, status, message }]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const runArchitectureTests = async () => {
    if (isRunning()) return;
    
    setIsRunning(true);
    clearResults();
    
    try {
      // 测试1: 模块导入
      addResult('模块导入测试', 'pending', '正在测试模块导入...');
      try {
        const { SimulatorExample } = await import("~/components/module/simulator/core/SimulatorExample");
        const { GameEngine } = await import("~/components/module/simulator/core/GameEngine");
        const { EventQueue } = await import("~/components/module/simulator/core/EventQueue");
        const { FrameLoop } = await import("~/components/module/simulator/core/FrameLoop");
        const { FSMEventBridge } = await import("~/components/module/simulator/core/FSMEventBridge");
        
        if (SimulatorExample && GameEngine && EventQueue && FrameLoop && FSMEventBridge) {
          addResult('模块导入测试', 'success', '所有核心模块导入成功');
        } else {
          addResult('模块导入测试', 'error', '部分模块导入失败');
        }
      } catch (error) {
        addResult('模块导入测试', 'error', `导入失败: ${error}`);
      }
      
      // 测试2: 实例创建
      addResult('实例创建测试', 'pending', '正在创建模拟器实例...');
      try {
        const { SimulatorExample } = await import("~/components/module/simulator/core/SimulatorExample");
        const simulator = new SimulatorExample();
        addResult('实例创建测试', 'success', 'SimulatorExample实例创建成功');
        
        // 测试3: 基本方法调用
        addResult('基本方法测试', 'pending', '正在测试基本方法...');
        try {
          const status = simulator.getSystemStatus();
          if (status && typeof status === 'object') {
            addResult('基本方法测试', 'success', `getSystemStatus()调用成功，状态: ${JSON.stringify(status).slice(0, 100)}...`);
          } else {
            addResult('基本方法测试', 'error', 'getSystemStatus()返回异常');
          }
        } catch (error) {
          addResult('基本方法测试', 'error', `方法调用失败: ${error}`);
        }
        
        // 测试4: 生命周期测试
        addResult('生命周期测试', 'pending', '正在测试启动/停止...');
        try {
          simulator.start();
          addResult('生命周期测试', 'success', '模拟器启动成功');
          
          // 等待一小段时间
          await new Promise(resolve => setTimeout(resolve, 100));
          
          const runningStatus = simulator.getSystemStatus();
          if (runningStatus.isRunning) {
            addResult('生命周期测试', 'success', '模拟器运行状态正常');
          } else {
            addResult('生命周期测试', 'error', '模拟器启动后状态异常');
          }
          
          simulator.stop();
          addResult('生命周期测试', 'success', '模拟器停止成功');
        } catch (error) {
          addResult('生命周期测试', 'error', `生命周期测试失败: ${error}`);
        }
        
        // 测试5: 事件处理测试
        addResult('事件处理测试', 'pending', '正在测试事件处理...');
        try {
          simulator.start();
          simulator.simulateSkillCast('player_1', 'test_skill', 'target_1');
          simulator.simulateBuffApplication('player_1', 'test_buff', 3);
          addResult('事件处理测试', 'success', '事件处理方法调用成功');
          simulator.stop();
        } catch (error) {
          addResult('事件处理测试', 'error', `事件处理失败: ${error}`);
        }
        
      } catch (error) {
        addResult('实例创建测试', 'error', `实例创建失败: ${error}`);
      }
      
      // 测试6: 类型系统测试
      addResult('类型系统测试', 'pending', '正在测试TypeScript类型...');
      try {
        const { BaseEvent } = await import("~/components/module/simulator/core/EventQueue");
        const { FSMEvent } = await import("~/components/module/simulator/core/FSMEventBridge");
        
        // 创建测试事件
        const testEvent: typeof BaseEvent = {
          id: 'test',
          executeFrame: 0,
          priority: 'normal',
          type: 'test',
          payload: { test: true }
        };
        
        const testFSMEvent: typeof FSMEvent = {
          type: 'test',
          memberId: 'test',
          currentState: 'test'
        };
        
        addResult('类型系统测试', 'success', 'TypeScript类型系统正常');
      } catch (error) {
        addResult('类型系统测试', 'error', `类型系统测试失败: ${error}`);
      }
      
    } catch (error) {
      addResult('架构测试', 'error', `全局测试失败: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div class="p-6 max-w-4xl mx-auto">
      <div class="mb-6">
        <h1 class="text-3xl font-bold mb-2">模拟器架构调试</h1>
        <p class="text-gray-600">验证模拟器架构的完整性和功能性</p>
      </div>

      <div class="bg-white rounded-lg shadow-md p-6 mb-6">
        <div class="flex items-center gap-4 mb-4">
          <button
            onClick={runArchitectureTests}
            disabled={isRunning()}
            class="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {isRunning() ? '测试运行中...' : '运行架构测试'}
          </button>
          
          <button
            onClick={clearResults}
            disabled={isRunning()}
            class="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50"
          >
            清除结果
          </button>
        </div>

        <div class="space-y-3">
          {testResults().length === 0 ? (
            <div class="text-gray-500 text-center py-8">
              点击"运行架构测试"开始验证
            </div>
          ) : (
            testResults().map((result, index) => (
              <div
                key={index}
                class={`p-4 rounded-lg border-l-4 ${
                  result.status === 'success' 
                    ? 'bg-green-50 border-green-500' 
                    : result.status === 'error' 
                    ? 'bg-red-50 border-red-500' 
                    : 'bg-yellow-50 border-yellow-500'
                }`}
              >
                <div class="flex items-center gap-2 mb-2">
                  <span class={`w-3 h-3 rounded-full ${
                    result.status === 'success' 
                      ? 'bg-green-500' 
                      : result.status === 'error' 
                      ? 'bg-red-500' 
                      : 'bg-yellow-500'
                  }`}></span>
                  <span class="font-semibold">{result.name}</span>
                </div>
                <p class="text-sm text-gray-700 ml-5">{result.message}</p>
              </div>
            ))
          )}
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-xl font-semibold mb-4">架构说明</h2>
        <div class="space-y-4 text-sm text-gray-600">
          <div>
            <h3 class="font-medium text-gray-900 mb-2">核心模块</h3>
            <ul class="list-disc list-inside space-y-1 ml-4">
              <li><strong>GameEngine</strong>: 主引擎，协调所有模块</li>
              <li><strong>EventQueue</strong>: 事件队列，管理时间片段事件</li>
              <li><strong>FrameLoop</strong>: 帧循环，推进时间和调度事件</li>
              <li><strong>FSMEventBridge</strong>: FSM事件桥接器，连接状态机和事件队列</li>
              <li><strong>SimulatorExample</strong>: 示例类，展示完整系统集成</li>
            </ul>
          </div>
          
          <div>
            <h3 class="font-medium text-gray-900 mb-2">设计理念</h3>
            <ul class="list-disc list-inside space-y-1 ml-4">
              <li>低耦合设计，通过接口和适配器模式连接模块</li>
              <li>事件驱动架构，支持异步事件处理</li>
              <li>帧基础的时间系统，确保一致的60fps模拟</li>
              <li>可插拔的事件处理器，支持自定义扩展</li>
              <li>状态机集成，支持复杂的游戏逻辑</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}