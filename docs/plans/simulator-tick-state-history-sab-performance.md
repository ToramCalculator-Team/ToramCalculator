# Simulator Tick 状态历史 SAB 性能重构计划

- **状态**: 代码已实施，待浏览器与性能验收
- **日期**: 2026-07-16
- **目标**: 消除验证结束到分析面板以及分析返回设计的历史数据长任务，同时保留每个 Tick 可精确还原的完整分析语义
- **相关决策**: ADR 0028、0029、0038、0040、0044
- **相关计划**: [Simulator 最小验证闭环](./minimum-validation-loop.md)

本计划只负责 Tick 状态历史的记录、跨线程移交、Session 持有、按需读取和性能验收。它不实现完整时间轴 UI，不改变 EngineCheckpoint 语义，也不把运行历史持久化到数据库。

## 问题基线

当前生产链路把分析语义和对象表示绑定在一起：

1. `GameEngine.runSingleTick()` 在每个 Tick 结算后调用 `createFrameSnapshot()`。
2. `createFrameSnapshot()` 为所有成员导出完整 `AttributeSnapshot` 对象；属性叶节点重复携带名称、表达式、基础值和 modifier 来源，`byController` 又重复绑定成员属性。
3. `RunOutputRecorder` 把所有对象追加到 `frames: FrameSnapshot[]`。
4. `finish()` 遍历全部帧改写相对 Tick 和时间，执行 `EngineRunOutputSchema.parse()`，再递归 `deepFreeze()` 整个产出。
5. Worker 结果经过消息准备和结构化克隆；主线程 `parseEngineRPCResult()` 再按完整 `EngineRunOutputSchema` 解析。
6. `simulatorSessionMachine.commitRunRecord` 对同一产出再次执行 `EngineRunOutputSchema.parse()`，随后把大型对象图纳入 Session 生命周期。
7. 分析面板当前摘要并不读取 `output.frames`，但结束阶段仍为未来时间轴完整支付对象构造、遍历、复制、校验和 GC 成本。

这条链路的成本随 Tick 数和成员属性数增长，直接对应两项已观察问题：结束验证后数十秒才打开分析面板，以及返回设计时数秒的主线程停顿。

## 目标数据流

```text
Tick 结算后的稳定引擎状态
  -> TickStateHistoryWriter 直接写开放 SAB 分段
  -> 分段基准 + 按列选择的增量或全量记录
  -> 分段封闭后保持不可变
  -> 运行结束时封闭最后分段并建立小型分段目录
  -> Worker RPC 返回普通运行事实 + Tick 状态历史目录
  -> 主线程协议入口验证目录一次
  -> SimulatorSession 建立 RunRecord 并确认移交
  -> 分析消费者按 Tick 或区间读取 SAB
```

实时 UI 保持独立链路：

```text
Tick 结算后的稳定引擎状态
  -> 仅在实时推送节流命中时构造 FrameSnapshot
  -> frame_snapshot push
  -> latestFrame
```

`FrameSnapshot` 可以继续作为实时 UI 投影类型，但不能继续作为历史存储、RunRecord 字段或分析事实源。

## 实施不变量

1. 每条 Simulator 运行都记录每个已完成 Tick；不能抽样、降频或静默丢弃旧 Tick。
2. 任意 Tick 的属性值、基础值、modifier 来源及其他纳入分析契约的成员状态都必须精确还原。
3. Tick 状态历史目录是 RunRecord 中唯一的 Tick 历史数据源；生产代码不并存 `FrameSnapshot[]`。
4. Worker 运行期间独占开放分段；主线程只能收到并读取已封闭分段。
5. 运行期间不向 SimulatorSession 逐段镜像；完整运行结束后一次性提交目录。
6. 分段首部提供独立分析基准，后续数据默认记录变化；固定且较小的数据列可以经测量后连续全量记录。
7. dirty bitmap、change journal 或版本号只能优化稳定状态比较，不能成为历史完整性的唯一事实源。
8. EngineCheckpoint 与 Tick 状态基准保持两个契约；实现可以共享索引设施，但不能互相替代。
9. Worker 构造时维护内容不变量；主线程只验证一次目录；Session 和分析界面不再全量解析同一历史。
10. 打开分析和返回设计不遍历、复制、验证或销毁 Tick 历史。
11. 完整 Simulator 强制要求安全上下文、跨源隔离和 SAB；不增加对象数组、ArrayBuffer 或功能降级分支。
12. Writer、Reader 和目录验证共同使用一份版本化布局定义；不得分别硬编码字段编号、列类型或含义。

## 所有权与生命周期

| 阶段 | 历史所有者 | 可写性 | 释放条件 |
|---|---|---|---|
| 活动运行 | Engine / Worker | 仅开放分段可写 | 取消运行时丢弃全部引用 |
| 已完成待移交 | Engine / Worker | 全部分段已封闭 | Session 确认接收后释放 Engine 引用 |
| 已接收待确认 | Engine 与 SimulatorSession | 只读 | acknowledge 成功后 Engine 释放；失败只重试确认 |
| Session 运行记录 | SimulatorSession | 只读 | 删除 RunRecord、切换 Simulator 或结束 Session |

SAB 没有应用级手动释放 API；这里的“释放”指所有者删除目录和缓冲区引用，使浏览器可以在引用归零后回收内存。返回设计不会删除 RunRecord，因此也不会释放或重建历史。

## 阶段 0：固定基线并验证 SAB 运行条件

### 工作项

- [ ] 用当前实现记录 30 秒、3 分钟和 10 分钟样本的结束耗时、返回设计耗时、主线程长任务、Worker 内存、主线程堆和 GC 表现，保存为迁移前基线。
- [x] 为开发、预览和生产顶层文档响应统一设置 `Cross-Origin-Opener-Policy: same-origin` 与 `Cross-Origin-Embedder-Policy: require-corp`；Service Worker 继续缓存并返回带原始响应头的导航响应。
- [ ] 审计外部脚本、图片、模型、字体、API 和认证跳转，确认它们满足 CORS/CORP 与 COOP 行为；不通过时修复资源交付方式，不引入历史存储兜底。
- [x] 在完整 Simulator 唯一启动入口显式断言 `isSecureContext`、`crossOriginIsolated`、`SharedArrayBuffer` 和 `Atomics`；读取能力的代码只做断言，不惰性启动基础设施。
- [ ] 增加真实主线程与 Simulation Worker 往返验证：主线程创建 SAB，双方通过 `Atomics` 观察同一值，证明本地开发链路不是只通过类型检查。
- [ ] 验证 `pnpm dev` 与生产构建预览都满足隔离条件；完整 `pnpm build` 已通过，实际响应头与浏览器能力留待浏览器验收。

### 阶段门槛

- localhost 开发环境和生产预览环境都满足 `crossOriginIsolated === true`。
- Worker/Atomics 往返成功，实际缓冲区没有被复制成普通 `ArrayBuffer`。
- 隔离失败在 Simulator 启动边界明确报错，不进入半可用运行状态。

## 阶段 1：建立唯一的历史布局契约与读写器

### 工作项

- [x] 在 Engine 状态历史模块定义版本化目录、分段描述符、字段 flags 和封闭状态；目录普通元数据使用严格 schema，SAB 内容由同一布局定义驱动 Writer 与 Reader。
- [x] 使用稳定字典编码成员身份、属性路径、展示名、表达式和 modifier 来源；每 Tick 数据只保存数值或稳定引用，不重复写入字符串对象。
- [x] 数值保持现有 JavaScript `number` 的 Float64 精度，没有引入更窄表示。
- [x] 每个分段写入完整分析基准；后续 Tick 对属性与 modifier 记录变化，成员位置作为固定小型列连续全量记录。
- [x] 相对 Tick 和相对模拟时间在写入时形成，结束阶段不再遍历历史改写时间。
- [x] Writer 只允许顺序追加 Tick，并通过 Atomics 在封闭时发布最终长度和覆盖范围；Reader 拒绝开放分段、未知版本、越界范围、Tick 缺口和重叠。
- [x] Reader 提供按单 Tick 与按区间读取的只读查询；两者都不暴露写入口，也不默认返回完整运行对象数组。
- [x] 已覆盖分段首尾、跨分段读取、modifier 来源和值变化、属性变化、成员位置变化和最后一个未满分段的往返测试。

### 阶段门槛

- 给定小型确定性场景，Reader 对每个 Tick 还原的分析状态与现有严格快照语义一致。
- Writer 与 Reader 不存在两份字段编号或列定义；修改布局版本时编译期迫使两端共同更新。
- 随机读取一个目标 Tick 最多解码一个分段，不从运行起点重放。

## 阶段 2：把 Tick 热路径切换为直接写 SAB

### 工作项

- [x] `RunOutputRecorder.start()` 根据技术记录策略按需创建 TickStateHistoryWriter，并让取消、完成、待确认和 acknowledge 生命周期与现有单槽产出状态一致。
- [x] 在 Tick 全部结算完成后，从稳定成员状态直接写入历史；不先调用 `createFrameSnapshot()`、`exportAttributeSnapshot()` 构造完整对象再编码。
- [x] StatContainer 提供历史写入所需的只读索引化投影，复用既有属性索引、数值存储和 modifier 来源，不建立第二套属性事实。
- [x] `createFrameSnapshot()` 只服务节流后的实时 UI push；历史捕获不依赖控制器绑定或 UI 选中状态。
- [x] 历史按成员身份保存规范状态，不再复制 `byController.boundMemberDetail.attrs`。
- [x] Simulator 验证显式请求 `tickStateHistory: "everyTick"`；不需要逐 Tick 状态的通用 SimulationTask 使用 `none`，不创建 Writer。
- [x] Worker 运行期间逐段封闭，结束时只封闭最后分段并生成目录；结束阶段不重新压缩或遍历全部 Tick。

### 阶段门槛

- Tick 热路径不再为历史创建 `FrameSnapshot`、属性对象树或 modifier 来源对象副本。
- 调整实时 UI 推送频率不会改变 Tick 状态历史。
- 每条正常结束的 Simulator 运行都可还原与已执行 Tick 数相同的连续分析状态。

## 阶段 3：切换完成协议与 Session 单一历史源

### 工作项

- [x] 用 `stateHistory` 分段目录替换 `EngineRunOutput.frames`；输入、技能释放和伤害事实继续使用现有普通数据契约。
- [x] Worker 消息准备把 SAB 视为共享原子载体，只克隆小型目录包装，不遍历或复制缓冲区内容。
- [x] `parseEngineRPCResult()` 在跨线程入口唯一验证目录版本、分段顺序、Tick 覆盖、字节范围和封闭状态；验证复杂度只与分段数相关。
- [x] `simulatorSessionMachine.commitRunRecord` 删除第二次 `EngineRunOutputSchema.parse()`，只检查活动 runId 和幂等业务不变量，并直接保存已经验证的输出。
- [x] 保持 ADR 0038 的确认顺序：Session 先建立 RunRecord，再 acknowledge；确认失败保留 Session 记录和 Engine 待移交引用，重试不重复创建记录。
- [x] 池化 SimulationTask 与常驻实时 Engine 继续复用 ADR 0040 的同一响应契约，没有增加第二套 SAB 响应解析器。
- [x] 协议切换已删除生产 `frames` 字段和兼容分支，没有使用 feature flag 双写。

### 阶段门槛

- 结束响应大小只随分段目录、输入和事件事实增长，不随 Tick 历史字节数线性增长。
- Session 中不存在 `FrameSnapshot[]` 或完整 Tick 对象图。
- 非法目录在协议入口失败；合法目录进入 Session 后不再被完整解析。

## 阶段 4：按需分析与界面生命周期

### 工作项

- [x] RunRecord 直接持有 Tick 状态历史目录，SimulatorSession 读面通过 Reader 提供唯一历史查询入口。
- [x] 当前结果摘要继续从 duration、damage、skillReleases 和 inputs 纯派生；打开分析面板不解码 Tick 历史。
- [x] 后续时间轴可以按 Tick 和区间查询；查询结果是临时投影，不写回 RunRecord 或 SimulatorSession。
- [x] 分析返回设计只保留业务阶段与视图切换，不遍历、解析、冻结、复制或清理 Tick 历史。
- [x] 只在 RunRecord 删除、Simulator 切换或 Session 结束时移除分段目录引用；现有 Session 生命周期测试继续覆盖多记录和切换。
- [x] 当前未引入解码缓存；未来只有性能数据证明必要时才增加有明确上限的非权威缓存。

### 阶段门槛

- 打开当前摘要分析时没有全量 Tick 解码。
- 返回设计的执行工作量不随运行时长、Tick 数或历史记录数线性增长。
- 连续保留三条运行、往返设计与分析后，三条记录仍能读取任意 Tick。

## 阶段 5：删除旧对象历史路径

### 删除清单

- [x] 删除 `ActiveRunOutput.frames`、`RunOutputRecorder.appendFrame()` 和结束阶段的 `active.frames.map(...)`。
- [x] 删除对完整 EngineRunOutput 执行的递归 `deepFreeze()`；普通小型事实在 Worker 结果克隆边界隔离。
- [x] 删除历史路径对 `FrameSnapshotSchema` 的依赖和 Session 的重复 parse。
- [x] 删除把 `byController` 或选中成员详细属性作为历史副本的代码；实时 UI 所需字段继续留在实时投影。
- [x] 更新仍断言 `output.frames` 的测试和输出策略；新断言使用目录 Tick 数和 Reader 还原结果。
- [x] 全仓搜索确认生产代码不存在 `EngineRunOutput.frames`、`collectFrameSnapshots` 和结束阶段全量历史遍历。

### 保留清单

- `FrameSnapshotSchema` 及 `frame_snapshot` push，作为实时 UI 的节流投影。
- `latestFrame`，作为当前实时视图而不是运行历史。
- 输入轨迹、成功技能、伤害事实和 RunRecord 与 DesignCopy 的关联。
- Engine 未确认移交前保护唯一待移交产出的幂等语义。

## 阶段 6：性能与回归验收

性能检查点只用于验证本计划结果，不建立新的业务状态或通用监控架构。至少记录“结束请求到分析可交互”和“返回设计请求到设计可交互”两个端到端耗时；Worker 内只聚合 Tick 历史写入与最终封闭耗时，不逐 Tick 产生性能事件。

代码已经使用标准 Performance Timeline 记录两个主线程端到端 measure，并在 Worker 内记录每条运行的 Tick 写入总耗时、最大单 Tick 耗时、封闭耗时、分段数和 SAB 分配/使用字节。自动化验证、Biome、TypeScript 与完整生产构建均已通过；下列短、中、长浏览器样本及 P95/内存验收仍待执行。

开发模式额外输出 `[Simulator][SharedMemory]`、`[Simulator][TickHistoryWriter]`、`[Simulator][Performance]` 和 `[Simulator][TickHistoryReader]` 四类结构化验收日志。Reader 日志在分析视图完成两次绘制后利用空闲时间抽样每个分段首 Tick 和整条记录末 Tick，不扫描完整历史，也不计入“结束请求到分析可交互”耗时；生产构建不输出这些日志。

### 样本与预算

| 样本 | 负载 | 用途 |
|---|---|---|
| 短 | 60 Hz、8 成员、30 秒 | 快速回归与错误定位 |
| 中 | 60 Hz、8 成员、3 分钟 | 观察分段增长和 GC 趋势 |
| 长 | 60 Hz、8 成员、10 分钟，同一 Session 保留 3 条 | 最终容量与交互验收 |

- 结束验证到分析面板可交互：P95 不超过 1 秒，单次不超过 2 秒，主线程无超过 200 ms 的结束任务。
- 返回设计到设计面板可交互：P95 不超过 100 ms，单次不超过 250 ms，主线程无超过 50 ms 的返回任务。
- 三条长记录同时保留时不得丢 Tick、覆盖旧记录、触发浏览器内存崩溃或把历史重新物化为普通对象图。
- 记录每条运行的 SAB 分配量、实际使用量、分段数、增量列与全量列占用，以及按需读取单 Tick 和区间的耗时。
- 如果某列在增量编码下 CPU 成本高且全量列仍满足容量预算，只调整该列编码和布局版本；不得回退到对象数组。

### 回归验证

- 运行 Tick 历史读写器、RunOutputRecorder、GameEngine、Worker 协议、SimulationTask、SimulatorSession 和分析器相关测试。
- 使用低频和高频实时快照设置运行相同输入，确认历史与摘要一致。
- 覆盖正常完成、取消、finish 重试、acknowledge 响应丢失、Session 切换和 Session 结束。
- 对相关 TS 路径运行 Biome；Vite、Service Worker 和响应头变更必须运行 `pnpm build`。
- 使用浏览器验证本地 `crossOriginIsolated`、Worker/Atomics 往返、分析打开和返回设计；只通过 Node 单元测试不构成完成。

## 完成条件

1. ADR 0044 的 SAB-only、分段、单次目录移交、单一历史源和一次验证约束全部进入生产路径。
2. 每个 Tick 的完整分析语义可通过 Reader 精确还原，实时 UI 节流不会改变历史。
3. 生产代码不再保存、移交或重复解析 `FrameSnapshot[]`，也不存在其他历史兜底模式。
4. 参考负载下结束分析和返回设计达到既定 P95、单次和长任务预算。
5. 本地开发、生产预览和 Service Worker 控制页面都保持跨源隔离，外部资源与认证流程通过回归。
6. 业务文档使用“Tick 分析快照”，引擎协议与代码使用“Tick 状态历史”和“Tick 状态历史目录”，并明确前者从后者按需还原。
