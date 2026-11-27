# GameSystemHost

## 模块职责

`GameSystemHost` 是模拟实例中始终存在的游戏系统运行环境。它提供逻辑时钟，装载并驱动游戏系统，接入输入输出 I/O，并按消费端声明创建和管理观察者。

1. 使用模拟实例装配器提供的工厂构造并持有 `GameSystem`。
2. 向游戏系统提供逻辑时钟和输入读取端。
3. 执行启动、暂停、恢复、停止和单步等已接受的运行操作。
4. 按观察声明创建与释放观察通道。
5. 销毁时释放游戏系统、时钟、观察者和 I/O 资源。

宿主不维护游戏系统的生命周期状态图。模拟实例中的生命周期管理器决定操作是否可接受，宿主执行操作并报告结果。同线程和跨线程模式都使用宿主；线程模式通过注入的通道实现选择普通内存、共享内存或消息传输。

## 理想结构

```typescript
class GameSystemHost {
  /**
   * 装载游戏系统。
   *
   * @param create 游戏实现提供的系统工厂
   * @param options 输入读取端与可选初始状态
   * @returns 装载完成的结果
   */
  loadGame(create: GameSystemFactory, options: GameSystemLoadOptions): void;

  /**
   * 执行已接受的游戏系统运行操作。
   *
   * @param operation 启动、暂停、恢复、停止或单步操作
   * @returns 执行结果
   */
  execute(operation: GameSystemOperation): Promise<void>;

  /**
   * 添加观察者。
   *
   * @param declaration 消费端声明的数据选择与采样配置
   * @returns 观察者编号与读取句柄
   */
  addObserver(declaration: ObserverDeclaration): ObserverRegistration;

  /**
   * 释放宿主及其持有的资源。
   *
   * @returns 资源释放完成的 Promise
   */
  dispose(): Promise<void>;
}
```

## 关键设计决策

### 1. 宿主是游戏系统的运行环境

逻辑时钟、游戏系统、输入读取端和观察者属于宿主管理的实例资源，由宿主统一装载与释放。

### 2. 游戏逻辑时间由宿主持有

用户暂停的是游戏世界。生命周期管理器请求宿主暂停逻辑时钟；平台真实时间继续服务通信、界面刷新和超时。宿主位于哪个线程不改变时钟归属。

### 3. 观察通道由消费端声明

宿主按声明创建动态观察者。消费者取得读取句柄后直接读取自己的通道，读取过程不经过实例对象转发。
