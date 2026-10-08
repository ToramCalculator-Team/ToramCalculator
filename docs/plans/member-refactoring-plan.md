# Member 重构和拆分计划

**状态**：进行中  
**创建时间**：2024  
**预期完成**：2-3 周  
**负责人**：开发团队

---

## 目录

- [整体目标](#整体目标)
- [当前状态分析](#当前状态分析)
- [拆分目标结构](#拆分目标结构)
- [实施阶段](#实施阶段)
- [风险和缓解措施](#风险和缓解措施)
- [验证清单](#验证清单)
- [时间估计](#时间估计)
- [提交策略](#提交策略)

---

## 整体目标

将当前 906 行的 Member 类拆分为清晰的三层聚合结构，提高模块内聚性和可维护性。

### 关键指标

- **Member.ts 行数**：从 906 行 → 60-80 行
- **职责明确**：Member 作为薄壳聚合根
- **测试覆盖**：三层各自有单元测试
- **性能**：Tick 性能无明显下降（±5%）
- **兼容性**：所有现有测试通过

---

## 当前状态分析

### Member.ts 结构（906 行）

```
身份与元数据：11 行
├─ id, type, name, campId, teamId, dataSchema, runtime, services

编排层字段：15 行
├─ actor, controlBehavior, effectBtManager, procBus, attributeThresholdSource

数据字段：10 行
├─ attributeContainer, statusStore, pipelineOverlays

服务注入字段：12 行
├─ domainEventSender, controlInputRecorder, 12+ 个 set* 方法

方法：~860 行
├─ 生命周期方法
├─ 初始化和环境创建
├─ 服务注入方法（12+）
├─ 事件派发和状态管理
├─ 控制输入处理
├─ 移动处理
├─ Pipeline 执行
├─ Checkpoint
└─ 多个私有辅助方法
```

### 主要问题

1. **职责过重**：包含数据、计算、编排三层的所有逻辑
2. **服务注入混乱**：12+ 个 `set*` 方法
3. **方法散落**：相关逻辑分散在多个方法中
4. **依赖隐含**：各层之间的依赖关系不明确
5. **可测试性差**：难以单独测试各层的逻辑

---

## 拆分目标结构

### 新的文件结构

```
src/engine/core/World/Member/
├── Member.ts（聚合根，60-80 行）
│   └─ 持有三层 + 生命周期 + 公开接口
├── MemberDataLayer.ts（数据层，200-250 行）
│   ├─ AttributeContainer 管理
│   ├─ StatusStore 管理
│   ├─ SharedRuntime 管理
│   └─ 水平移动积分
├── MemberComputeLayer.ts（计算层，100-150 行）
│   └─ Pipeline 执行和 overlays 管理
├── MemberOrchestrationLayer.ts（编排层，400-500 行）
│   ├─ FSM 管理
│   ├─ ControlBehavior 管理
│   ├─ EffectBtManager 管理
│   ├─ ProcBus 管理
│   ├─ 行为模式管理
│   ├─ 控制输入处理
│   └─ 移动输入解析
├── types.ts（优化，新增三层 checkpoint 类型）
├── RuntimeServices.ts（优化）
└── MemberBaseSchema.ts（不变）
```

### 三层职责边界

| 层 | 持有内容 | 职责 | Tick 处理 |
|-----|---------|------|---------|
| **数据层** | AttributeContainer、StatusStore、SharedRuntime | 属性、状态、位置管理；水平移动积分 | 清理过期状态、同步标签、刷新脏值 |
| **计算层** | Pipeline overlays、PipelineResolverService | 管线执行、提供封闭计算环境 | 无（按需调用） |
| **编排层** | FSM、ControlBehavior、EffectBtManager、ProcBus | FSM 生命周期、控制输入、行为模式、移动输入解析 | FSM 和 BT 推进 |

---

## 实施阶段

### 阶段 1：准备和规划（2 天）

**目标**：建立基础、制定详细计划

#### 1.1 代码审计
- [ ] 列出 Member.ts 所有 public/private 方法
- [ ] 统计每个方法的行数和复杂度
- [ ] 识别方法之间的依赖关系
- [ ] 识别外部调用点

**产出**：方法清单表和依赖关系图

#### 1.2 创建开发分支
```bash
git checkout -b refactor/member-architecture
```

#### 1.3 创建 tracking issue
- [ ] 列出所有要修改的文件
- [ ] 列出所有外部调用点
- [ ] 列出风险和缓解措施

#### 1.4 补充现有测试
- [ ] 检查现有 Member 相关的测试覆盖率
- [ ] 补充缺失的关键路径测试

---

### 阶段 2：创建新的三层类（3-4 天）

#### 2.1 创建 MemberDataLayer

**文件**：`src/engine/core/World/Member/MemberDataLayer.ts`

**任务**：
- [ ] 创建类框架和构造函数
- [ ] 从 Member 抽取所有数据相关字段
- [ ] 抽取 `syncStatusTags` 逻辑
- [ ] 抽取 `applyStatusInstance` 和 `removeStatusByType`
- [ ] 抽取水平移动积分逻辑（`integrateHorizontalMovement`）
- [ ] 创建 `tick` 方法（清理、同步、刷新）
- [ ] 实现查询接口（`getPosition`、`getAttribute`、`getStatusTags`）
- [ ] 实现 checkpoint 方法
- [ ] 创建 `DataLayerCheckpoint` 类型
- [ ] 编写单元测试

**预期行数**：200-250 行

**关键代码片段**：
```typescript
export class MemberDataLayer<TExtraAttrKey extends string> {
  constructor(
    private readonly attributeContainer: AttributeContainer<MemberBaseAttrKey | TExtraAttrKey>,
    private readonly statusStore: MutableStatusInstanceStore,
    private readonly runtime: MemberSharedRuntime<TExtraAttrKey>,
    private readonly services: MemberRuntimeServices,
  ) {}

  tick(context: TickContext): void {
    this.statusStore.purgeExpired(context.currentTimeMs);
    this.syncStatusTags(context.currentTimeMs);
    this.attributeContainer.flushDirtyValues();
  }

  // ... 其他方法
}
```

#### 2.2 创建 MemberComputeLayer

**文件**：`src/engine/core/World/Member/MemberComputeLayer.ts`

**任务**：
- [ ] 创建类框架和构造函数
- [ ] 抽取 `runPipeline` 逻辑
- [ ] 抽取 pipeline overlays 管理
- [ ] 实现 checkpoint 方法
- [ ] 创建 `ComputeLayerCheckpoint` 类型
- [ ] 编写单元测试

**预期行数**：100-150 行

#### 2.3 创建 MemberOrchestrationLayer

**文件**：`src/engine/core/World/Member/MemberOrchestrationLayer.ts`

**任务**：
- [ ] 创建类框架和构造函数
- [ ] 抽取 FSM env 创建逻辑
- [ ] 抽取 BT capabilities 创建逻辑
- [ ] 抽取控制输入处理逻辑（`submitInput`）
- [ ] 抽取行为模式管理（`setBehaviorMode`）
- [ ] 抽取移动输入解析（`resolveMovementInput`）
- [ ] 实现 tick 方法（FSM update、BT 推进）
- [ ] 实现查询接口（`isAlive`、`getFsmState`、`getActiveEffectState`）
- [ ] 实现 checkpoint 方法
- [ ] 创建 `OrchestrationLayerCheckpoint` 类型
- [ ] 编写单元测试

**预期行数**：400-500 行

**关键方法**：
```typescript
tick(context: TickContext): void {
  this.actor.send({ type: "update", timestamp: context.currentTimeMs });
  
  const movementInput = this.resolveMovementInput(context);
  if (movementInput) {
    // 注意：这里只是解析，实际积分由数据层完成
    this.dataLayer.integrateHorizontalMovement(movementInput, context.deltaTimeMs);
  }
  
  this.effectBtManager.tickAll();
  
  if (this.behaviorMode === 'autonomous') {
    this.controlBehavior?.step();
  }
}
```

---

### 阶段 3：重构 Member 聚合根（2 天）

#### 3.1 精简 Member.ts

**文件**：`src/engine/core/World/Member/Member.ts`

**任务**：
- [ ] 删除所有三层字段（移到三层类）
- [ ] 更新构造函数创建三层实例
- [ ] 删除所有 12+ 个 `set*` 注入方法
- [ ] 删除 `runPipeline`（委托给 compute layer）
- [ ] 删除 `createStateMachineEnv`、`createBtCapabilities` 等初始化方法
- [ ] 删除 `applyStatusInstance`、`syncStatusTags`、`removeStatusByType`
- [ ] 删除 `submitExternalControlInput`、`setControlMode`
- [ ] 删除 `resolveMovementInput`、`integrateMovement`、`faceDirection`
- [ ] 删除 `declareState`、`refreshPresentationState` 等 presentation 相关
- [ ] 删除 `dispatchStatusEnteredFact`、`dispatchStatusExitedFact`
- [ ] 保留：身份、查询接口、`submitControlInput`、tick、checkpoint
- [ ] 更新 Member 类文档
- [ ] 编写集成测试

**新的 Member 结构**：
```typescript
export abstract class Member<...> implements WorldObservable {
  // 身份字段（保留）
  readonly id: string;
  readonly type: MemberType;
  readonly name: string;
  readonly campId: string;
  readonly teamId: string;

  // 三层聚合（新增）
  private readonly dataLayer: MemberDataLayer<TExtraAttrKey>;
  private readonly computeLayer: MemberComputeLayer;
  private readonly orchestrationLayer: MemberOrchestrationLayer<...>;

  // 生命周期（简化）
  start(): void;
  tick(context: SimulationTickContext): void;

  // 被动查询接口（保留）
  get position(): Vector3;
  get alive(): boolean;
  getAttribute(key: string): number;
  getFsmState(): string;
  getActiveEffectState(): EffectState | null;

  // 命令入口（保留）
  submitControlInput(event: MemberControlEvent, source: 'external' | 'autonomous'): void;

  // Checkpoint（保留）
  captureCheckpoint(): MemberCheckpoint;
  restoreCheckpoint(checkpoint: MemberCheckpoint): void;
}
```

**预期行数**：70-100 行

#### 3.2 更新类型定义

**文件**：`src/engine/core/World/Member/types.ts`

**任务**：
- [ ] 创建 `DataLayerCheckpoint` 类型
- [ ] 创建 `ComputeLayerCheckpoint` 类型
- [ ] 创建 `OrchestrationLayerCheckpoint` 类型
- [ ] 更新 `MemberCheckpoint` 包含三层 checkpoint

---

### 阶段 4：更新外部调用点（3-5 天）

#### 4.1 识别调用点

```bash
# 查找直接访问 runtime 的地方
grep -rn "member\.runtime\|member\.attributeContainer" src/engine --include="*.ts" | grep -v test | grep -v "Member\.ts"

# 查找调用 set* 方法的地方
grep -rn "member\.setControlMode\|member\.setDomainEventSender\|member\.set" src/engine --include="*.ts" | grep -v test

# 查找调用数据方法的地方
grep -rn "member\.applyStatusInstance\|member\.syncStatusTags\|member\.runPipeline" src/engine --include="*.ts" | grep -v test
```

#### 4.2 按模块更新

**MemberManager.ts**：
- [ ] 更新成员初始化逻辑
- [ ] 移除所有 `member.set*` 方法调用
- [ ] 确保使用新的查询接口

**World.ts**：
- [ ] 更新 member.tick 调用
- [ ] 更新 presentation state 相关代码（应该已不存在）

**GameEngine.ts**：
- [ ] 更新属性读取方式
- [ ] 更新状态读取方式

**其他子系统**（DamageSystem、AreaManager、SpaceManager）：
- [ ] 验证只通过公开接口访问
- [ ] 确保直接发送事件给 FSM，不调用 Member 方法

#### 4.3 主要改动参考表

| 原代码 | 新代码 | 说明 |
|--------|--------|------|
| `member.setDomainEventSender(...)` | 构造期注入 | 依赖注入改为构造期 |
| `member.setPipelineResolverService(...)` | 构造期注入 | 同上 |
| `member.setControlMode('ai')` | `member.orchestrationLayer?.setBehaviorMode('autonomous')` | 或直接不调用，通过初始化指定 |
| `member.runPipeline(...)` | `member.computeLayer?.runPipeline(...)` | 委托给 compute layer |
| `member.applyStatusInstance(instance)` | 通过 FSM 或直接在适当位置处理 | 数据层职责 |
| `member.runtime.xxx` | `member.dataLayer?.runtime.xxx` | 或通过公开查询接口 |
| 直接修改 Member 属性 | 通过相应层的接口或发送事件给 FSM | 统一规范 |

#### 4.4 特别处理的调用点

**设置 EventCatalog**（当前 `member.setEventCatalog`）：
- [ ] 改为构造期注入或初始化时调用

**设置 DomainEventBus**：
- [ ] 改为构造期注入

**属性查询**（如 `member.attributeContainer.getValue`）：
- [ ] 统一改为 `member.getAttribute(key)` 或保留但通过 dataLayer 访问

#### 4.5 提交 commit

逐个文件或按模块提交：
```bash
git commit "refactor: update MemberManager to use new Member interfaces"
git commit "refactor: update World to use new Member interfaces"
git commit "refactor: update GameEngine to use new Member interfaces"
git commit "refactor: update DamageSystem to use new Member interfaces"
# ... 其他模块
```

---

### 阶段 5：清理和优化（1-2 天）

#### 5.1 代码审查

- [ ] 代码风格一致性检查（运行 biome）
- [ ] 注释完整性检查
- [ ] 类型定义完整性检查
- [ ] 导出声明检查

#### 5.2 测试补充

- [ ] 为 MemberDataLayer 编写单元测试
- [ ] 为 MemberComputeLayer 编写单元测试
- [ ] 为 MemberOrchestrationLayer 编写单元测试
- [ ] 为 Member 聚合根编写集成测试
- [ ] 运行全套引擎测试：`pnpm vitest run src/engine/core`

#### 5.3 性能验证

- [ ] 运行性能基准测试（tick 性能）
- [ ] 对比重构前后的性能数据
- [ ] 验证 checkpoint 序列化性能
- [ ] 验证内存占用

```bash
# 运行基准测试
pnpm vitest run src/engine/core --reporter=verbose
```

#### 5.4 文档更新

- [ ] 更新 Member 类文档和注释
- [ ] 创建三层类的文档
- [ ] 更新 `src/engine/AGENTS.md` 相关部分
- [ ] 更新引擎架构设计文档
- [ ] 更新 README 或相关开发指南

#### 5.5 最终检查

- [ ] 运行 `pnpm typecheck` 全项目类型检查
- [ ] 运行 `pnpm biome check src/engine` 代码风格检查
- [ ] 运行 `pnpm vitest run src/engine/core` 全套测试
- [ ] 手动测试关键流程（模拟、伤害计算、状态转换等）

---

## 风险和缓解措施

### 主要风险

| 风险 | 影响程度 | 可能性 | 缓解措施 |
|------|---------|--------|---------|
| 外部调用点过多，改动范围大 | 高 | 高 | 使用搜索工具系统地找出所有调用点，建立清单，分批更新验证 |
| 三层类型系统复杂，编译错误多 | 高 | 中 | 逐个文件创建和更新，边创建边编译验证，不一次性改完 |
| 现有测试覆盖不足，隐藏的 bug | 中 | 中 | 阶段 1 补充关键路径测试，拆分后补充三层单元测试 |
| Tick 性能回退，模拟变慢 | 高 | 低 | 运行性能测试对比，如有退步则分析原因并优化 |
| 兼容性问题导致其他模块崩溃 | 中 | 中 | 保持公开接口兼容性，必要时添加过渡层，渐进式迁移 |
| Member 子类（Player/Mob）改动不完整 | 中 | 中 | 编译检查会捕获，添加集成测试验证子类功能 |
| 分支冲突或意外改动 | 低 | 中 | 频繁 push，定期 rebase，清晰的 commit 消息 |

### 缓解策略

1. **小步快跑**：每个小改动都编译验证一次
2. **充分测试**：每完成一个阶段就运行相关测试
3. **频繁提交**：每个逻辑单元作为一个 commit
4. **及时 review**：可以在局部完成后请同事 review
5. **文档同步**：改动时同步更新注释和文档

---

## 验证清单

### 编译验证
- [ ] `pnpm typecheck` 全项目通过
- [ ] `pnpm biome check src/engine` 全部通过
- [ ] 无 TypeScript 错误

### 功能验证
- [ ] `pnpm vitest run src/engine/core` 现有测试全部通过
- [ ] MemberDataLayer 单元测试通过
- [ ] MemberComputeLayer 单元测试通过
- [ ] MemberOrchestrationLayer 单元测试通过
- [ ] Member 集成测试通过
- [ ] 手动测试：正常模拟流程
- [ ] 手动测试：伤害计算和受击
- [ ] 手动测试：技能施放
- [ ] 手动测试：状态转换（跳跃、腾空、落地）
- [ ] 手动测试：行为模式切换

### 结构验证
- [ ] Member.ts 行数：60-80 行
- [ ] 三层各自职责明确
- [ ] 无循环依赖
- [ ] 代码风格一致
- [ ] 注释完整

### 性能验证
- [ ] Tick 性能无明显下降（±5%）
- [ ] Checkpoint 序列化性能无明显下降
- [ ] 内存占用无明显增加
- [ ] 模拟流畅度正常

---

## 时间估计

| 阶段 | 任务 | 人天 | 备注 |
|------|------|------|------|
| 1 | 准备和规划 | 2 | 代码审计、分支创建、补充测试 |
| 2 | 创建三层类 | 3-4 | DataLayer、ComputeLayer、OrchestrationLayer |
| 3 | 重构 Member | 2 | 删除旧逻辑、创建三层实例、简化接口 |
| 4 | 更新外部调用 | 3-5 | 系统地找出并更新所有调用点 |
| 5 | 清理优化 | 1-2 | 代码审查、测试补充、文档更新 |
| **总计** | | **11-15** | **约 2-3 周** |

### 并行可能性

- 阶段 2 的三个子任务可以部分并行（不同开发者同时创建三个类）
- 阶段 4 的不同模块可以并行更新

---

## 提交策略

### 分步 commit

```bash
# 创建分支
git checkout -b refactor/member-architecture

# 阶段 2：创建三层类（每个类一个 commit）
git add src/engine/core/World/Member/MemberDataLayer.ts
git commit "feat: create MemberDataLayer with data management responsibilities"

git add src/engine/core/World/Member/MemberComputeLayer.ts
git commit "feat: create MemberComputeLayer with pipeline execution"

git add src/engine/core/World/Member/MemberOrchestrationLayer.ts
git commit "feat: create MemberOrchestrationLayer with FSM and orchestration"

# 阶段 3：重构 Member
git add src/engine/core/World/Member/Member.ts src/engine/core/World/Member/types.ts
git commit "refactor: simplify Member as aggregation root, delegate to three layers"

# 阶段 4：更新外部调用（按模块）
git add src/engine/core/World/MemberManager.ts
git commit "refactor: update MemberManager to use new Member interfaces"

git add src/engine/core/World/World.ts
git commit "refactor: update World to use new Member interfaces"

# ... 其他模块

# 阶段 5：测试和文档
git add src/engine/core/World/Member/*.test.ts
git commit "test: add unit tests for three layers"

git add docs/
git commit "docs: update architecture documentation"
```

### PR 提交

**PR 标题**：
```
refactor(engine): decompose Member into three layers (data, compute, orchestration)
```

**PR 描述**：
```markdown
## Changes

Decomposes the 906-line Member class into a clear three-layer structure:
- **MemberDataLayer** (200-250 lines): Manages attributes, status, runtime state
- **MemberComputeLayer** (100-150 lines): Executes pipelines
- **MemberOrchestrationLayer** (400-500 lines): Orchestrates FSM, BT, control
- **Member** (60-80 lines): Lightweight aggregation root

## Rationale

- Improves code organization and single responsibility
- Reduces Member complexity from 906 to ~80 lines
- Clarifies dependencies between layers
- Enables independent testing of each layer

## Testing

- [x] All existing tests pass
- [x] New unit tests for three layers
- [x] Integration tests for Member
- [x] Manual testing of key flows

## Performance

- Tick performance: ±0% (no regression)
- Checkpoint serialization: ±0% (no regression)
- Memory usage: ±0% (no regression)

## Related

Closes #XXX (if applicable)
```

---

## 完成后清理

根据 AGENTS.md，当计划完成时：

- [ ] 删除此计划文档：`docs/plans/member-refactoring-plan.md`
- [ ] 如果有架构决策需要长期保留，提取为 ADR（在 `docs/decisions/`）
- [ ] 更新相关的概念文档和代码注释
- [ ] 更新 Code Map（`project_code_map_write`）

### 建议的 ADR（如果需要）

如果重构中产生了重要的架构决策（超出此计划范围），创建 ADR 记录：
- Member 作为薄壳聚合根的设计决策
- 三层边界划分的原则
- 外部与 Member 交互的规范

---

## 附录：快速参考

### 核心职责对照表

| 原 Member | 新位置 | 调整 |
|-----------|--------|------|
| `id`, `type`, `name` | Member | 保留 |
| `runtime` | MemberDataLayer | 变为私有，通过接口访问 |
| `attributeContainer` | MemberDataLayer | 变为私有，通过接口访问 |
| `statusStore` | MemberDataLayer | 变为私有，通过接口访问 |
| `actor` | MemberOrchestrationLayer | 移动 |
| `controlBehavior` | MemberOrchestrationLayer | 移动 |
| `effectBtManager` | MemberOrchestrationLayer | 移动 |
| `procBus` | MemberOrchestrationLayer | 移动 |
| `pipelineOverlays` | MemberComputeLayer | 移动 |
| `runPipeline()` | MemberComputeLayer | 委托 |
| `tick()` | Member | 简化为协调三层 |
| `submitControlInput()` | Member | 保留，委托给编排层 |
| `get position()` | Member | 保留，委托给数据层 |
| `getAttribute()` | Member | 保留，委托给数据层 |

### 关键 API 变化

```typescript
// 旧 API
member.runPipeline(name, params);
member.setControlMode('ai');
member.applyStatusInstance(instance);
member.runtime.position;

// 新 API
member.submitControlInput(event, source);
member.position;  // getter
member.getAttribute(key);
member.getFsmState();
member.getActiveEffectState();
member.actor.send(event);  // 直接发送事件给 FSM
```

---

**文档完成日期**：待更新  
**最后修改**：制定阶段
