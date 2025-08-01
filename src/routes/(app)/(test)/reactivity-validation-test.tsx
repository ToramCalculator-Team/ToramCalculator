import { Component, createSignal, createResource, Show } from "solid-js";
import { 
  testBasicReactivity, 
  testDependencyChainReactivity, 
  testBatchReactivity, 
  testDataConsistency,
  runAllReactivityTests 
} from "../../../components/features/simulator/test/reactivityTest";
import { findMemberWithRelations } from "@db/repositories/member";

const ReactivityValidationTest: Component = () => {
  const [isRunning, setIsRunning] = createSignal(false);
  const [consoleOutput, setConsoleOutput] = createSignal<string[]>([]);
  
  // 获取数据库数据
  const [memberData] = createResource(() => findMemberWithRelations("defaultMember1Id"));

  // 捕获console输出
  const originalLog = console.log;
  const originalError = console.error;
  
  const captureConsole = () => {
    setConsoleOutput([]);
    console.log = (...args) => {
      const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
      setConsoleOutput(prev => [...prev, message]);
      originalLog(...args);
    };
    console.error = (...args) => {
      const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
      setConsoleOutput(prev => [...prev, `❌ ${message}`]);
      originalError(...args);
    };
  };
  
  const restoreConsole = () => {
    console.log = originalLog;
    console.error = originalError;
  };

  const runTest = async (testFunction: () => Promise<void>, testName: string) => {
    if (isRunning()) return;
    
    setIsRunning(true);
    captureConsole();
    
    try {
      console.log(`🚀 开始运行: ${testName}`);
      await testFunction();
      console.log(`✅ 完成: ${testName}`);
    } catch (error) {
      console.error(`❌ 测试失败: ${testName}`, error);
    } finally {
      restoreConsole();
      setIsRunning(false);
    }
  };

  return (
    <div class="p-6 max-w-6xl mx-auto">
      <h1 class="text-3xl font-bold mb-6 text-gray-800">响应性验证测试</h1>
      
      <div class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h2 class="text-lg font-semibold mb-2 text-blue-800">测试说明</h2>
        <p class="text-blue-700">
          这些测试用于验证TypedArray响应式系统的数据一致性和响应性：
        </p>
        <ul class="mt-2 ml-4 text-blue-700 list-disc">
          <li><strong>基础响应性</strong>：验证属性设置和计算的正确性</li>
          <li><strong>依赖链响应</strong>：验证属性修改后依赖属性的自动更新</li>
          <li><strong>批量响应性</strong>：验证批量修改时的数据一致性</li>
          <li><strong>数据一致性</strong>：验证数据读取的一致性和时效性</li>
        </ul>
      </div>

      {/* 数据加载状态 */}
      <Show when={memberData.loading} fallback={
        <Show when={memberData()} fallback={
          <div class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-red-700">❌ 无法加载成员数据，请检查数据库连接</p>
          </div>
        }>
          <div class="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p class="text-green-700">✅ 数据库数据加载完成，可以开始测试</p>
          </div>
        </Show>
      }>
        <div class="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p class="text-yellow-700">⏳ 正在加载数据库数据...</p>
        </div>
      </Show>

      {/* 测试按钮组 */}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <button
          onClick={() => runTest(testBasicReactivity, "基础响应性测试")}
          disabled={isRunning() || memberData.loading || !memberData()}
          class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          🧪 基础响应性测试
        </button>

        <button
          onClick={() => runTest(testDependencyChainReactivity, "依赖链响应性测试")}
          disabled={isRunning() || memberData.loading || !memberData()}
          class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          🔗 依赖链响应性测试
        </button>

        <button
          onClick={() => runTest(testBatchReactivity, "批量响应性测试")}
          disabled={isRunning() || memberData.loading || !memberData()}
          class="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          📦 批量响应性测试
        </button>

        <button
          onClick={() => runTest(testDataConsistency, "数据一致性测试")}
          disabled={isRunning() || memberData.loading || !memberData()}
          class="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          🔒 数据一致性测试
        </button>

        <button
          onClick={() => runTest(runAllReactivityTests, "全部验证测试")}
          disabled={isRunning() || memberData.loading || !memberData()}
          class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed col-span-full md:col-span-2 lg:col-span-1 transition-colors"
        >
          🧪🧪🧪 运行全部测试
        </button>

        <button
          onClick={() => setConsoleOutput([])}
          disabled={isRunning()}
          class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          🗑️ 清空输出
        </button>
      </div>

      {/* 运行状态指示 */}
      <Show when={isRunning()}>
        <div class="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div class="flex items-center">
            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>
            <span class="text-yellow-700">测试运行中...</span>
          </div>
        </div>
      </Show>

      {/* 输出控制台 */}
      <div class="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-auto" style="height: 500px;">
        <div class="mb-2 text-gray-400">
          === 响应性验证测试输出 ===
        </div>
        {consoleOutput().length === 0 ? (
          <div class="text-gray-500">等待测试输出...</div>
        ) : (
          consoleOutput().map((line, index) => (
            <div class="mb-1">
              {line}
            </div>
          ))
        )}
      </div>

      {/* 测试说明 */}
      <div class="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h3 class="text-lg font-semibold mb-2 text-gray-800">验证要点</h3>
        <div class="text-gray-700 space-y-2">
          <p><strong>✅ 正常情况：</strong></p>
          <ul class="ml-4 list-disc space-y-1">
            <li>所有属性设置后能正确读取</li>
            <li>计算属性根据公式正确计算</li>
            <li>修改基础属性后，依赖属性立即更新</li>
            <li>批量修改后所有相关属性同步更新</li>
            <li>多次读取同一属性结果完全一致</li>
          </ul>
          
          <p class="mt-4"><strong>❌ 异常情况：</strong></p>
          <ul class="ml-4 list-disc space-y-1">
            <li>读取到的值与设置的值不一致</li>
            <li>修改属性后依赖属性没有更新</li>
            <li>计算结果与预期公式不符</li>
            <li>批量操作与单独操作结果不一致</li>
            <li>存在数据竞争或缓存不一致</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ReactivityValidationTest;