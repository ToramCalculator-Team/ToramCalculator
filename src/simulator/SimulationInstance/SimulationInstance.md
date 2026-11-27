# SimulationInstance

## 模块职责

`SimulationInstance` 表示一次可独立运行的模拟，由生命周期管理、游戏控制器、游戏系统宿主和游戏渲染器四个模块组成。游戏系统由宿主持有并驱动。

1. 创建并持有四个组成模块；创建成功时宿主已装载游戏系统。
2. 将启动、暂停、恢复和停止命令交给生命周期管理器，由游戏系统宿主执行并确认。
3. 向业务提供游戏输入和观察输出入口。
4. 销毁时等待运行命令结束，释放全部组成模块与实例级通道；宿主负责销毁其持有的游戏系统和观察者。

实例不单独暴露游戏加载状态。游戏实现由服务的实例装配器提供，宿主在实例创建期间完成系统装载；构造成功后实例即处于已加载、已停止状态。

## 理想结构

```typescript
class SimulationInstance {
  /**
   * 启动游戏系统。
   *
   * @returns 执行端确认启动后的 Promise
   */
  start(): Promise<void>;

  /**
   * 暂停游戏世界的逻辑时间。
   *
   * @returns 执行端确认暂停后的 Promise
   */
  pause(): Promise<void>;

  /**
   * 恢复游戏世界的逻辑时间。
   *
   * @returns 执行端确认恢复后的 Promise
   */
  resume(): Promise<void>;

  /**
   * 停止游戏系统。
   *
   * @returns 执行端确认停止后的 Promise
   */
  stop(): Promise<void>;

  /**
   * 写入游戏输入。
   *
   * @param input 游戏输入快照或离散命令
   */
  submitInput(input: unknown): void;

  /**
   * 添加观察者并取得读取句柄。
   *
   * @param declaration 消费端声明的数据选择和采样策略
   * @returns 可直接读取观察产出的句柄
   */
  addObserver(declaration: ObserverDeclaration): ObserverHandle;

  /**
   * 销毁模拟实例及其四个组成模块。
   *
   * @returns 资源释放完成的 Promise
   */
  dispose(): Promise<void>;
}
```

## 关键设计决策

### 1. 实例是单次运行的管理边界

`SimulationService` 负责创建和登记实例。实例负责运行控制、输入输出接入，以及自身资源释放。

### 2. 四个组成模块分工明确

生命周期管理器控制游戏系统运行状态；游戏控制器写入输入；游戏系统宿主提供时钟、转接 I/O 并管理观察者，宿主持有并驱动游戏系统；游戏渲染器消费观察输出。

### 3. 消费端直接读取观察句柄

实例负责观察接入和释放。消费端取得句柄后直接读取数据，不经过实例逐次转发。
