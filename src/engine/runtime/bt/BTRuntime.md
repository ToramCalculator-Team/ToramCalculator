# BT 运行时

## 模块职责

1. **定义管理**：按 flowId 注册 BT 定义（mdsl），版本变更时重新编译并缓存编译产物。定义来源是游戏规则层，引擎不持有任何具体流程定义。
2. **实例托管**：为每个实体的每个流程维护一个 Host，每 Tick 推进一次。Host 分两类，由是否允许外部编辑决定。
3. **节点实现注入**：接收游戏规则层注册的 action/condition 实现，按节点名路由调用。
4. **事件发射**：包装所有注册的节点实现，在节点生命周期时刻以树路径为键发射事件，payload 是 blackboard 快照。节点实现层对此无感。
5. **版本热替换**：可编辑 BT 在 Tick 开头检查版本，变化时重建树并保留 blackboard。
6. **Checkpoint**：可编辑 BT 只存 blackboard；不可编辑 BT 用 mistreevous 现有机制。

---

## 理想结构

### 核心依赖

```typescript
/// 注册表：引擎级单例，跨 reset 存活，由引擎构造并向下注入。
class BTFlowRegistry {
  // flowId → 已编译流程
  private flows: Map<string, CompiledFlow>;

  // 全局节点实现注册表（游戏规则层注入）
  private nodeImpls: {
    actions: Map<string, NodeMethodImpl>;
    conditions: Map<string, NodeMethodImpl>;
  };
}

interface CompiledFlow {
  version: number;
  // mistreevous 解析 mdsl 的产物，只在版本变更时生成一次
  compiledDefinition: RootNodeDefinition;
  // 该流程引用的节点实现名集合，编译时从定义中提取
  requiredImpls: Set<string>;
}

/// 可编辑 BT 实例：控制行为树、效果行为树。
class EditableBTHost {
  private registry: BTFlowRegistry;
  private flowId: string;
  private version: number;
  // mistreevous 树对象，版本变更时重建
  private tree: BehaviourTree;
  // 共享黑板，重建时保留
  private blackboard: Blackboard;
}

/// 不可编辑 BT 实例：技能 BT，随技能资产交付，不支持运行时热替换。
class FixedBTHost {
  private registry: BTFlowRegistry;
  private flowId: string;
  private tree: BehaviourTree;
  private blackboard: Blackboard;
}
```

### Host 分类判据

|  | EditableBTHost | FixedBTHost |
|---|---|---|
| 版本变更 | 支持，Tick 开头重建 | 不发生 |
| 允许状态 | 仅 SUCCESS / FAILED | RUNNING 允许 |
| Checkpoint | 只存 blackboard | mistreevous captureCheckpoint |
| 典型场景 | 控制行为树、效果行为树 | 技能 BT |

判据是物理约束：热替换时旧树的 RUNNING 状态无处映射，因此可编辑 BT 必须同步。

---

### 构造与注册

```typescript
/**
 * 构造注册表
 */
constructor(): void
// TODO:
// - 初始化 flows 与 nodeImpls 为空 Map

/**
 * 注册或更新一个 BT 流程定义
 * @param flowId 流程标识
 * @param definition mdsl 定义字符串
 * @param version 规则包提供的版本号，引擎只比较不计算
 */
registerFlow(flowId: string, definition: string, version: number): void
// TODO:
// - 解析 mdsl 为 RootNodeDefinition
// - 提取引用的节点实现名集合
// - 缓存编译产物，记录版本号

/**
 * 注册节点实现
 * @param kind action 或 condition
 * @param name 节点名，与 mdsl 中的节点名对应
 * @param impl 节点实现函数
 */
registerNodeImpl(kind: "action" | "condition", name: string, impl: NodeMethodImpl): void
// TODO:
// - 存入 nodeImpls 对应 Map
// - 包装实现，插入事件发射逻辑（见下文 NodeEventWrapper）

/**
 * 构造可编辑 BT 实例
 * @param flowId 流程标识
 * @param blackboard 初始黑板
 */
createEditableHost(flowId: string, blackboard: Blackboard): EditableBTHost
// TODO:
// - 从 registry 取出编译产物
// - 构造 mistreevous 树，注入包装后的节点实现
// - 记录版本号

/**
 * 构造不可编辑 BT 实例
 * @param flowId 流程标识
 * @param blackboard 初始黑板
 */
createFixedHost(flowId: string, blackboard: Blackboard): FixedBTHost
// TODO: 同上，但不记录版本号（不参与热替换）
```

---

### Tick 推进

```typescript
/**
 * 推进可编辑 BT 一次
 * @param now 当前模拟时间
 */
tick(now: number): void
// TODO:
// - 检查 registry.flows[flowId].version 是否变化
// - 变化则重建树：保留 blackboard，用新编译产物构造新树
// - 更新 version
// - 调用 tree.step()
// - 断言结果不为 RUNNING

/**
 * 推进不可编辑 BT 一次
 */
tick(now: number): void
// TODO:
// - 调用 tree.step()
// - 允许返回 RUNNING
```

重建时机在 Tick 开头、模拟推进之前。重建是一次性分配（解析 + 构造），放在 Tick 中途会让该 Tick 的耗时尖峰落在不确定位置，影响性能分析。放 Tick 开头与 Tick 边界对齐，可断言本 Tick 内无重建。

---

### NodeEventWrapper

节点注册时统一包装，在函数执行前后以节点路径为键发射生命周期事件。每个节点实现不感知事件发射。

```typescript
/**
 * 包装一个节点实现，插入事件发射逻辑
 * @param impl 原始节点实现
 * @param pathProvider 提供该节点在树中的路径
 */
wrapNodeImpl(impl: NodeMethodImpl, pathProvider: () => string): NodeMethodImpl
// TODO:
// - 返回包装后的函数
// - 执行前：发射 { path, phase: "entered" } 事件
// - 执行原始实现
// - 执行后：按返回状态发射 { path, phase: "succeeded" | "failed" } 事件
// - 事件 payload 是当前 blackboard 的浅快照
// - 事件发往 worker 内 EventBus

/**
 * 生成节点路径
 * 从根到当前节点的节点名序列，用 "." 连接
 */
buildNodePath(node: mistreevousNode): string
// TODO:
// - 遍历父链收集节点名
// - 匿名节点用节点类型名兜底
```

事件身份由树路径承担，形如 `受击流程.命中判定.基础命中值计算:succeeded`。订阅端按前缀匹配选择粒度。树结构本身就是规则结构，命名空间与规则不会漂移。

快照在节点生命周期时刻生成，不在 Tick 末批量做。blackboard 是可变共享状态，事件触发时的值可能在后续节点中被覆盖，Tick 末取到的是最终值而非事件发生时的值。

只有匹配外部订阅的路径才做快照并写入输出端口事件区。无外部订阅的路径只在 worker 内 EventBus 派发，不进入 SAB。

---

### Checkpoint

```typescript
/**
 * 可编辑 BT：只存 blackboard
 */
captureCheckpoint(): EditableBtCheckpoint
// TODO: 返回 { flowId, version, blackboard }

restoreCheckpoint(checkpoint: EditableBtCheckpoint): void
// TODO:
// - 恢复 blackboard
// - 用当前 registry 的编译产物重建树（版本可能已变）
// - 不可恢复 RUNNING 状态，但可编辑 BT 本就不允许 RUNNING

/**
 * 不可编辑 BT：用 mistreevous 机制
 */
captureCheckpoint(): FixedBtCheckpoint
// TODO:
// - 返回 { flowId, treeCheckpoint: tree.captureCheckpoint(), blackboard }

restoreCheckpoint(checkpoint: FixedBtCheckpoint): void
// TODO:
// - 恢复 blackboard
// - 调用 tree.restoreCheckpoint(checkpoint.treeCheckpoint)
// - 恢复 Wait 已等待时长、Repeat 迭代计数、Retry 尝试计数
```

mistreevous 本地化版本已实现 checkpoint 机制，覆盖 Wait 的已等待时长、Repeat 的迭代计数、Retry 的尝试计数。不可编辑 BT 直接复用，无需额外开发。

可编辑 BT 的 checkpoint 只存 blackboard，因为热替换会丢弃旧树的全部内部状态，而可编辑 BT 禁止 RUNNING，不存在需要保存的树内部状态。

---

## 与游戏规则层的接口

游戏规则包通过以下接口向引擎注册：

```typescript
interface BTRulesPackage {
  // BT 流程定义
  definitions: Array<{ flowId: string; definition: string; version: number }>;
  // 节点实现
  actions: Record<string, NodeMethodImpl>;
  conditions: Record<string, NodeMethodImpl>;
}
```

引擎在构造时接收 `BTRulesPackage`，调用 `registerFlow` 与 `registerNodeImpl` 完成注册。运行时不再访问游戏规则包。

节点实现的函数签名：

```typescript
type NodeMethodImpl = (context: NodeContext) => State;

interface NodeContext {
  // 当前成员的 blackboard
  blackboard: Blackboard;
  // 当前模拟时间
  now: number;
  // 本 Tick 的步长
  deltaTimeMs: number;
  // 成员能力面（submitControlInput 等）
  capabilities: MemberCapabilities;
}
```

节点实现只能通过 `capabilities` 访问成员能力，通过 `blackboard` 读写状态。不直接持有引擎或 World 引用。

---

## 与 World 的关系

Host 实例归 World 持有，随成员生命周期创建与销毁。World 在 Tick 的决策相遍历所有成员的 EditableBTHost 并调用 `tick(now)`，在效果相遍历效果行为树。

World 不感知 Host 内部结构，只看到 `tick(now)` 入口和 `captureCheckpoint` / `restoreCheckpoint`。

---

## 不负责

- 持有具体流程定义（由游戏规则层注册）
- 持有具体节点方法实现（由游戏规则层注册）
- 判断哪个成员该跑哪个流程（由 World 或成员装配决定）
- 事件订阅过滤（由 EventBus 与输出端口事件区负责）
