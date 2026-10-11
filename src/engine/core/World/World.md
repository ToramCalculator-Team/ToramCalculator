# World

## 职责

World 是引擎的纯粹模拟状态容器和规则执行层，职责范围严格限定为：

1. **模拟时间管理**：管理逻辑时间（tickIndex、simulationTimeMs），包含在 World checkpoint 中
2. **确定性随机**：持有并管理 Random 实例，为规则层提供确定性随机数
3. **成员管理**：管理所有成员的生命周期、状态和行为
4. **空间查询**：提供成员空间位置查询、范围查询等空间系统
5. **伤害结算**：管理瞬时伤害和持续区域伤害的计算与应用
6. **规则执行**：驱动所有成员的 Tick 执行、FSM 状态机、行为树等
7. **表达式求值**：为规则层提供表达式计算能力（技能伤害公式、状态判定等）
8. **快照与恢复**：捕获和恢复完整的世界状态（包含时间、随机种子、所有成员状态）

**不负责**：
- ❌ 外部通信（黑板读写由 Engine 负责）
- ❌ 生命周期控制（启动、暂停、停止由 Engine 负责）
- ❌ 性能统计（Engine 时间、fps 由 Engine 负责）
- ❌ 录制与回放（由主线程的行为编辑工具从输出黑板读取）

**时间语义**：
- **World 时间**：模拟世界的逻辑时间，由 World 自主管理
- **Engine 时间**：wall-clock 时间，World 不关心

---

## 理想结构

### 核心依赖

```typescript
class World {
  // 模拟时间状态
  private tickIndex: number;
  private simulationTimeMs: number;
  
  // 确定性随机
  private random: Random;
  
  // 子系统
  private memberManager: MemberManager;
  private spaceManager: SpaceManager;
  private damageSystem: DamageSystem;
  private areaManager: AreaManager;
  
  // 规则层依赖
  private expressionEvaluator: ExpressionEvaluator;
  private pipelineResolverService: PipelineResolverService;
  private eventCatalog: EventCatalog;
  
  // 地形
  private sampleTerrainHeight: (x: number, z: number) => number;
  
  // 域事件总线（World 内部）
  private domainEventBus: DomainEventBus;
}
```

---

### 构造与初始化

```typescript
/**
 * 构造 World 实例
 * @param infra 基础设施依赖（表达式求值、Pipeline、事件目录等）
 */
constructor(infra: WorldInfrastructure): void
// TODO:
// - 创建 Random 实例
// - 初始化 MemberManager、SpaceManager、DamageSystem、AreaManager
// - 保存基础设施引用
// - 初始化 DomainEventBus

/**
 * 加载场景数据
 * @param data 场景初始化数据
 */
loadScenario(data: EngineScenarioData): void
// TODO:
// - 设置随机种子：this.random.setSeed(data.scenario.randomSeed)
// - 重置时间：tickIndex = 0, simulationTimeMs = 0
// - 加载地形定义：setTerrainDefinition(data.scenario.terrain)
// - 创建所有成员：memberManager.createMembers(data.members)
// - 初始化空间索引：spaceManager.rebuild()

/**
 * 清空世界状态
 */
clear(): void
// TODO:
// - memberManager.clear()
// - damageSystem.clear()
// - areaManager.clear()
// - 重置时间
// - 清空域事件总线
```

---

### 时间推进

```typescript
/**
 * 执行单次逻辑 Tick
 * @param inputs 成员控制输入（memberId → MemberInput）
 * @param deltaTimeMs 本次 Tick 的时间跨度
 */
tick(
  inputs: ReadonlyMap<string, MemberInput>,
  deltaTimeMs: number
): void
// TODO:
// 1. 构造 Tick 上下文
//    const context: SimulationTickContext = {
//      tickIndex: this.tickIndex,
//      simulationTimeMs: this.simulationTimeMs,
//      deltaTimeMs
//    };
//
// 2. 遍历所有成员，调用 member.tick(context, input)
//    for (const member of memberManager.getAllMembers()) {
//      const input = inputs.get(member.id) ?? null;
//      member.tick(context, input);
//      
//      // 地形高度积分
//      const terrainHeight = this.sampleTerrainHeight(member.position.x, member.position.z);
//      member.integrateTerrainHeight(terrainHeight, context);
//    }
//
// 3. 刷新瞬时伤害
//    damageSystem.flushInstantDamage();
//
// 4. 更新持续区域
//    areaManager.tick(context);
//
// 5. 推进时间
//    this.simulationTimeMs += deltaTimeMs;
//    this.tickIndex++;
```

---

### 时间查询

```typescript
/**
 * 获取当前 Tick 序号
 */
getTickIndex(): number
// TODO: 返回 tickIndex

/**
 * 获取当前模拟时间（毫秒）
 */
getSimulationTimeMs(): number
// TODO: 返回 simulationTimeMs
```

---

### 随机数管理

```typescript
/**
 * 设置随机种子
 * @param seed 随机种子
 */
setRandomSeed(seed: number): void
// TODO: this.random.setSeed(seed)

/**
 * 获取下一个随机数 [0, 1)
 */
nextRandom(): number
// TODO: 返回 this.random.value()

/**
 * 获取 Random 实例（供子系统使用）
 */
getRandom(): Random
// TODO: 返回 this.random
```

---

### 成员管理

```typescript
/**
 * 获取指定成员
 * @param memberId 成员 ID
 * @returns 成员实例，不存在返回 undefined
 */
getMember(memberId: string): Member | undefined
// TODO: 委托给 memberManager.getMember()

/**
 * 获取所有成员
 * @returns 只读成员数组
 */
getAllMembers(): ReadonlyArray<Member>
// TODO: 委托给 memberManager.getAllMembers()

/**
 * 获取成员快照（用于输出黑板）
 * @param memberId 成员 ID
 * @returns 成员快照，不存在返回 undefined
 */
getMemberSnapshot(memberId: string): MemberSnapshot | undefined
// TODO: 委托给 memberManager，返回序列化快照

/**
 * 获取所有成员快照
 * @returns 成员快照数组
 */
getAllMemberSnapshots(): MemberSnapshot[]
// TODO: 委托给 memberManager
```

---

### 空间查询

```typescript
/**
 * 查询指定范围内的成员
 * @param center 中心点
 * @param radius 半径
 * @returns 成员数组
 */
queryMembersInRange(
  center: { x: number; z: number },
  radius: number
): Member[]
// TODO: 委托给 spaceManager.queryInRange()

/**
 * 查询指定阵营的成员
 * @param campId 阵营 ID
 * @returns 成员数组
 */
queryMembersByCamp(campId: string): Member[]
// TODO: 委托给 memberManager

/**
 * 查询存活的成员
 * @returns 成员数组
 */
queryAliveMembers(): Member[]
// TODO: 委托给 memberManager
```

---

### 地形管理

```typescript
/**
 * 设置地形定义
 * @param definition 地形定义
 */
setTerrainDefinition(definition: TerrainDefinition): void
// TODO:
// - 创建地形高度采样器
// - this.sampleTerrainHeight = createPhysicalTerrainGenerator(definition).sampleHeight

/**
 * 投影点到地形
 * @param position 位置
 * @returns 投影到地形后的位置
 */
projectToGround(position: { x: number; y: number; z: number }): { x: number; y: number; z: number }
// TODO: 返回 { x, y: sampleTerrainHeight(x, z), z }
```

---

### 域事件管理

```typescript
/**
 * 发射域事件（供成员调用）
 * @param event 域事件
 */
emitDomainEvent(event: MemberDomainEvent): void
// TODO: domainEventBus.emit(event)

/**
 * 获取指定成员的域事件（供 Engine 输出路由使用）
 * @param memberId 成员 ID
 * @returns 该成员产生的所有域事件
 */
getDomainEventsFor(memberId: string): DomainEvent[]
// TODO: 委托给 domainEventBus.getEventsFor(memberId)

/**
 * 清空已读取的域事件（每 Tick 结束后调用）
 */
clearDomainEvents(): void
// TODO: domainEventBus.clear()
```

---

### 表达式求值

```typescript
/**
 * 求值表达式
 * @param expression 表达式字符串
 * @param context 表达式上下文（包含 self、target、world 等）
 * @returns 求值结果（数值或布尔）
 */
evaluateExpression(
  expression: string,
  context: ExpressionContext
): number | boolean
// TODO: 委托给 expressionEvaluator.evaluate(expression, context)
```

---

### 快照与恢复

```typescript
/**
 * 捕获 World 完整快照
 * @returns World checkpoint
 */
captureCheckpoint(): WorldCheckpoint
// TODO:
// return {
//   tickIndex: this.tickIndex,
//   simulationTimeMs: this.simulationTimeMs,
//   randomState: this.random.getState(),
//   members: this.memberManager.captureMemberCheckpoints(),
//   damageAreaSystem: this.areaManager.damageAreaSystem.captureCheckpoint()
// };

/**
 * 恢复到指定快照
 * @param checkpoint World checkpoint
 */
restoreCheckpoint(checkpoint: WorldCheckpoint): void
// TODO:
// - this.tickIndex = checkpoint.tickIndex
// - this.simulationTimeMs = checkpoint.simulationTimeMs
// - this.random.setState(checkpoint.randomState)
// - memberManager.restoreMemberCheckpoints(checkpoint.members)
// - areaManager.damageAreaSystem.restoreCheckpoint(checkpoint.damageAreaSystem)
```

---

## 类型依赖

```typescript
// 时间
import type { SimulationTickContext } from "../types";

// 输入
import type { MemberInput } from "../thread/protocol/inputBuffer";

// 快照
import type { WorldCheckpoint, MemberSnapshot } from "../types";

// 随机
import { Random } from "~/lib/random";

// 子系统
import type { MemberManager } from "./MemberManager";
import type { SpaceManager } from "./SpaceManager";
import type { DamageSystem } from "./Damage/DamageSystem";
import type { AreaManager } from "./Area/AreaManager";

// 规则层依赖
import type { ExpressionEvaluator } from "../Expression/ExpressionEvaluator";
import type { PipelineResolverService } from "../Pipeline/PipelineResolverService";
import type { EventCatalog } from "../Event/EventCatalog";

// 域事件
import type { DomainEventBus } from "../DomainEvents/DomainEventBus";
import type { MemberDomainEvent, DomainEvent } from "../types";

// 地形
import type { TerrainDefinition } from "~/lib/terrain";

// 成员
import type { Member } from "./Member/Member";
```

---

## 基础设施注入

World 需要的基础设施通过构造函数注入：

```typescript
export interface WorldInfrastructure {
  /** 表达式求值器 */
  expressionEvaluator: ExpressionEvaluator;
  
  /** Pipeline 解析服务 */
  pipelineResolverService: PipelineResolverService;
  
  /** 事件目录 */
  eventCatalog: EventCatalog;
  
  /** 伤害执行处理器（瞬时伤害、区域伤害） */
  damageExecutionHandlers?: {
    executeInstantDamage?: (effect: InstantDamageEffect) => void;
    createDamageArea?: (spec: DamageAreaSpec) => void;
  };
}
```

这些基础设施由 Engine 创建并注入：

```typescript
// GameEngine 构造函数
constructor(config: EngineConfig, infra: EngineInfrastructure) {
  // 创建 World 时注入基础设施
  this.world = new World({
    expressionEvaluator: infra.expressionEvaluator,
    pipelineResolverService: infra.pipelineResolverService,
    eventCatalog: infra.eventCatalog
  });
}
```

---

## 与 Engine 的交互

### Engine 调用 World

```typescript
// Engine.stepTick()
stepTick(): void {
  // 1. 从输入黑板读取
  const inputs = this.inputReader.readAllSlots();
  
  // 2. 调用 World.tick()
  this.world.tick(inputs, this.deltaTimeMs);
  
  // 3. 从 World 获取输出
  const events = this.world.getDomainEventsFor(memberId);
  const snapshot = this.world.getMemberSnapshot(memberId);
  
  // 4. 写入输出黑板
  this.outputWriter.writeDomainEvents(slotIndex, events);
  this.outputWriter.writeWorldState(slotIndex, snapshot);
  
  // 5. 清空已读取的域事件
  this.world.clearDomainEvents();
}
```

### World 不调用 Engine

World 是纯粹的规则执行层，不依赖 Engine：
- ❌ 不调用 Engine 的任何方法
- ❌ 不持有 Engine 的引用
- ✅ 只接收 Engine 传入的输入和基础设施

---

## 时间管理细节

### 时间状态

World 持有两个时间状态：

```typescript
private tickIndex: number = 0;         // Tick 序号
private simulationTimeMs: number = 0;  // 模拟时间（毫秒）
```

### 时间推进

每次 `tick()` 调用结束后推进：

```typescript
tick(inputs, deltaTimeMs): void {
  const context = {
    tickIndex: this.tickIndex,
    simulationTimeMs: this.simulationTimeMs,
    deltaTimeMs
  };
  
  // ... 执行规则
  
  // 推进时间
  this.simulationTimeMs += deltaTimeMs;
  this.tickIndex++;
}
```

### 时间快照

时间状态包含在 `WorldCheckpoint` 中：

```typescript
interface WorldCheckpoint {
  tickIndex: number;
  simulationTimeMs: number;
  randomState: any;
  members: MemberCheckpoint[];
  // ...
}
```

恢复快照时，World 恢复到指定时间点：

```typescript
restoreCheckpoint(checkpoint): void {
  this.tickIndex = checkpoint.tickIndex;
  this.simulationTimeMs = checkpoint.simulationTimeMs;
  // ...
}
```

---

## Random 管理细节

### Random 生命周期

```typescript
constructor(infra) {
  // 构造时创建 Random
  this.random = new Random();
}

loadScenario(data) {
  // 场景加载时设置种子
  this.random.setSeed(data.scenario.randomSeed);
}
```

### Random 使用

规则层通过 World 获取随机数：

```typescript
// 成员构造时注入 Random getter
const member = new Member({
  // ...
  getRandom: () => this.world.getRandom()
});

// 成员内部使用
const criticalHit = this.getRandom().value() < 0.2;
```

### Random 快照

Random 状态包含在 `WorldCheckpoint` 中：

```typescript
captureCheckpoint(): WorldCheckpoint {
  return {
    // ...
    randomState: this.random.getState()
  };
}

restoreCheckpoint(checkpoint): void {
  this.random.setState(checkpoint.randomState);
}
```

---

## 表达式求值细节

### ExpressionEvaluator 注入

```typescript
constructor(infra: WorldInfrastructure) {
  this.expressionEvaluator = infra.expressionEvaluator;
}
```

### 表达式上下文

```typescript
interface ExpressionContext {
  /** 当前 Tick 序号 */
  tickIndex: number;
  
  /** 当前模拟时间 */
  currentTimeMs: number;
  
  /** 施法者 ID */
  casterId: string;
  
  /** 目标 ID */
  targetId: string;
  
  /** 技能等级 */
  skillLv: number;
  
  // ... 其他上下文变量
}
```

### 求值调用

```typescript
// 成员内部调用
const damage = this.world.evaluateExpression(
  "self.atk * 1.5 + skillLv * 10",
  {
    tickIndex: context.tickIndex,
    currentTimeMs: context.simulationTimeMs,
    casterId: this.id,
    targetId: target.id,
    skillLv: 5
  }
);
```

---

## 域事件流

### 事件产生

成员产生域事件：

```typescript
// Member 内部
this.world.emitDomainEvent({
  type: "hit",
  memberId: this.id,
  timeMs: context.simulationTimeMs,
  payload: { damage: 100, targetId: target.id }
});
```

### 事件收集

Engine 在 Tick 结束后收集：

```typescript
// Engine.routeOutputs()
for (const memberId of slot.subscribedMembers) {
  const events = this.world.getDomainEventsFor(memberId);
  this.outputWriter.writeDomainEvents(slotIndex, events);
}

// 清空已读取的事件
this.world.clearDomainEvents();
```

---

## 关键设计决策

### 1. 时间归属 World

- World 时间是模拟逻辑时间，由 World 自主管理
- Engine 时间是 wall-clock 时间，用于性能统计
- 两者独立，暂停 World 不影响 Engine 时间

### 2. Random 归属 World

- Random 由 World 构造时创建
- `loadScenario()` 时设置种子
- Random 状态包含在 World checkpoint

### 3. 表达式求值归属 World

- ExpressionEvaluator 作为基础设施注入
- World 封装求值接口，成员通过 World 调用
- 不暴露给 Engine

### 4. 域事件内部化

- DomainEventBus 属于 World 内部
- Engine 通过 `getDomainEventsFor()` 读取
- 每 Tick 结束后 Engine 负责清空

### 5. 快照完整性

- WorldCheckpoint 包含所有模拟状态
- 时间、Random、成员、区域全部包含
- Engine 不需要单独的 checkpoint

---

## 相关文档

- [GameEngine.md](../GameEngine.md) - 引擎职责与接口
- [Member.md](./Member/Member.md) - 成员职责与接口
- [inputBuffer.md](../thread/protocol/inputBuffer.md) - 输入协议
- [outputBuffer.md](../thread/protocol/outputBuffer.md) - 输出协议
