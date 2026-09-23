# Actor 化、模块重命名与分布式架构迁移方案

## 概述

本方案覆盖三个相互关联的架构演进方向：

1. **World 实体 Actor 化**：将 Member、Area 等实体转换为独立 Actor，保持确定性
2. **模块重命名**：消除 "System" 的 ECS 误导，建立清晰的分层命名
3. **分布式游戏支持**：基于 Lockstep 模式支持多人实时协作

本方案按依赖关系分为 4 个阶段，每个阶段可独立交付和验证。

## 设计原则

- **确定性优先**：Actor 化不能破坏模拟的确定性和可重放性
- **渐进演进**：每个阶段都保持系统可运行，支持灰度切换
- **架构一致性**：消除概念混淆，建立统一的命名和通信模式
- **性能可控**：Actor 开销通过池化和批处理控制在可接受范围

## 术语说明

- **Actor**：持有状态机、接收消息、封装状态的自治单元
- **Service**：无状态或单例状态的计算服务提供者
- **Manager**：管理实体生命周期（创建/销毁/查询）的协调者
- **Scheduler**：控制执行顺序和时序的调度者
- **Coordinator**：协调多个实体交互的编排者

---

## Phase 0：前置准备与基线验证（1-2 周）

**目标**：建立确定性验证基线，确保后续 Actor 化不破坏确定性。

### 0.1 确定性验证套件

**任务**：
- 扩展现有 `Random` 的测试覆盖
- 实现端到端确定性验证：相同 seed + 相同输入 = 相同输出
- 建立 checkpoint/restore 的完整测试

**验收**：
```typescript
// 验证用例
test('相同种子和输入产生相同结果', () => {
  const run1 = executeScenario({ seed: 12345, inputs: [...] });
  const run2 = executeScenario({ seed: 12345, inputs: [...] });
  expect(run1.finalState).toEqual(run2.finalState);
});

test('checkpoint 恢复后继续执行一致', () => {
  const engine1 = new GameEngine();
  engine1.loadScenario(scenario);
  engine1.runUntil(tick: 100);
  const checkpoint = engine1.captureCheckpoint();
  
  const engine2 = new GameEngine();
  engine2.restoreCheckpoint(checkpoint);
  engine1.runUntil(tick: 200);
  engine2.runUntil(tick: 200);
  
  expect(engine1.captureCheckpoint()).toEqual(engine2.captureCheckpoint());
});
```

**产出**：
- `src/engine/core/determinism.test.ts`
- 确定性验证通过的基线报告

### 0.2 性能基线测量

**任务**：
- 测量当前架构下 12fps、60fps 的性能表现
- 测量不同成员数量（2/8/32/96）下的性能
- 建立性能回归测试

**验收**：
```bash
# 性能基线
pnpm benchmark:engine

# 输出示例
成员数: 8, 帧率: 60fps, 平均帧时间: 12.3ms
成员数: 32, 帧率: 60fps, 平均帧时间: 45.2ms
成员数: 96, 帧率: 12fps, 平均帧时间: 78.1ms
```

**产出**：
- `src/engine/core/benchmark.ts`
- 性能基线报告 `docs/performance-baseline.md`

### 0.3 输入记录与回放

**任务**：
- 完善 ADR 0043 的输入记录实现
- 实现输入回放功能
- 验证回放与实时执行的一致性

**验收**：
```typescript
// 记录一次运行
const recorder = new InputRecorder();
engine.tick(); // 实时运行
const inputLog = recorder.export();

// 回放
const replayEngine = new GameEngine();
replayEngine.loadScenario(scenario);
replayEngine.replay(inputLog);

expect(replayEngine.finalState).toEqual(engine.finalState);
```

**产出**：
- 输入记录格式定义
- 回放验证通过

**里程碑**：Phase 0 完成后，创建 ADR 描述确定性保证机制和验证策略。

---

## Phase 1：模块重命名与职责澄清（2-3 周）

**目标**：消除 "System" 的 ECS 误导，建立清晰的分层命名和职责边界。

### 1.1 命名映射与新架构定义

**重命名方案**：

```
当前名称                  →  新名称                      职责
────────────────────────────────────────────────────────────
DamageSystem             →  DamageCoordinator          协调伤害派发
DamageAreaSystem         →  DamageAreaManager          管理伤害区域生命周期
BuffAreaSystem           →  BuffAreaManager            管理 Buff 区域生命周期
TrapAreaSystem           →  TrapAreaManager            管理陷阱区域生命周期
AreaManager              →  AreaCoordinator            协调三类区域更新顺序
SpaceManager             →  SpaceService               提供空间查询服务
MemberManager            →  MemberManager              保持（已经合理）
EventQueue               →  EventScheduler             调度跨帧事件
FrameLoop                →  FrameLoop                  保持（已经合理）
PipelineResolverService  →  PipelineResolverService    保持（已经合理）
```

**分层定义**：

```
┌─────────────────────────────────────────┐
│  实体层（Actor 化的目标）                │
│  Member, DamageArea, BuffArea, TrapArea  │
└─────────────────────────────────────────┘
              ↑ 创建/销毁/查询
┌─────────────────────────────────────────┐
│  管理层（Manager）                        │
│  MemberManager, DamageAreaManager, ...   │
└─────────────────────────────────────────┘
              ↑ 协调交互
┌─────────────────────────────────────────┐
│  协调层（Coordinator）                    │
│  DamageCoordinator, AreaCoordinator      │
└─────────────────────────────────────────┘
              ↑ 依赖服务
┌─────────────────────────────────────────┐
│  服务层（Service）                        │
│  SpaceService, PipelineResolverService   │
└─────────────────────────────────────────┘
              ↑ 被调度
┌─────────────────────────────────────────┐
│  调度层（Scheduler）                      │
│  EventScheduler, ActorScheduler（新增）  │
└─────────────────────────────────────────┘
```

### 1.2 重命名实施

**步骤**：

1. **创建别名过渡**：
```typescript
// src/engine/core/World/Damage/DamageCoordinator.ts
export class DamageCoordinator { /* 新实现 */ }

// src/engine/core/World/Damage/DamageSystem.ts
/**
 * @deprecated 使用 DamageCoordinator 替代
 * 别名将在 Phase 2 完成后移除
 */
export const DamageSystem = DamageCoordinator;
```

2. **逐模块迁移引用**：
   - 先迁移 `World.ts`
   - 再迁移 `Member.ts`
   - 最后迁移测试和文档

3. **移除别名**：
   - 所有引用迁移完成后删除别名
   - 运行全量测试确保无遗漏

**验收**：
- `pnpm biome check --write src/ db/`
- `pnpm typecheck`
- 所有测试通过
- `git grep -i "DamageSystem" src/` 无结果

### 1.3 文档更新

**更新内容**：
- `src/engine/AGENTS.md`：更新通信机制角色表
- `src/engine/document/架构设计说明概要.md`：更新模块名称
- Code Map `engine-runtime`：更新模块描述和锚点
- 注释中的模块引用

**验收**：
- 文档与代码命名一致
- Code Map 锚点全部有效

**里程碑**：Phase 1 完成后，创建 ADR 描述模块分层架构和命名规范。

---

## Phase 2：Actor 基础设施建设（3-4 周）

**目标**：建立确定性 Actor 调度器，为实体 Actor 化提供基础。

### 2.1 确定性 Actor 调度器设计

**核心接口**：

```typescript
/**
 * 确定性 Actor 调度器
 * 
 * 保证：
 * 1. 同一 tick 内的消息按固定顺序处理（actor ID → 消息类型 → 注册顺序）
 * 2. 消息同步处理完毕后才进入下一 tick
 * 3. 支持 checkpoint/restore
 */
interface DeterministicActorScheduler {
  /**
   * 注册一个 Actor 到调度器
   * @param actorId 全局唯一 ID，按字典序决定处理顺序
   */
  registerActor(actorId: string, actor: Actor): void;
  
  /**
   * 移除 Actor
   */
  unregisterActor(actorId: string): void;
  
  /**
   * 发送消息（不立即投递，进入当前 tick 的队列）
   * @param targetActorId 目标 Actor ID
   * @param message 消息内容
   */
  send(targetActorId: string, message: ActorMessage): void;
  
  /**
   * 执行一个 tick：排序并处理所有消息
   */
  tick(tick: SimulationTickContext): void;
  
  /**
   * 捕获调度器状态（用于 checkpoint）
   */
  captureState(): ActorSchedulerState;
  
  /**
   * 恢复调度器状态
   */
  restoreState(state: ActorSchedulerState): void;
}

/**
 * Actor 消息基类
 */
interface ActorMessage {
  type: string;
  payload?: unknown;
  timestamp?: number;  // 逻辑时钟
  order?: number;      // 注册顺序
}

/**
 * Actor 基础接口
 */
interface Actor {
  id: string;
  
  /**
   * 处理消息（同步、阻塞）
   */
  processMessage(message: ActorMessage): void;
  
  /**
   * 捕获 Actor 状态
   */
  captureState(): unknown;
  
  /**
   * 恢复 Actor 状态
   */
  restoreState(state: unknown): void;
}
```

**实现要点**：

```typescript
class DeterministicActorSchedulerImpl implements DeterministicActorScheduler {
  private actors = new Map<string, Actor>();
  private messageQueue: Array<{ targetActorId: string; message: ActorMessage }> = [];
  private messageOrderCounter = 0;
  
  send(targetActorId: string, message: ActorMessage): void {
    // 记录注册顺序
    message.order = this.messageOrderCounter++;
    this.messageQueue.push({ targetActorId, message });
  }
  
  tick(tick: SimulationTickContext): void {
    // 1. 稳定排序：actor ID → 消息类型 → 注册顺序
    this.messageQueue.sort((a, b) => {
      if (a.targetActorId !== b.targetActorId) {
        return a.targetActorId.localeCompare(b.targetActorId);
      }
      if (a.message.type !== b.message.type) {
        return a.message.type.localeCompare(b.message.type);
      }
      return a.message.order! - b.message.order!;
    });
    
    // 2. 同步处理所有消息
    for (const { targetActorId, message } of this.messageQueue) {
      const actor = this.actors.get(targetActorId);
      if (actor) {
        actor.processMessage(message);
      }
    }
    
    // 3. 清空队列
    this.messageQueue = [];
    this.messageOrderCounter = 0;
  }
  
  captureState(): ActorSchedulerState {
    return {
      actors: Array.from(this.actors.entries()).map(([id, actor]) => ({
        id,
        state: actor.captureState(),
      })),
      pendingMessages: [...this.messageQueue],
    };
  }
  
  restoreState(state: ActorSchedulerState): void {
    // 恢复所有 Actor 状态
    for (const { id, state: actorState } of state.actors) {
      this.actors.get(id)?.restoreState(actorState);
    }
    // 恢复消息队列
    this.messageQueue = [...state.pendingMessages];
  }
}
```

### 2.2 Actor 基类实现

```typescript
/**
 * Actor 基类，封装 XState actor 或自定义状态机
 */
abstract class BaseActor implements Actor {
  abstract readonly id: string;
  
  /**
   * 子类实现消息处理逻辑
   */
  abstract processMessage(message: ActorMessage): void;
  
  /**
   * 子类实现状态捕获
   */
  abstract captureState(): unknown;
  
  /**
   * 子类实现状态恢复
   */
  abstract restoreState(state: unknown): void;
  
  /**
   * 向其他 Actor 发送消息（通过调度器）
   */
  protected sendTo(targetActorId: string, message: ActorMessage): void {
    // 通过全局调度器发送
    getActorScheduler().send(targetActorId, message);
  }
}
```

### 2.3 集成到 GameEngine

```typescript
export class GameEngine {
  private actorScheduler: DeterministicActorScheduler;
  
  constructor() {
    this.actorScheduler = new DeterministicActorSchedulerImpl();
    // 注入到全局（供 Actor 使用）
    setActorScheduler(this.actorScheduler);
  }
  
  tick(): void {
    // 1. 调度器处理所有消息
    this.actorScheduler.tick(this.currentTick);
    
    // 2. World 编排（保持现有逻辑，逐步迁移到 Actor）
    this.world.tick(this.currentTick, ...);
    
    // 3. 其他系统...
  }
  
  captureCheckpoint(): GameEngineCheckpoint {
    return {
      ...existingFields,
      actorScheduler: this.actorScheduler.captureState(),
    };
  }
  
  restoreCheckpoint(checkpoint: GameEngineCheckpoint): void {
    // ...
    this.actorScheduler.restoreState(checkpoint.actorScheduler);
  }
}
```

### 2.4 验证与测试

**测试用例**：

```typescript
test('Actor 调度器保持确定性', () => {
  const scheduler1 = new DeterministicActorSchedulerImpl();
  const scheduler2 = new DeterministicActorSchedulerImpl();
  
  // 注册相同的 Actor
  const actor1a = new TestActor('actor1');
  const actor2a = new TestActor('actor2');
  scheduler1.registerActor('actor1', actor1a);
  scheduler1.registerActor('actor2', actor2a);
  
  const actor1b = new TestActor('actor1');
  const actor2b = new TestActor('actor2');
  scheduler2.registerActor('actor1', actor1b);
  scheduler2.registerActor('actor2', actor2b);
  
  // 发送相同的消息（不同顺序）
  scheduler1.send('actor2', { type: 'msg1' });
  scheduler1.send('actor1', { type: 'msg2' });
  
  scheduler2.send('actor1', { type: 'msg2' });
  scheduler2.send('actor2', { type: 'msg1' });
  
  // 执行 tick
  scheduler1.tick(mockTick);
  scheduler2.tick(mockTick);
  
  // 验证结果一致
  expect(actor1a.processedMessages).toEqual(actor1b.processedMessages);
  expect(actor2a.processedMessages).toEqual(actor2b.processedMessages);
});

test('Actor 调度器支持 checkpoint', () => {
  const scheduler = new DeterministicActorSchedulerImpl();
  scheduler.registerActor('actor1', new TestActor('actor1'));
  
  scheduler.send('actor1', { type: 'msg1' });
  const checkpoint = scheduler.captureState();
  
  scheduler.tick(mockTick);
  
  // 恢复到发送消息但未处理的状态
  const scheduler2 = new DeterministicActorSchedulerImpl();
  scheduler2.registerActor('actor1', new TestActor('actor1'));
  scheduler2.restoreState(checkpoint);
  
  scheduler2.tick(mockTick);
  
  expect(scheduler2.captureState()).toEqual(scheduler.captureState());
});
```

**验收**：
- 所有调度器测试通过
- 与现有 GameEngine 集成后确定性验证通过
- 性能回归测试通过（开销 < 5%）

**产出**：
- `src/engine/core/Actor/DeterministicActorScheduler.ts`
- `src/engine/core/Actor/BaseActor.ts`
- `src/engine/core/Actor/types.ts`
- 测试套件

**里程碑**：Phase 2 完成后，创建 ADR 描述确定性 Actor 调度机制。

---

## Phase 3：实体 Actor 化（4-6 周）

**目标**：将 Member、Area 等实体转换为 Actor，建立统一的消息驱动模式。

### 3.1 Member Actor 化（已部分完成）

**现状评估**：
- Member 已经持有 XState actor
- 已通过 `actor.send({ type: "update" })` 驱动
- 需要补充：与调度器集成

**改造方案**：

```typescript
/**
 * Member 实现 Actor 接口
 */
export abstract class Member<...> extends BaseActor {
  readonly id: string;
  private xstateActor: MemberActor<...>;
  
  processMessage(message: ActorMessage): void {
    switch (message.type) {
      case 'tick':
        this.handleTick(message.payload as SimulationTickContext);
        break;
      case '受到攻击':
        this.xstateActor.send({ type: '受到攻击', data: message.payload });
        break;
      case 'control_input':
        this.handleControlInput(message.payload);
        break;
      default:
        console.warn(`Unknown message type: ${message.type}`);
    }
  }
  
  private handleTick(tick: SimulationTickContext): void {
    // 原有的 tick 逻辑
    this.runtime.tickIndex = tick.tickIndex;
    this.runtime.currentTimeMs = tick.currentTimeMs;
    // ...
    this.xstateActor.send({ type: "update", timestamp: tick.currentTimeMs });
    // ...
  }
  
  captureState(): MemberActorState {
    return {
      xstateSnapshot: this.xstateActor.getSnapshot(),
      runtime: this.runtime,
      attributeContainer: this.attributeContainer.captureState(),
      // ...
    };
  }
  
  restoreState(state: MemberActorState): void {
    // 恢复 XState actor 状态
    // 恢复 runtime
    // 恢复 attributeContainer
    // ...
  }
}
```

**迁移步骤**：

1. Member 实现 BaseActor 接口
2. 注册到 ActorScheduler
3. World.tick 改为向所有 Member 发送 'tick' 消息
4. 验证确定性

```typescript
// src/engine/core/World/World.ts
export class World {
  tick(tick: SimulationTickContext, ...): void {
    // 向所有 Member 发送 tick 消息
    const memberIds = Array.from(this.memberManager.getAllMemberIds()).sort();
    for (const memberId of memberIds) {
      getActorScheduler().send(memberId, { type: 'tick', payload: tick });
    }
    
    // 伤害协调（暂时保持中心化）
    this.damageCoordinator.flushInstantDamage(...);
    
    // 区域协调（下一步 Actor 化）
    this.areaCoordinator.tick(tick);
  }
}
```

**验收**：
- Member 作为 Actor 运行
- 确定性验证通过
- 性能回归测试通过

### 3.2 Area Actor 化

**设计目标**：
- 每个 Area 实例是独立的 Actor
- 区域自己定时检测范围内目标
- 区域向命中目标发送消息

**Area Actor 接口**：

```typescript
/**
 * 区域 Actor 基类
 */
abstract class AreaActor extends BaseActor {
  abstract readonly rangeKind: 'point' | 'circle' | 'rect';
  abstract readonly position: Vec3;
  abstract readonly shape: AreaShape;
  
  protected spaceService: SpaceService;
  protected memberManager: MemberManager;
  
  /**
   * 子类实现区域逻辑
   */
  abstract checkAndApplyEffect(tick: SimulationTickContext): void;
  
  processMessage(message: ActorMessage): void {
    switch (message.type) {
      case 'tick':
        this.checkAndApplyEffect(message.payload as SimulationTickContext);
        break;
      case 'destroy':
        this.destroy();
        break;
    }
  }
  
  protected destroy(): void {
    // 从调度器注销
    getActorScheduler().unregisterActor(this.id);
  }
}

/**
 * 伤害区域 Actor
 */
class DamageAreaActor extends AreaActor {
  private spec: DamageAreaSpec;
  private lastHitTimeMsByTargetId = new Map<string, number>();
  private damageCountByTargetId = new Map<string, number>();
  
  checkAndApplyEffect(tick: SimulationTickContext): void {
    const elapsedMs = tick.currentTimeMs - this.spec.lifetime.startTimeMs;
    
    // 检查生命周期
    if (elapsedMs >= this.spec.lifetime.durationMs) {
      this.sendTo(this.id, { type: 'destroy' });
      return;
    }
    
    // 查询范围内目标
    const targets = this.spaceService.queryCircle(
      this.position,
      this.shape.radius,
      { aliveOnly: true }
    );
    
    // 向每个目标发送伤害消息
    for (const target of targets) {
      if (this.shouldHit(target.id, tick.currentTimeMs)) {
        this.sendTo(target.id, {
          type: '受到攻击',
          payload: this.createDamagePayload(target.id, tick),
        });
        this.recordHit(target.id, tick.currentTimeMs);
      }
    }
  }
  
  private shouldHit(targetId: string, currentTimeMs: number): boolean {
    const lastHitTime = this.lastHitTimeMsByTargetId.get(targetId) ?? -Infinity;
    const hitInterval = this.spec.attackSemantics.damageIntervalMs;
    return currentTimeMs - lastHitTime >= hitInterval;
  }
  
  private recordHit(targetId: string, currentTimeMs: number): void {
    this.lastHitTimeMsByTargetId.set(targetId, currentTimeMs);
    const count = this.damageCountByTargetId.get(targetId) ?? 0;
    this.damageCountByTargetId.set(targetId, count + 1);
  }
  
  captureState(): DamageAreaActorState {
    return {
      spec: this.spec,
      position: this.position,
      lastHitTimeMsByTargetId: Array.from(this.lastHitTimeMsByTargetId.entries()),
      damageCountByTargetId: Array.from(this.damageCountByTargetId.entries()),
    };
  }
  
  restoreState(state: DamageAreaActorState): void {
    this.spec = state.spec;
    this.position = state.position;
    this.lastHitTimeMsByTargetId = new Map(state.lastHitTimeMsByTargetId);
    this.damageCountByTargetId = new Map(state.damageCountByTargetId);
  }
}
```

**AreaManager 改造**：

```typescript
/**
 * DamageAreaManager：管理伤害区域 Actor 的生命周期
 */
export class DamageAreaManager {
  private areas = new Map<string, DamageAreaActor>();
  private nextAreaId = 1;
  
  createDamageArea(spec: DamageAreaSpec): string {
    const areaId = `damage_${this.nextAreaId++}`;
    const actor = new DamageAreaActor(areaId, spec, this.spaceService, this.memberManager);
    
    // 注册到调度器
    getActorScheduler().registerActor(areaId, actor);
    this.areas.set(areaId, actor);
    
    return areaId;
  }
  
  remove(areaId: string): void {
    const actor = this.areas.get(areaId);
    if (actor) {
      getActorScheduler().unregisterActor(areaId);
      this.areas.delete(areaId);
    }
  }
  
  // tick 逻辑移到 AreaCoordinator
}

/**
 * AreaCoordinator：协调区域 Actor 的更新顺序
 */
export class AreaCoordinator {
  constructor(
    private damageAreaManager: DamageAreaManager,
    private buffAreaManager: BuffAreaManager,
    private trapAreaManager: TrapAreaManager,
  ) {}
  
  tick(tick: SimulationTickContext): void {
    // 向所有区域发送 tick 消息（按 ID 排序保证确定性）
    const areaIds = [
      ...this.damageAreaManager.getAllAreaIds(),
      ...this.buffAreaManager.getAllAreaIds(),
      ...this.trapAreaManager.getAllAreaIds(),
    ].sort();
    
    for (const areaId of areaIds) {
      getActorScheduler().send(areaId, { type: 'tick', payload: tick });
    }
  }
}
```

**迁移步骤**：

1. 实现 `AreaActor` 基类和 `DamageAreaActor`
2. 改造 `DamageAreaManager` 为生命周期管理器
3. 改造 `AreaCoordinator` 为消息派发者
4. 逐步迁移 BuffArea 和 TrapArea
5. 验证确定性和性能

**验收**：
- 所有区域类型 Actor 化
- 区域逻辑与原有行为一致
- 确定性验证通过
- 性能回归测试通过

### 3.3 World 编排简化

Actor 化完成后，World 的职责简化为：

```typescript
export class World {
  tick(tick: SimulationTickContext, ...): void {
    // 1. 向所有 Member Actor 发送 tick
    const memberIds = Array.from(this.memberManager.getAllMemberIds()).sort();
    for (const memberId of memberIds) {
      getActorScheduler().send(memberId, { type: 'tick', payload: tick });
    }
    
    // 2. 伤害协调器冲刷瞬时伤害
    this.damageCoordinator.flushInstantDamage(...);
    
    // 3. 向所有 Area Actor 发送 tick
    this.areaCoordinator.tick(tick);
    
    // ActorScheduler 会按确定性顺序处理所有消息
  }
}
```

**验收**：
- World 代码精简至 < 100 行
- 所有实体通过消息驱动
- 架构清晰，职责明确

**里程碑**：Phase 3 完成后，创建 ADR 描述实体 Actor 化架构和消息通信协议。

---

## Phase 4：分布式 Lockstep 支持（6-8 周）

**目标**：支持多人实时协作，基于 Lockstep 模式同步输入。

### 4.1 输入同步协议设计

**核心概念**：

```typescript
/**
 * 玩家输入帧
 */
interface PlayerInputFrame {
  tick: number;                    // 目标 tick
  playerId: string;                // 玩家 ID
  inputs: PlayerInput[];           // 该帧的所有输入
  checksum?: string;               // 可选：用于验证一致性
}

/**
 * 玩家输入
 */
interface PlayerInput {
  memberId: string;                // 控制的成员 ID
  action: MemberControlEvent;      // 控制动作
  timestamp: number;               // 客户端时间戳（用于调试）
}

/**
 * 输入同步包
 */
interface InputSyncPacket {
  tick: number;                    // 当前 tick
  inputs: PlayerInputFrame[];      // 所有玩家的输入
  serverTime: number;              // 服务器时间
}
```

**Lockstep 流程**：

```
客户端 A                  服务端                   客户端 B
   │                        │                        │
   │── 输入(tick: 100) ────→│                        │
   │                        │←──── 输入(tick: 100) ──│
   │                        │                        │
   │                        │ 收集所有玩家输入       │
   │                        │ 广播 InputSyncPacket    │
   │                        │                        │
   │←─ InputSyncPacket ────│                        │
   │                        │──── InputSyncPacket ──→│
   │                        │                        │
   │ 本地模拟 tick 100      │                        │ 本地模拟 tick 100
   │ (相同输入 = 相同结果)  │                        │ (相同输入 = 相同结果)
   │                        │                        │
   │── 输入(tick: 101) ────→│                        │
   │                        │←──── 输入(tick: 101) ──│
   │                        │                        │
  ...                      ...                      ...
```

### 4.2 服务端输入收集器

```typescript
/**
 * Lockstep 输入收集器（服务端）
 */
class LockstepInputCollector {
  private players: Set<string> = new Set();
  private inputBuffer: Map<number, Map<string, PlayerInputFrame>> = new Map();
  private currentTick = 0;
  private maxBufferedTicks = 10;
  
  /**
   * 注册玩家
   */
  addPlayer(playerId: string): void {
    this.players.add(playerId);
  }
  
  /**
   * 移除玩家
   */
  removePlayer(playerId: string): void {
    this.players.delete(playerId);
    // 清理该玩家的缓冲输入
    for (const tickInputs of this.inputBuffer.values()) {
      tickInputs.delete(playerId);
    }
  }
  
  /**
   * 接收玩家输入
   */
  receiveInput(input: PlayerInputFrame): void {
    if (!this.players.has(input.playerId)) {
      console.warn(`Unknown player: ${input.playerId}`);
      return;
    }
    
    let tickInputs = this.inputBuffer.get(input.tick);
    if (!tickInputs) {
      tickInputs = new Map();
      this.inputBuffer.set(input.tick, tickInputs);
    }
    
    tickInputs.set(input.playerId, input);
  }
  
  /**
   * 尝试获取下一帧的完整输入
   * 只有所有玩家都提交了输入才返回
   */
  tryGetNextFrame(): InputSyncPacket | null {
    const nextTick = this.currentTick + 1;
    const tickInputs = this.inputBuffer.get(nextTick);
    
    if (!tickInputs) return null;
    
    // 检查是否所有玩家都提交了输入
    for (const playerId of this.players) {
      if (!tickInputs.has(playerId)) {
        return null;  // 还有玩家未提交
      }
    }
    
    // 所有玩家都已提交，返回输入包
    const packet: InputSyncPacket = {
      tick: nextTick,
      inputs: Array.from(tickInputs.values()),
      serverTime: Date.now(),
    };
    
    // 清理旧的缓冲
    this.inputBuffer.delete(nextTick);
    this.currentTick = nextTick;
    
    return packet;
  }
  
  /**
   * 获取等待中的玩家列表（用于调试）
   */
  getWaitingPlayers(tick: number): string[] {
    const tickInputs = this.inputBuffer.get(tick);
    if (!tickInputs) return Array.from(this.players);
    
    const waiting: string[] = [];
    for (const playerId of this.players) {
      if (!tickInputs.has(playerId)) {
        waiting.push(playerId);
      }
    }
    return waiting;
  }
}
```

### 4.3 客户端输入发送器

```typescript
/**
 * Lockstep 输入发送器（客户端）
 */
class LockstepInputSender {
  private ws: WebSocket;
  private playerId: string;
  private currentTick = 0;
  private pendingInputs: PlayerInput[] = [];
  
  constructor(serverUrl: string, playerId: string) {
    this.playerId = playerId;
    this.ws = new WebSocket(serverUrl);
    this.ws.onmessage = (event) => this.handleMessage(event);
  }
  
  /**
   * 添加本地输入
   */
  addInput(input: PlayerInput): void {
    this.pendingInputs.push(input);
  }
  
  /**
   * 发送当前帧的输入
   */
  sendFrame(): void {
    const frame: PlayerInputFrame = {
      tick: this.currentTick + 1,
      playerId: this.playerId,
      inputs: [...this.pendingInputs],
    };
    
    this.ws.send(JSON.stringify({ type: 'input', data: frame }));
    this.pendingInputs = [];
  }
  
  /**
   * 处理服务端消息
   */
  private handleMessage(event: MessageEvent): void {
    const message = JSON.parse(event.data);
    
    if (message.type === 'input_sync') {
      const packet: InputSyncPacket = message.data;
      this.applyInputs(packet);
      this.currentTick = packet.tick;
    }
  }
  
  /**
   * 应用同步的输入到本地引擎
   */
  private applyInputs(packet: InputSyncPacket): void {
    const engine = getLocalEngine();
    
    for (const playerFrame of packet.inputs) {
      for (const input of playerFrame.inputs) {
        engine.applyPlayerInput(input);
      }
    }
    
    // 执行一个 tick
    engine.tick();
  }
}
```

### 4.4 延迟补偿与预测

**问题**：Lockstep 需要等待最慢的玩家，会有延迟感。

**解决方案**：客户端预测 + 服务端校正

```typescript
/**
 * 预测式 Lockstep 客户端
 */
class PredictiveLockstepClient {
  private localEngine: GameEngine;      // 本地预测引擎
  private confirmedTick = 0;            // 已确认的 tick
  private predictedTick = 0;            // 预测的 tick
  private inputHistory: PlayerInput[] = [];  // 输入历史
  
  /**
   * 本地输入：立即预测执行
   */
  handleLocalInput(input: PlayerInput): void {
    this.inputHistory.push(input);
    this.localEngine.applyPlayerInput(input);
    this.localEngine.tick();
    this.predictedTick++;
    
    // 发送到服务端
    this.sendInput(input);
  }
  
  /**
   * 收到服务端确认的输入
   */
  handleConfirmedInputs(packet: InputSyncPacket): void {
    // 检查预测是否正确
    const needRollback = this.checkPrediction(packet);
    
    if (needRollback) {
      // 回滚到确认的 tick
      this.localEngine.restoreCheckpoint(this.confirmedTick);
      
      // 重放所有输入
      for (const playerFrame of packet.inputs) {
        for (const input of playerFrame.inputs) {
          this.localEngine.applyPlayerInput(input);
        }
      }
      this.localEngine.tick();
      
      // 重放本地未确认的输入
      const unconfirmedInputs = this.inputHistory.filter(
        input => input.tick > packet.tick
      );
      for (const input of unconfirmedInputs) {
        this.localEngine.applyPlayerInput(input);
        this.localEngine.tick();
      }
    }
    
    this.confirmedTick = packet.tick;
    
    // 清理已确认的输入历史
    this.inputHistory = this.inputHistory.filter(
      input => input.tick > packet.tick
    );
  }
  
  private checkPrediction(packet: InputSyncPacket): boolean {
    // 比较本地预测和服务端确认的状态
    // 如果不一致，需要回滚
    // 简化实现：只比较关键状态（如 HP、位置）
    return false;  // TODO: 实现状态比较
  }
}
```

### 4.5 ElectricSQL 集成（非战斗数据）

```typescript
/**
 * 使用 ElectricSQL 同步非战斗数据
 */
class GameDataSync {
  private electric: ElectricClient;
  
  async syncPlayerProfile(playerId: string): Promise<void> {
    // 同步玩家装备、背包
    await this.electric.sync({
      table: 'player_equipment',
      where: { player_id: playerId },
    });
    
    await this.electric.sync({
      table: 'player_inventory',
      where: { player_id: playerId },
    });
  }
  
  async syncGuildData(guildId: string): Promise<void> {
    // 同步公会信息
    await this.electric.sync({
      table: 'guilds',
      where: { id: guildId },
    });
    
    await this.electric.sync({
      table: 'guild_members',
      where: { guild_id: guildId },
    });
  }
  
  async syncChatMessages(channelId: string): Promise<void> {
    // 同步聊天记录
    await this.electric.sync({
      table: 'chat_messages',
      where: { channel_id: channelId },
    });
  }
}
```

### 4.6 混合架构：关键路径 vs 非关键路径

```typescript
/**
 * 混合同步管理器
 */
class HybridSyncManager {
  private lockstepClient: LockstepInputSender;  // 战斗输入
  private electricSync: GameDataSync;           // 非战斗数据
  
  /**
   * 战斗输入：Lockstep 同步
   */
  sendCombatInput(input: PlayerInput): void {
    this.lockstepClient.addInput(input);
  }
  
  /**
   * 装备更换：ElectricSQL 同步
   */
  async changeEquipment(playerId: string, slot: string, itemId: string): Promise<void> {
    await this.electricSync.updateEquipment(playerId, slot, itemId);
    // ElectricSQL 会自动同步到其他客户端
  }
  
  /**
   * 发送聊天：ElectricSQL 同步
   */
  async sendChat(message: ChatMessage): Promise<void> {
    await this.electricSync.insertChatMessage(message);
    // ElectricSQL 会自动同步到其他客户端
  }
}
```

### 4.7 部署架构

```
┌─────────────────────────────────────────────────────────┐
│                    客户端 A                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ GameEngine   │  │ Lockstep     │  │ ElectricSQL  │ │
│  │ (本地模拟)   │  │ InputSender  │  │ Client       │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
         │                    │                    │
         │                    │                    │
         │ 渲染               │ WebSocket          │ Postgres
         │                    │                    │ Replication
         │                    ↓                    ↓
         │           ┌─────────────────────────────────┐
         │           │      应用服务器                  │
         │           │  ┌──────────────────────────┐  │
         │           │  │ LockstepInputCollector   │  │
         │           │  │ (输入收集与广播)         │  │
         │           │  └──────────────────────────┘  │
         │           │  ┌──────────────────────────┐  │
         │           │  │ PGlite + ElectricSQL     │  │
         │           │  │ (非战斗数据同步)         │  │
         │           │  └──────────────────────────┘  │
         │           └─────────────────────────────────┘
         │                    │                    │
         │                    │                    │
         │                    │                    │
┌─────────────────────────────────────────────────────────┐
│                    客户端 B                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ GameEngine   │  │ Lockstep     │  │ ElectricSQL  │ │
│  │ (本地模拟)   │  │ InputSender  │  │ Client       │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**验收**：
- 2-4 人小队副本支持 Lockstep
- 延迟 < 150ms（12fps 约 2 帧）
- 确定性验证通过
- 断线重连不影响其他玩家

**里程碑**：Phase 4 完成后，创建 ADR 描述分布式 Lockstep 架构和混合同步策略。

---

## 风险与缓解

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| Actor 性能开销过大 | 高 | 中 | Phase 2 提前验证，超过 10% 则优化或回退 |
| 确定性破坏 | 高 | 中 | Phase 0 建立基线，每个 Phase 都验证 |
| Lockstep 延迟不可接受 | 中 | 中 | 实现客户端预测，或降级为小队专用 |
| ElectricSQL 同步冲突 | 中 | 低 | 只用于非关键数据，战斗用 Lockstep |
| 重命名引入 Bug | 低 | 低 | 使用别名过渡，增量迁移 |

## 成功标准

- **Phase 1**：所有模块重命名完成，代码和文档一致
- **Phase 2**：Actor 调度器通过确定性验证，性能开销 < 5%
- **Phase 3**：所有实体 Actor 化，性能开销 < 10%
- **Phase 4**：支持 2-4 人小队副本，延迟 < 150ms

## 时间线

```
Week 1-2   : Phase 0 - 前置准备
Week 3-5   : Phase 1 - 模块重命名
Week 6-9   : Phase 2 - Actor 基础设施
Week 10-15 : Phase 3 - 实体 Actor 化
Week 16-23 : Phase 4 - 分布式 Lockstep
Week 24    : 最终验证与文档
```

**总计**：约 6 个月

## 参考资料

- [Lockstep 网络模型](https://gafferongames.com/post/deterministic_lockstep/)
- [客户端预测与回滚](https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html)
- [确定性游戏引擎设计](https://blog.royalsloth.eu/posts/the-deterministic-game-engine/)
- [ElectricSQL 文档](https://electric-sql.com/docs)
- ADR 0043: 输入记录与行动录制
- ADR 0040: Worker RPC 契约
- ADR 0008: WorldObservable 空间介质

---

**本方案将根据实施过程中的反馈持续更新。每个 Phase 完成后需要创建对应的 ADR 并归档到 `docs/decisions/`。**
