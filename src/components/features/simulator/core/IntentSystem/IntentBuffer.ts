import type { Intent } from "./Intent";

/**
 * 每帧 Intent 缓冲区：tick 阶段写入，commit 阶段统一执行
 */
export class IntentBuffer {
  private buffer: Intent[] = [];

  push(intent: Intent | undefined | null): void {
    if (!intent) return;
    this.buffer.push(intent);
  }

  drain(): Intent[] {
    const out = this.buffer;
    this.buffer = [];
    return out;
  }
}

export default IntentBuffer;

