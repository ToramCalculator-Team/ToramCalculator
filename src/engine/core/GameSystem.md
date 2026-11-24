# GameSystem

## 模块职责

GameSystem 是复刻自实际游戏的受控系统，按既定规则响应输入与时间。

1. **受控状态**：保存系统状态，以场景或一份既有状态作为初始状态。
2. **每步完成后发布状态**：维护统一状态对象，每一步执行完毕后更新，供同一线程内的读取方读取。
3. **报告下一步时刻**：给出已完成到的逻辑时刻与下一项工作的逻辑时刻。

## 理想结构

```typescript
interface GameSystem {
  /**
   * 已完成到的逻辑时刻。
   *
   * @returns 当前逻辑时刻
   */
  getCurrentTime(): SimulationTime;

  /**
   * 下一项工作的逻辑时刻。
   *
   * @returns 下一项工作的时刻；没有已排定的工作时返回 null
   */
  getNextTime(): SimulationTime | null;

  /** 统一状态对象，每步执行完毕后更新。 */
  readonly state: SystemState;
}
```

```typescript
/**
 * 构造游戏系统
 *
 * @param clock 宿主时钟，提供当前时刻、唤醒与取消唤醒
 * @param input 输入通道，系统按自己的时机读取快照
 * @param state 场景或一份既有状态与它的逻辑时刻
 */
// new GameSystem({ clock, input, state })
```

```typescript
/** 逻辑时刻；cursor 是实现自己的次序标记，外部只按 timeMs 排序。 */
interface SimulationTime {
  timeMs: number;
  cursor?: unknown;
}
```

### 状态对象

系统只维护一份状态，每一步执行完毕后整体更新为最新完成时刻的状态。以便外部读取状态信息。

### 时间

游戏系统的一切时间都经由宿主时钟：

```typescript
interface SystemClock {
  /**
   * 当前时刻。
   *
   * @returns 毫秒表示的逻辑时刻
   */
  nowMs(): number;

  /**
   * 安排一次唤醒。
   *
   * @param delayMs 相对当前的延迟
   * @param callback 到期时调用
   * @returns 可取消的句柄
   */
  setTimeout(delayMs: number, callback: () => void): TimerHandle;

  /**
   * 取消已安排的唤醒。
   *
   * @param handle 唤醒句柄
   */
  clearTimeout(handle: TimerHandle): void;
}
```

## 关键设计决策

### 1. 状态对象是唯一读取面

**设计理念**：单一事实源优于为每个消费者维护一份产出。

所有读取方从同一份状态读取，差异由读取方投影得出。

### 2. 时间能力全部由宿主提供

**设计理念**：时间源是运行环境的一部分，模拟只描述时间的作用。

系统读取时刻、安排唤醒与取消唤醒都经过同一个对象。
