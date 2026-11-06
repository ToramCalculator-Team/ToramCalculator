# Reactor 模块

## 职责

为引擎提供确定性并发的协调基础设施。任何游戏系统实现为 Reactor 子类，由 ReactorScheduler 统一调度，无需了解调度细节。

## 核心概念

**Reactor**：最小响应单元。构造时声明 InputPort、OutputPort、LogicalAction、PhysicalAction，并通过 `initialReactions()` 提供初始 Reaction 集合。

**Reaction**：Reactor 内的响应函数，声明触发条件（triggers）、只读依赖（uses）和可能写入的输出（effects）。调度器从声明中派生依赖图，不执行函数体。同一 Reactor 内多 Reaction 在同一 Tag 触发时按声明顺序执行。

**APG（非循环优先图）**：从端口连接声明派生的 Reactor 粒度层级偏序。同层 Reactor 无依赖，任意顺序执行；层间有屏障。层级完全由连接关系决定，与游戏内容无关。拓扑变化（注册/注销/连接变更）时标记脏，下一 Tag 重建。

**Tag**：超稠密时间二元组 `{ logicalTime: bigint, microstep: number }`，对应 LF 论文模型。logicalTime 单位纳秒，microstep 处理同一逻辑时刻内的连续因果事件。`send(delay=0)` 产生的事件在 `(t, m+1)` 触发，`send(delay>0)` 在 `(t+delay, 0)` 触发。确定性来源：相同 Tag 和输入，输出唯一。

**LogicalAction**：延迟触发通道。`send()` 投递的消息经调度器按 Tag 有序分发。对应 LF 的 logical action。

**PhysicalAction**：外部异步输入的确定性边界。Tag 由调度器在物理时间读取时赋值，一旦确定后续处理完全确定。对应 LF 的 physical action。

**Actor 三原语**：
- `create(cls, id, connections?, ...args)` — 在 reaction 体内动态创建并注册新 Reactor，从下一 Tag 起参与调度。对应 LF mutations。
- `send(targetId, actionName, value, delayNs?)` — 向目标 Reactor 的 LogicalAction 投递延迟消息，按超稠密时间有序交付。
- `become(newReactions)` — 替换整个 Reaction 集合（即替换 FSM），下一 Tag 起生效。约束：端口声明不变，新 Reaction 集合只使用已声明的端口名。

**Reaction 快照**：调度器在 Tag 开始时调用 `_snapshotReactions()` 固化本 Tag 使用的 Reaction 集合。Tag 内 `become()` 不影响本 Tag 调度，下一 Tag 起生效。

## 文件结构

```
Reactor/
├── index.ts              公开导出
├── types.ts              Tag、ReactionDecl、PortConnection、ReactorContext 等核心类型
├── Reactor.ts            抽象基类；Actor 三原语 create / send / become
├── InputPort.ts          输入槽，由调度器填充和清空
├── OutputPort.ts         输出槽，由 Reaction 体写入，调度器传播
├── LogicalAction.ts      LogicalAction（延迟触发）和 PhysicalAction（外部输入）
├── ReactorScheduler.ts   注册中心 + APG 派生 + Tag 驱动
└── Reactor.md            本文档
```

## 单 Tag 执行流程

```
step(tag) / tick(tickNs)
  ├─ snapshotReactions()          固化各 Reactor 本 Tag 使用的 Reaction 集合
  ├─ deliverPending(tag)          分发 executeAt === tag 的 LogicalAction 消息
  ├─ rebuildAPGIfDirty()          拓扑变化后重算，Tick 内稳定
  │
  for level in layers:
    for reactor in reactorsAtLevel:
      for reaction in reactor._getTriggeredReactions():
        reaction.body(reactor, tag)   读 InputPort，写 OutputPort，
                                      调用 create / send / become
    propagatePorts()                  层间屏障：OutputPort → 下游 InputPort
                                      afterNs>0 的连接转 PendingMessage 投递到未来 Tag
  │
  ├─ clearAllPorts()              清空所有 InputPort / OutputPort / Action
  └─ drainMicrosteps(tag)         处理本 Tag 内因 send(delay=0) 产生的
                                  (logicalTime, microstep+1) 因果链
```

## 使用方式

```typescript
class DamageReactor extends Reactor {
  readonly damageRequest = this.addInput<DamageRequest>("damageRequest");
  readonly damageResult = this.addOutput<DamageResult>("damageResult");

  protected initialReactions(): ReactionDecl<this>[] {
    return [{
      triggers: ["damageRequest"],
      effects: ["damageResult"],
      body: (self, tag) => {
        const req = self.damageRequest.value!;
        self.damageResult.set(resolve(req));
      },
    }];
  }

  captureState() { return {}; }
  restoreState(_: unknown) {}
}

const scheduler = new ReactorScheduler();
const dmg = new DamageReactor("damage");
const member = new MemberReactor("member-1");

scheduler.register(dmg);
scheduler.register(member, [{
  fromReactorId: "damage",
  fromPortName: "damageResult",
  toReactorId: "member-1",
  toPortName: "incomingDamage",
}]);

// 固定步长驱动
scheduler.tick(BIGINT_NS_PER_TICK);
```

## 关键约束

- Reaction 体只能写自己的 OutputPort；跨 Reactor 修改状态通过 `send()` 经 LogicalAction 延迟投递，或通过 OutputPort → 下游 InputPort 连接在下一层传播。
- 连接图不能有环。环路违反因果性，调度器重建 APG 时抛错。反馈回路用 LogicalAction 引入显式延迟打破。
- `become()` 替换的 Reaction 集合必须只使用已声明的端口名；端口声明在构造时固定，运行期不可变。
- APG 的"静态"是单 Tag 内稳定。Reactor 注册/注销、连接变化标记 APG 脏，下一 Tag 重建。

## 分布式扩展点

当前为单机单 Worker 实现。跨设备分布式执行在此之上扩展：
- 集中式协调：RTI 协调 Tag 推进，federate 间消息经 RTI 中转。
- 去中心化协调：各节点用本地物理时钟 + maxwait 参数自行决定 Tag 推进，参考 PTIDES / Google Spanner。

Reactor 模型本身不变，federation 在调度器层添加网络传输层。
