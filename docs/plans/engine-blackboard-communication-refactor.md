# 引擎黑板通信架构重构计划

**创建时间**: 2024-10-10  
**状态**: 待执行  
**预计工作量**: 3-5 天

## 问题诊断

当前引擎与外部模块的通信架构存在以下问题：

1. **引擎持有外部回调**
   - `systemMessageSender` 回调用于推送域事件、遥测
   - `ControllerEventProjector` 持有 `domainEventBatchSender`
   - 违反"引擎是黑盒模拟器"的定位

2. **运行时绑定管理复杂**
   - `ControlBindingManager` 维护 controllerId → memberId 映射
   - 需要 `bind/unbind` RPC 建立绑定
   - 控制器必须等待引擎启动后才能绑定

3. **通信机制不一致**
   - 连续状态（世界状态）：SAB
   - 离散事件（域事件）：推送回调
   - 遥测：定时推送
   - 生命周期：推送快照

4. **路由机制不对称**
   - 输入路由：控制器写入 SAB → 引擎查询绑定表 → 路由到成员
   - 输出路由：引擎调用回调 → 主线程分发

5. **协议文件混乱**
   - `protocol.ts` (384行) 混合了：
     - 生命周期状态机协议
     - 引擎 RPC (16种)
     - 推送消息定义
     - 世界状态布局
     - 错误类型

## 重构目标

### 核心原则

**引擎是无状态的黑板读写器**：
- 从输入黑板读取
- 向输出黑板写入
- 不持有外部回调
- 不维护绑定状态

**输入输出完全对称**：
- 输入 SAB：槽位对应成员（消费方是引擎）
- 输出 SAB：槽位对应控制器/渲染器（消费方是外部）
- 布局规则固定可预测，双方独立计算

### 目标架构

```
┌─────────────────────────────────────────┐
│ 主线程                                   │
│                                         │
│  ┌───────────┐         ┌──────────────┐│
│  │ 控制器 A  │         │ 渲染器       ││
│  │           │         │              ││
│  │ setTarget │         │              ││
│  │ (member1) │         │              ││
│  └─────┬─────┘         └──────┬───────┘│
│        │ 写入槽位 0            │ 读取槽位││
│        ↓                       ↓        │
│  ┌──────────────────────────────────┐  │
│  │ 输入 SAB          输出 SAB       │  │
│  │ [槽位0→成员1]    [槽位0→控制器A]│  │
│  │ [槽位1→成员2]    [槽位1→渲染器] │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
           ↑                       ↑
           │ 读取                  │ 写入
           │                       │
┌─────────────────────────────────────────┐
│ Worker                                  │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │ GameEngine                       │  │
│  │                                  │  │
│  │  tick() {                        │  │
│  │    // 读取输入黑板               │  │
│  │    for slot in inputSlots:      │  │
│  │      input = readSlot(slot)     │  │
│  │      member = slotToMember[slot]│  │
│  │      member.process(input)      │  │
│  │                                  │  │
│  │    // 执行模拟逻辑               │  │
│  │    world.tick()                 │  │
│  │                                  │  │
│  │    // 写入输出黑板               │  │
│  │    for consumer in consumers:   │  │
│  │      slot = consumer.slotIndex  │  │
│  │      writeSlot(slot, output)    │  │
│  │  }                               │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## 实施步骤

### 阶段 1: 拆分 protocol.ts (0.5天)

将 `src/engine/core/thread/protocol.ts` 拆分为：

```
src/engine/core/thread/protocol/
├── lifecycle.ts          # 生命周期双端协议
├── rpc.ts                # 引擎 RPC 契约
├── push.ts               # 推送消息定义（待删除）
├── inputBuffer.ts        # 输入 SAB 布局与编解码
├── outputBuffer.ts       # 输出 SAB 布局与编解码
├── errors.ts             # 协议错误分类
└── index.ts              # 统一导出
```

**验证**：所有现有导入路径正常，测试通过。

### 阶段 2: 实现输入 SAB 布局 (1天)

#### 2.1 定义布局计算规则

```typescript
// src/engine/core/thread/protocol/inputBuffer.ts

export interface InputSlotLayout {
  slotIndex: number;
  memberId: string;
  movementOffset: number;      // 连续移动状态区域
  eventQueueOffset: number;    // 离散事件队列区域
  eventQueueCapacity: number;
}

export function calculateInputLayout(
  members: EngineMember[]
): Map<string, InputSlotLayout> {
  const sorted = [...members].sort((a, b) => a.id.localeCompare(b.id));
  const layout = new Map<string, InputSlotLayout>();
  
  let currentOffset = HEADER_SIZE;
  sorted.forEach((member, index) => {
    const movementOffset = currentOffset;
    const eventQueueOffset = movementOffset + MOVEMENT_STATE_SIZE;
    
    layout.set(member.id, {
      slotIndex: index,
      memberId: member.id,
      movementOffset,
      eventQueueOffset,
      eventQueueCapacity: INPUT_EVENT_QUEUE_CAPACITY
    });
    
    currentOffset = eventQueueOffset + 
                    (INPUT_EVENT_QUEUE_CAPACITY * EVENT_SLOT_SIZE);
  });
  
  return layout;
}
```

#### 2.2 实现 Writer 和 Reader

```typescript
export class InputBufferWriter {
  constructor(
    private buffer: SharedArrayBuffer,
    private layout: Map<string, InputSlotLayout>
  ) {}
  
  writeMovement(slotIndex: number, movement: MovementState): void {
    const slot = this.getSlotByIndex(slotIndex);
    // 写入连续移动状态
  }
  
  writeEvent(slotIndex: number, event: ControlEvent): boolean {
    const slot = this.getSlotByIndex(slotIndex);
    // 写入离散事件队列
  }
}

export class InputBufferReader {
  constructor(
    private buffer: SharedArrayBuffer,
    private layout: Map<string, InputSlotLayout>
  ) {}
  
  readSlot(slotIndex: number): MemberInput {
    const slot = this.getSlotByIndex(slotIndex);
    return {
      movement: this.readMovement(slot),
      events: this.readEvents(slot)
    };
  }
}
```

#### 2.3 修改控制器

```typescript
// src/engine/controller/MemberController.ts

export class MemberController {
  private currentSlotIndex: number | null = null;
  private inputWriter: InputBufferWriter;
  private inputLayout: Map<string, InputSlotLayout>;
  
  constructor(
    inputBuffer: SharedArrayBuffer,
    scenarioData: EngineScenarioData
  ) {
    // 计算布局（不需要等待引擎）
    this.inputLayout = calculateInputLayout(scenarioData.members);
    this.inputWriter = new InputBufferWriter(inputBuffer, this.inputLayout);
  }
  
  setTarget(memberId: string): void {
    const slot = this.inputLayout.get(memberId);
    if (!slot) throw new Error(`Member ${memberId} not in layout`);
    this.currentSlotIndex = slot.slotIndex;
  }
  
  updateMovement(direction: Vector2, intensity: number): void {
    if (this.currentSlotIndex === null) {
      throw new Error("No target selected");
    }
    this.inputWriter.writeMovement(this.currentSlotIndex, {
      enabled: true,
      moving: true,
      direction,
      intensity
    });
  }
  
  castSkill(skillId: string): boolean {
    if (this.currentSlotIndex === null) {
      throw new Error("No target selected");
    }
    return this.inputWriter.writeEvent(this.currentSlotIndex, {
      type: "使用技能",
      data: { skillId }
    });
  }
}
```

**验证**：控制器可以在引擎启动前创建，可以本地切换控制对象。

### 阶段 3: 实现输出 SAB 布局 (1.5天)

#### 3.1 扩展场景配置

```typescript
// src/engine/core/engineScenarioSchema.ts

export interface EngineScenarioData {
  members: EngineMember[];
  
  // 新增：输出消费者配置
  outputConsumers?: {
    controllers?: Array<{
      id: string;
      subscribedMembers: string[];
      outputTypes: OutputType[];
    }>;
    renderers?: Array<{
      id: string;
      type: "scene" | "ui";
      subscribedMembers: string[];
      outputTypes: OutputType[];
    }>;
  };
}

export type OutputType = 
  | "domain_events"
  | "telemetry"
  | "world_state"
  | "animation"
  | "ui_data";
```

#### 3.2 定义输出布局计算规则

```typescript
// src/engine/core/thread/protocol/outputBuffer.ts

export interface OutputSlotLayout {
  slotIndex: number;
  consumerId: string;
  consumerType: "controller" | "renderer";
  subscribedMembers: string[];
  outputTypes: OutputType[];
  eventQueueOffset: number;
  eventQueueCapacity: number;
  telemetryOffset: number;
  worldStateOffset: number;
}

export function calculateOutputLayout(
  outputConsumers: OutputConsumers
): Map<string, OutputSlotLayout> {
  const allConsumers = [
    ...(outputConsumers.controllers || []).map(c => 
      ({ ...c, consumerType: "controller" as const })),
    ...(outputConsumers.renderers || []).map(r => 
      ({ ...r, consumerType: "renderer" as const }))
  ].sort((a, b) => a.id.localeCompare(b.id));
  
  const layout = new Map<string, OutputSlotLayout>();
  let currentOffset = HEADER_SIZE;
  
  allConsumers.forEach((consumer, index) => {
    const eventQueueOffset = currentOffset;
    const telemetryOffset = eventQueueOffset + 
      (OUTPUT_EVENT_QUEUE_CAPACITY * EVENT_SLOT_SIZE);
    const worldStateOffset = telemetryOffset + TELEMETRY_SIZE;
    
    layout.set(consumer.id, {
      slotIndex: index,
      consumerId: consumer.id,
      consumerType: consumer.consumerType,
      subscribedMembers: consumer.subscribedMembers,
      outputTypes: consumer.outputTypes,
      eventQueueOffset,
      eventQueueCapacity: OUTPUT_EVENT_QUEUE_CAPACITY,
      telemetryOffset,
      worldStateOffset
    });
    
    currentOffset = worldStateOffset + WORLD_STATE_SIZE;
  });
  
  return layout;
}
```

#### 3.3 实现输出 Writer 和 Reader

```typescript
export class OutputBufferWriter {
  constructor(
    private buffer: SharedArrayBuffer,
    private layout: Map<string, OutputSlotLayout>
  ) {}
  
  writeDomainEvents(slotIndex: number, events: DomainEvent[]): void {
    // 写入事件队列
  }
  
  writeTelemetry(slotIndex: number, telemetry: EngineTelemetry): void {
    // 写入遥测数据
  }
  
  writeWorldState(slotIndex: number, state: WorldState): void {
    // 写入世界状态
  }
}

export class OutputBufferReader {
  constructor(
    private buffer: SharedArrayBuffer,
    private layout: Map<string, OutputSlotLayout>
  ) {}
  
  pollEvents(slotIndex: number): DomainEvent[] {
    // 读取并标记已消费
  }
  
  readTelemetry(slotIndex: number): EngineTelemetry | null {
    // 读取最新遥测
  }
  
  readWorldState(slotIndex: number): WorldState | null {
    // 读取最新世界状态
  }
}
```

#### 3.4 修改引擎输出路由

```typescript
// src/engine/core/GameEngine.ts

export class GameEngine {
  private outputLayout: Map<string, OutputSlotLayout>;
  private outputWriter: OutputBufferWriter;
  
  loadScenario(data: EngineScenarioData) {
    // 计算输出布局
    this.outputLayout = calculateOutputLayout(
      data.outputConsumers || { controllers: [], renderers: [] }
    );
    
    // ... 创建成员
  }
  
  setOutputBuffer(buffer: SharedArrayBuffer): void {
    this.outputWriter = new OutputBufferWriter(buffer, this.outputLayout);
  }
  
  tick() {
    // 读取输入
    for (const [slotIndex, memberId] of this.inputSlotMap) {
      const input = this.inputReader.readSlot(slotIndex);
      const member = this.world.getMember(memberId);
      member.processInput(input);
    }
    
    // 执行模拟
    this.world.tick(...);
    
    // 路由输出
    this.routeOutputs();
  }
  
  private routeOutputs(): void {
    for (const [consumerId, slot] of this.outputLayout) {
      
      // 收集订阅的成员的输出
      for (const memberId of slot.subscribedMembers) {
        const member = this.world.getMember(memberId);
        
        if (slot.outputTypes.includes("domain_events")) {
          const events = this.domainEventBus.getEventsFor(memberId);
          this.outputWriter.writeDomainEvents(slot.slotIndex, events);
        }
        
        if (slot.outputTypes.includes("telemetry")) {
          const telemetry = this.getTelemetry();
          this.outputWriter.writeTelemetry(slot.slotIndex, telemetry);
        }
        
        if (slot.outputTypes.includes("world_state")) {
          const state = member.getWorldState();
          this.outputWriter.writeWorldState(slot.slotIndex, state);
        }
      }
    }
  }
}
```

**验证**：引擎不再持有 `systemMessageSender` 回调，所有输出写入黑板。

### 阶段 4: 删除旧通信机制 (0.5天)

#### 4.1 删除组件

- `src/engine/core/Controller/ControlBindingManager.ts`
- `src/engine/core/Controller/ControllerEndpoint.ts` (ControllerRegistry)
- `src/engine/core/DomainEvents/ControllerEventProjector.ts`
- `src/engine/core/MessageRouter/MessageRouter.ts` 的绑定管理逻辑

#### 4.2 删除 RPC

- `bind/unbind` RPC 定义
- 相关的 RPC 处理逻辑

#### 4.3 删除推送逻辑

- `GameEngine.systemMessageSender`
- `GameEngine.postSystemMessage()`
- `engine_telemetry` 定时推送
- `domain_event_batch` 推送

#### 4.4 简化 MessageRouter

```typescript
// MessageRouter 简化为纯粹的槽位分发器
class MessageRouter {
  constructor(
    private world: World,
    private slotToMemberMap: Map<number, string>
  ) {}
  
  processSlotInput(slotIndex: number, input: MemberInput): void {
    const memberId = this.slotToMemberMap.get(slotIndex);
    if (!memberId) return;
    
    const member = this.world.getMember(memberId);
    
    // 连续输入
    if (input.movement.enabled) {
      member.updateMovementInput(input.movement);
    }
    
    // 离散事件
    for (const event of input.events) {
      member.submitControlInput(event);
    }
  }
}
```

**验证**：所有旧推送路径删除，测试通过。

### 阶段 5: 更新测试 (0.5天)

#### 5.1 引擎测试

- 删除 `systemMessageSender` mock
- 改用输出 SAB 读取验证输出
- 测试布局计算规则一致性

#### 5.2 控制器测试

- 测试本地切换控制对象
- 测试在引擎启动前创建控制器
- 测试槽位写入正确性

#### 5.3 集成测试

- 端到端测试：控制器输入 → 引擎处理 → 输出读取
- 测试多控制器场景
- 测试事件队列容量溢出

## 验收标准

- [ ] `protocol.ts` 拆分为独立职责的文件
- [ ] 控制器可以在引擎启动前创建
- [ ] 控制器可以本地切换控制对象，无需通知引擎
- [ ] 引擎不持有任何外部回调
- [ ] 删除 `ControlBindingManager`、`ControllerRegistry`
- [ ] 删除 `bind/unbind` RPC
- [ ] 删除所有推送逻辑（`engine_telemetry`、`domain_event_batch`）
- [ ] 输入输出布局规则在主线程和引擎计算结果一致
- [ ] 所有现有测试通过
- [ ] 引擎可以在没有消费者的情况下独立运行

## 风险与缓解

### 风险 1: 布局计算规则不一致

**风险**：主线程和引擎的布局计算实现不一致，导致槽位映射错误。

**缓解**：
- 共享布局计算代码（移到独立模块）
- 添加布局一致性测试
- 在场景加载时校验 SAB 大小和布局版本

### 风险 2: 离散事件容量不足

**风险**：事件队列容量固定，消费者不及时可能溢出。

**缓解**：
- 初始容量设为 1024 events
- 溢出时记录诊断信息
- 监控事件队列使用率

### 风险 3: 迁移期间功能损坏

**风险**：重构期间可能破坏现有功能。

**缓解**：
- 分阶段实施，每个阶段独立验证
- 保持现有测试通过
- 必要时可以回滚单个阶段

## 后续工作

重构完成后，可以进一步优化：

1. **合并世界状态 SAB**：当前 `WorldStateBuffer` 是独立的，可以考虑合并到输出 SAB 的渲染器槽位中
2. **细化输出类型**：根据实际需求细化 `OutputType`，如分离不同类型的域事件
3. **多消费者支持**：如果需要多个控制器订阅同一个成员，实现消费标记 bitmap
4. **性能优化**：测量黑板读写性能，必要时优化布局或使用更高效的编码

## 相关文档

需要更新的文档：
- `src/engine/document/通信协议表.md` - 更新为黑板通信模型
- `src/engine/document/README.md` - 更新架构总览
- 相关 ADR：
  - ADR 0045 的推送部分被本重构取代
  - ADR 0050 扩展到所有输出
  - ADR 0052 的世界状态 SAB 成为输出 SAB 的一部分
