# GameSystem 运行时：暂停、状态捕获与状态应用

## 目标

在 `src/lib/Reactor` 的单进程运行时之上补齐三项能力：确定性重放、调度控制（暂停/恢复/单步）、状态捕获与应用。三者共用同一套标签序列，重放与暂停都不改变 tag 序列。

## 分层

| 层 | 职责 |
|---|---|
| 宿主（现 `GameEngine`） | 线程边界、SAB、控制面协议、配置、检查点序列化与版本迁移、运行记录 |
| `GameSystem`（壳） | 与模型无关的推进、时间、状态、观察接口 |
| `ReactorGameSystem extends App`（当前实现） | 网络根、输入采样器、tag 推进、暂停/恢复、单步、状态捕获与应用 |
| 观察者（`OutputCollector`） | tag 完成时读参数视图并写输出缓冲，不进入网络 |
| 网络节点（`InputSampler`、业务反应器） | 反应与端口，构成因果链 |

## 阶段

### P0 契约整理

删除混入游戏概念的结束条件：`StopPolicySchema` 中 `untilBattleEnd` 与 `untilMemberActionEnds`、`GameEngine.checkStopCondition`、`GameEngine.fastForwardSync` 的结束判定，以及 `executeSimulationTask` 里对 `untilMemberAiBehaviorEnds` 的引用。

引擎只保留两种终止来源：外部显式停止命令，以及运行预算（`maxTicks` / `maxDurationMs`）。游戏层需要「战斗结束」这类条件时，由游戏层节点在满足条件时调度停止动作。

退出：`src/engine` 不再出现游戏概念，`StopPolicySchema` 只保留 `manual` 与 `untilTimeMs`。

### P1 运行时最小扩展

`src/lib/Reactor/core/reactor.ts` 增加最小的受保护能力，四项都写在 `App` 内（`_next()`、`_popEvents()`、`_eventQ`、`_currentTag` 是 private）：

- `peekNextTag()`：返回队首事件 tag，队列为空时返回 `null`。
- `_stepToNextTag()`：单步包装，内部同步调用 `_next()` 直到逻辑时间推进或队列为空。
- `_startFrom({ startTime, tag, pendingEvents })`：从检查点启动，按固定顺序执行。
- `captureEventQueue()` / `restoreEventQueue()`：待处理事件的导出与重建。

`_startFrom` 的顺序：分析依赖 → 设起止时间 → 清空事件队列 → 按 `_endOfExecution` 重排 shutdown → `_advanceTime(tag)` → 注入事件 → 启动执行。第 2 步只遍历 `_timersToSchedule`，因此该集合无需清空；事件队列清空后必须补排 shutdown，否则结束判断永不成立。

恢复只接受已构造且未启动的实例，违反时抛错。

不需要 snooze 访问器：`_next()` 不被唤醒就不会重排 snooze，暂停清掉 `_alarm` 与 `_immediateRef` 即可。也不需要 `_startOfExecution` 访问器：`_determineStartAndEndOfExecution(startTime)` 已经是 protected。

事件用 `trigger._getFullyQualifiedName()` 作为稳定标识，配合 tag 与 value。

退出：spike 测试证明单步、暂停、恢复、检查点可用，且不改动既有测试结果。

### P2 GameSystem 运行控制

- `stepToNextTag()`：推进一个逻辑时间并排空全部微步
- `pause()` / `resume()`：暂停清除闹钟与即时调用并冻结物理时钟，恢复解冻并重放最后一次唤醒请求
- tag 完成通知：只在当前逻辑时间没有后续微步时发出

暂停与恢复作用在同一实例上：`_active` 在整个运行期间为 `true`，暂停不触碰它。

暂停分两个落点，两者都不修改共享缓冲的协议与布局：

| 效果 | 落点 | 执行侧 |
|---|---|---|
| 冻结 GameSystem | `pause()` 清闹钟与即时调用、冻结物理时钟 | Worker |
| 冻结输入写入 | 写入闭包在暂停时跳过 `write` | 主线程 |

顺序：引擎确认暂停后才能停止写入。暂停确认时刻是输入通道的截断点，此后不再有新数据进入；暂停前已写入但未消费的命令在恢复后按原顺序处理。

退出：暂停期间 `getCurrentPhysicalTime()` 不前进；恢复后的 tag 序列与不暂停时一致；暂停中控制器持续采样不会产生新的 SAB 写入。

### P3 状态捕获与应用

- 捕获：tag 完成通知内触发，输出 `startTime`、当前 `tag`、节点状态与待处理事件。
- 应用：新实例调用 `_startFrom`。`_determineStartAndEndOfExecution(startTime)` 用原始起点，随后清空它排出的 Timer 事件，按 `_endOfExecution` 重排 shutdown，`_advanceTime(tag)` 保留微步，注入待处理事件，再启动执行。

恢复只接受已构造且未启动的实例。已启动实例的 `_timersToSchedule` 已消费、`_reactionsAtStartup` 已装载、`_eventQ` 可能有在飞事件，再走一遍会双重排定。

这是跨运行的搬运，与同一实例内的暂停/恢复是两件事。

退出：运行 N 个 tag 后捕获，在新实例中恢复并继续，产出与不中断运行逐 tag 一致。

### P4 宿主壳收敛

- `GameEngine` 移除 `tickIndex`、`stepMs`、帧循环与漂移抛错，保留 SAB、协议、`runOutput`、检查点
- `logicHz` 与 `stepMs` 不再作为时间刻度，网络内周期由各 Timer 的 period 表达
- 控制面 `CMD_PAUSE` / `CMD_RESUME` / `CMD_STEP` 映射到 `GameSystem`
- `fastForwardSync` 改为运行时驱动

退出：`EngineService` 的既有用例通过；暂停期间输入 SAB 被持续写入也不影响恢复后的第一个 tag。

### P5 业务迁入网络

- `World.tick` 的职责拆成反应器节点，`InputSampler` 接入输入端口

退出：同一场景在检查点恢复与连续运行下结果一致；`tickStateHistory` 等帧模型遗留物删除。

## 暂停语义

暂停作用在同一实例上，与 `_start()` 对等。

物理时间由可注入的 `Clock` 提供（`time.ts:490`、`setClock`）。暂停时冻结时钟：`now()` 返回暂停时刻加已累计的暂停时长偏移，因此 `getCurrentPhysicalTime()` 不前进，反应里读到的经过时间连续。

暂停动作：记录待唤醒 tag；`_alarm.unset()`；清除 `_immediateRef`。snooze 不需要抑制：`_next()` 不被唤醒就不会重排。

恢复动作：解冻时钟；用 `super._setAlarmOrYield(记录下的 tag)` 重算睡眠时长，逻辑时间与物理时间的关系回到暂停前的状态。

暂停期间不接受输入：控制器照常采样自己的设备，但不再向输入缓冲写入；采样器定时器不触发。恢复后读取的是暂停前最后一份输入状态，命令区无积压，不存在容量溢出。

`Alarm` 内部用 `nowMonotonicMs()`（`performance.now()`）计时，与注入的 Clock 无关，因此暂停时必须丢弃这个 alarm 而不是保留它；恢复时重新设置即可，延迟由冻结后的物理时间重新算出，结果与未暂停时一致。

## 已知陷阱

| 陷阱 | 处理 |
|---|---|
| `_endOfExecution` 占用了当前 tag 的下一个微步 | 捕获不排在 shutdown 微步上，捕获在 shutdown 之前或普通 tag 上 |
| `_popEvents` 与 `schedule` 在执行结束后丢弃事件 | 恢复注入在清空事件队列、补排 shutdown 之后，`_startExecuting` 之前完成 |
| 清空事件队列会丢掉第 2 步排的 shutdown | 按 `_endOfExecution` 重排；字段仍在，不重排则结束判断永不成立 |
| `_active` 无复位路径 | 它是启动相位标志，暂停/恢复不触碰；跨运行搬运检查点时新建实例 |
| `_keepAlive` 的 snooze 由 App 内部发起 | 暂停清 `_alarm` 与 `_immediateRef`；snooze 不需要抑制 |
| 恢复时用 `tag.time` 作为起始时间 | 检查点保存原始 `startTime`；`_startFrom` 用它，随后设置当前 tag |
| `Alarm` 用 `performance.now()` 计时，与注入的 Clock 无关 | 暂停时 `unset()` 丢弃剩余时长，恢复时按冻结的物理时间重算延迟 |
