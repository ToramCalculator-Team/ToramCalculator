# Hook 与触发层设计讨论结论

本文档记录围绕 `额外逻辑hook点.txt`（托环/被动逻辑）与 `技能效果参考.txt`（特殊技能逻辑）在现有引擎分层（数据 / 计算 / 编排）下可实现性的讨论结论。命名细节待定。

## 1. 分层骨架保留

现有三层切分合理，继续沿用：

- **数据层**：`StatContainer`（属性 + modifier 层）、`StatusInstanceStore`（游戏内状态实例）、`MemberSharedRuntime`（BT 原型链共享面）。
- **计算层**：`PipelineCatalog` + `PipelineResolverService` + `PipelineOverlay`。三地址码 + 增量 overlay，已具备条件算子（`select / and / or / not / >= ...`）。
- **编排层**：XState FSM（状态机，唯一的 runtime 写入方）+ mistreevous BT（`activeEffectEntry` 单活动技能 + `parallelEntries` 并行 buff）。

在三层之间**新增一个轻量的触发/订阅子系统**，但作用域显著小于最初设想，仅用于 Pipeline overlay 无法表达的事件（见 §4）。

## 2. 关键决议

### 2.1 StatContainer 作为持久化槽的统一载体

技能 / 托环 / buff 在安装时可向 StatContainer **声明自己需要的属性槽**，所有跨技能层数、冷却时间戳、计数器都走属性读取语法。

- 爆能的 `咏咒层数`、魔法炮的 `充能百分比`、弧光剑舞的 `灵光层数` 等跨技能数据，统一落成属性槽。
- Passive 的冷却（HP 紧急回复 60s、起跑冲刺 60s、转让 180s）不再用 BT `wait`，而是存 `lastTriggeredFrame` 到属性槽，触发判定为 `$currentFrame - $lastTriggeredFrame >= CD`。

**好处**：
- checkpoint / fast-forward / 预览回放零额外工作（Float64Array 已在 checkpoint 中）。
- 公式 / 管线 / BT 用同一套属性读取语法访问，不需要第二套 "status 查询" API。
- 首次触发用哨兵值表达（`-Infinity` 或 0），比"有没有 cooldown 实例"更直接。

**待定**：属性 key 的命名前缀约定，避免托环与技能间冲突（候选格式：`passive.<id>.<field>` / `skill.<id>.<field>`）。

### 2.2 StatusInstance 边界收紧

`StatusInstanceStore` 仅承载**游戏内可见状态**（昏厥、着火、出血、猛毒、麻痹、迟缓、降防、冻结、停止……）—— 即玩家看得见、别的技能需要读 `tag` 去判断是否存在的那种状态。

- 不再把冷却、计数器、层数当 Status 存。
- Status 的核心价值是 `tag` 集合，配合触发系统的"状态进入/离开"事件和管线里的状态查询条件。

### 2.3 `DamageDispatchPayload` 需扩展

受击/伤害相关的 hook 绝大多数靠 payload 里的归因信息判定，必须扩展：

- `damageTags: string[]` —— 伤害类别标签（`着火 / 猛毒 / 魔力爆发 / 控制强化 / 物理 / 魔法 / 百分比 ...`）。
- `warningZone: string` —— 警告区域类型（`red / blue / none`），服务于红/蓝区护盾。
- `direction: Vec3` 或相对方位字段 —— 服务于"殿后"（镜头相对朝向）等方向判定。
- 以及必要的源头信息（施法者 id、技能 id、是否致死等）已有，按需补齐。

### 2.4 Pipeline + Overlay 承担绝大多数 hook

成员初始化时，passive / 托环把**各自的 overlay 预插入到对应管线**。之后战斗期间不需要动态订阅；只要伤害进入对应管线，overlay 本身就是"如果 XX 则 YY"的表达。

受击与伤害侧需要落地的核心管线（对应 `玩家受击流程.txt`）：

- `hitResolve`：无敌 → 闪躲 → 暴击 → 回避 → 伤害 → 格挡 → 格挡后伤害
- `applyDamage`：异常抵抗 / 异常施加判定 / 扣 HP

典型 passive 的管线落点：

| 效果 | 落点 | 指令示意 |
|---|---|---|
| 燃烧的斗志 | `hitResolve` 末尾 | `if damageTags.has('着火') then mp.current += 攻回*tLv*5%` |
| 猛毒恢复 | `hitResolve` 末尾 | `if damageTags.has('猛毒') then 概率 removeStatus('猛毒')` |
| 魔力失火 | `applyDamage` 后 | `if damageTags.has('魔力爆发') and hp>0 then mp+=100` |
| 紧急维修 | `hitResolve` 中 | `if statusTags.has('降防') then 概率 removeStatus('降防')` |
| 浴血奋战 后半 | `hitResolve` 伤害计算段 | 与出血状态联动 |
| 稳如泰山 | `hitResolve` 减伤段 | `if status='停止' and moveSpeed=0 then damage *= (1-tLv*3%)` |
| 殿后 | `hitResolve` 减伤段末尾 | `if direction=='back' then damage *= (1-tLv%)` |
| 红/蓝区护盾 | `hitResolve` 减伤段 | `if warningZone='red' then damage *= (1-tLv%)` |
| 弧光剑舞·扣MP | `hitResolve` 减伤段 | 消耗 MP 抵伤害；不足则 removeStatus('弧光剑舞') |
| 弧光剑舞·减伤 | `hitResolve` 减伤段 | 单独一条 overlay |
| HP 紧急回复 | `applyDamage` 内 | `if hp.current - damage < hp.max*0.25 and 冷却已过 then hp.current += (tLv+10)%` |
| 领教领教 | `hitResolve` 末尾 | `damage = clamp(damage, 0, targetHp*1%)` |
| 最后的抵抗 | `applyDamage` 前 | `insertBefore(applyDamage, select(...)); if 是队伍最后且 hp-damage≤0 then damage = hp.current-1` |
| 锤击·必暴击 | `hitResolve` 暴击判定段 | `if damageTags.has('控制强化') and targetStatusTags.has('控制类异常') then crit=true` |

### 2.5 触发/订阅子系统的作用域（缩小版）

仅用于 Pipeline overlay 无法自然表达的"离散事件"。**已确认**需要触发源：

- **状态进入 / 离开**（StatusInstanceStore apply / removeByType 时广播，带 type 和 source）
  - 减轻追击 a（进入胆怯/翻覆/昏厥 → 获得减伤 buff）
  - 神经控制（进入麻痹 → 攻速+）
  - 钉鞋（进入迟缓 → 移速+）
  - 浴血奋战 前半（进入出血 → 倍率+）
  - 巨人烈破凝气（进入乏力 → 层数归 1）

**待进一步讨论**的可能触发源：

- 仇恨变化（起跑冲刺、恐慌、目标申告）
- 队伍成员事件（命運共同體、最後的抵抗的队伍判定、救世主、转让、下班通报）
- 技能生命周期事件（爆能咏咒累加、结界联动、魔法炮充能、曬太陽情绪识别）

属性跨阈值事件暂不独立建模：HP 紧急回复等需求可以用 `applyDamage` 管线内的条件 overlay 表达，不需要阈值订阅。

### 2.6 跨 actor 数据：快照随事件

撤回 `Member.runPipeline` 的 `peerStats` 参数设计。所有跨成员数据通过**消息/事件 payload 打包传递**：

- 伤害公式里 `self.xxx` 由施法者侧打包成 `casterSnapshot` 随 `DamageDispatchPayload` 发送（已实现，`CommonActions.ts:106`）。
- 不存在同步的跨 actor 属性读。
- MemberManager 可提供"活着的队友数"这类聚合查询（推送/广播），不是拉取。

### 2.7 跨技能读取靠属性，不靠跨 actor

弧光剑舞读灵光层数、爆能读咏咒层数等，**都是同一 actor 内部**的跨技能读——走 2.1 的属性槽方案即可，与 actor 隔离无冲突。

## 3. 单独说明：几个代表效果的落点

- **弧光剑舞**（拆分为两条 overlay）：
  - 受击时扣 MP 抵伤害；MP 不足时 `removeStatus('弧光剑舞')`——挂 `hitResolve`。
  - 受击减伤加成——挂 `hitResolve` 减伤段。
- **最后的抵抗**：向 `applyDamage` 前插入 `select` 指令，若自己是队伍最后一名 + `hp - damage ≤ 0`，则改写 `damage = hp.current - 1`；同帧再启动一个 5+等级秒后的延时死亡（BT / 事件队列任选）。
- **灵光剑舞 终止条件**：位于自身 buff BT 内的循环节点判定（`if hp < hp.max*5% then end`），不走触发系统。

## 4. 落地路线图

### 阶段 1 — 数据层前置

1. `DamageDispatchPayload` 扩展字段：`damageTags / warningZone / direction / 致死标记` 等。
2. StatContainer 属性槽的前缀命名约定 + 技能/托环安装时的声明接口。

### 阶段 2 — 计算层落地

3. 实现 `hitResolve` / `applyDamage` 管线，并把 `DamageAreaSystem` 派发的 "受到攻击" FSM 事件接到这段管线上。
4. 清理：移除 `Member.runPipeline` 的 `peerStats` 参数。

### 阶段 3 — 触发子系统（精简版）

5. 最小触发系统：仅实现 StatusInstanceStore apply / remove 时的 "状态进入/离开" 广播；BT 提供叶子节点声明式订阅。
6. 按需扩展到仇恨 / 队伍 / 技能生命周期事件（待定）。

### 阶段 4 — passive / 托环 试点

7. 选代表性 hook 跑通全链路，覆盖：
   - Pipeline overlay 类：燃烧的斗志、领教领教、最后的抵抗、殿后、HP 紧急回复
   - 触发订阅类：减轻追击、神经控制

### 阶段 5 — 编排层补缺

8. 输入意图通道（`ControllerEndpoint → runtime.inputIntent`），为一阵风 / 月神灾厄 / 殿后 等铺路。
9. `BuffAreaSystem` 补全，接空间查询 + 周期 tick，实现怕寂寞这类空间 buff。

### 阶段 6 — 扩展（低优先）

10. 条件 Modifier：战斗期间武器不变，短期不急；后续若出现装备/形态切换需求，优先走"管线 overlay 内 select" 路线。

## 5. 未决项

- 触发系统对"仇恨变化 / 队伍事件 / 技能生命周期"三类事件的取舍（相关需求量相对小）。
- 属性槽的命名前缀格式。
- 输入意图通道的具体协议（按键流 vs 意图聚合）。
- Mp 紧急回复的触发点挂在技能释放检查点还是单独订阅。
