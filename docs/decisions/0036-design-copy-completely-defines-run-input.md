# 0036 - Simulator 设计副本完整定义运行输入

- **状态**: Accepted
- **日期**: 2026-07-12
- **决策层**: 跨层（数据 / 应用状态 / 引擎 / 分析）
- **相关代码**: `db/schema/models/data.prisma`、`src/routes/(app)/(features)/simulator/`、`src/lib/engine/core/thread/`
- **相关 ADR**: Supersedes 0025；Depends on 0027；Refines 0024

## 背景

原模型在可变设计草稿之外再为每次运行创建完整 RunSnapshot，并把随机种子、主控成员和分析范围作为运行时参数附加。引入完整 Simulator 设计副本后，一个副本已经包含可运行的数据图，并在产生运行记录后通过 copy-on-write 保持不变。继续保存 RunSnapshot 和 RunParameters 会重复同一设计边界，也会让运行输入分散在多个所有者中。

## 决策驱动

- 每条运行必须能够由一个设计身份完整解释全部可配置输入和分析口径。
- 同一结果影响参数不能同时存在于 Simulator、RunSnapshot 和临时运行参数中。
- Worker 协议必须是 DesignCopy 的纯派生传输形状，而不是第二个可编辑领域对象。

## 候选方案

### A. DesignCopy 之外继续创建 RunSnapshot 与 RunParameters

- 优点：延续现有冻结边界；单次运行可以临时覆盖随机种子、分析范围或主控成员。
- 缺点：Character 和 Simulator 数据重复；同一运行输入由多个对象拼装；临时参数无法从设计副本本身解释和比较。

### B. DesignCopy 完整定义运行，Worker 输入只做纯派生

- 优点：运行记录、设计差异和再次执行都指向同一个设计身份；不存在附加参数或 Character 版本缓存；相同副本与输入轨迹具有稳定语义。
- 缺点：随机种子、分析范围和主控配置等字段必须迁入 Simulator；需要不同随机样本时要显式创建或修改设计副本。

## 决议

选 B：**Simulator 及其本地 DesignCopy 完整包含所有会影响逻辑结果、手动控制语义或分析口径的可配置值；RunRecord 直接关联 DesignCopy，不再建立独立 RunSnapshot 或 RunParameters。**

1. Simulator 设计至少包含完整场景、成员配置与流程、随机种子、预期手动控制成员和分析范围；其他会改变逻辑结果的用户可配置值也必须归入同一设计。
2. DesignCopy 包含运行所需的完整数据图。副本一旦用于运行就保持原值，继续编辑通过 copy-on-write 产生新副本。
3. RunRecord 只关联产生它的 DesignCopy 和运行产出，不复制 Character、Simulator、随机种子或分析范围。
4. `EngineScenarioInput` 是从 DesignCopy 纯派生并跨线程传输的临时 payload，不是 Simulator 会话长期持有的领域实体。
5. 相同 DesignCopy 重复运行时保持相同随机种子；系统不得在运行开始时自动生成新种子。不同随机样本通过显式修改种子形成不同副本。
6. 分析范围由 Simulator 设计定义，首版默认当前主控 Player 对全部敌对成员；场景结构仍不受一对一人数限制。
7. 运行 ID、开始/结束、暂停、当前 Tick、输入轨迹、行动录制和结果属于运行事实，不进入 Simulator。
8. UI 节流、遥测频率、Worker 分块和其他不改变逻辑结果的执行策略属于运行时宿主或投影，不进入 Simulator。
9. 固定游戏规则属于引擎规则集；只有产品明确允许用户按方案改变的规则参数才进入 Simulator。

## 代价

Simulator schema 会承载更多完整设计字段，任何遗漏的结果影响参数都会破坏“副本完整定义运行”的不变量。用户若想采样多个随机种子，需要显式管理多个副本，不能依赖每次运行自动随机化。DesignCopy 到 Worker 的派生和结构化克隆仍会产生物理数据副本，但它不能再演变成第二个可编辑或长期缓存的领域对象。

## 重新评估条件

- 单次运行必须合法覆盖设计值，且覆盖本身不应成为可比较的设计事实。
- DesignCopy 的完整数据图过大，无法在会话和 Worker 边界维持可接受的复制成本。
- 产品引入持久运行历史，需要独立且可版本化的运行输入身份。

## 影响范围

- 删除 Simulator 会话层的 RunSnapshot、RunParameters 和相应 Character 版本缓存。
- RunRecord 以 `designCopyId` 解释输入差异；分析器读取 DesignCopy 与运行事实。
- 场景解析从 DesignCopy 一次产出逻辑 `EngineScenarioInput` 与 `worldResources`，二者共享同一设计副本身份。
- Simulator schema、默认数据和编辑 UI 增加随机种子、主控配置和分析范围。
- 实施与验收纳入 `docs/plans/minimum-validation-loop.md` 的数据收敛、会话、分析与再设计阶段。
