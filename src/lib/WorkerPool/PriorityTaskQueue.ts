import type { Task } from "./type";

/**
 * 优先级任务队列
 *
 * 实现三级优先级的任务队列：高优先级 > 中优先级 > 低优先级
 * 确保重要任务能够优先执行，提高系统响应性能。
 *
 * 核心算法：
 * - enqueue: 根据优先级将任务添加到对应队列末尾
 * - dequeue: 按优先级顺序从队列头部取出任务
 * - unshift: 将任务添加到对应优先级队列头部（用于重试）
 */
export class PriorityTaskQueue<TTaskType extends string, TPayload, TPriority extends string> {
  private queues: {
    [key in TPriority]: Task<TTaskType, TPayload, key>[];
  };

  constructor(priority: TPriority[]) {
    // 根据优先级创建队列
    this.queues = priority.reduce(
      (acc, priority) => {
        acc[priority] = [];
        return acc;
      },
      {} as { [key in TPriority]: Task<TTaskType, TPayload, key>[] },
    );
  }

  /**
   * 将任务加入队列
   * @param task 要加入的任务
   */
  enqueue(task: Task<TTaskType, TPayload, TPriority>): void {
    this.queues[task.priority].push(task); // 添加到对应优先级队列末尾
  }

  /**
   * 从队列中取出下一个任务
   * 按优先级顺序：high -> medium -> low
   * @returns 下一个要执行的任务，如果队列为空则返回null
   */
  dequeue(): Task<TTaskType, TPayload, TPriority> | null {
    for (const priority of Object.keys(this.queues) as TPriority[]) {
      if (this.queues[priority].length > 0) {
        return this.queues[priority].shift() || null; // 从队列头部取出任务
      }
    }
    return null; // 所有队列都为空
  }

  /**
   * 将任务添加到对应优先级队列头部
   * 主要用于任务重试，确保重试任务能够优先执行
   * @param task 要添加的任务
   */
  unshift(task: Task<TTaskType, TPayload, TPriority>): void {
    this.queues[task.priority].unshift(task); // 添加到队列头部
  }

  /**
   * 检查是否有待处理任务
   * @returns 是否有任务在队列中
   */
  hasTask(): boolean {
    return Object.values(this.queues as Task<TTaskType, TPayload, TPriority>[][]).some((queue) => queue.length > 0); // 检查任意队列是否有任务
  }

  /**
   * 获取队列中任务总数
   * @returns 所有优先级队列的任务总数
   */
  size(): number {
    return Object.values(this.queues as Task<TTaskType, TPayload, TPriority>[][]).reduce(
      (sum, queue) => sum + queue.length,
      0,
    ); // 计算所有队列的任务总数
  }
}
