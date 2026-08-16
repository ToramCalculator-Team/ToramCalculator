# 0052 - 高频世界状态统一使用实时状态 SAB

- **状态**: Accepted
- **日期**: 2026-08-15
- **决策层**: 跨层（引擎 / Worker / Session / UI / 渲染）
- **相关代码**: `src/engine/core/thread/`、`src/engine/core/World/Member/`、`src/engine/core/World/Area/`、`src/features/simulator/session/`、`src/platform/render/scene/`
- **相关 ADR**: Refines 0050；Depends on 0029；Depends on 0044；Related to 0053

## 决策问题

引擎 Worker 同时向 UI 和渲染层提供高频世界状态。现有 `FrameSnapshot` 把成员位置、属性和控制器绑定视图组装为对象后通过消息发送；渲染层又拥有独立的成员位置 SAB，区域仍通过渲染快照传输。这样产生重复状态源、重复属性序列化和不同消费者之间的节奏差异。

渲染层还需要模型、材质和动画映射等静态视觉资源。该信息不属于实时世界状态，不能因为实体在运行中出现就重复通过高频通道传输。系统需要区分静态资源注册表、实体到资源配置的引用和实体运行状态。

系统需要决定：是否继续为 UI、渲染层和不同状态类别维护多条高频消息路径，还是把实时世界状态统一放进一个由 Worker 写入、UI 与渲染层共同读取的 latest-state SAB，同时保留引擎和 UI 所需离散事件、以及完整 Tick 历史的独立语义。渲染层本身不需要跨线程视觉事件回放。

## 决策驱动

- Worker 必须是实时世界事实的唯一写入者，UI 和渲染层不能各自维护一份高频权威状态。
- UI 和渲染器都只需要最新状态，可以跳过中间 Tick；把这些状态排队会产生过期对象和重复结构化克隆。
- 渲染器的静态视觉资源应由本地注册表或一次性资源清单提供；实时状态只携带可解释当前实体的稳定资源引用，不重复传输模型 URL、材质和动画映射。
- 成员属性的叶子数量和 modifier 来源随场景装配变化，协议必须支持按成员生成不同的属性布局。
- 区域是世界实体，但与成员的属性、生命周期和渲染字段不同，不能复用同一个成员实体槽结构。
- 逐次消费的技能、状态和用户动作不能因为 SAB 覆盖而丢失；完整 Tick 历史也有独立的长期生命周期和容量策略。

## 候选方案

### A. UI 使用 `FrameSnapshot`，渲染层使用独立世界状态 SAB

- 优点：可以沿用当前 UI 接口，渲染位置读取路径改动较小。
- 缺点：成员状态被重复编码；属性和区域仍走消息对象；UI 与渲染器可能读取不同 Tick 的事实；后续继续增加第三条高频路径的概率很高。

### B. 连续世界状态统一使用一个 latest-state SAB，离散事件和 Tick 历史保持独立

- 优点：Worker 只写一次，UI 和渲染器共享同一个提交版本；中间状态可以自然跳过；成员属性、modifier 和区域可以按场景布局；历史数据不污染实时 ABI。
- 缺点：需要协商布局、管理容量和版本；UI 需要本地轮询或调度器把 SAB 提交版本转换为响应式更新；共享内存需要安全上下文和跨源隔离。

### C. 所有跨线程数据，包括离散事件和 Tick 历史，都进入同一个 SAB

- 优点：跨线程载体单一，理论上可以减少消息类型。
- 缺点：覆盖式 latest-state 无法表达事件逐次消费；事件队列和完整历史的生命周期、容量与重放语义不同；把三种语义强行放进同一个 ABI 会增加丢失、回收和版本迁移风险。

## 决议

选择 B：**成员和区域的连续世界状态统一写入一个实时状态 SAB；渲染器使用静态视觉资源注册表解释实体状态，UI 与渲染层只读该 SAB 的最新提交；引擎和 UI 所需离散事件继续使用各自事件通道，渲染层不接收跨线程视觉事件，完整 Tick 状态历史继续使用独立的历史 SAB。**

### 实时状态 SAB 的结构边界

SAB 使用版本化目录和提交序号，逻辑上包含以下区域：

```text
Header / layoutVersion / commitVersion
MemberDirectory
AttributeSchemaTable
MemberStateTable
MemberAttrTable
ModifierEntryTable
ModifierSourceTable
ModifierChainTable
AreaStateTable
```

渲染器的运行时输入分为两类：

1. **静态视觉资源注册表**：由项目资源映射或 Session 初始化时的一次性资源清单提供，包含模型、外观和动画映射。它不进入实时状态 SAB，也不通过 `render_cmd` 逐实体发送。
2. **实时状态 SAB**：包含实体目录中的 `active`、槽位代次和稳定的 `visualProfileId`/类型引用，以及位置、朝向、生命周期、可重建的动画时间线、区域形状和相机目标等动态状态。动画时间线至少包含动画标识、提交时 `progress`、逻辑时间或 Tick、循环/结束状态；成员行动速度 `mspd` 是 `MemberAttrTable` 中的权威成员属性，逻辑、物理和渲染都从同一提交读取，动画只将其用于计算播放速度，不复制为第二个 `actionRate` 字段。`visualProfileId` 只是资源注册表索引，不是资源定义本身。
渲染器不接收技能、攻击、受击或其他离散事件来驱动视觉状态。渲染器读取一致的 SAB 提交后，根据提交时 `progress`、逻辑时间差和同一提交的 `mspd` 在本地计算当前帧动画进度；已经结束且未被读取到的瞬时动作不补播。

确立以下不变量：

1. Worker 是唯一写入者；UI 和渲染层只读。所有表由同一个提交序号保护，消费者可以跳过中间提交。渲染器可以从任意一个读取一致的提交建立当前世界，不需要识别或等待一个特殊的“初始提交”。
2. `MemberStateTable` 和 `AreaStateTable` 是两个独立的状态表。区域不使用成员槽位表示，也不把区域强行建模为带属性的成员。
3. 每个成员通过目录保存 `attributeOffset`、`attributeCount`、`modifierOffset`、`modifierCapacity`、`active`、槽位代次和稳定的视觉资源引用。属性布局按场景装配结果生成，而不是为所有成员使用同一固定属性数量。运行中新增的召唤物使用预分配的空闲槽位；渲染器通过活动状态变化发现并创建它们。
4. 属性数量按下式确定：

   ```text
   attributeCount(member) = 基础属性叶子数 + 去重后的 attributeSlots 数
   ```

   当前基线为 Player 138 个基础属性叶子、Mob 31 个基础属性叶子。`attributeSlots` 必须在 `AttributeContainer` 构造前合并；运行中不能原地追加属性。若未来需要运行中扩展，必须在生命周期边界重新协商并替换 SAB 布局。

5. modifier 使用独立的定长 entry pool，不按“每个属性固定 N 个来源”分配。设战前装配完成后的实际条目数为 `P(member)`，首版容量计算为：

   ```text
   modifierCapacity(member) = nextPowerOfTwo(max(128, P(member) + 80))
   ```

   `80` 为运行时 modifier 预算，其中 64 个用于 buff / debuff / passive 等动态来源，16 个用于技能、伤害区域和短生命周期行动。首版默认容量为 256，硬上限为 512；容量不足必须在场景装配或布局协商阶段显形，不能覆盖旧条目。

6. modifier entry 只保存属性索引、modifier 类型、数值和来源索引；来源名称、来源类型和 provenance chain 通过 `ModifierSourceTable` 与 `ModifierChainTable` 保存。字符串进入只读元数据区，不在每个 Tick 重复写入。
7. 首版 `AreaStateTable` 的世界级容量为 256。区域创建超过容量时必须拒绝创建并报告诊断，不得覆盖仍然有效的区域。区域种类增加时继续扩展区域表的类型字段和布局版本，不复用成员表。
8. 连续状态 SAB 不承载逐次事件。技能触发、施法阶段、攻击、闪避、格挡、受击、死亡、目标切换和用户输入确认按各自语义进入引擎或 UI 的离散事件通道；渲染层不订阅这些事件来驱动视觉状态。不建立统一的跨线程事件队列、全局序列号或全局消费确认。
9. `render_cmd` 整体退出运行时渲染协议。迁移完成后，`spawn`、`destroy`、`face`、`teleport`、`reconcile`、持续动画、区域更新和相机目标全部由静态资源注册表、Session 状态和实时状态 SAB 驱动；不保留备用的跨线程视觉事件通道。
10. 完整模拟 Tick 序列和历史分析数据不进入实时世界状态 SAB。它们遵循 ADR 0044 的分段历史 SAB、目录移交和释放生命周期。
11. 渲染器启动时读取任意一个完整且稳定的 SAB 提交作为本地启动基线；渲染器不等待或回放启动期间的渲染命令。静态资源注册表必须先就绪，随后渲染器立即继续读取最新提交。
12. `FrameSnapshot` 不再是实时世界状态的权威载体。迁移完成后，`frame_snapshot` push、`latestFrame`、旧的渲染快照初始化路径和重复的属性对象导出都应删除；小型 telemetry 和离散事件不受此条影响。
13. 没有 UI 或渲染消费者的普通引擎执行不隐式创建实时状态 SAB。实时投影能力由 Session 显式附加，并在释放时解除 Worker 写入附件。

### 明确排除

- 不为 UI 和渲染层分别维护两份高频世界状态。
- 不把事件队列编码成可以被覆盖的 latest-state 槽位。
- 不把模型 URL、材质、动画映射等静态资源定义写入实时状态 SAB。
- 不要求渲染器通过历史 `render_cmd` 回放来建立世界；当前世界由静态资源注册表和任意一致的最新状态提交建立。
- 不为渲染层保留可选的离散视觉事件通道或消息降级路径。
- 不把区域塞进成员实体槽位，也不为区域复制一套成员属性模型。
- 不通过消息通道发送完整属性对象来补充 SAB 缺失字段。
- 不把实时最新状态和 Tick 历史合并为同一个可变 ABI。

## 代价

- Worker 和主线程必须先协商场景布局，SAB 布局版本、目录偏移和容量变化需要同步迁移。
- UI 不会因 SAB 写入自动触发 Solid 响应式更新，需要由主线程调度器轮询提交版本并触发本地更新。
- 属性 schema 和 modifier provenance 需要额外的数字索引、只读元数据区和按需解码逻辑。
- modifier 和区域容量有明确上限；超限场景必须失败或重新协商，不能依赖无限增长的 Map。
- 实时功能继续要求 SharedArrayBuffer 可用、跨源隔离和安全上下文；不为该能力增加隐式消息降级路径。
- 迁移期间需要同时验证静态资源注册表、召唤物槽位生命周期、UI、渲染器和 Worker 生命周期；旧 `FrameSnapshot` 与连续状态 `render_cmd` 路径不能长期双写。
- 渲染器不会补播它未读取期间已经结束的动作；如果未来产品要求逐次展示这类瞬时效果，需要重新评估本决策，而不是增加隐式事件旁路。

## 重新评估条件

- 代表性场景中成员 modifier 条目稳定超过 512，或区域并发稳定超过 256，导致容量拒绝成为正常业务路径。
- 运行时开始支持成员或属性的高频动态创建，生命周期边界替换 SAB 无法满足延迟预算。
- UI 或渲染器需要跨会话、跨进程或远程消费实时状态，Session 内共享内存不再覆盖主要生命周期。
- 测量显示实时 SAB 的读取调度、元数据解码或跨源隔离环境门槛成为主要性能或可用性瓶颈。
- 浏览器提供新的零复制 latest-state 机制，同时具备等价的原子一致性和生命周期能力。
- 产品明确要求渲染器逐次展示当前状态之外的瞬时动作或视觉效果。

## 参考

- [ADR 0050：实时状态的传输语义分类](./0050-realtime-state-transport-semantics.md)
- [ADR 0029：属性快照采用扁平路径与严格叶节点契约](./0029-flat-typed-attribute-snapshot-contract.md)
- [ADR 0044：Tick 状态历史采用 SAB-only 分段增量存储](./0044-store-tick-state-history-in-sab-segments.md)
- `src/engine/core/World/Member/runtime/AttributeContainer/AttributeContainerTypes.ts`
- `src/engine/core/thread/worldStateBuffer.ts`
