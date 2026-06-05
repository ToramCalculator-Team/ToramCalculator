# 0011 - 成员事实在结算点成对派发到两条总线

- **状态**: Proposed
- **日期**: 2026-06-05
- **决策层**: 编排层 / 通信
- **相关代码**: `src/lib/engine/core/World/Member/runtime/DamageResolution.ts`、`src/lib/engine/core/World/Member/runtime/StatusInstance/StatusInstanceStore.ts`、`src/lib/engine/core/DomainEvents/DomainEventBus.ts`、`src/lib/engine/core/World/Member/runtime/ProcBus/ProcBus.ts`、`src/lib/engine/core/World/Member/attachments/RuntimeAttachmentInstaller.ts`
- **相关 ADR**: 0008（受击结算后 emit `damage.received` 到自身 ProcBus 的先例）、0010（ProcBus 与 DomainEventBus 各司其职的角色划分）

## 背景

"成员身上发生的事实"（受击、状态进入/离开、HP/MP 变化）有两类消费方：

- **成员内逻辑**：passive / buff / registlet 要据此响应。例如"燃烧的斗志"——受到带 `ignition`（着火）标签的伤害时回 MP。这类响应走每成员的 ProcBus。
- **成员外观察者**：UI / 控制器要据此渲染（伤害数字、血条、施法进度）。这类走引擎级单例 DomainEventBus，由 `ControllerEventProjector` 投影 memberId→controllerId。

ADR-0010 已确立两条总线**各司其职**：ProcBus 对内、DomainEventBus 对外。

代码现状（已逐条核对）：

1. **对外那条通**：受击结算 `resolveDamageAndApply` 走完会 `notifyDomainEvent({type:"hit"})`，UI 能拿到。
2. **对内那条断**：全仓库**无任何** `emit("damage.received")`。`damage.received` 在 `BuiltInEvents.ts:100` 登记了、订阅侧 `installSubscriptions`（按 `requiredDamageTags` 过滤）也写好了，**但源头从未派发**。`status.entered/exited` 同样是登记+订阅就绪、源头空缺的"空壳事件"。
3. **后果**：数据驱动的 registlet 机制其余环节（数据 schema、安装、handler 执行）全部就位，唯独受击/状态端没接线，导致"燃烧的斗志"这类 passive **根本触发不了**。

需要决定：如何让"对内响应"这条链路通起来，以及它与"对外投影"的关系如何摆放。

## 候选方案

### A. DomainEventBus 降为 ProcBus 下游（重构计划原方向）

ProcBus 成为唯一 emit 点；DomainEventBus 订阅 ProcBus 的相关事件，转成 UI 投影。Member 不再"双发"。

- 优点：表面上"单一 emit 点"，概念上似乎更干净。
- 缺点：
  - 违背 ADR-0010 刚确立的"对内/对外各司其职"角色划分，把对外投影**耦合**成员内事件结构。
  - payload 形状不匹配：UI 的 `hit` 要"受击后 hp"，ProcBus 的 `damage.received` 是结算明细（finalDamage/crit/tags）。下游投影要么补字段、要么回读成员状态。
  - 层级错配：ProcBus 每成员、DomainEventBus 引擎级单例。"单例订阅每个成员的总线"要在每成员接一根转发线，**反而增加接线**。

### B. 在权威结算点成对派发到两条总线

"成员身上发生的事实"在它被结算的那一处，一次性、成对地 emit 到两条总线：对内 emit 给本成员 ProcBus（供 passive/registlet 响应），对外 emit 给 DomainEventBus（供 UI 投影）。两条总线维持 ADR-0010 的角色划分不变。

- 优点：
  - 不改两条总线的既有角色与层级，零架构改动，只补"对内那条断掉的 emit"。
  - 两条线的 payload 各自按消费方裁剪，互不耦合。
  - 受击结算函数 `resolveDamageAndApply` 已用参数注入 `notifyDomainEvent`，新增对内 emit 沿用同一模式，改动面极小。
- 缺点：
  - 同一事实有两处 emit。需要明确这是"两个消费方"而非"冗余双发"，否则后人会误以为可以合并掉一处。
  - 两处 emit 的一致性靠结算点自律（同一函数内相邻两行），没有强制约束。

## 决议

选 **B**。

理由：

1. **不破坏刚立的角色划分**：ADR-0010 确立 ProcBus 对内、DomainEventBus 对外。方案 A 让对外投影耦合成员内事件，是倒退；B 维持划分。
2. **现状的真问题是"对内源悬空"，不是"双发冗余"**：受击只 emit 了对外的 `hit`，对内的 `damage.received` 从未派发。要补的是缺失的那条，不是删掉哪条。
3. **两处 emit 是两个消费方，不是冗余**：`hit`（UI 要受击后 hp）与 `damage.received`（passive 要结算明细 + damageTags）payload 不同、消费方不同。合并任一条都会丢失另一方所需信息。
4. **改动面最小、可立即验证**：沿用 `resolveDamageAndApply` 的参数注入，加一条 emit 即可让"燃烧的斗志"端到端跑通，作为运行时验证。
5. **registlet 的 Player 专属性天然达成**：受击结算 Player/Mob 共用，但 registlet 仅 Player 安装。Mob emit `damage.received` 无人订阅、空转无害，无需在 emit 处做成员类型判断。

## 代价

放弃了什么、何时会后悔：

- **放弃"单一 emit 点"的概念洁癖**：同一事实有两处 emit（一处对内、一处对外）。代价是后人可能误读为"冗余双发"而想合并。缓解：本 ADR 明确两者是不同消费方；两处 emit 写在同一结算函数相邻位置，便于一眼看出配对关系。
- **一致性靠自律**：两处 emit 没有强制绑定，若将来新增"成员事实"只 emit 了一条，会重现今天"对内悬空"或"对外缺失"的问题。缓解：在结算点注释标注配对约定；若此类事实增多，再考虑提取一个"成对派发"helper（届时另立 ADR）。
- **空壳源接通后，订阅基数上升**：`damage.received` / `status.entered/exited` 真正派发后，ProcBus 的 predicate 扇出从 0 变为实际值。与 ADR-0010「代价」节的扇出讨论同源；当前 registlet 基数小，可接受。
- **后悔条件**：若实测发现"对外投影"长期只是"对内事件的机械转写"（payload 完全一致、无额外信息），那方案 A 的合并反而更省。当前两者 payload 明确不同，赌它们会持续分化（UI 关心展示态，passive 关心结算明细）。

## 影响范围

- **代码层面**：
  - `DamageResolution.resolveDamageAndApply`：命中分支末尾新增对内 emit `damage.received`（参数注入 emit 通路）。
  - `StatusInstanceStore`：apply / 移除路径新增 emit `status.entered` / `status.exited`。
  - `Member`：把本成员 ProcBus 的 emit 通路注入给受击结算（类比现有 `notifyDomainEvent` 注入）。
  - Mob/Player 状态机调用 `resolveDamageAndApply` 处补传 emit 参数。
- **文档层面**：`BuiltInEvents.ts` 三个事件的 description 可注明"已接通"；本 ADR 与 README 索引。
- **迁移**：纯增量，不改既有 `notifyDomainEvent`/DomainEventBus 行为。叶子层 `healHp/healMp` 的 `notifyDomainEvent` 散发问题正交，本 ADR 不处理。
- **验证**：以真实 registlet "燃烧的斗志"（`eventNames=["damage.received"]`、`requiredDamageTags=["ignition"]`、handler 加 `mp.current += ampr×level×5%`）端到端跑通为运行时验证（`ampr` 已存在于 `PlayerAttrSchema`）。

## 参考

- ADR-0008：受击结算后 emit `damage.received` 到自身 ProcBus 的先例（本 ADR 兑现它）。
- ADR-0010：ProcBus（对内）/ DomainEventBus（对外）各司其职的角色划分（本 ADR 维持并依据它否定方案 A）。
- `src/lib/engine/document/额外逻辑hook点.txt`：燃烧的斗志等受击/状态响应型 registlet 的原始需求描述。
- `src/lib/engine/document/world-medium-analysis.tmp.md:88`：自述"内置 `damage.received` 事件存在，但当前伤害流程没有 emit 到成员内 ProcBus"。