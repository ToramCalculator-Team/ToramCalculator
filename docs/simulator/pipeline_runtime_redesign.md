# 模拟器运行时重构设计（Pipeline / FSM / BT / Stat / Status）

## 1. 目标

本轮重构的目标是把当前模拟器运行时拆成职责清晰、可迭代扩展的几层：

- FSM：只负责流程调度与状态迁移。
- Pipeline：负责可插拔、可复用的计算链。
- BT：负责技能主动效果、Buff 并行树、AI 行为逻辑。
- StatContainer：负责成员级数值属性与修饰器。
- StatusInstanceStore：负责状态/异常/持续效果实例。

设计重点：

- 支持雷吉斯托环等纯数据驱动扩展。
- 支持全局、世界、阵营、队伍、成员、技能等多级 patch。
- 避免 `runtimeContext`、BT board、pipeline 上下文之间重复存放同一份数据。

## 2. 非目标

本轮不追求一次性完成所有系统迁移。

- 不立即重写全部技能逻辑。
- 不立即引入每一级的完整运行时对象。
- 不立即把所有旧字段重命名到位。

本轮优先完成概念冻结与第一条主链的迁移基线。

## 3. 术语

### 3.1 PipelineRegistry

全局的管线定义仓库，负责存放：

- 管线定义（pipeline -> stage 列表）
- stage/action 定义
- 纯数据配置转 patch/definition 的解析规则

它是“定义仓库”，不是实际执行器。

### 3.2 MemberPipelineRuntime

挂在成员上的管线执行器，负责：

- 收集各级 scope patch
- 合成本次有效执行链
- 创建并执行 `PipelineExecutionContext`
- 返回本次结果

它是“执行器”，不是全局定义仓库。

### 3.3 Pipeline

一个可复用的计算流程，例如：

- 命中计算
- 控制结算
- 伤害结算
- 状态施加
- 技能效果解析

### 3.4 PipelineStage

单个可复用计算步骤。一个 stage 应尽量：

- 输入清晰
- 输出清晰
- 不依赖隐式全局状态

### 3.5 Scope Patch

对 pipeline 的补丁，来自不同层级：

- global
- world
- camp
- team
- member
- skill
- transient

Patch 只描述“如何改动执行链/参数”，不直接等于完整执行器。

### 3.6 StatusInstanceStore

成员的状态/异常实例仓库，负责管理：

- 睡眠、中毒、着火、出血、昏厥等状态实例
- 实例生命周期（apply/refresh/expire/remove）
- 对外提供 `statusTags`、`remainingFrames` 等派生查询

它不是 stat 容器。

## 4. 运行时分层

## 4.1 FSM

FSM 只负责：

- 接收事件
- 进行状态迁移
- 调度 pipeline
- 注册/注销 BT

FSM 不直接实现：

- 命中算法
- 伤害算法
- 状态持续时间算法
- 雷吉斯托环具体效果

## 4.2 Pipeline

Pipeline 负责：

- 一次性计算链
- 多级 patch 合成
- stage 插入/覆盖/替换
- 统一输入输出

Pipeline 不负责：

- 长期持有成员状态
- 管理状态实例生命周期
- AI 决策

## 4.3 BT

BT 负责：

- 主动技能效果执行
- Buff 并行行为
- AI 行为树
- 由条件和动作组成的行为逻辑

BT action 原则上不直接承载复杂公式，而应该：

- 调用 pipeline
- 发出事件
- 执行轻量运行时动作

## 4.4 StatContainer

StatContainer 负责成员级数值真相源：

- 基础值
- 静态修饰器
- 动态修饰器
- 表达式依赖
- 来源追踪

适合进入 StatContainer 的值：

- 命中、回避、暴击、伤害倍率
- 状态抗性
- 某状态持续时间倍率
- 受击减伤倍率
- 技能 cost/range/cd 的成员级修正

不适合进入 StatContainer 的值：

- 当前技能中间临时值
- 本次命中结算 scratch
- 当前睡眠实例剩余帧
- 某次伤害请求快照

## 4.5 StatusInstanceStore

StatusInstanceStore 负责状态实例层：

- 当前有哪些状态实例
- 每个实例的来源、开始帧、结束帧、层数、剩余时间
- 实例刷新与失效

它输出给其他系统的常见视图：

- `statusTags`
- `hasStatus(statusType)`
- `getStatusRemaining(statusType)`

## 5. 对象职责表

| 对象 | 职责 | 不负责 |
|---|---|---|
| `PipelineRegistry` | 全局定义、标准 stage 注册、配置解析 | 实际执行 |
| `MemberPipelineRuntime` | 成员执行、patch 合成、上下文创建 | 全局定义存储 |
| `StatContainer` | 成员级数值属性 | 状态实例 |
| `StatusInstanceStore` | 状态实例生命周期 | 数值修饰器 |
| `BtBoard` | 行为树访问视图 | 长期真相源 |
| `MemberRuntimeState` | 成员共享运行时状态 | 数值依赖计算 |
| `MemberRuntimeServices` | 表达式/渲染/事件等服务接口 | 持久状态 |

## 6. 为什么不在每一级都挂完整 PipelineManager

不建议在引擎、世界、阵营、队伍、成员上都挂完整执行器。

原因：

- 定义仓库会重复
- 编译缓存会重复
- override 优先级会变复杂
- 执行入口会分散

推荐方式：

- 引擎级：`PipelineRegistry` + `GlobalPatchStore`
- 世界级：`WorldPatchStore`
- 阵营级：`CampPatchStore`
- 队伍级：`TeamPatchStore`
- 成员级：`MemberPipelineRuntime` + `MemberPatchStore`

即：

- “定义集中存放”
- “各级只提供 patch”
- “成员统一执行”

## 7. Scope Patch 优先级

本设计采用如下优先级，从低到高：

1. global
2. world
3. camp
4. team
5. member
6. skill
7. transient

说明：

- `global`：系统默认规则
- `world`：地图/副本/全局环境
- `camp`：阵营被动规则
- `team`：队伍协同规则
- `member`：成员持有的装备/托环/被动
- `skill`：本次技能变体覆盖
- `transient`：本次事件临时 patch

## 8. PipelineExecutionContext

`PipelineExecutionContext` 是“本次 pipeline 执行的工作台”，不是长期 runtime 副本。

建议结构：

- `subject`：当前执行主体成员
- `source`：可选，来源成员
- `target`：可选，目标成员
- `runtime`：主体共享运行时状态引用
- `stats`：主体的 `StatContainer` 引用
- `services`：表达式求值、渲染、事件、伤害请求等服务
- `input`：本次输入
- `scratch`：本次执行的中间值
- `output`：本次结果
- `meta`：traceId、skillId、ringId、sourceType、frame 等

设计原则：

- 引用共享长期状态，不复制大对象
- 中间值进入 `scratch`
- 最终产物进入 `output`
- 需要写回共享状态时显式写回

## 9. 数据归属规则

### 9.1 进入 StatContainer

满足下列特征的值应进入 StatContainer：

- 是成员级长期可查询属性
- 会被多个来源统一修正
- 适合表达为 schema path

例子：

- `accuracy`
- `antiVirus`
- `status.sleep.durationRate`
- `status.control.durationRate`
- `damage.taken.physicalRate`

### 9.2 进入 MemberRuntimeState

满足下列特征的值应进入共享运行时状态：

- 是成员当前流程态
- 会被 FSM/BT/Pipeline 共同读取
- 不是属性依赖计算的对象

例子：

- `currentSkill`
- `currentSkillVariant`
- `currentDamageRequest`
- `currentTargetId`

### 9.3 进入 StatusInstanceStore

满足下列特征的值应进入状态实例仓库：

- 表示某次状态/异常/持续效果实例
- 需要记录开始时间、剩余时间、来源

例子：

- 当前睡眠实例
- 当前中毒实例
- 当前着火实例

### 9.4 进入 PipelineExecutionContext.scratch

满足下列特征的值应进入 `scratch`：

- 只在本次结算中存在
- 是某个阶段的中间产物
- 不应污染共享状态

例子：

- 命中率中间值
- 本次最终睡眠时长
- 本次控制成功判定结果

## 10. BT Board 设计

`BtBoard` 应视为行为树访问层，而不是另一份长期 runtime。

推荐结构：

- 原型链指向共享 runtime state / services
- 自身存放局部 BT memory
- 动态挂载 action/condition invoker

要求：

- 不深拷贝共享状态
- 不长期持有与 runtime 脱钩的重复副本

## 11. 纯数据驱动托环模型

本设计假定托环为纯数据驱动。

因此托环 effect 只允许落到标准 effect 类型：

- `stat_modifier`
- `pipeline_patch`
- `status_reaction`

后续可继续扩展，但第一轮先以这三类为主。

## 12. “睡眠不足”托环设计样例

原始需求：

- 睡眠不足：睡眠状态的持续时间缩短 `tLv * 10%`

### 12.1 数据层建议

托环本身：

- `id: register_ring_sleep_insufficient`
- `name: 睡眠不足`
- `maxLevel: 5`
- `uniqueKey: sleep_insufficient`
- `target: self`

effect：

- `type: stat_modifier`
- `attr: status.sleep.durationRate`
- `channel: static_fixed`
- `op: add`
- `valuePerLevel: -10`

### 12.2 为什么不是专属 pipeline patch

因为它本质上不是流程分支修改，而是“目标侧持续时间倍率 stat”。

因此：

- 托环装配时，转成 stat modifier
- 状态施加时，由通用 pipeline 读取该 stat

### 12.3 引擎中的执行流

#### 装配阶段

成员装配托环时：

1. 校验不可重复持有
2. 遍历托环 effect
3. 对 `sleep_insufficient` 执行 stat modifier mount

#### 状态施加阶段

当目标要被施加睡眠时，执行通用 `status.apply` pipeline：

1. `normalize`
2. `check_immunity`
3. `resolve_base_duration`
4. `apply_duration_modifiers`
5. `clamp_duration`
6. `create_instance`
7. `publish`

其中第 4 步读取：

- `status.sleep.durationRate`

算出本次最终睡眠持续时间。

#### 状态实例阶段

最终创建一个 sleep status instance，写入 `StatusInstanceStore`：

- `type: sleep`
- `sourceId`
- `sourceSkillId`
- `appliedAtFrame`
- `resolvedDurationFrames`
- `expiresAtFrame`

## 13. 第一条建议迁移链

为了控制风险，建议先迁一条完整纵向切片：

- `受到攻击 -> 命中 -> 控制 -> 伤害`

或者先做更小切片：

- `状态施加 -> 睡眠持续时间计算 -> 状态实例写入`

如果以托环为先导样例，推荐先做第二条。

## 14. 迭代顺序

### 迭代 0：设计冻结

- 确认对象职责
- 确认字段归属
- 确认 scope patch 优先级

### 迭代 1：命名与类型清洗

- `Pipline` -> `Pipeline`
- `Property` -> `RuntimeState`
- `blackboard` -> `btMemory`

### 迭代 2：运行时拆层

- `MemberRuntimeState`
- `MemberRuntimeServices`
- `BtBoard`
- `StatusInstanceStore`
- `PipelineExecutionContext`

### 迭代 3：成员管线执行器接入

- `PipelineRegistry`
- `MemberPipelineRuntime`
- scope patch 合成

### 迭代 4：迁移第一条切片

- 推荐先做状态施加管线
- 以“睡眠不足”为第一条托环样例

## 15. 当前待确认项

以下问题在进入实现前仍需逐一确认：

1. `statusTags` 是否保留为兼容缓存视图
2. `currentDamageRequest` 是否继续留在共享 runtime state
3. 阵营/队伍 patch store 是否先放在 `MemberManager`，还是提前引入显式 runtime 对象
4. 状态实例的刷新规则、叠层规则、互斥规则

## 16. 结论

本设计的核心原则是：

- stat 与 state 分层
- 定义与执行分层
- patch 与 runtime 分层
- 托环优先纯数据驱动

用一句话概括：

“定义集中在引擎，patch 分散在各级作用域，执行统一发生在成员，状态实例独立于 stat，BT 只看共享 runtime 的访问视图。”
