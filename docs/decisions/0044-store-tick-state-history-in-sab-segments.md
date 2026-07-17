# 0044 - Tick 状态历史采用 SAB-only 分段增量存储

- **状态**: Accepted
- **日期**: 2026-07-16
- **决策层**: 跨层（引擎 / 通信 / 应用状态 / 部署）
- **相关代码**: `src/lib/engine/core/tickStateHistory.ts`、`src/lib/engine/core/runOutput.ts`、`src/lib/engine/core/thread/`、`src/features/simulator/simulatorSessionMachine.ts`、`vite.config.ts`
- **相关 ADR**: Refines 0028、0038；Depends on 0029、0046

## 决策问题

Simulator 的每条验证运行都需要把通用引擎 Tick 状态历史作为分析数据源，未来时间轴能够还原任意 Tick 的完整状态。当前逐 Tick 物化完整对象并在运行结束时一次性复制、重复校验全部历史，已经使结束验证和界面切换超过交互延迟预算。系统需要决定启用逐 Tick 状态记录时采用普通对象、可转移缓冲区，还是跨 Worker 共享的分段内存布局。

## 决策驱动

- 启用逐 Tick 状态记录后，每个 Tick 的状态必须精确可还原，不能通过降频、抽样或静默丢弃旧 Tick 换取性能。
- 参考负载下结束验证到分析面板可交互的 P95 必须不超过 1 秒，返回设计的 P95 必须不超过 100 ms。
- 增量编码必须发生在 Worker 运行期间，结束阶段不能重新遍历完整 Tick 历史。
- 运行中的历史仍由 Engine 独占管理，SimulatorSession 只接收完整运行结果。
- Engine 尚未确认移交前必须保留可重试的产出，SimulatorSession 拥有已接收 RunRecord 的业务生命周期。
- 系统只保留一种 Tick 状态历史存储与读取模式，不维护长期兼容分支。
- 跨线程结果需要运行时验证，但同一份历史不能在 Worker、线程客户端和 SimulatorSession 之间重复全量解析。

## 候选方案

### A. 保留逐 Tick 对象并在结束时结构化克隆

- 优点：沿用现有 `FrameSnapshot[]` 和 Zod 对象契约，调试直观。
- 缺点：相邻 Tick 重复保存属性元数据和 modifier 来源；结束时需要全量构造、复制和校验，主线程对象图与 GC 成本随运行时长增长。

### B. 使用分段增量 ArrayBuffer 并在结束时转移

- 优点：可以使用紧凑列式布局并通过 transfer 避免一次复制，且不要求跨源隔离。
- 缺点：转移后 Worker 缓冲区被 detach，无法直接保留同一份待确认产出用于重试；若保留副本会重新引入复制与双份内存，系统还需要维护与 SAB 不同的生命周期路径。

### C. 使用分段增量 SharedArrayBuffer

- 优点：Worker 与主线程读取同一物理分段，无需复制 Tick 数据；Worker 可以在确认前继续持有引用，Session 接收后直接按分段读取；紧凑缓冲区不会形成大规模普通对象图。
- 缺点：完整 Simulator 必须运行在 `crossOriginIsolated` 环境；共享内存布局需要显式版本、封闭协议和引用生命周期，部署、Service Worker 与外部资源必须满足 COOP/COEP 约束。

## 决议

选择 C：**启用逐 Tick 状态记录时只使用 SAB 承载分段增量历史；不需要状态历史的引擎执行不创建 Writer，也不承担共享内存环境门槛。**

1. `Tick 状态历史` 是通用引擎执行记录；Simulator 的 `Tick 分析快照` 是从该历史按需还原的业务查询语义，不要求每个 Tick 长期物化完整对象。
2. 记录策略为 `everyTick` 时，Worker 在每个 Tick 结算完成后直接写入历史分段；分段首 Tick 提供可独立解码的状态基准，后续 Tick 默认保存变化，任意目标 Tick 最多只需解码一个分段。
3. 增量以 Tick 结束后的权威状态投影为完整性来源。dirty bitmap 或变更通知只能缩小读取范围，不能成为是否记录某项变化的唯一事实。
4. 每个历史分段由独立 SAB 承载。Worker 可以写入开放分段；分段封闭后保持不可变，但运行期间不向 SimulatorSession 逐段发布。
5. 分段布局必须版本化，并将重复的成员、属性路径、表达式和 modifier 来源编码为稳定字典与引用。编码策略按数据列选择，不要求所有字段统一使用增量；固定且较小的数据列可以在测量证明满足性能和容量预算时连续全量记录。具体列布局、分段容量和压缩参数属于可测量后替换的实现选择。
6. Engine 检查点与 Tick 状态基准保持独立。两者可以共享分段索引或底层设施，但状态历史不携带可执行检查点，也不能代替完整引擎恢复状态。
7. 一条运行完整结束后，Engine 一次性向调用方提交由 SAB 引用和元数据组成的 `Tick 状态历史目录`，不复制分段承载的 Tick 数据。Engine 在 acknowledge 前继续保护待移交分段，确认后释放自己的引用。
8. Simulator RunRecord 以 `Tick 状态历史目录` 作为分析历史的唯一数据源，不再持有完整 `FrameSnapshot[]`。分析消费者按 Tick 或区间直接查询分段；解码结果属于临时投影，不能写回 RunRecord 或 SimulatorSession 形成第二份长期历史。
9. 打开分析面板和返回设计只改变业务阶段与视图，不得全量解码、复制或销毁状态历史。删除 RunRecord 或结束 SimulatorSession 时才释放对应目录及 SAB 引用。
10. 类型化写入器在逐 Tick 写入和分段封闭时维护内容不变量；主线程协议入口只对分段目录执行一次运行时验证，包括布局版本、运行身份、分段顺序、Tick 覆盖、字节范围和封闭状态。SimulatorSession 接收已验证的 RunRecord，不再重复解析历史；分析面板也不在打开时重新验证整条记录。
11. 完成边界不重新扫描 SAB 内容或计算全量校验和。Worker 与主线程属于同一应用运行边界，软件错误通过写入不变量、目录验证和测试暴露，不能用与历史长度成正比的重复读取替代正确构造。
12. Simulator 开始请求逐 Tick 状态历史的验证前必须显式断言安全上下文、`crossOriginIsolated` 和 `SharedArrayBuffer` 可用。通用 EngineService 和不记录状态历史的任务不执行该断言；请求方条件不满足时明确失败，不惰性降级到第二种记录模式。

## 代价

- 运行 Simulator 逐 Tick 验证的开发、预览和生产环境必须维持 COOP/COEP；不满足跨源隔离的宿主仍可执行不需要状态历史的引擎任务。
- 外部脚本、图片、模型、认证交互和 API 访问需要逐项验证 CORS/CORP 与 opener 行为。
- SAB 不会自动降低 Tick 编码成本或记录容量；仍需设计增量、字典、分段索引和显式内存释放。
- 同一分段内可能同时存在全量列和增量列，读取器必须通过布局版本解释编码，不能从字段种类隐式推断。
- 共享内存数据不能依赖普通对象级 Zod 深解析；协议需要区分可校验的分段描述符与由版本化布局保证的缓冲区内容。
- Session 不能通过再次解析完整产出来弥补线程协议类型不清；协议入口必须产出可被下游直接信任的已验证结果。
- 调试工具需要提供按需解码能力，不能依赖直接检查完整 `FrameSnapshot[]`。

## 重新评估条件

- 目标部署环境无法稳定提供跨源隔离，且该环境成为必须支持的产品范围。
- 分段增量布局达到性能预算后，SAB 相比可转移 ArrayBuffer 没有可测量收益，而跨源隔离持续造成关键功能不可用。
- Simulator 运行记录进入跨会话持久化或远程执行边界，SAB 不再是主要生命周期载体。
- 浏览器平台提供满足可靠移交、零复制共享和生命周期要求的新标准机制。

## 参考

- [ADR 0028](./0028-capture-tick-snapshots-before-ui-throttling.md)
- [ADR 0029](./0029-flat-typed-attribute-snapshot-contract.md)
- [ADR 0038](./0038-transfer-completed-run-output-to-simulator-session.md)
- [ADR 0046](./0046-compile-business-workflows-to-generic-engine-contracts.md)
- [Simulator 最小验证闭环](../plans/minimum-validation-loop.md)
- [Simulator Tick 状态历史 SAB 性能重构计划](../plans/simulator-tick-state-history-sab-performance.md)
