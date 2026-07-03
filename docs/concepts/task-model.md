# 任务模型：simulator + character 两支（MBUI Task & Concepts 层）

- **状态**: 第一版（覆盖 simulator + character 两支；wiki/搜索/profile 待后续）
- **日期**: 2026-06-23
- **性质**: MBUI 四层中最上层「Task & Concepts」。纯层级任务分解（无时序算子），每个叶子标注将派生的 AUI 原语。是下一层「AUI 定义」的输入。
- **相关**: `docs/concepts/interaction-context.md`（AUI 是模态无关交互模型）、ADR 0014（业务树/三分基准）、ADR 0016（渲染层 worldResources）

> 方法约束（贯穿全文）：
> 1. 任务 = 用户**目标**（动词+对象，能在语音里说出），不是 CUI 操作（点击/拖拽）。
> 2. **纯层级分解，无时序算子**（CTT 的 `>>`/`|||`/`[]` 一律不用）。任务间的先后/并发/中断是**状态**，归 xstate，不进任务树。
> 3. 不从零画，从 ADR 0014 业务树往下钻叶子到「一次具体交互」粒度。
> 4. 标「待细化」的叶子：基于 schema/代码推断、未读实代码确认，第一版不深挖。

---

## 1. 核心洞察：主业务是一个循环

用户需求不是并列功能集，而是一条主线：

> **用户要捏出一套配置，并即时看到它在战斗里的效果，据此继续调。**

`设计 → 验证 → 分析` 是一个**循环**。simulator 与 character 是该循环的**两种粒度**，自相似：
- **character**：对**单个机体**的小循环（改装备 → 看技能预览/dps），三步近同步压在一层。
- **simulator**：对**整个阵容**的大循环（编排+流程 → 跑模拟 → 看结果），三步是显式相位。

---

## 2. 领域概念（任务作用的对象）

任务动词的宾语，来自 `engineScenarioSchema` / `characterPageModel.ts:761` / db schema：

```
simulator(scenario)
├── campA / campB（阵营）
│   └── team（队伍）
│       └── member（成员：player 机体 / mob）
│           ├── equipment 槽（含 crystal 锻晶）
│           ├── skill 树
│           ├── AI 行为（BehaviourTree，player 可编辑）
│           └── avatar / 模型
└── primaryMemberId（指定主控）
```

派生物（不是持久实体）：
- **运行结果**：由 `(scenario 快照, seed)` **确定性产出**，内存态，不持久化。随机数统一后，种子 + scenario 即可完全复现，分享带种子即可，无需存储。

---

## 3. 任务树

### 3.1 机体设计 ── character 页（独立交互空间）

设计-验证-分析近同步压在一层，无时序问题：设计完系统自动验证、产出结果供分析。

```
机体设计（character 页）
├── 选择要编辑的机体                         [Selection]
├── 配置装备
│   ├── 关注某个装备槽                       [Selection: attend equipmentSlot] ★意图已有
│   ├── 更换该槽装备                         [Trigger / Input]
│   └── 配置槽上锻晶                         [Input]（待细化）
├── 配置技能
│   ├── 关注技能树                           [Selection: attend skillTree] ★意图已有
│   └── 调整技能等级/点数                     [Input]（待细化）
└── （近同步）验证 + 分析
    ├── 看计算后属性                          [Output]
    ├── 看技能预览                            [Output]（SkillPreviewPanel，有据）
    └── 看 dps 影响                           [Output]（dps_impact，有据）
```

### 3.2 simulator 页（三相位，共享同一 worldResources）

由 `businessPhaseMachine` 管三相位（designing / simulating / analyzing）。三个相位空间共享**同一份编排好的阵容**（worldResources），仅 inputScheme 与 Output 重心随相位变。

```
simulator 页
│
├── 设计空间（designing）── 两个子部分：
│   ├── 初始场景设计：编排阵容
│   │   ├── 增删成员、绑定阵营/队伍              [Trigger / Input]（完整编排待细化）
│   │   └── 指定主控成员                        [Selection]
│   └── 流程设计：编辑主控成员 AI 行为
│       └── 编辑行为树（BtEditor）              [Input]（待细化）
│
├── 验证空间（simulating）
│   ├── 给主控动作
│   │   ├── 移动                               [Input: 连续]
│   │   └── 释放技能                           [Trigger]（受 skillAvailability 约束，有据）
│   ├── 切换主控成员                            [Selection]（setActiveController，有据）
│   ├── 控制模拟进程                            [Trigger ×5]（start/pause/resume/step/reset，有据）
│   ├── 时钟模式：实时 | 快速                    （空间的参数，不改 inputScheme）
│   ├── 观察战斗
│   │   ├── 看世界（位置/动画）                  [Output: world]
│   │   ├── 看主控状态（HP/MP）                 [Output]（MemberStatusPanel，有据）
│   │   └── 看遥测（TPS/成员数）                [Output]（telemetry，有据）
│   └── 转移焦点                               [Selection: attend simEntity]（C4，有据）
│
└── 分析空间（analyzing）
    ├── 操作对象：本次运行结果（(scenario, seed) 确定性产出，内存态）
    ├── 看结果可视化（图表/统计/时间线）          [Output]（维度待细化）
    ├── 关注数据点 / 时间线事件                  [Selection: attend timelineEvent] ★意图已预留
    └── 回放                                    （从检查点重启模拟，复用验证空间世界渲染，非新驱动源）
```

---

## 4. 时钟模式说明（实时 vs 快速）

「实时 / 快速」是**验证空间的一个时钟参数**，不是独立交互空间，**不改变 inputScheme**：

- **实时**：按真实时间推进。
- **快速**：不按真实时间，尽可能快地跑。主控**有** AI 时 AI 驱动、不允许用户操作；主控**无** AI 时，动作队列空则暂停等用户给动作，给完接着快进。

时钟快慢与「主控有没有 AI」正交。一个编了 AI 的主控，既能快速自动跑，也能在实时里被用户操控。

---

## 5. 由任务树浮现的交互空间结构（喂给下一层 AUI）

> 这是下一步「AUI 定义」直接要用的结论。

| 交互空间 | 所属 | 相位 | inputScheme 概要 | 主体 Output |
|---|---|---|---|---|
| 机体设计 | character 页（独立） | 设计-验证-分析近同步 | 选机体/换装/配锻晶/调技能/关注槽·技能树 | 角色模型 + 属性/预览/dps |
| 初始场景设计 | simulator 页 | designing | 增删成员/编排队伍/指定主控 | 阵容布阵世界 |
| 流程设计 | simulator 页 | designing | 编辑主控 AI 行为树 | （行为树视图） |
| 验证（模拟） | simulator 页 | simulating | 移动/技能/切主控/进程控制/转移焦点 | 战斗世界 + 主控状态 + 遥测 |
| 分析 | simulator 页 | analyzing | 选结果/关注 timelineEvent/回放控制 | 结果可视化 + 回放世界 |

两个跨空间不变量（前面讨论已确立）：

1. **顶层交互单元 = 交互空间，不是路由。** simulator 一个路由内含 4 个交互空间（设计2 + 验证 + 分析），是铁证。
2. **世界内容（worldResources）与交互空间正交。** simulator 的 4 个空间共享同一份阵容世界；character 是另一份。「延续/重建」由 worldResources diff 决定，与切哪个空间无关（ADR 0016）。

---

## 6. 待细化清单（第一版不深挖，标记备查）

- 配锻晶、调技能等级：schema 有，未读实代码确认交互细节。
- 编辑主控 AI 行为树：BtEditor 组件存在，未读其交互流程。
- 完整阵容编排（增删成员/绑队伍）：仅 `addMemberController` 有据，完整编排未读到。
- 分析结果可视化的具体维度：未定。
- wiki / 搜索 / profile 三支：本版未覆盖（无代码细聊，避免现编）。

---

## 7. 下一步（逐层向下具象）

按 MBUI：Task（本文）→ **AUI 定义**（下一步）→ CUI 投影（GUI/3D）。

下一步「AUI 定义」要做的：把第 5 节每个交互空间的 inputScheme/Output/Selection 落成模态无关的 AUI 原语声明（input/output/select/trigger），注意力为穿透全树的唯一游标，结构与状态分离（结构=声明，状态=xstate 平级 actor），并为每个原语标注它今天映射到哪些现有 CUI 元素（reification 表，同时产出 CUI 改造清单）。
