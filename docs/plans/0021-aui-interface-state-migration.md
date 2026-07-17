# ADR 0021 - AUI 行为状态机迁移计划

- **状态**: 进行中
- **日期**: 2026-07-10
- **对应决策**: [ADR 0021](../decisions/0021-aui-interface-state-machine.md)

本文件用于跟踪实施步骤和验收结果，可以随代码现状调整；它不是 ADR，不扩展或修改 ADR 0021 的决策边界。

Simulator 最小验证闭环的产品范围、纵向实施顺序和最终验收以 [最小验证闭环推进计划](./minimum-validation-loop.md) 为准；本文件只跟踪其中涉及的 AUI 状态迁移，避免维护第二套 Simulator 路线图。

## 目标

先以 character 装备交互完成一个端到端薄切片，证明 UI 与 3D 输入可以驱动同一行为状态，且两个投影都只依赖 snapshot。验证成立后，再按真实交互逐支迁移 skill 和 simulator。

## 迁移前基线

- `AppActorContext` 创建 `businessPhaseMachine` 和 `visualIntentMachine` 两个平级 actor。
- `EquipmentPanel` 用 `ATTEND`、`ENGAGE`、`RELEASE` 表达装备交互。
- 场景投影把相机补间完成转换为 `SETTLED`，共享状态同时包含视觉过渡生命周期。
- `skillTree`、`simEntity`、`timelineEvent` 已出现在通用 Target 类型中，但当前没有对应的完整输入链路，不能把类型占位视为已实现需求。

## 实施进度

- [ ] 将 Simulator 会话所有权迁出 `RealtimeSimulator` 页面生命周期；Wiki 开闭和 Character 工作面切换只挂载或卸载投影，不执行 `engine.reset()`、解绑控制器或清除业务阶段。
- [ ] AUI 同一时刻最多持有一个活跃 Simulator 会话；并行计算任务不计入该数量，也不获得会话业务阶段。
- [ ] Wiki 与 Character 技能预览统一通过模拟任务能力并行计算；任务不读取或修改活跃 Simulator 会话的可变运行态。
- [ ] 按 ADR 0026 重构 Simulator 数据结构：Team/Member 归当前 Simulator 独占，Player Member 直接持有 `characterId`，Mob Member 持有 `mobId` 与难度配置，并校验同一 Player 不重复。
- [ ] 按 ADR 0035、0036 建立完整 DesignCopy 集合；当前实现把随机种子、主控配置和分析范围纳入 Simulator，已运行副本保持原值，后续编辑通过 copy-on-write 形成新副本。
- [ ] 按 ADR 0027 建立唯一场景解析边界，从 DesignCopy 一次产出同一设计身份的逻辑输入与静态 `worldResources`；3D 通过 `memberId` 将静态模型资源与引擎动态命令汇合。
- [ ] RunRecord 直接关联 DesignCopy；删除独立 RunSnapshot、RunParameters 和每条运行的 Character 数据副本。
- [x] 建立 `character.overview`、`character.equipment.inspecting`、`character.equipment.editing` 状态路径和最小 context。
- [x] `EquipmentPanel` 改为发送语义事件，并从 snapshot 投影槽位高亮与装备选择 sheet。
- [x] 删除无依据的装备相机姿态；当前槽位 metadata 不包含视角语义，装备交互保持相机原位。
- [x] 删除 `visualIntentMachine`、通用 `Target + Operation`、独立注意力 actor 和 `SETTLED` 回执链路。
- [x] 为状态转移、迟到事件、相机抢占和重挂载恢复添加测试。
- [x] SceneRuntime 按 glTF metadata 接入装备槽拾取与槽位高亮，并与 UI 复用同一语义事件。
- [ ] 提供带装备槽 metadata 的角色/装备资产。当前 `character.glb` 只有整体角色 mesh，没有 weapon/armor 等槽位 mesh 或 metadata，因此现有资产不会触发槽位拾取。

## 3D 资产契约

可拾取的装备 mesh 或其祖先 glTF node 必须在 `extras.equipmentSlot` 写入以下值之一：

```json
{
  "equipmentSlot": "weapon"
}
```

允许值为 `weapon`、`subWeapon`、`armor`、`option`、`special`。一个槽位可以标记多个实际 mesh；子 mesh 未直接标记时会沿父节点继承。未知值会被忽略，禁止用骨骼名、空间坐标或数据库列名推断槽位。

资产只描述装备槽，不包含 `characterId`。角色身份由当前 character SceneRuntime session 提供，拾取适配器最终生成与 UI 相同的 `character.equipment.inspect` 事件。

使用 Blender 导出 GLB 时，需要在对应 Object/Node 上添加名为 `equipmentSlot` 的 Custom Property，并启用 glTF 导出器的 `Include > Custom Properties`，确保属性进入 node/mesh `extras`。

## 第一阶段：character 装备薄切片

### 1. 建立最小行为模型

只建立已经有真实交互支撑的状态路径：

```text
character
├── overview
└── equipment
    ├── inspecting
    └── editing
```

context 仅保存当前交互所需的 `characterId` 和 `equipmentSlot`。进入 `overview` 时清除不再有效的动态目标；领域实体本身不复制进 context。

为“检查装备槽”“编辑装备槽”“返回角色概览”定义语义事件。事件命名在实现时统一，但不得包含 `click`、`pick`、`openSheet`、`moveCamera` 等具体模态或投影动作。

### 2. 统一输入

- `EquipmentPanel` 的槽行、编辑命令和关闭命令发送上述语义事件。
- 3D 装备拾取发送与 UI 相同的“检查装备槽”事件，不直接修改 panel、sheet、高亮或相机；接线以前必须先建立槽位到 mesh metadata 的资产契约。
- 输入来源如需保留，只用于诊断，不参与状态语义和合法性判断。

### 3. 改为 snapshot 投影

- `EquipmentPanel` 根据状态路径和 context 决定选中槽及 sheet 内容。
- 3D 场景根据同一 snapshot 决定有 metadata 支撑的装备高亮。
- overlay 动画留在 UI 投影；未来只有在建立显式视角契约后，3D 投影才能响应装备状态改变相机。
- 投影不向 AUI 状态机发送动画完成或资源就绪事件。

### 4. 收口旧模型

装备链路迁移完成后，删除 `visualIntentMachine`、通用 `Target + Operation`、独立注意力 actor 和 `SETTLED` 回执链路。同步更新 provider、投影命名和过时注释，确保应用中不存在第二套跨模态交互状态。

## 后续扩展

### skill

先从现有 SkillPanel 的真实交互识别“浏览、检查、编辑”状态及动态 `characterId/treeId`，再接入同一 AUI 行为状态机。不要仅依据旧 `skillTree` Target 占位扩展状态。

### simulator

先建立 Simulator 会话、DesignCopy 与成员编排边界，再按 `designing`、`validating`、`analyzing` 三个业务阶段逐支建模；当前 `businessPhaseMachine.simulating` 在迁移时收敛为领域术语 `validating`。阶段由当前 Simulator 会话拥有，不是无条件存在的应用全局状态；已加载方案、设计副本集合、运行进度、控制器关系和阶段只由显式结束或切换方案终止，Wiki 开闭和 Character 工作面切换不得改变它们。迁移时由 AUI 状态机唯一持有该会话的阶段事实，吸收并移除重复的 `businessPhaseMachine` 状态；领域会话运行时可以独立存在，但只能消费 AUI 事件或快照，不能再保存同名阶段事实。随后迁移成员选择、主控操作、进程控制和分析焦点，不复制 `worldResources` 或模拟结果。

## 第一阶段验收

- UI 槽操作与 3D 装备拾取对同一意图产生同一种语义事件。
- 仅凭 machine snapshot 和领域数据，重新挂载后可以恢复 sheet 和有 metadata 支撑的装备高亮。
- 非法语义事件由状态结构或 guard 拒绝，不依赖额外 capability 表。
- 相机补间和 overlay 动画完成与否不阻塞下一次用户意图。
- machine context 不包含 Babylon 对象、`CameraPose`、overlay handle、加载进度或领域实体副本。
- Character 修改不会改变已经产生运行记录的 DesignCopy；相同副本与输入轨迹仍能复现相同结果。
- 未来 Character/Mob 绑定模型后，设计阶段与验证阶段都能从场景解析结果加载正确模型；逻辑输入与视觉资源不会跨版本错配。
- 缺少显式视角契约时，装备检查与编辑不会改变相机位置。
- 删除旧模型后，仓库中不再引用 `visualIntentMachine`、独立注意力 actor 或 `SETTLED` 视觉回执。

## 验证方式

- 为纯状态机覆盖合法转移、非法事件和动态 context 清理。
- 分别从 UI 与 3D 输入触发同一意图，比较产生的语义事件和最终 snapshot。
- 在 `inspecting`、`editing` 状态重新挂载 UI 与场景投影，确认表现可恢复。
- 搜索旧 actor、事件和 Target 类型引用，确认迁移后没有遗留的第二套模式。
