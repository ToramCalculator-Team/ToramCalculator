# 成员运行时上下文收口计划

## 文档目的

本文档只描述引擎内“成员运行时上下文”的分类依据、字段归属规则、分阶段处理办法和验证清单。

它的用途是：

- 作为后续手动重构时的实施计划
- 作为回退代码后仍然可保留的设计依据
- 避免 `Member.context` 再次演化成“万能袋”

本文档不代表当前代码已经实现到什么阶段；它是目标方案与实施顺序的说明。

---

## 一、问题定义

当前成员相关运行时信息混杂在多个位置：

- 成员共享状态与引擎注入服务混在一起
- FSM 私有流程状态与共享世界状态互相镜像
- 单次 pipeline 执行的临时数据回写到成员长期运行时
- BT 为了方便读取，把不属于共享契约的字段也塞进成员上下文

这种混合会带来几个直接问题：

- 字段边界不清，任何模块都可能继续往 `context` 里加东西
- 同一份数据存在多个来源，容易出现双写分叉
- checkpoint / rollback 很难做到一致恢复
- pipeline、FSM、BT 的职责边界被长期侵蚀

因此需要对“成员运行时上下文”进行强力收口。

---

## 二、目标终态

最终只保留 4 个明确边界：

1. `member.runtime`
   用于成员跨系统共享的、可序列化的、需要参与 checkpoint 的运行时状态。

2. `member.services`
   用于引擎注入的运行时服务引用，不属于状态，不参与 checkpoint。

3. `fsm.context`
   只保留状态机私有流程状态，不再镜像共享世界状态。

4. `PipelineExecutionContext`
   只承载单次 pipeline 执行的输入、中间值和输出，禁止污染成员长期 runtime。

补充说明：

- BT 不再拥有独立的“共享上下文模型”，而是从 `member.runtime` 派生私有上下文
- 若 BT 需要 `owner`、`services` 等便利字段，只能通过 BT 私有 bindings 注入
- 最终删除 `Member.context`

---

## 三、分类依据

任何字段在归类前，先回答下面 6 个问题：

1. 这个字段是否需要被 FSM、BT、pipeline、表达式求值等多个系统共同读取？
2. 这个字段是否代表成员的长期共享状态，而不是某次执行过程中的临时值？
3. 这个字段是否应该参与 checkpoint / rollback？
4. 这个字段是否可序列化？
5. 这个字段是否只是状态机内部流程控制所需？
6. 这个字段是否只是某一次 pipeline / 技能执行过程中的中间产物？

判定规则如下：

- 若答案偏向“跨系统共享 + 长期存在 + 需要恢复 + 可序列化”，归入 `member.runtime`
- 若答案偏向“引擎注入的函数/服务引用 + 不应序列化”，归入 `member.services`
- 若答案偏向“状态机内部流程控制”，归入 `fsm.context` 或状态机模块私有对象
- 若答案偏向“仅本次执行有效”，归入 `PipelineExecutionContext.input/scratch/output`
- 若既不形成共享契约，也没有稳定消费者，应删除而不是保守迁移

---

## 四、四类上下文的职责边界

### 1. `member.runtime`

职责：

- 成员跨系统共享的 canonical 运行时状态
- 各系统读取时唯一可信来源
- checkpoint / rollback 的成员运行时快照主体

必须满足：

- 可序列化
- 没有函数引用
- 没有“仅本次执行有效”的临时对象
- 不保存 BT / pipeline / FSM 的私有过程噪音

建议固定基础字段：

- `currentFrame`
- `position`
- `targetId`
- `statusTags`
- `skill: { current, previous, variant, params }`

成员类型扩展字段：

- `PlayerRuntime`
  - `type`
  - `skillList`
  - `skillCooldowns`
  - `character`
- `MobRuntime`
  - `skillList`
  - `skillCooldowns`
  - `character`

### 2. `member.services`

职责：

- 承载引擎或外部运行环境注入的服务引用

必须满足：

- 不属于状态
- 不参与 checkpoint
- 不进入 shared runtime

保留现有 5 个服务槽位即可：

- `getCurrentFrame`
- `expressionEvaluator`
- `damageRequestHandler`
- `renderMessageSender`
- `domainEventSender`

### 3. `fsm.context`

职责：

- 保存状态机私有流程状态
- 为状态迁移与 guard / action 提供最小闭包数据

必须满足：

- 不镜像共享 runtime 中已有字段
- 不保存 `owner`
- 不保存 `targetId`、`position`、`currentFrame`、`statusTags`

最小化目标：

- `isAlive`
- `createdAtFrame`
- 成员类型自己的私有流程状态

说明：

- 某些技能生命周期计时字段若只用于状态机流程推进，可以继续留在 FSM 私有上下文或状态机模块私有对象
- 但它们不应再进入 shared runtime

### 4. `PipelineExecutionContext`

职责：

- 表达“某一次 pipeline 执行”的完整上下文
- 承载本次执行输入、中间值和输出

建议结构：

- `subject`
- `source`
- `target`
- `memberContext`
- `services`
- `stats`
- `input`
- `scratch`
- `output`
- `meta`

硬规则：

- stage 从 `ctx.memberContext` 读取共享 runtime
- stage 从 `ctx.services` 获取服务
- 临时对象必须进入 `input/scratch/output`
- 不允许把命中、控制、伤害等临时数据回写到成员长期 runtime

---

## 五、字段归类规则

### 应进入 `member.runtime` 的字段

- `currentFrame`
- `position`
- `targetId`
- `statusTags`
- `currentSkill`
- `previousSkill`
- `currentSkillVariant`
- `currentSkillParams`
- `skillList`
- `skillCooldowns`
- `character`

说明：

- 技能相关共享字段建议统一收口为 `runtime.skill`
- `statusTags` 虽由 `statusStore` 派生，但对外仍通过 `runtime.statusTags` 暴露共享结果

### 应进入 `member.services` 的字段

- `getCurrentFrame`
- `expressionEvaluator`
- `damageRequestHandler`
- `renderMessageSender`
- `domainEventSender`

### 应迁出 shared runtime，进入 FSM 私有状态或状态机私有对象的字段

这类字段通常只服务于流程推进，而不是跨系统共享：

- `currentSkillIndex`
- `skillStartFrame`
- `skillEndFrame`
- `currentSkillStartupFrames`
- `currentSkillChargingFrames`
- `currentSkillChantingFrames`
- `currentSkillActionFrames`

### 应迁入 `PipelineExecutionContext` 的临时数据

- `currentDamageRequest`
- 命中判定中间值
- 控制判定中间值
- 伤害结算临时对象
- 仅本次 pipeline 执行需要的事件负载

### 不应进入 shared runtime，但可作为 BT 私有绑定的内容

- `owner`
- `services`
- `currentSkill`
- `previousSkill`
- `currentSkillVariant`
- `currentSkillParams`

说明：

- 这些可以作为 BT 使用时的便利视图
- 但不属于 `member.runtime` 的持久共享契约

### 应直接删除而不是迁移的字段

若当前没有形成稳定共享契约，应直接删掉：

- `currentSkillActiveEffectLogic`
- `btMemory`
- `skillState`
- `buffState`
- `compiledSkillEffectLogicByEffectId`
- `vAtkP`
- `vAtkM`

---

## 六、命名与类型目标

### 新的 canonical model

- `MemberSharedRuntime`
- `MemberRuntimeServices`
- `PlayerRuntime`
- `MobRuntime`
- `PipelineExecutionContext<TRuntime>`

### 需要退出历史舞台的名字

- `Member.context`
- `MemberContext`
- `PlayerContext`
- `MobContext`

说明：

- 若迁移需要短暂兼容，可在一个明确的过渡阶段保留适配器
- 但最终目标是彻底删除这些旧名

---

## 七、分阶段处理办法

实施时采用“强力收口，但分阶段提交”的策略。

每个阶段都必须满足：

- 编译通过
- 核心战斗流程仍可运行
- 不新增新的上下文混用

### 阶段 1：建立 canonical model

目标：

- 在 `src/lib/engine/core/World/Member` 建立新的 runtime / services 边界

处理办法：

1. 新增 `MemberSharedRuntime`、`PlayerRuntime`、`MobRuntime`
2. 新增 `MemberRuntimeServices`
3. `Member` 改为显式持有 `runtime` 和 `services`
4. `position`、`statusStore`、`statContainer` 继续作为真实持有者
5. `statusTags` 从真实持有者派生后回写到 `runtime`
6. 若还需要兼容旧代码，可短暂保留 `Member.context` 适配器

阶段结束判断：

- 新代码只读写 `member.runtime` / `member.services`
- 不再把服务字段放进 shared runtime

### 阶段 2：收口成员专属状态与 FSM

目标：

- 清理 Player / Mob 中混在共享 runtime 里的流程字段

处理办法：

1. 将技能生命周期计时字段迁到 FSM 私有上下文或状态机模块私有对象
2. 将 `currentSkill`、`previousSkill`、`currentSkillVariant`、`currentSkillParams` 收口到 `runtime.skill`
3. 删除 `currentDamageRequest` 这类长期挂在成员上的临时对象
4. `MemberStateContext` 缩减为最小私有状态
5. Player / Mob 状态机不再维护 `targetId`、`position`、`currentFrame`、`statusTags` 镜像副本

阶段结束判断：

- 共享状态只有一个来源
- FSM 不再镜像 shared runtime

### 阶段 3：接入 PipelineExecutionContext 与 BT 派生上下文

目标：

- 让 pipeline 与 BT 都建立在新 runtime 模型之上

处理办法：

1. `Member.runPipeline()` 统一组装 `PipelineExecutionContext`
2. stage 实现统一从 `ctx.memberContext` 和 `ctx.services` 读取
3. stage 中间值全部放进 `ctx.scratch` / `ctx.output`
4. BT 上下文改为 `Object.create(member.runtime)`
5. `owner`、`services` 只通过 BT 私有 bindings 或 agent 参数注入

阶段结束判断：

- pipeline 不再直接以旧 `MemberContext` 作为 stage context
- BT 不再依赖 shared runtime 上存在 `owner`

### 阶段 4：删除兼容层并修正 checkpoint 语义

目标：

- 清除所有旧接口名和过渡层

处理办法：

1. 删除 `Member.context`
2. 删除 `PlayerContext` / `MobContext` 相关类型名
3. 将泛型约束改为 `MemberSharedRuntime` / `PlayerRuntime` / `MobRuntime`
4. `MemberCheckpoint` 明确保存 canonical shared runtime
5. `restoreCheckpoint()` 恢复 FSM persisted snapshot，而不是只恢复局部状态
6. 恢复后重新从真实持有者派生 `statusTags`、`position` 等共享视图

阶段结束判断：

- 旧上下文命名彻底退出代码
- rollback 时 runtime 与 FSM 不再出现“一边恢复了、一边没恢复”的分叉

---

## 八、按模块的落地顺序

建议按下面顺序手动实施：

1. `src/lib/engine/core/World/Member/Member*`
2. `src/lib/engine/core/World/Member/runtime/Agent/RuntimeServices`
3. `src/lib/engine/core/World/Member/runtime/StateMachine`
4. `src/lib/engine/core/World/Member/types/Player`
5. `src/lib/engine/core/World/Member/types/Mob`
6. `src/lib/engine/core/Pipline`
7. `src/lib/engine/core/World/Member/runtime/BehaviourTree`
8. `src/lib/engine/core/GameEngine` 与其他外围调用点
9. BT Editor、示例、类型配置
10. 最后删除兼容层与旧类型名

原因：

- 先建立 canonical model，外围模块才有稳定目标可迁移
- 若先改 FSM / BT / pipeline，而底座仍是旧 `Member.context`，会导致大量中间态污染

---

## 九、实施硬规则

整个迁移过程中遵守下面几条硬规则：

1. 从第 2 阶段开始，禁止新增任何对 `member.context` 的直接读写
2. 禁止把函数、服务引用、owner 指针塞回 shared runtime
3. 禁止把单次执行临时对象长期挂在成员 runtime 上
4. 禁止 FSM 再维护共享字段的镜像副本
5. 发现没有稳定消费者的字段时，优先删除，不做保守迁移
6. 每个阶段结束都先做编译与核心流程验证，再继续下一阶段

---

## 十、验证清单

### 构造与注入

- 创建 Player / Mob 后，`services` 注入可用
- `runtime` 中不再包含服务字段

### Tick 同步

- 每帧更新后，`runtime.currentFrame` 正确
- `runtime.position` 正确
- `runtime.statusTags` 正确
- FSM 不再持有这些字段的镜像副本

### 目标切换

- 修改一次 `targetId` 后，FSM / BT / pipeline 在同一帧读取到同一个值
- 不存在双写分叉

### 技能生命周期

- 设置技能后，`runtime.skill.current` 正确
- 选择变体后，`runtime.skill.variant` 正确
- 参数生成后，`runtime.skill.params` 正确
- 清空技能后，不会残留上一轮参数

### 单次执行隔离

- 命中、控制、伤害 pipeline 结束后，临时对象只留在执行上下文
- 成员长期 runtime 不被污染

### BT 兼容

- 主动技能树仍可运行
- 并行 BT 仍可运行
- BT agent 注入仍可用
- 不再依赖 shared runtime 上存在 `owner`

### Checkpoint / rollback

- capture 后修改目标、状态、技能态、pipeline 动态插桩、FSM 状态
- restore 后 runtime、FSM、BT、pipeline 结果一致恢复

### 回归流程

- Player / Mob 创建
- tick
- 切换目标
- 释放技能
- 受击
- 预览 / 回滚路径

以上核心集成流程都应通过

---

## 十一、建议的手动实施策略

如果准备先回退当前代码，再按计划重做，建议这样操作：

1. 先将代码恢复到一个“无乱码、可编译”的干净状态
2. 保留本文档作为唯一迁移计划
3. 按阶段逐步提交，每阶段只做一类边界收口
4. 每阶段结束先验证，再开始下一阶段
5. 在最后一个阶段再删除兼容层，不要一开始就大面积清除旧名

---

## 十二、一句话总纲

共享且可恢复的状态进入 `member.runtime`，引擎注入服务进入 `member.services`，状态机私有流程状态进入 `fsm.context`，单次执行临时数据进入 `PipelineExecutionContext`；没有稳定共享契约的字段直接删除，不再让 `Member.context` 继续膨胀。
