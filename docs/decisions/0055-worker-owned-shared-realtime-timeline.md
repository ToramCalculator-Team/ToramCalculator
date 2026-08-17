# 0055 - Worker 拥有共享实时会话时间轴

- **状态**: Accepted
- **日期**: 2026-08-17
- **决策层**: 跨层（引擎时钟 / Worker / 实时状态协议 / 渲染）
- **相关代码**: `src/engine/core/FrameLoop/`、`src/engine/core/thread/`、`src/platform/render/scene/`
- **相关 ADR**: Depends on 0050、0052；Refines 0053

## 决策问题

实时逻辑在 Simulation Worker 中执行，渲染在主线程 RAF 中执行。系统需要决定两者是分别根据本地回调间隔推进、由主线程 RAF 逐帧唤醒逻辑 Worker，还是共同读取一个权威实时会话时间轴并各自追踪该时间轴。这个选择必须保证逻辑 Tick 使用固定模拟步长，同时让渲染位置、区域轨迹和动作进度不受跨线程提交间隔抖动影响。

## 决策驱动

- 逻辑 Tick 的模拟步长必须固定，Worker 调度延迟不能进入规则系统的 `deltaTimeMs`。
- 成员位置、区域轨迹和动作动画必须按同一个逻辑时间推进，不能分别累加渲染 `deltaTime` 和最近提交时间。
- 主线程 RAF、Worker timer、GC 和页面后台调度都不能提供严格均匀的 wall-clock 回调，架构必须允许提交抖动。
- 实时状态保持 ADR 0050、0052 的 latest-state 语义，渲染器可以跳过中间提交，但必须能从任意完整提交继续当前表现。
- 时钟生命周期属于实时引擎运行，不应由是否附加渲染投影决定。

## 候选方案

### A. 主线程 RAF 同时驱动渲染并通过 SAB 信号唤醒逻辑 Worker

- 优点：前台显示刷新正常时，逻辑唤醒与渲染回调大致处于同一刷新周期。
- 缺点：Worker 完成提交与渲染读取之间没有顺序保证；主线程阻塞会同时阻塞逻辑唤醒；RAF 信号只表达调度事件，不能形成可供位置、区域和动画共同读取的时间映射。

### B. Simulation Worker 拥有 Real / Virtual / Fixed 分层时间，渲染读取共享时间轴映射

- 优点：逻辑按固定 Tick 推进；暂停、倍率和过载裁剪集中在 Virtual Time；渲染可以在每个 RAF 上按同一逻辑时间采样全部视觉状态；跨线程提交抖动由插值或有限外推吸收。
- 缺点：实时状态协议需要携带时钟映射；渲染器需要保留最近提交并计算渲染逻辑时间；Worker 过载时仍需明确追帧或放慢虚拟时间。

### C. 新增独立 Clock Worker，向逻辑 Worker 和渲染线程广播 Tick

- 优点：计时生命周期可以脱离逻辑计算和主线程 RAF。
- 缺点：广播到达时间仍然抖动，逻辑 Worker 忙时只能积压信号；渲染线程仍受 RAF 调度；新增第三个线程协议和确认关系，但不能提高固定步长语义或提供执行完成屏障。

## 决议

选择 B：**Simulation Worker 拥有实时会话的权威时间轴，并把同一时间轴映射随实时世界状态提交给渲染器；逻辑使用固定步长追踪该时间轴，渲染使用每帧计算出的单一渲染逻辑时间投影全部连续表现。**

确立以下不变量：

1. 实时时间分为三层：Real Time 只观测 Worker 单调时间；Virtual Time 负责暂停、倍率和可接受的最大 wall-clock 增量；Fixed Time 只把 Virtual Time 离散成固定 Tick。
2. `tickIndex` 是离散逻辑时间的权威序号；每次 `stepTick` 的 `deltaTimeMs` 固定为 `1000 / logicHz`。调度延迟只能改变一次驱动需要执行的 Tick 数，不能改变单个 Tick 步长。
3. Worker 的实时驱动只有一个。主线程 RAF tick signal 退出引擎协议；是否附加实时世界状态投影不得改变逻辑时钟来源。
4. 实时世界状态提交同时包含状态对应的 `logicalTimeMs`，以及可把渲染 wall-clock 映射到 Virtual Time 的时钟快照。时钟快照与成员、区域和动作状态受同一个提交序号保护。
5. 渲染器每个 RAF 只计算一次 `renderLogicalTime`。成员位姿、区域轨迹和成员动作进度全部读取它，不再分别使用 Babylon `deltaTime` 或最近提交的 `logicalTimeMs` 作为当前时刻。
6. 渲染器保留最近读到的完整提交进行插值；只允许有限外推。传送、实体代次变化和状态连续性中断必须丢弃旧插值关系。
7. 调度延迟超过单轮追帧预算时，系统舍弃超出的 Real Time 对 Virtual Time 的贡献，使虚拟时间放慢；不得用可变 `deltaTimeMs` 或跳过逻辑 Tick 追赶 wall-clock。舍弃量必须进入遥测。
8. 页面暂停、引擎暂停和时间倍率变化通过显式 Virtual Time 状态表达。渲染器不能在 Worker 已暂停后继续累计本地运动或动画时间。

以下实现可以替换而不改变本决策：Worker 使用 deadline `setTimeout`、`Atomics.waitAsync` 或其他单调调度 API；实时状态保存两个本地提交还是短环形提交；插值延迟和有限外推上限的具体数值。

## 代价

- 实时状态 SAB 布局需要升级，Worker、UI reader 和渲染器必须同步迁移。
- 为了吸收提交抖动，插值默认引入约一个固定 Tick 的显示延迟；降低延迟需要接受有限外推和校正。
- 浏览器暂停页面或 Worker 时仍无法提供硬实时保证；恢复后只能按 Virtual Time 策略显式放慢或重建时间映射。
- Worker 持续超过 Tick 预算时，虚拟时间会落后于真实时间；系统需要用遥测暴露该状态，而不是隐藏为不均匀 Tick。

## 重新评估条件

- 实时逻辑和 Babylon 渲染迁移到同一个 OffscreenCanvas Worker，可以建立固定更新完成后再渲染的严格帧屏障。
- 引入多个必须保持同一相位的实时逻辑 Worker，单个 Worker 所有的时间轴无法覆盖协调范围。
- 实测一个固定 Tick 的插值延迟无法满足交互预算，且有限外推的校正频率持续超过视觉质量预算。
- 实时会话改为服务端权威时间轴，本地 Worker 不再拥有推进速率和暂停语义。

## 参考

- [ADR 0050：实时状态的传输语义分类](./0050-realtime-state-transport-semantics.md)
- [ADR 0052：高频世界状态统一使用实时状态 SAB](./0052-realtime-world-state-uses-unified-sab.md)
- [ADR 0053：成员逻辑状态输出与渲染映射边界](./0053-logical-state-output-and-render-mapping.md)
- [实时世界状态 SAB 迁移计划](../plans/realtime-world-state-sab-migration.md)
