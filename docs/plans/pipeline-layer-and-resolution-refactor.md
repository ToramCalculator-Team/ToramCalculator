# 管线层级化与解析缓存重构计划

**状态**: 待执行  
**预计工作量**: 3-4 天  
**核心决策**: 管线按 world → camp → team → member → skill 分层的层节点持有解析结果；子层在父层结果上叠加自己的 overlay，只重建变更层及其后代；缓存键取层链身份而非指令内容

## 问题诊断

1. **解析发生在每次调用**：`PipelineResolverService.resolveAndRun` 先无条件执行 `resolve`（复制基础指令、排序 overlay、逐 operation 复制、`JSON.stringify` + djb2 哈希），再查编译缓存。实测 `resolve` 5.2–14.6µs，`compilePipeline` 0.04–0.09µs，指令执行约 8.4µs——缓存省下的是最小的一项。
2. **缓存的目的与架构不符**：`compiledCache` 是 Worker 级基础设施（`Simulation.worker.ts:175-187`），而 `GameEngine` 也是模块级单例，`reset` 只清仿真层。跨 `GameEngine` 复用不存在；它真正提供的共享只在单次运行内，且是用解析后的内容换来的。
3. **32 位内容哈希有碰撞风险**：djb2 截断到 32 位，碰撞会静默取用另一套编译结果。确定性模拟中这是正确性问题。
4. **层叠结构不完整**：`PipelineOverlay.scope` 声明 `"member" | "skill"`，但只有 `"member"` 被产生（`installPipelinePatches.ts:58`）；排序里 `scope === "member" ? 0 : 1` 是当前唯一的层叠实现。camp / team / world 三层在数据模型里已有承载（`MemberManager` 的阵营队列表、成员上的 `campId` / `teamId`），但管线不感知。
5. **`revision` 的契约与实现不符**：`overlay.ts` 声明 revision 变更用于触发缓存失效，但 `hashInstructions` 只吃 `pipelineName` 与指令内容，revision 仅参与排序，且 `installPipelinePatches.ts` 硬编码为 `1`。
6. **锚点缺失静默降级**：`applyOverlayOperation` 在 `insertAfter` / `insertBefore` 找不到锚点时追加到末尾，`replaceInstruction` / `removeInstruction` / `replaceOperand` 找不到时原样返回。锚点源自配置数据，写错时表现为“技能少了半条效果”而不是装配失败。

## 关键设计

### 1. 层链

管线覆盖按五层组织，层链自上而下，子层优先级高于父层：

```
world            （场景级规则）
  └ camp        （阵营级）
      └ team    （队伍级）
          └ member   （成员自身：装备、托环、被动）
              └ skill:<skillId>   （该技能私有）
```

层链在调用上下文中确定。`member` 与 `skill` 两层是**每个成员 / 每个技能各一个节点**，`world` / `camp` / `team` 是共享节点——这正是层叠语义要求的效果：父层规则只解析一次，全部后代继承。

`skill` 层是**每个技能一个独立子层**，技能 A 的规则不影响技能 B。因此同一次调用的层链是 `world → camp → team → member → skill:<id>`，链长固定为 5，其中 `skill` 节点的身份由调用方（发起该次计算的技能上下文）决定。

`overlay.scope` 字段删除：层归属由**拥有该 overlay 的层节点**决定，不再由 overlay 自述。排序规则相应改为层链位置 → `priority` → `revision` → `id`。

### 2. 层节点持有解析结果

每层一个节点，节点按管线名持有该层链位置上的解析产物：

```typescript
// src/engine/core/Pipeline/PipelineLayer.ts
export interface ResolvedPipelineEntry {
  readonly instructions: readonly PipelineInstruction[];
  readonly compiled: CompiledPipeline;
  /** 构造该条目时各层节点的 revision，用于失效判定。 */
  readonly provenance: readonly LayerRevision[];
}

export class PipelineLayer {
  readonly kind: PipelineLayerKind;   // "world" | "camp" | "team" | "member" | "skill"
  readonly id: string;
  private overlays: readonly PipelineOverlay[] = [];
  private revision = 0;
  private readonly entries = new Map<PipelineName, ResolvedPipelineEntry>();
}
```

子层解析 = **父层 `instructions` + 自身的 operations**，而不是重放整条链。这是层叠模型自带的收益：子层只应用自己的增量。

按需构建：某条管线在某层从未被调用过就不产生条目。存储量上界是 `层节点数 × 实际调用的管线数`。

### 3. 缓存键取层链身份

条目记录构造时的 `provenance`（各层节点 revision）。取用时自顶向下比对，**任一层 revision 变化即视为失效，从第一个变化的层重建**，祖先的 `instructions` 直接复用。

键是 `(层链身份, pipelineName)`，不是解析后的指令内容。因此：

- 不需要 `JSON.stringify` + djb2 遍历指令，键长度取决于层数而非指令数
- 没有 32 位碰撞风险
- 跨成员的共享发生在语义上应共享的层（world / camp / team），成员层不再互相干扰
- `revision` 回到 `overlay.ts` 原本声称的语义，由层节点自己的计数器提供

`PipelineResolverService` 相应地不再持有 `compiledCache` / `getOrCompile` / `hashInstructions`，`ResolvedPipeline.signature` 与 `trace` 一并删除（全仓无消费方）。

### 4. 失效触发点

| 层节点 | 归属 | 变更来源 |
|--------|------|---------|
| world | `World` | 场景级 overlay（新增承载位，见第 5 条） |
| camp / team | `MemberManager` | 阵营 / 队伍级 overlay（同上） |
| member | `Member` | `pipelineOverlays` 的三个写入点：`installPipelinePatches.ts:74` / `:80`、`Member.ts:702` |
| skill | 技能的 overlay 承载方 | 技能 overlay 的安装与卸载（新增承载位） |

每个节点的 overlay 集合收为 `private`，写入统一走该节点的方法并递增 `revision`。失效点因此唯一且可定位。

### 5. 层级承载位的准备

`world` / `camp` / `team` / `skill` 四层当前没有 overlay 数据来源，但层节点必须真实存在且不特例化——空集合是合法状态，不是分支。本次只准备承载位：

- `World` 持有 world 层节点
- `MemberManager` 持有 camp / team 层节点（与既有 `camps` / `teams` 注册表同生命周期）
- `Member` 持有 member 层节点；skill 层节点按 `skillId` 惰性创建于所属成员

`world` / `camp` / `team` 层的 overlay 数据来源（场景 schema 字段、DB 表）本次不定义。`EngineScenarioSchema` 是否需要 `worldOverlays` / `campOverlays` / `teamOverlays` 字段，等出现真实数据来源时再定。

### 6. 与状态收集共用层身份

`MemberStateHistory` 的成员描述符已带 `campId` / `teamId`，`worldStateBuffer` 的成员布局尚未带。管线侧需要的是稳定、可比较的层身份，状态收集侧需要的是同一个身份用于聚合。两处应共用一份 `LayerRef` 定义（`kind` + `id`），避免各自维护一套层命名。

本次只提取类型并把管线侧改用该类型；`worldStateBuffer` 是否补写层字段、状态收集如何按层聚合，属于 SAB 改造计划的范围，不在本计划内。

### 7. 锚点缺失显形失败

`applyOverlayOperation` 中所有“找不到锚点 / 目标”分支改为抛错，错误信息含 `pipelineName`、overlay 的 `sourceId`、缺失的锚点或 target。overlay 是配置数据，配置错误必须在装配阶段暴露。

### 8. `env` 构造（相邻项，先实测再决定）

`Member.runPipeline`（`Member.ts:615-668`）每次调用都新建 `env`，内含约 8 个闭包。除 `damageTags` 外都由成员级稳定状态决定。本计划**只记录不实施**，先量出它在 `runPipeline` 总耗时中的占比再决定是否上移到成员构造期。

## 基础管线预先编译

`PipelineCatalog` 的基础定义不可变且 Worker 级共享，可以在构造时对全部基础管线各编译一次。这是唯一无需层链参与的编译：任何层链都以它为起点。省下子层构建时的重复编译。

## 实测数据

`damageCalc`，Node 24，20000 次迭代取均值：

| overlay 数 | 完整 `resolveAndRun`（缓存命中） | 仅 `resolve` | 仅 `compilePipeline` |
|---|---|---|---|
| 0 | 13.6 µs | 5.2 µs | 0.09 µs |
| 1 | 15.3 µs | 7.1 µs | 0.09 µs |
| 3 | 18.1 µs | 9.6 µs | 0.04 µs |
| 6 | 24.0 µs | 14.6 µs | 0.07 µs |

目标是把 5.2–14.6µs 的 `resolve` 与全部 `compilePipeline` 从调用路径移到层节点构建路径，并把触发条件收敛为层 revision 变化。

## 实施步骤

1. **提取层身份**：定义 `LayerRef`（`kind` + `id`）与 `PipelineLayerKind`，管线侧改用该类型。
2. **实现 `PipelineLayer`**：overlay 集合私有化 + 写入方法递增 `revision`；按管线名懒构建 `ResolvedPipelineEntry`；自顶向下的 `provenance` 失效判定。
3. **改造 `PipelineResolverService`**：删除 `compiledCache` / `getOrCompile` / `hashInstructions` / `signature` / `trace`；解析改为接收层链、返回子层在父层结果上叠加后的指令序列。
4. **删除 `PipelineOverlay.scope`**，排序规则改为层链位置 → `priority` → `revision` → `id`。
5. **接上层节点**：`World` 建 world 节点；`MemberManager` 建 camp / team 节点；`Member` 建 member 节点并把三个 `pipelineOverlays` 写入点改为走层节点方法；skill 层节点按 `skillId` 惰性创建。
6. **基础管线预编译**：`PipelineCatalog` 构造时编译全部基础管线。
7. **锚点缺失抛错**：`applyOverlayOperation` 各找不到分支改为抛错。
8. **更新文档**：`Pipeline/` 模块文档、`World.md`、`GameEngine.md` 的管线叙述改为层链模型。
9. **补测试**：
   - `PipelineResolverService`：基础解析、各 operation 语义、锚点缺失抛错、层内排序
   - `PipelineLayer`：层链叠加顺序、provenance 失效（父层变更触发后代重建）、祖先结果复用、空 overlay 集合的层不改变结果
   - 当前 `Pipeline/` 下只有 `InstructionParser.test.ts`，`Resolver` 与 `Compiler` 无测试
10. **复测**上表与多成员场景，确认 `runPipeline` 单次耗时下降到指令执行量级，且成员数增加不带来线性解析成本。

## 验收标准

- [ ] 管线按 world → camp → team → member → skill 五层组织，子层覆盖父层
- [ ] skill 层为每个技能独立子层，技能 A 的 overlay 不影响技能 B
- [ ] 层链在调用上下文确定，链上各节点持有自己的 overlay 集合与 revision
- [ ] 解析结果按层节点持有，子层只在父层结果上叠加自身增量
- [ ] 缓存失效由层 revision 驱动：变更层及其后代重建，祖先结果复用
- [ ] 管线编译与 overlay 解析不在 `Member.runPipeline` 的调用路径上
- [ ] 仓库中不存在按指令内容计算的管线签名
- [ ] `PipelineOverlay.scope` 删除，层归属由层节点决定
- [ ] world / camp / team / skill 层以空集合形式真实存在，不特例化
- [ ] 管线与状态收集共用同一份层身份类型
- [ ] overlay 锚点或目标缺失时抛错，错误信息含 `pipelineName` 与 `sourceId`
- [ ] `trace` 与 `signature` 从解析结果中移除，无残留消费方
- [ ] `PipelineResolverService` 不再持有跨调用状态
- [ ] 基础管线在 catalog 构造时编译，不参与层链构建

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| 失效点遗漏导致沿用过期的已解析管线 | 各层 overlay 集合收为 private，编译器层面排除直接写入；测试覆盖“父层变更后子层重建”与“checkpoint 恢复后结果正确” |
| 五层节点增加对象数量与生命周期管理 | 层节点与既有实体同生命周期（World / MemberManager / Member），不引入新的生命周期；skill 层节点随技能上下文惰性创建 |
| 子层只叠加增量导致父层结果必须长期驻留 | 父层结果的存储量上界是 `层节点数 × 实际调用管线数`；按需构建，未调用的管线不产生条目 |
| 锚点缺失改为抛错后暴露既有配置错误 | 这是预期行为；逐个修正配置数据，不在解析层兜底 |
| 层身份在两处（管线 / 状态收集）漂移 | 共用同一份 `LayerRef` 定义；本次只提取类型，聚合逻辑归 SAB 改造计划 |
| 删除 `trace` 影响调试 | 无消费方；需要时在层节点上按需重建，不常驻调用路径 |

## 后续待定

- **`env` 构造开销**：见关键设计第 8 条，先实测再决定。
- **world / camp / team / skill 层的数据来源**：场景 schema 字段或 DB 表，等出现真实需求时定义。
- **`skillBranchActivators`**：托环已有 `skillBranchActivator` 声明（`BuiltInRegistlets.ts`），与 skill 层 overlay 同属技能作用域概念，是否统一到层节点上，待 skill 层落地后评估。
- **`worldStateBuffer` 的层字段**：与本计划共用层身份，具体编码归 SAB 改造计划。
- **是否需要 ADR**：本次结论为“管线覆盖按实体层级链式解析，解析结果由层持有、随层失效”。执行前按 `.agents/skills/architecture-decision-governance/SKILL.md` 判断是否达到 ADR 显著性门槛。

## 相关文档与 ADR

- `docs/decisions/0003-skill-cost-as-pipeline-contract.md`（管线计算、FSM 写回的边界，本次不改）
- `src/engine/document/hook与触发层设计讨论结论.md`（§2.2.1 管线 + overlay 承担 hook，本次把其中的“成员初始化时预插入”扩展为分层插入）
