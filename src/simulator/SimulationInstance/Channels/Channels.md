# SimulationInstance Channels

## 模块职责

通道承载游戏输入与观察输出，定义同线程和跨线程实现都必须遵守的数据交接语义。

1. 输入通道连接游戏控制器与游戏系统宿主。
2. 观察通道由宿主管理，提供宿主写入、消费端读取的能力。
3. 同线程与跨线程模式都使用宿主；通道实现分别采用普通内存、共享内存或消息传输。
4. 观察通道按消费端声明动态创建和释放。

## 理想结构

```text
GameController -> InputChannel -> GameSystemHost -> GameSystem
GameSystemHost -> ObserverChannel -> GameRenderer / analysis consumer
```

```typescript
interface ObserverHandle {
  /**
   * 读取当前观察产出。
   *
   * @returns 当前可用的数据快照或事件范围
   */
  read(): unknown;

  /**
   * 释放观察通道。
   *
   * @returns 通道释放完成的 Promise
   */
  close(): Promise<void>;
}
```

## 关键设计决策

### 1. 生命周期命令与数据通道分离

加载、启动、暂停和停止需要状态判断与执行确认，使用命令协议；游戏输入和观察输出使用数据通道。

### 2. 观察布局由消费端声明

实例负责接入和生命周期管理，消费端决定选择字段、采样周期、容量和满载策略。观察通道在 attach 时建立，detach 时释放。
