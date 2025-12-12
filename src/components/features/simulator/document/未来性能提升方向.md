## 引擎 WASM / SAB 改造策略（草案）

> 本文档只描述方向与阶段性策略，不是实现细节规范。  
> 目标：在不打乱现有架构的前提下，为后续 Rust+WASM 与 SAB 改造打好“接口与数据结构”的基础。

---

### 1. 当前架构与瓶颈概述

- **运行位置**
  - 游戏引擎 `GameEngine` 运行在 `Simulation.worker` 中（见 `Simulation.worker.ts`）。
  - 主线程通过 `SimulatorPool` → 通用 `WorkerPool` 调度和与 Worker 通信。

- **帧循环与快照**
  - `FrameLoop` 以目标 FPS（当前 60）推进：
    - 每帧调用 `GameEngine.createFrameSnapshot()` 生成完整帧快照。
    - 再通过 `GameEngine.sendFrameSnapshot()` → `postSystemMessage(..., "frame_snapshot", snapshot)` 发送到主线程。
  - `postSystemMessage` 目前会对所有数据走：
    - `sanitizeForPostMessage`（`JSON.stringify` + `JSON.parse` 或深度清洗）  
    - 再交给 `postMessage` / 结构化克隆。

- **现状特征**
  - **高频**：约 60 次/秒的 `frame_snapshot` 推送。
  - **数据量大且结构复杂**：
    - 包含完整 `engine` KPI、事件队列统计；
    - 所有成员序列化数据 + 状态机快照 + buff / attrs / 技能可用性等。
  - 这意味着：当前真正的开销热点，主要在 **大对象构造 + JSON 清洗 + 结构化克隆 + GC**，而不在“是不是 WASM”。

---

### 2. Rust + WASM 总体策略

#### 2.1 整体目标

- 中长期，将“战斗模拟核心”抽象成一个可以：
  - 编译到 **WASM（浏览器端）**；
  - 同时编译为 **原生（CLI / Server / 桌面版）** 的 Rust crate。

- 短期不强制把全部逻辑搬到 Rust，而是：
  - 保留现有 **TS + XState** 的行为/状态机体系；
  - 重点抽离可纯计算的部分，为未来 Rust 接管做边界设计（`BattleConfig` / `BattleResult`）。

#### 2.2 并发与 Worker 策略

- **浏览器端的并发** 继续由 TS 层负责：
  - 使用现有 `WorkerPool` / `SimulatorPool` 进行任务调度与并发管理。
  - 每个 Worker 内只运行一个模拟器实例（JS 或未来的 Rust+WASM 混合实现），负责：
    - 单场战斗或一批战斗的完整模拟。

- Rust+WASM 引入后：
  - Worker 内部只新增一条“调用 wasm 核心模拟”的路径；
  - 不在第一阶段把“任务并发调度”也搬到 wasm，多线程 wasm/SAB 等放在后续阶段考虑。

---

### 3. 分阶段改造计划

#### Phase 0：稳定 TS 引擎与快照结构（当前阶段）

**目标**：在 TS 世界中，把“战斗快照”的语义与形状稳定下来，为 Rust/SAB 做铺垫。

- 保持现有核心模块：
  - `GameEngine` / `FrameLoop` / `MessageRouter` / `MemberManager` 等结构不做大改。

- 明确并固定 **一帧快照真正需要的字段**：
  - 引擎级别 KPI（`frameNumber`、`runTime`、`averageFPS` 等）。
  - 成员级别：
    - 基本属性：`HP/MP`、`isAlive`、位置/朝向、阵营、队伍、目标 ID 等。
    - buff 状态：buff ID、剩余时间、层数等。
    - 技能状态：技能 ID、等级、MP/HP 消耗、冷却剩余时间、`isAvailable` 等。

- 要求：
  - `FrameSnapshot` 中 **只包含可结构化克隆的基础类型 / 普通对象 / 数组**：
    - 禁止把 actor、本地闭包、复杂 Proxy 等直接塞进去；
    - 需要时，只提取 **快照值（例如状态枚举、上下文字段的快照）**。

> 这一阶段的结果：即便不引入 WASM/SAB，单用 TS 也能比较清晰地说明“一帧快照”的语义，未来迁移时只需约束字段，而不重写业务。

---

#### Phase 1：优化现有 Worker 通信（仍不启用 SAB）

**目标**：在不动整体架构的前提下，降低 60fps 快照传输的开销，为后续 SAB 做准备。

- 通信策略调整：
  - 为 `frame_snapshot` 引入 **快速路径**：
    - 前提：`FrameSnapshot` 结构本身已经被约束为“可结构化克隆”；
    - 对于 `frame_snapshot`，在 `postSystemMessage` 中**不再强制 `sanitizeForPostMessage(JSON)`**，直接 `postMessage`。

- 数据粒度调整（可选但推荐）：
  - 将 UI 使用的状态拆分为两层：
    - **高频轻量快照（60fps）：**
      - 面向渲染：位置、朝向、HP/MP 百分比、动画状态、少量 buff 标记、技能是否可用等。
      - 只包含渲染和即时响应（属性条、buff 动效、技能可用状态）真正需要的字段。
    - **低频完整快照（例如 10fps 或按需）：**
      - 包含更全的调试/分析信息（完整 buff 列表、详细 attrs 等），用于 UI 面板和调试。

- 预期收益：
  - 仍然使用结构化克隆，但对象体积与 JSON 清洗频率下降；
  - 可以在不引入 SAB 的情况下，先验证：  
    - 当前瓶颈是否在“数据传输/GC”；
    - 如果性能已经足够，SAB 可以推迟到真正需要时再做。

---

#### Phase 2：Rust + WASM PoC（单场战斗）

**目标**：验证 Rust 核心模拟的可行性与性能，保持边界简单。

- 设计统一接口（概念层面）：
  - `BattleConfig`：一场战斗的完整输入（阵营、成员、初始属性、技能配置、随机种子等）。
  - `BattleResult`：一场战斗的输出（总伤害、时间线关键事件、胜负信息、统计数据等）。

- 首版 WASM 接口形式（KISS）：
  - `simulate_once(config_json: string, seed: u64) -> result_json`
  - 内部使用 Rust + `serde_json`，不急着做二进制/TypedArray 编解码。

- TS 侧接线方式：
  - 在 `Simulation.worker` 内部增加一条“调用 wasm 模块”的路径（旁路测试）：
    - 保留现有 TS 引擎逻辑作为基准；
    - 通过同样的 `BattleConfig` / `BattleResult` 结构，对照输出与性能。

> 这一阶段的重点是 **验证“重运算场景（如自动寻优）下的性能收益”**，而不是立刻替换所有框架逻辑。

---

#### Phase 3：批量模拟 + 自动寻优（仍使用 JSON / 对象边界）

**目标**：在引入 Rust+WASM 之后，支撑遗传算法 / 退火等高强度批量模拟需求。

- 扩展 WASM 接口：
  - `simulate_batch(configs_json: string, seeds_json: string) -> result_json`
    - 一次性处理多套配置或多次采样；
    - 降低 JS ↔ WASM 边界的切换次数。

- TS 端策略：
  - 使用现有 `WorkerPool` / `batchSimulatorPool` 分发“候选配置”的批量任务；
  - 优化算法（GA / 退火等）仍然写在 TS 层，由 TS 负责多 worker 调度。

- 边界保持简单：
  - JS ↔ WASM 仍然只用 JSON / 结构化对象；
  - 不在这一阶段就上 SAB/二进制，以免过早绑定布局。

---

#### Phase 4：SAB 全量快照（高频 UI 通信专用）

**适用前提**：  
只有在完成 Phase 1~3 后，并通过实际 profiling 确认：

- 高频 UI 状态同步（frame_snapshot）仍然是明显的性能瓶颈；
- 对 60fps 属性/buff/技能可用状态的实时性有强需求；

才进入此阶段。

**设计方向**：使用 `SharedArrayBuffer`（SAB）作为 **“统一的高频全量快照通道”**。

- 前置条件：
  - 站点需要配置 `crossOriginIsolated`（COOP/COEP 或等效 header）以启用 SAB。

- 内存布局设计（示意思路）：
  - 约定最大成员数（例如 72）、最大 buff 数/技能数上限；
  - 设计一个固定结构：
    - 成员表：`members[MaxMembers]`，每个成员一个固定大小 slot（HP、MP、位置、阵营、状态等）。
    - Buff 表：可以为每成员分配 `MaxBuffPerMember` 个固定槽，或全局 buff 数组 + 索引。
    - 技能表：同理为每成员 / 每技能预留固定槽，用于存放冷却、可用状态等。
  - 使用 TypedArray（`Float32Array` / `Int32Array` / `Uint16Array` 等）映射到 SAB。

- 双缓冲 / 版本号机制：
  - 为避免“半写半读”的撕裂问题：
    - 方案 A：双缓冲（A/B 两块 SAB 或两个视图），Worker 写完一帧后 flip；
    - 方案 B：单缓冲 + 帧号/版本号字段，UI 只读取两个相同版本号之间的数据。

- 与 Rust 的协同：
  - 未来 Rust 模拟器可以直接写到这块共享内存（或 WASM 线性内存的一段再映射到 SAB）：
    - Worker 内部只负责“把 Rust 内部状态 flush 到 SAB 布局”；
    - 主线程渲染逻辑只需按约定布局读取，不关心数据来源是 TS 还是 Rust。

> 这一阶段的收益是：  
> - **接口与架构层面简单统一**：UI 固定从 SAB 读取最新帧，而不是处理复杂的增量消息。  
> - **性能层面减少 60fps 大对象复制和 GC 压力**：写入/读取都变成对 TypedArray 的原地操作。

---

### 4. 取舍原则与实践建议

- **优先保持架构与边界清晰**：
  - 先把 `BattleConfig` / `BattleResult` / `FrameSnapshot` 等“语义层”的结构稳定下来；
  - 再逐步优化实现细节（JSON → 结构化克隆 → SAB → 二进制布局）。

- **避免过早微优化**：
  - 在没有 profiling 数据前，不急着一次性做 SAB / 多线程 WASM / 全二进制协议；
  - 保持每一步都能在较短时间内验证收益，并能随时回滚。

- **TS 与 Rust 的类型/结构尽量对齐**：
  - 优先从现有 zod / DB schema 中抽象“战斗相关的最小必要集”；
  - 确保这些结构用 TS interface 和 Rust struct 都能自然表达。

- **调试体验要留后门**：
  - 即便上了 SAB / 二进制布局，也应该保留：
    - 一个“调试模式”，可以把当前 SAB / WASM 状态 decode 成 JS 对象，方便日志与断点分析；
    - 一些慢但易读的路径，只在开发或 Debug 时开启。

---

### 5. 实施顺序（简化版 Checklist）

1. **现在即可做的**：
   - 精简并固定 `FrameSnapshot` 字段，禁止不可序列化对象进入快照。
   - 为 `frame_snapshot` 引入“跳过 JSON 清洗”的快速路径，只用结构化克隆。

2. **有余力时可以开始的**：
   - 用文字/类型定义清楚 `BattleConfig` / `BattleResult` 的最小必要结构。
   - 在 TS 内部模拟使用这两类结构，减少与 UI/DB 的耦合。

3. **性能/功能需要时再做的**：
   - Rust+WASM PoC：`simulate_once` + `simulate_batch` JSON 接口。
   - 自动寻优时接入批量接口，放在 `batchSimulatorPool` 上跑。
   - 确认高频帧同步是瓶颈后，按上文方案设计 SAB 布局与双缓冲。

> 日后改动：  
> - 若实际实现与本策略不一致，建议在此文档中以“变更记录”的方式写明原因与决策时间点。


