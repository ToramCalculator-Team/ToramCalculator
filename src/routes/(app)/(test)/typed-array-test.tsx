import { Component, createSignal } from "solid-js";
import { runPerformanceTest, runFunctionalTest } from "../../../components/features/simulator/test/typed-array-performance-test";

const TypedArrayTest: Component = () => {
  const [consoleOutput, setConsoleOutput] = createSignal<string[]>([]);
  const [isRunning, setIsRunning] = createSignal(false);

  // 捕获控制台输出
  let originalConsoleLog = console.log;
  let originalConsoleWarn = console.warn;
  let originalConsoleError = console.error;

  const captureConsole = () => {
    console.log = (...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      setConsoleOutput([...consoleOutput(), message]);
      originalConsoleLog(...args);
    };

    console.warn = (...args: any[]) => {
      const message = `⚠️ ${args.map(arg => String(arg)).join(' ')}`;
      setConsoleOutput([...consoleOutput(), message]);
      originalConsoleWarn(...args);
    };

    console.error = (...args: any[]) => {
      const message = `❌ ${args.map(arg => String(arg)).join(' ')}`;
      setConsoleOutput([...consoleOutput(), message]);
      originalConsoleError(...args);
    };
  };

  const restoreConsole = () => {
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  };

  const runFunctional = async () => {
    setIsRunning(true);
    setConsoleOutput([]);
    
    captureConsole();
    
    try {
      await new Promise(resolve => {
        setTimeout(() => {
          runFunctionalTest();
          resolve(void 0);
        }, 100);
      });
    } catch (error) {
      console.error("功能测试执行失败:", error);
    } finally {
      restoreConsole();
      setIsRunning(false);
    }
  };

  const runPerformance = async () => {
    setIsRunning(true);
    setConsoleOutput([]);
    
    captureConsole();
    
    try {
      await new Promise(resolve => {
        setTimeout(() => {
          runPerformanceTest();
          resolve(void 0);
        }, 100);
      });
    } catch (error) {
      console.error("性能测试执行失败:", error);
    } finally {
      restoreConsole();
      setIsRunning(false);
    }
  };

  const clearOutput = () => {
    setConsoleOutput([]);
  };

  return (
    <div class="p-6 max-w-6xl mx-auto">
      <h1 class="text-3xl font-bold mb-6">TypedArray响应式系统测试</h1>
      
      <div class="mb-6 space-y-4">
        <div class="flex gap-4">
          <button
            onClick={runFunctional}
            disabled={isRunning()}
            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isRunning() ? "运行中..." : "功能测试"}
          </button>
          
          <button
            onClick={runPerformance}
            disabled={isRunning()}
            class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {isRunning() ? "运行中..." : "性能测试"}
          </button>
          
          <button
            onClick={clearOutput}
            class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            清空输出
          </button>
        </div>
        
        <div class="text-sm text-gray-600">
          <p><strong>功能测试</strong>：验证TypedArray实现的基本功能是否正常</p>
          <p><strong>性能测试</strong>：对比Map实现与TypedArray实现的性能差异</p>
        </div>
      </div>

      <div class="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm h-96 overflow-y-auto">
        {consoleOutput().length === 0 ? (
          <div class="text-gray-500">点击上方按钮开始测试...</div>
        ) : (
          consoleOutput().map((line, index) => (
            <div class="whitespace-pre-wrap mb-1">{line}</div>
          ))
        )}
      </div>

      <div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="p-4 bg-blue-50 rounded-lg">
          <h2 class="text-xl font-semibold mb-2">TypedArray优势</h2>
          <ul class="list-disc list-inside space-y-1 text-sm">
            <li>连续内存布局，缓存友好</li>
            <li>O(1)直接索引访问，无哈希查找</li>
            <li>批量操作高效，支持SIMD</li>
            <li>减少对象分配，降低GC压力</li>
            <li>位标志优化状态管理</li>
          </ul>
        </div>
        
        <div class="p-4 bg-yellow-50 rounded-lg">
          <h2 class="text-xl font-semibold mb-2">技术细节</h2>
          <ul class="list-disc list-inside space-y-1 text-sm">
            <li>Float64Array存储属性值</li>
            <li>Uint32Array管理标志位</li>
            <li>5个数组分别存储不同修饰符</li>
            <li>位图优化脏值检查</li>
            <li>拓扑排序保证依赖顺序</li>
          </ul>
        </div>
      </div>

      <div class="mt-6 p-4 bg-green-50 rounded-lg">
        <h2 class="text-xl font-semibold mb-2">预期性能提升</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div class="font-semibold">属性访问</div>
            <div class="text-green-600">3-5x faster</div>
          </div>
          <div>
            <div class="font-semibold">内存使用</div>
            <div class="text-green-600">40-60% less</div>
          </div>
          <div>
            <div class="font-semibold">GC压力</div>
            <div class="text-green-600">70% reduction</div>
          </div>
          <div>
            <div class="font-semibold">批量操作</div>
            <div class="text-green-600">5-10x faster</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TypedArrayTest;