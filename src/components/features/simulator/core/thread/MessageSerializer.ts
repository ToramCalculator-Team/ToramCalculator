/**
 * 消息序列化器 - 确保数据可以安全地通过postMessage传递
 * 
 * 设计原则：
 * 1. 类型安全：保持原始消息的类型信息
 * 2. 性能优化：自动检测和处理Transferable对象
 * 3. 结构可预测：返回结果结构明确
 * 4. 通用性：不包含特定业务逻辑
 * 5. 可复用：供主线程和Worker线程共同使用
 */

/**
 * 检查对象是否为可传输对象
 * @param obj 要检查的对象
 * @returns 是否为Transferable对象
 */
export function isTransferable(obj: unknown): obj is Transferable {
  return obj instanceof ArrayBuffer || obj instanceof MessagePort;
}

/**
 * 递归查找消息中的所有可传输对象
 * @param obj 要扫描的对象
 * @returns 找到的所有Transferable对象数组
 */
export function findTransferables(obj: unknown): Transferable[] {
  const transferables = new Set<Transferable>();

  function scan(item: unknown): void {
    if (!item || typeof item !== "object") return;

    if (isTransferable(item)) {
      transferables.add(item);
      return;
    }

    if (Array.isArray(item)) {
      (item as unknown[]).forEach(scan);
      return;
    }

    if (item && typeof item === "object" && item !== null) {
      for (const value of Object.values(item)) {
        scan(value);
      }
    }
  }

  scan(obj);
  return Array.from(transferables);
}

/**
 * 类型安全的消息传输准备
 *
 * @param message 要传输的消息
 * @returns 包含消息和可传输对象列表的传输结果
 */
export function prepareForTransfer<T>(message: T): { message: T; transferables: Transferable[] } {
  const transferables = findTransferables(message);
  return {
    message,
    transferables,
  };
}

/**
 * 清理数据，移除不可序列化的内容
 * 确保数据可以安全地通过postMessage传递
 *
 * @param data 原始数据
 * @returns 清理后的安全数据
 */
export function sanitizeForPostMessage(data: any): any {
  try {
    // 尝试JSON序列化和反序列化来检测不可序列化的内容
    const serialized = JSON.stringify(data);
    return JSON.parse(serialized);
  } catch (error) {
    // 如果JSON序列化失败，进行深度清理
    return deepSanitizeData(data);
  }
}

/**
 * 深度清理数据，递归移除不可序列化的内容
 *
 * @param data 原始数据
 * @param seen 已访问对象的WeakSet，防止循环引用
 * @returns 清理后的安全数据
 */
function deepSanitizeData(data: any, seen = new WeakSet()): any {
  // 处理基本类型
  if (data === null || data === undefined) {
    return data;
  }
  
  if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
    return data;
  }

  // 处理函数类型
  if (typeof data === 'function') {
    return undefined; // 移除函数
  }

  // 处理Symbol类型
  if (typeof data === 'symbol') {
    return undefined; // 移除Symbol
  }

  // 处理Date对象
  if (data instanceof Date) {
    return data.toISOString();
  }

  // 处理数组
  if (Array.isArray(data)) {
    return data.map(item => deepSanitizeData(item, seen));
  }

  // 处理对象
  if (typeof data === 'object') {
    // 检查循环引用
    if (seen.has(data)) {
      return undefined; // 移除循环引用
    }
    seen.add(data);

    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      const sanitizedValue = deepSanitizeData(value, seen);
      if (sanitizedValue !== undefined) {
        sanitized[key] = sanitizedValue;
      }
    }
    return sanitized;
  }

  // 其他类型（如BigInt等）
  return undefined;
}
