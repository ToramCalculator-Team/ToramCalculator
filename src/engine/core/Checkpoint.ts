/**
 * 可检查点化接口。实现此接口的子系统支持状态捕获和恢复。
 * T 必须为 plain data（无函数、无闭包），以支持 postMessage 跨 Worker 传输。
 */
export interface Checkpointable<T> {
	captureCheckpoint(): T;
	restoreCheckpoint(checkpoint: T): void;
}
