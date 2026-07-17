# 0045 - 引擎生命周期采用双端协议状态机

- **状态**: Accepted
- **日期**: 2026-07-17
- **决策层**: 跨层（引擎 / 通信 / 应用状态）
- **相关代码**: `src/lib/engine/core/GameEngineSM.ts`、`src/lib/engine/core/GameEngine.ts`、`src/lib/engine/core/thread/`、`src/features/simulator/simulatorSessionMachine.ts`
- **相关 ADR**: Depends on 0040；Refines 0042

## 决策问题

实时引擎的生命周期命令从主线程跨越 Worker 执行。系统需要同时确定已提交状态的权威所有者、主线程命令等待状态、公开 Promise 的完成边界，以及 Handle、Session 和 UI 可以观察的状态范围。当前由状态机消息、RPC task 完成、`GameEngine.runState` 和 Session 事件解释共同表达这些事实，无法保证命令完成与状态转换使用同一条可验证路径。

## 决策驱动

- Worker 必须是已经提交的引擎生命周期状态的唯一权威。
- 生命周期方法只有在实际副作用成功并确认状态转换后才能完成，不能把 transport ACK 当作执行完成。
- controller 与 executor 的合法转换应保留在一份可读状态图中，不能分别维护两套规则。
- Engine 协议、Handle、Session 与 UI 必须保持单向依赖，raw Worker 消息不能越过能力边界。
- 可恢复命令失败必须回到最后确认的稳定状态，并保留结构化错误语义。

## 候选方案

### A. 只在 Worker 保留生命周期 FSM

- 优点：只有一个 actor，已提交状态的权威位置直接，主线程客户端结构较少。
- 缺点：主线程的命令发送、等待结果和控制可用性需要由 Promise、pending map 和 Session 分别表达，跨线程命令过程不再具有一张完整状态图。

### B. 主线程与 Worker 分别维护独立状态模型

- 优点：两端可以按各自需要独立建模，协议只传命令和状态通知。
- 缺点：合法转换、失败回退和状态命名会形成两套事实；push 通知与 RPC 完成也容易产生先后不一致。

### C. 同一份状态机定义实例化为 controller 与 executor

- 优点：两端共享状态图和事件协议，同时保留 Worker 的提交权威与主线程的命令等待状态；失败和确认路径可以统一验证。
- 缺点：同一状态机必须明确区分角色语义，两端 snapshot 不保证同时相等，协议相关性和双角色转换需要更完整的测试。

## 决议

选择 C：**实时引擎生命周期使用双端协议状态机；同一份 XState 定义分别实例化为主线程 controller 和 Worker executor，Worker executor 拥有已提交状态，主线程 controller 拥有命令发送与等待结果状态。**

1. “双端”表示共享状态图和事件协议，不表示两个 actor 是同时提交或任意时刻完全相同的状态副本。
2. `idle`、`ready`、`running`、`paused` 是已确认的稳定生命周期状态。加载、启动、暂停、恢复、停止、重置、单步和卸载通过显式过渡态执行；`step` 使用 `paused -> stepping -> paused`，`reset` 成功后进入 `ready`，`unloadScenario` 成功后进入 `idle`。
3. executor 只有在 `GameEngine` 原子副作用成功后才能进入目标稳定状态。`GameEngine` 不再保存独立可变的生命周期状态，也不重复裁决生命周期转换是否合法；帧调度器可以保留不对外表示生命周期的内部驱动状态。
4. 每个 `CMD_*` 与对应 `RESULT_*` 构成唯一的类型化 RPC 请求响应。Worker task 只有在执行完成后才返回 `RESULT_*`；transport ACK 不具有生命周期完成语义。
5. `EngineWorkerClient` 必须校验结果类型、关联身份和结构，把结果送入 controller，并在 controller 完成确认转换后才 resolve 公开生命周期 Promise。
6. 可恢复的命令失败不进入统一长期 `error` 状态。controller 与 executor 回到命令发起前最后确认的稳定状态，公开方法以结构化执行错误 reject；transport 或 Worker 故障仍使当前 Handle 失败并由上层结束资源。
7. `engine_lifecycle_snapshot` 是独立的只读 push，只用于状态观察和初次连接，不完成命令，也不替代对应 RPC 结果。
8. `EngineWorkerClient` 内部持有 controller actor，不公开 raw actor 或任意 `send()`。`RealtimeEngineHandle` 只公开类型化命令和受限的只读 lifecycle snapshot/subscribe 能力。
9. Session 只消费 Handle 的只读生命周期状态和命令结果，并投影为 UI 状态；Session 与 UI 不解释 raw `RESULT_*`、Worker envelope 或 controller 内部状态路径。
10. 本决策不引入 Worker 不重建条件下的在线重同步、结果丢失自动重试、多控制端接管或状态版本协商。

## 代价

- 状态机定义需要同时覆盖 controller 与 executor 角色，角色分支、来源稳定状态和结果相关性必须通过测试维持。
- 主线程可能处于等待结果的过渡态，而 Worker 已执行或尚未执行对应副作用；观察者必须理解 controller snapshot 是协议视图，不是第二份 Worker 权威状态。
- 删除 `GameEngine.runState` 时必须把连续帧驱动所需的内部停止条件收回 `FrameLoop` 或调度器，避免把驱动标记重新包装成生命周期状态。
- 当前不提供在线重同步。Worker、transport 或协议发生不可恢复故障时，需要关闭当前 Handle 并由资源所有者重新建立运行时。

## 重新评估条件

- 产品要求多个主线程控制端并发控制、跨连接接管或基于权限移交控制权。
- Worker 必须在主线程重连后保持原地运行，并在不重建资源的前提下完成状态重同步。
- 生命周期执行迁移到远程进程，网络重试、幂等键和结果补查成为正式协议要求。
- 双角色共享状态图持续导致角色分支难以阅读，且独立状态模型能够通过生成契约或模型测试证明不会漂移。

## 参考

- [ADR 0040](./0040-paired-typed-worker-rpc-contracts.md)
- [ADR 0042](./0042-engine-service-owns-generic-engine-resources.md)
