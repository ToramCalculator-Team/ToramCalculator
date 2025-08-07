// ==================== Worker模板 (my-worker.js) ====================

/**
 * 通用Worker模板
 * 与线程池配套使用，基于Artem的简洁设计原则
 */

// Worker状态
let messagePort: MessagePort | null = null;
let isReady = false;

/**
 * 初始化Worker - 接收MessageChannel的port1
 */
self.onmessage = function(event) {
  if (event.data.type === 'init' && event.data.port) {
    messagePort = event.data.port as MessagePort;
    messagePort.onmessage = handleTask;
    isReady = true;
    
    console.log('Worker initialized and ready');
  }
};

/**
 * 处理任务 - 基于Artem的简洁消息格式
 */
async function handleTask(event: MessageEvent) {
  if (!messagePort) {
    console.error('Worker not properly initialized');
    return;
  }

  const { taskId, type, payload } = event.data;
  const startTime = performance.now();

  try {
    // 执行具体任务
    const result = await executeTask(type, payload);
    const endTime = performance.now();

    // 发送结果 - 使用Artem的简洁格式
    messagePort.postMessage({
      taskId,
      result,
      metrics: {
        duration: endTime - startTime,
        memoryUsage: getMemoryUsage()
      }
    });

  } catch (error) {
    const endTime = performance.now();
    
    // 发送错误 - 保持简洁的格式
    messagePort.postMessage({
      taskId,
      error: error instanceof Error ? error.message : String(error),
      metrics: {
        duration: endTime - startTime,
        memoryUsage: getMemoryUsage()
      }
    });
  }
}

/**
 * 执行具体任务 - 需要根据业务需求实现
 */
async function executeTask(type: string, payload: any): Promise<any> {
  switch (type) {
    case 'processData':
      return processData(payload);
    
    case 'calculateSum':
      return calculateSum(payload);
    
    case 'sortArray':
      return sortArray(payload);
    
    default:
      throw new Error(`Unknown task type: ${type}`);
  }
}

// ==================== 具体任务实现示例 ====================

/**
 * 数据处理任务示例
 */
function processData(payload: { data: any[]; operation: string }) {
  const { data, operation } = payload;
  
  switch (operation) {
    case 'filter':
      return data.filter(item => item > 0);
    
    case 'map':
      return data.map(item => item * 2);
    
    case 'reduce':
      return data.reduce((sum, item) => sum + item, 0);
    
    default:
      return data;
  }
}

/**
 * 计算求和任务
 */
function calculateSum(payload: { numbers: number[] }): number {
  return payload.numbers.reduce((sum, num) => sum + num, 0);
}

/**
 * 数组排序任务
 */
function sortArray(payload: { array: number[]; ascending: boolean }) {
    const { array, ascending } = payload;
  return array.sort((a, b) => ascending ? a - b : b - a);
}

/**
 * 获取内存使用情况
 */
function getMemoryUsage(): number {
  // 在浏览器环境中，可以使用performance.memory（如果可用）
  if (typeof performance !== 'undefined' && (performance as any).memory) {
    return (performance as any).memory.usedJSHeapSize;
  }
  return 0;
}