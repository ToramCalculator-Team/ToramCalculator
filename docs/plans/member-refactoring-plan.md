# Member 重构计划

**状态**：进行中  
**创建时间**：2024  
**预期完成**：1-2 周  
**负责人**：开发团队

---

## 目录

- [整体目标](#整体目标)
- [当前状态分析](#当前状态分析)
- [重构目标](#重构目标)
- [实施阶段](#实施阶段)
- [风险和缓解措施](#风险和缓解措施)
- [验证清单](#验证清单)
- [时间估计](#时间估计)
- [提交策略](#提交策略)

---

## 整体目标

重构当前 906 行的 Member 类，通过注释分割明确三层职责（数据层、计算层、编排层），精简冗余方法和依赖注入，提高代码的可读性和可维护性。

**核心原则**：不拆分为独立类，保持单类但通过注释和方法分组组织代码。

### 关键指标

- **Member.ts 行数**：从 906 行 → 300-400 行
- **职责明确**：通过注释清晰分割三层
- **方法分组**：按职责组织方法
- **依赖注入简化**：去掉 12+ 个 `set*` 方法
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

1. **职责不清晰**：数据、计算、编排三层逻辑混在一起
2. **服务注入混乱**：12+ 个 `set*` 方法
3. **方法散落**：相关逻辑分散在多个方法中
4. **冗余职责**：包含不应该由 Member 负责的逻辑
5. **可读性差**：906 行单文件，难以快速定位逻辑

---

## 重构目标

### 目标结构

```typescript
class Member<TExtraAttrKey, TSpecificEvent, TFSMContext, TRuntime> 
  implements WorldObservable 
{
  // ==================== 身份与元数据 ====================
  readonly id: string;
  readonly type: MemberType;
  readonly name: string;
  readonly campId: string;
  readonly teamId: string;
  readonly data: EngineMember;

  // ==================== 数据层：状态容器 ====================
  private readonly dataSchema: NestedSchema;
  private readonly attributeContainer: AttributeContainer<...>;
  private readonly statusStore: MutableStatusInstanceStore;
  private readonly runtime: TRuntime;

  // ==================== 计算层：管线 ====================
  private readonly pipelineOverlays: PipelineOverlay[] = [];
  private pipelineResolverService: PipelineResolverService | null = null;

  // ==================== 编排层：状态机与行为树 ====================
  private readonly actor: MemberActor<...>;
  private actorStarted = false;
  private behaviorMode: 'autonomous' | 'manual';
  private readonly controlBehavior: ControlBehaviorRuntime | null = null;
  private readonly effectBtManager: EffectBtManager<...>;
  private readonly procBus: ProcBus | null = null;

  // ==================== 依赖服务（注入） ====================
  private readonly services: MemberRuntimeServices;
  private readonly domainEventBus: DomainEventBus | null = null;

  // ==================== 构造与初始化 ====================
  constructor(...) { ... }

  // ==================== 生命周期 ====================
  start(): void { ... }
  tick(context: SimulationTickContext): void { ... }

  private tickDataLayer(context: SimulationTickContext): void { ... }
  private tickOrchestrationLayer(context: SimulationTickContext): void { ... }

  // ==================== 查询接口：数据层 ====================
  get position(): Vector3 { ... }
  getAttribute(key: string): number { ... }

  // ==================== 查询接口：编排层 ====================
  get alive(): boolean { ... }
  getFsmState(): string { ... }
  getActiveEffectState(): EffectState | null { ... }

  // ==================== 命令接口 ====================
  submitControlInput(event, source): void { ... }

  // ==================== 数据层私有方法 ====================
  private syncStatusTags(): void { ... }
  private integrateHorizontalMovement(movement, delta): void { ... }

  // ==================== 编排层私有方法 ====================
  private resolveMovementInput(context): MovementState | null { ... }
  private isAlive(): boolean { ... }

  // ==================== 计算层私有方法 ====================
  private runPipeline(name, params): PipelineResult { ... }

  // ==================== Checkpoint ====================
  captureCheckpoint(): MemberCheckpoint { ... }
  restoreCheckpoint(checkpoint): void { ... }

  // ==================== 域事件发布（内部） ====================
  private notifyDomainEvent(event: MemberDomainEvent): void { ... }
}
```

**预期行数**：300-400 行

### 关键修正点

#### 1. 移除 PresentationState 合成
- ❌ 删除 `refreshPresentationState()` 方法
- ❌ 删除 `presentationState` 字段
- ✅ 分别暴露 `getFsmState()` 和 `getActiveEffectState()`
- 渲染层自行决定如何使用这两个状态

#### 2. 移除 applyDamage 方法
- ❌ 删除 `applyDamage()` 方法
- ✅ 外部直接发送事件给 FSM：`member.actor.send({ type: "受到攻击", data })`
- 伤害处理完全在 FSM 内部

#### 3. 移除垂直运动相关方法
- ❌ 删除 `integrateTerrainHeight()` 方法
- ❌ 删除 `applyGroundConstraint()` 方法
- ❌ 删除 `notifyLanded()` 方法
- ✅ 垂直运动积分和落地检测在 FSM 内部处理

#### 4. 行为历史归属外部
- ❌ 删除 `controlInputRecorder` 相关逻辑
- ✅ Member 在执行动作时发布 `action_executed` 事件
- ✅ 外部 RunOutputRecorder 订阅并记录

#### 5. 控制模式改名
- `controlMode` → `behaviorMode`
- `controlled` → `manual`
- `ai` → `autonomous`

#### 6. 依赖注入简化
- ❌ 删除 12+ 个 `set*` 方法
- ✅ 构造期一次性注入所有依赖

#### 7. DomainEventBus 清理
- ❌ 移除 `state_changed` 事件（状态快照）
- ✅ 只推送瞬时事件（hit、death、cast_start、action_executed 等）

---

## 实施阶段

### 阶段 1：准备和规划（1 天）

**目标**：建立基础、制定详细清单

#### 1.1 代码审计
- [ ] 列出 Member.ts 所有 public/private 方法
- [ ] 标记哪些方法应该保留、修改、删除
- [ ] 识别外部调用点（特别是 `set*` 方法和内部字段访问）
- [ ] 列出需要删除的冗余职责

**产出**：方法分类清单

#### 1.2 创建开发分支
```bash
git checkout -b refactor/member-simplification
```

#### 1.3 补充现有测试
- [ ] 检查现有 Member 相关的测试覆盖率
- [ ] 补充缺失的关键路径测试（确保重构后能验证正确性）

---

### 阶段 2：重组 Member.ts（3-4 天）

#### 2.1 第一步：添加注释分割，整理现有代码

**任务**：
- [ ] 在 Member.ts 顶部添加清晰的注释分割
- [ ] 将现有方法按职责移动到对应区域
- [ ] 不删除任何方法，只重新组织

**验证**：
- [ ] 代码编译通过
- [ ] 所有测试通过

#### 2.2 第二步：删除冗余方法

**删除清单**：
- [ ] `refreshPresentationState()` - 改为分别暴露 FSM 和 effect BT 状态
- [ ] `presentationState` 字段
- [ ] `resolveFsmState()` 抽象方法（如果不再需要）
- [ ] `applyDamage()` - 外部直接发送 FSM 事件
- [ ] `integrateTerrainHeight()` - FSM 内部处理
- [ ] `applyGroundConstraint()` - FSM 内部处理
- [ ] `notifyLanded()` - FSM 内部处理
- [ ] `controlInputRecorder` 相关逻辑 - 改为发布 action_executed 事件
- [ ] `dispatchStatusEnteredFact()` - 整合到状态变更逻辑
- [ ] `dispatchStatusExitedFact()` - 整合到状态变更逻辑
- [ ] 其他不再需要的私有辅助方法

**验证**：
- [ ] 更新外部调用点（下一阶段）
- [ ] 编译检查未使用的方法

#### 2.3 第三步：简化依赖注入

**任务**：
- [ ] 删除所有 `set*` 方法（除非有充分理由保留）
- [ ] 调整构造函数，接收所有必需的依赖
- [ ] 或者创建 Builder 模式初始化（如果构造函数参数过多）

**删除的 set 方法**：
- [ ] `setDomainEventSender()`
- [ ] `setControlInputRecorder()`
- [ ] `setTargetResolver()`
- [ ] `setTargetDirectionResolver()`
- [ ] `setEvaluateExpression()`
- [ ] `setDamageExecutionHandlers()`
- [ ] `setGetCurrentTimeMs()`
- [ ] `setGetTickIndex()`
- [ ] `setPipelineResolverService()`
- [ ] `setEventCatalog()`
- [ ] `setControlMode()` - 改为构造期指定或通过其他方式
- [ ] `setAiMovementBehaviors()`

**验证**：
- [ ] 更新 MemberManager 和其他初始化代码
- [ ] 编译通过

#### 2.4 第四步：优化方法命名和接口

**任务**：
- [ ] 统一命名风格（getter vs 方法）
- [ ] 确保查询接口清晰（position、alive、getAttribute 等）
- [ ] 确保命令接口单一（submitControlInput）
- [ ] 添加必要的 JSDoc 注释

**新增/修改的接口**：
- [ ] `getFsmState(): string` - 返回当前 FSM 状态名称
- [ ] `getActiveEffectState(): EffectState | null` - 返回 active effect BT 状态
- [ ] 移除 `getPresentationState()` 或改为直接调用上面两个方法

**验证**：
- [ ] 编译通过
- [ ] 类型检查通过

#### 2.5 第五步：清理和格式化

**任务**：
- [ ] 删除未使用的 import
- [ ] 删除未使用的类型定义
- [ ] 运行 biome 格式化
- [ ] 检查注释完整性
- [ ] 验证最终行数（目标 300-400 行）

**验证**：
- [ ] `pnpm biome check src/engine/core/World/Member/Member.ts`
- [ ] 行数统计：`wc -l src/engine/core/World/Member/Member.ts`

---

### 阶段 3：更新外部调用点（2-3 天）

#### 3.1 识别调用点

```bash
# 查找调用 set* 方法的地方
grep -rn "member\.set" src/engine --include="*.ts" | grep -v test | grep -v "Member\.ts"

# 查找直接访问内部字段的地方
grep -rn "member\.runtime\.\|member\.attributeContainer\.\|member\.presentationState" src/engine --include="*.ts" | grep -v test | grep -v "Member\.ts"

# 查找调用已删除方法的地方
grep -rn "member\.applyDamage\|member\.integrateTerrainHeight\|member\.notifyLanded\|member\.refreshPresentationState" src/engine --include="*.ts" | grep -v test
```

#### 3.2 按模块更新

**MemberManager.ts**：
- [ ] 更新成员初始化逻辑（构造期注入依赖）
- [ ] 移除所有 `member.set*` 方法调用

**World.ts**：
- [ ] 移除 `member.integrateTerrainHeight()` 调用
- [ ] 垂直运动现在由 FSM 内部处理

**GameEngine.ts / Simulation.worker.ts**：
- [ ] 更新 presentation state 读取方式
- [ ] 改为分别读取 `member.getFsmState()` 和 `member.getActiveEffectState()`

**DamageSystem / DamageResolution**：
- [ ] 移除 `member.applyDamage()` 调用
- [ ] 改为直接发送 FSM 事件：`member.actor.send({ type: "受到攻击", data })`

**其他子系统**：
- [ ] 验证只通过公开接口访问成员
- [ ] 移除对私有字段的直接访问

#### 3.3 主要改动参考表

| 原代码 | 新代码 | 说明 |
|--------|--------|------|
| `member.setDomainEventSender(...)` | 构造期注入 | 依赖注入改为构造期 |
| `member.setControlMode('ai')` | 构造期指定 `behaviorMode: 'autonomous'` | 或通过配置 |
| `member.applyDamage(effect)` | `member.actor.send({ type: "受到攻击", data: effect })` | 直接发 FSM 事件 |
| `member.integrateTerrainHeight(groundY, tick)` | FSM 内部处理 | 删除外部调用 |
| `member.notifyLanded()` | FSM 内部处理 | 删除外部调用 |
| `member.presentationState.current` | `member.getFsmState()` + `member.getActiveEffectState()` | 分别读取 |
| `member.runtime.position` | `member.position` | 使用公开 getter |
| `member.attributeContainer.getValue(key)` | `member.getAttribute(key)` | 使用公开接口 |

#### 3.4 提交 commit

逐个文件或按模块提交：
```bash
git commit "refactor: reorganize Member with clear layer separation comments"
git commit "refactor: remove redundant Member methods (applyDamage, integrateTerrainHeight, etc)"
git commit "refactor: simplify Member dependency injection"
git commit "refactor: update MemberManager to use new Member initialization"
git commit "refactor: update World to remove Member.integrateTerrainHeight calls"
git commit "refactor: update damage system to send FSM events directly"
git commit "refactor: update presentation state readers to use new interfaces"
```

---

### 阶段 4：清理和验证（1 天）

#### 4.1 代码审查

- [ ] 代码风格一致性检查（运行 biome）
- [ ] 注释完整性检查
- [ ] 类型定义完整性检查
- [ ] 确认所有三层区域的方法都正确分组

#### 4.2 测试补充

- [ ] 补充 Member 查询接口的测试
- [ ] 补充 Member 生命周期的测试
- [ ] 验证 FSM 事件发送逻辑
- [ ] 运行全套引擎测试：`pnpm vitest run src/engine/core`

#### 4.3 性能验证

- [ ] 运行性能基准测试（tick 性能）
- [ ] 对比重构前后的性能数据
- [ ] 验证 checkpoint 序列化性能
- [ ] 验证内存占用

```bash
# 运行基准测试
pnpm vitest run src/engine/core --reporter=verbose
```

#### 4.4 文档更新

- [ ] 更新 Member 类顶部的 JSDoc
- [ ] 更新 `src/engine/AGENTS.md` 相关部分
- [ ] 更新引擎架构设计文档（如果有）
- [ ] 记录关键架构决策（考虑是否需要创建 ADR）

#### 4.5 最终检查

- [ ] 运行 `pnpm typecheck` 全项目类型检查
- [ ] 运行 `pnpm biome check src/engine` 代码风格检查
- [ ] 运行 `pnpm vitest run src/engine/core` 全套测试
- [ ] 手动测试关键流程（模拟、伤害计算、状态转换等）
- [ ] 验证最终行数在 300-400 行范围内

---

## 风险和缓解措施

### 主要风险

| 风险 | 影响程度 | 可能性 | 缓解措施 |
|------|---------|--------|---------|
| 删除方法导致外部调用崩溃 | 高 | 中 | 使用搜索工具系统地找出所有调用点，逐个验证 |
| 构造期注入导致初始化复杂 | 中 | 中 | 如果参数过多，考虑 Builder 模式或配置对象 |
| 现有测试覆盖不足，隐藏 bug | 中 | 中 | 阶段 1 补充关键路径测试 |
| Tick 性能回退 | 高 | 低 | 运行性能测试对比，重构应该只是代码组织不影响性能 |
| FSM 内部处理垂直运动的改动遗漏 | 高 | 中 | 仔细检查 FSM 定义，确保垂直运动逻辑完整 |

### 缓解策略

1. **小步快跑**：每个小改动都编译验证一次
2. **充分测试**：每完成一个阶段就运行相关测试
3. **频繁提交**：每个逻辑单元作为一个 commit
4. **代码审查**：可以在局部完成后请同事 review

---

## 验证清单

### 编译验证
- [ ] `pnpm typecheck` 全项目通过
- [ ] `pnpm biome check src/engine` 全部通过
- [ ] 无 TypeScript 错误

### 功能验证
- [ ] `pnpm vitest run src/engine/core` 现有测试全部通过
- [ ] 手动测试：正常模拟流程
- [ ] 手动测试：伤害计算和受击
- [ ] 手动测试：技能施放
- [ ] 手动测试：状态转换（跳跃、腾空、落地）
- [ ] 手动测试：行为模式切换

### 结构验证
- [ ] Member.ts 行数：300-400 行
- [ ] 三层注释分割清晰
- [ ] 方法按职责分组
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
| 1 | 准备和规划 | 1 | 代码审计、分支创建、补充测试 |
| 2 | 重组 Member.ts | 3-4 | 注释分割、删除冗余、简化注入、优化接口 |
| 3 | 更新外部调用 | 2-3 | 系统地找出并更新所有调用点 |
| 4 | 清理验证 | 1 | 代码审查、测试补充、文档更新 |
| **总计** | | **7-9** | **约 1-2 周** |

---

## 提交策略

### 分步 commit

```bash
# 创建分支
git checkout -b refactor/member-simplification

# 阶段 2.1：添加注释分割
git add src/engine/core/World/Member/Member.ts
git commit "refactor: reorganize Member code with clear layer separation comments"

# 阶段 2.2：删除冗余方法
git add src/engine/core/World/Member/Member.ts
git commit "refactor: remove redundant Member methods (presentationState, applyDamage, terrain integration)"

# 阶段 2.3：简化依赖注入
git add src/engine/core/World/Member/Member.ts
git commit "refactor: simplify Member dependency injection, remove set* methods"

# 阶段 2.4：优化接口
git add src/engine/core/World/Member/Member.ts
git commit "refactor: optimize Member public interfaces (getFsmState, getActiveEffectState)"

# 阶段 3：更新外部调用（按模块）
git add src/engine/core/World/MemberManager.ts
git commit "refactor: update MemberManager to use constructor-based Member initialization"

git add src/engine/core/World/World.ts
git commit "refactor: remove Member.integrateTerrainHeight calls from World"

git add src/engine/core/World/Member/DamageResolution.ts
git commit "refactor: send FSM events directly instead of calling Member.applyDamage"

git add src/engine/core/thread/Simulation.worker.ts
git commit "refactor: update presentation state readers to use getFsmState/getActiveEffectState"

# 阶段 4：测试和文档
git add src/engine/core/World/Member/*.test.ts
git commit "test: add tests for refactored Member interfaces"

git add docs/ src/engine/AGENTS.md
git commit "docs: update architecture documentation for Member refactoring"
```

### PR 提交

**PR 标题**：
```
refactor(engine): simplify Member class with clear layer separation
```

**PR 描述**：
```markdown
## Changes

Refactors the 906-line Member class by:
- Adding clear comment-based separation for three layers (data, compute, orchestration)
- Removing redundant methods (applyDamage, integrateTerrainHeight, notifyLanded, refreshPresentationState, etc)
- Simplifying dependency injection (removing 12+ set* methods)
- Reorganizing methods by responsibility
- Final size: ~300-400 lines

## Rationale

- Improves code readability through clear layer separation
- Reduces complexity by removing redundant responsibilities
- Maintains single-class structure (avoids over-abstraction)
- Clarifies that business logic (damage, vertical motion) belongs in FSM

## Key Changes

- ❌ Removed PresentationState merging → render layer reads FSM + effect BT separately
- ❌ Removed applyDamage → external systems send FSM events directly
- ❌ Removed vertical motion methods → FSM handles internally
- ❌ Removed 12+ set* methods → constructor-based dependency injection
- ✅ Added getFsmState() and getActiveEffectState() query interfaces
- ✅ Clear comment-based layer separation

## Testing

- [x] All existing tests pass
- [x] Manual testing of key flows
- [x] No performance regression

## Performance

- Tick performance: ±0% (no regression)
- Checkpoint serialization: ±0% (no regression)

## Related

Closes #XXX (if applicable)
```

---

## 完成后清理

根据 AGENTS.md，当计划完成时：

- [ ] 删除此计划文档：`docs/plans/member-refactoring-plan.md`
- [ ] 如果有重要的架构决策，提取为 ADR（在 `docs/decisions/`）
- [ ] 更新相关的 Code Map（`project_code_map_write`）

### 建议的 ADR（如果需要）

如果重构中产生了重要的架构决策，创建 ADR 记录：
- Member 作为单类但通过注释分层的设计决策
- 成员是被动实体的原则
- 业务逻辑归属 FSM 的原则

---

## 附录：核心架构原则

### 架构不变量

1. **成员是被动实体**：所有状态信息被动暴露
2. **唯一主动推送**：瞬时事件通过 DomainEventBus
3. **三层职责清晰**：数据、计算、编排各司其职（通过注释分割）
4. **Member 是薄壳**：持有、协调、暴露接口（300-400 行）
5. **查询接口形式是工程细节**：readonly 字段 / getter / 方法等价
6. **行为历史归属外部**：成员发布事件，外部记录
7. **业务逻辑在 FSM 内**：伤害处理、垂直运动、落地检测都在 FSM
8. **Member 不转发事件**：外部直接调用 `member.actor.send(event)`

### 外部交互模式

```typescript
// ✅ 控制输入（唯一命令入口）
member.submitControlInput({ type: "跳跃", ... }, 'external');

// ✅ 攻击事件（直接发给 FSM）
member.actor.send({ type: "受到攻击", data: { damageRequest } });

// ✅ 查询状态（被动）
const pos = member.position;
const hp = member.getAttribute('hp.current');
const alive = member.alive;
const fsmState = member.getFsmState();
const effectState = member.getActiveEffectState();

// ❌ 不再支持
member.applyDamage(effect);
member.integrateTerrainHeight(groundY, tick);
member.notifyLanded();
member.setControlMode('ai');
```

---

**文档完成日期**：2024-10-08  
**最后修改**：重构计划修订
