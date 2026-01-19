/**
 * 事件发射器 - 基于Node.js ThreadPool的EventEmitter思路
 *
 * 提供事件订阅/发布机制，用于监听线程池的各种状态变化：
 * - task-completed: 任务完成
 * - task-failed: 任务失败
 * - task-retry: 任务重试
 * - queue-full: 队列满载
 * - worker-replaced: Worker替换
 * - metrics: 性能指标更新
 * - shutdown: 池关闭
 */
export class EventEmitter {
    private events: { [key: string]: Function[] } = {}; // 事件监听器映射表
  
    /**
     * 注册事件监听器
     * @param event 事件名称
     * @param listener 监听器函数
     */
    on(event: string, listener: Function): void {
      if (!this.events[event]) {
        this.events[event] = [];
      }
      this.events[event].push(listener);
      // console.log(`📡 EventEmitter: 注册事件监听器 "${event}"，当前监听器数量: ${this.events[event].length}`);
    }
  
    /**
     * 发射事件，触发所有监听器
     * @param event 事件名称
     * @param args 事件参数
     */
    emit(event: string, ...args: any[]): void {
      // 减少引擎状态更新事件的日志噪音
      if (event !== "engine_state_update") {
        // console.log(`📡 EventEmitter: 发射事件 "${event}"，监听器数量: ${this.events[event]?.length || 0}`);
      }
      if (this.events[event]) {
        this.events[event].forEach((listener) => {listener(...args)});
      }
    }
  
    /**
     * 移除事件监听器
     * @param event 事件名称
     * @param listener 可选的特定监听器，不传则移除所有
     */
    off(event: string, listener?: Function): void {
      if (!this.events[event]) return;
  
      if (listener) {
        this.events[event] = this.events[event].filter((l) => l !== listener);
      } else {
        delete this.events[event];
      }
    }
  }