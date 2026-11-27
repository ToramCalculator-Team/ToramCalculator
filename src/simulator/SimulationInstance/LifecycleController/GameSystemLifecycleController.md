# GameSystemLifecycleController

## 模块职责

`GameSystemLifecycleController` 管理游戏系统的运行状态，验证启动、暂停、恢复和停止命令，并协调执行端完成操作。

1. 根据共享状态转换定义判断命令是否可接受。
2. 调用执行端运行操作并等待确认。
3. 执行成功后更新稳定状态；失败时保留原状态并向调用方报告错误。
4. 暴露当前运行状态和释放入口。

生命周期控制器属于 `SimulationInstance` 的四个组成模块之一。实例创建时游戏系统已装载，控制器初始状态为已停止。

## 理想结构

```typescript
class GameSystemLifecycleController {
  /**
   * 执行一项游戏系统运行命令。
   *
   * @param command 启动、暂停、恢复或停止命令
   * @returns 执行端确认操作完成后的 Promise
   */
  send(command: GameSystemLifecycleCommand): Promise<void>;

  /**
   * 读取当前运行状态。
   *
   * @returns 已确认的运行状态
   */
  getState(): GameSystemLifecycleState;
}
```

## 关键设计决策

### 1. 转换规则共享，动作由各端绑定

`GameSystemLifecycleStateGraph.ts` 描述允许的状态转换。当前线程和 Worker 执行方式分别绑定本地动作或跨线程命令动作。

### 2. 暂停控制游戏世界

暂停和恢复由游戏系统宿主作用于逻辑时钟。宿主在同线程和跨线程模式下都存在；输入界面、通信和渲染不因游戏逻辑暂停而停止。
