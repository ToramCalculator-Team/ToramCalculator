# FrameLoop

## 模块职责

1. 按固定频率安排下一次唤醒。
2. 根据实际耗时修正下一次 `setTimeout` 的延迟。
3. 管理 `start`、`pause`、`resume`、`stop` 生命周期。

---

## 理想结构

```typescript
class FrameLoop {
  private state: "stopped" | "running" | "paused" = "stopped";
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly fixedStepMs: number;
  private nextDeadlineMs: number | null = null;
  private onTick: ((deltaTimeMs: number) => void) | null = null;

  constructor(logicHz: number) {
    if (!Number.isFinite(logicHz) || logicHz <= 0) {
      throw new Error("logicHz 必须是正数");
    }
    this.fixedStepMs = 1000 / logicHz;
  }

  start(onTick: (deltaTimeMs: number) => void): void
  pause(): void
  resume(): void
  stop(): void

  private scheduleNext(): void
}
```

---

## 时间调度原理

逻辑步长固定为：

```typescript
fixedStepMs = 1000 / logicHz;
```

启动时记录下一次理论执行时间：

```text
nextDeadline = performance.now() + fixedStepMs
```

每次循环：

1. 使用 `performance.now()` 获取当前实际时间。
2. 调用一次 `onTick(fixedStepMs)`。
3. 将理论时间推进一个固定步长：

```text
nextDeadline += fixedStepMs
```

4. 计算距离下一次理论执行时间的剩余时间：

```text
delay = max(0, nextDeadline - performance.now())
```

5. 使用 `setTimeout` 安排下一次唤醒。

```text
实际时间 ──> 读取时间误差 ──> 修正下一次 setTimeout

每次 stepTick 的 deltaTimeMs 始终为 fixedStepMs
```

`setTimeout` 的延迟只能影响唤醒时机，不能改变逻辑步长。浏览器或 Worker 被阻塞时，下一次循环可能晚到，但仍只执行一个固定步长 Tick。

---

## 生命周期

```text
stopped --start--> running
running --pause--> paused
paused  --resume-> running
running --stop---> stopped
paused  --stop---> stopped
```

- `start` 只允许建立一个循环。
- `pause` 取消当前定时器，不执行额外 Tick。
- `resume` 以当前时间重新建立下一次理论执行时间，避免把暂停期间的现实时间计入模拟。
- `stop` 取消定时器并清除 Tick 回调。

---


## 异常处理

如果时间误差大于 `fixedStepMs` 则抛出错误，这说明被调用的方法计算量超过了预期耗时，这是设计问题。

