# 0046 - 业务工作流编译为通用引擎执行与记录契约

- **状态**: Accepted
- **日期**: 2026-07-17
- **决策层**: 跨层（应用用例 / 引擎服务 / Worker 协议 / 运行时记录）
- **相关代码**: `src/features/character/preview/`、`src/features/simulator/`、`src/lib/engine/core/`
- **相关 ADR**: Refines 0024、0028；Depends on 0042

## 决策问题

Simulator 的设计、验证、分析循环和 Character 技能预览都会调用战斗引擎，但它们需要的执行方式、记录内容和结果解释不同。系统需要决定由 Engine 的配置与协议直接枚举这些业务用途，还是由应用层把业务工作流编译为只包含引擎机制和技术记录要求的通用契约。

## 决策驱动

- EngineService 和 Worker 基础设施不能因新增业务阶段或预览用例而扩展模式枚举。
- Member、技能、伤害、Tick 和输入判决属于引擎权威事实，业务摘要、RunRecord 和预览报告属于应用解释。
- 逐 Tick 状态历史成本高且依赖共享内存，不需要它的任务不能被迫承担该成本和环境门槛。
- 实时投影、执行推进和运行记录具有不同生命周期，不能由一个 `outputPolicy` 同时表达。
- 跨线程请求与结果必须保持可验证、可复现且不依赖调用方名称。

## 候选方案

### A. Engine 直接枚举业务运行模式

- 优点：调用方只需选择 `realtime`、`analysis` 或 `preview` 等预设。
- 缺点：Engine 必须理解业务用途；新增用例会修改底层协议，同一字段还会混合执行、投影和记录职责。

### B. 所有执行统一生成完整状态历史

- 优点：结果形状固定，任何调用方都能事后查询完整状态。
- 缺点：不需要历史的 Character 预览也会持续写 SAB，并让通用 EngineService 无条件依赖跨源隔离。

### C. 应用层编译通用执行机制与技术记录策略

- 优点：Engine 只理解场景、推进、停止、预算和记录能力；业务层独立决定用途并解释原始事实。
- 缺点：应用层必须显式构造任务和记录策略，并校验业务所需事实是否完整。

## 决议

选择 C：**设计、验证、分析和预览等业务工作流必须在应用层编译为通用引擎执行契约；EngineService、Worker 协议和 GameEngine 不得使用业务用途模式决定执行或输出。**

1. 引擎运行配置只描述推进方式、停止条件、外部输入、逻辑频率和时间参数，不包含 `previewSafe`、`returnPreviewReport`、`collectTickAnalysisHistory` 等业务模式。
2. 执行记录策略独立于运行配置；当前只区分是否记录每个 Tick 的状态历史。输入判决、技能释放和伤害继续作为通用运行事实。
3. Simulator 实操验证显式请求逐 Tick 状态历史，并在建立 RunRecord 前断言历史存在；Character 技能预览不请求状态历史，只解释输入判决、伤害和任务统计。
4. 实时 UI 投影继续由独立的快照推送频率控制，不通过执行记录策略表达。
5. Engine 使用“Tick 状态历史”等技术术语；“Tick 分析快照”、分析范围、摘要和对比只属于 Simulator 业务层。
6. StatContainer 可以提供与消费者无关的索引读取契约，但不能以 Analysis、Preview 或具体 Writer 命名，也不能承担输出归一化策略。
7. SharedArrayBuffer 能力只在请求逐 Tick 状态历史的功能边界校验，不能阻止不使用该能力的 EngineService、实时句柄或模拟任务启动。

## 代价

任务和实时运行开始接口需要显式携带记录策略，Engine 输出中的状态历史也必须允许为空。SimulatorSession 必须把“验证运行一定有完整历史”维护为自身不变量。业务层与引擎层使用不同术语后，文档和诊断工具需要明确“状态历史是分析查询的数据来源”，不能把两者重新合并成同一模式。

## 重新评估条件

- 多种调用方需要独立选择大量运行事实，当前单一状态历史开关无法保持清晰契约。
- Engine 迁移到远程执行服务，需要由服务端固定产出集合而不能接受调用方记录策略。
- Character 或其他非 Simulator 用例开始需要完整 Tick 状态历史，并形成与 Simulator 不同的保留或传输生命周期。

## 参考

- [ADR 0024](./0024-interactive-simulator-session-and-tasks.md)
- [ADR 0028](./0028-capture-tick-snapshots-before-ui-throttling.md)
- [ADR 0039](./0039-character-skill-preview-uses-fsm-authoritative-branches.md)
- [ADR 0042](./0042-engine-service-owns-generic-engine-resources.md)
- [ADR 0044](./0044-store-tick-state-history-in-sab-segments.md)
