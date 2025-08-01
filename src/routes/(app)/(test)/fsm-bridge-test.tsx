/**
 * FSM事件桥集成测试页面
 * 验证新的依赖注入架构
 */

import { createSignal, createResource, Show } from "solid-js";
import { findMemberWithRelations } from "@db/repositories/member";
import { testFSMBridgeIntegration } from "~/components/features/simulator/test/fsmBridgeTest";

export default function FSMBridgeTestPage() {
  const [consoleOutput, setConsoleOutput] = createSignal<string[]>([]);
  const [isRunning, setIsRunning] = createSignal(false);

  // 异步加载数据
  const [memberData] = createResource(() => findMemberWithRelations("defaultMember1Id"));

  const runTest = async () => {
    if (isRunning()) return;
    
    setIsRunning(true);
    setConsoleOutput([]);

    try {
      const logs = await testFSMBridgeIntegration();
      setConsoleOutput(logs);
    } catch (error) {
      setConsoleOutput([`❌ 测试运行失败: ${error}`]);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div class="container mx-auto p-6 space-y-6">
      <div class="bg-white rounded-lg shadow-md p-6">
        <h1 class="text-2xl font-bold text-gray-800 mb-4">
          🔄 FSM事件桥集成测试
        </h1>
        <p class="text-gray-600 mb-6">
          测试新的依赖注入架构：FSMEventBridge接口设计、Member基类集成、Player类使用等。
        </p>

        <Show 
          when={memberData.loading}
          fallback={
            <Show
              when={memberData.error}
              fallback={
                <div class="space-y-4">
                  <div class="flex gap-4">
                    <button
                      onClick={runTest}
                      disabled={isRunning()}
                      class="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isRunning() ? "🔄 运行中..." : "🚀 运行FSM事件桥测试"}
                    </button>

                    <button
                      onClick={() => setConsoleOutput([])}
                      disabled={isRunning() || consoleOutput().length === 0}
                      class="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      🗑️ 清空输出
                    </button>
                  </div>

                  <div class="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
                    <Show
                      when={consoleOutput().length > 0}
                      fallback={
                        <div class="text-gray-500">
                          点击"运行FSM事件桥测试"开始测试...
                        </div>
                      }
                    >
                      {consoleOutput().map((line, index) => (
                        <div class={`${line.includes('❌') ? 'text-red-400' : 
                                    line.includes('✅') ? 'text-green-400' : 
                                    line.includes('📊') ? 'text-blue-400' :
                                    line.includes('🔧') || line.includes('🎮') || line.includes('🏗️') ? 'text-yellow-400' :
                                    'text-gray-300'}`}>
                          {line || "\u00A0"}
                        </div>
                      ))}
                    </Show>
                  </div>

                  <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 class="font-semibold text-blue-800 mb-2">📋 测试说明</h3>
                    <ul class="space-y-1 text-sm text-blue-700">
                      <li>• <strong>基础功能测试</strong>：验证PlayerFSMEventBridge的基本功能</li>
                      <li>• <strong>集成测试</strong>：验证Player类与FSM事件桥的集成</li>
                      <li>• <strong>架构验证</strong>：验证依赖倒置、职责分离等设计原则</li>
                    </ul>
                  </div>

                  <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 class="font-semibold text-green-800 mb-2">🎯 架构优势</h3>
                    <ul class="space-y-1 text-sm text-green-700">
                      <li>• <strong>依赖倒置</strong>：Member依赖FSMEventBridge接口，不依赖具体实现</li>
                      <li>• <strong>职责分离</strong>：FSM事件转换逻辑独立于Member基类</li>
                      <li>• <strong>可扩展性</strong>：新成员类型只需实现接口，不修改现有代码</li>
                      <li>• <strong>可测试性</strong>：接口便于mock，单元测试简单</li>
                    </ul>
                  </div>
                </div>
              }
            >
              <div class="text-red-600 p-4 bg-red-50 rounded-lg">
                ❌ 数据加载失败: {memberData.error?.toString()}
              </div>
            </Show>
          }
        >
          <div class="text-blue-600 p-4 bg-blue-50 rounded-lg">
            🔄 正在加载测试数据...
          </div>
        </Show>
      </div>
    </div>
  );
}