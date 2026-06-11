# 0001 - StatContainer 作为持久化槽的统一载体

- **状态**: Accepted
- **日期**: 2026-05（从 `hook与触发层设计讨论结论.md` §2.1.1 拆出）
- **决策层**: 数据层
- **相关代码**:
  - `src/lib/engine/core/World/Member/runtime/StatContainer/StatContainer.ts`
  - `src/lib/engine/core/World/Member/runtime/StatContainer/SchemaTypes.ts`
  - `src/lib/engine/core/World/Member/runtime/Status/StatusInstanceStore.ts`
- **相关 ADR**: 未来拆出的"StatusInstance 边界收紧"会与本条成对

## 背景

引擎需要承载三类异质但都"跨帧持久化且参与计算"的数据：

1. **游戏内可见状态**：昏厥、着火、出血、猛毒——玩家看得见、别的技能会读 `tag` 判定的那种。
2. **跨技能共享计数/层数**：爆能的"咏咒层数"、魔法炮的"充能百分比"、弧光剑舞的"灵光层数"。
3. **Passive 的冷却时间戳**：HP 紧急回复 60s、起跑冲刺 60s、转让 180s 等。

天然看起来"计数器/冷却"和"状态"都是某种"附加在成员身上的东西"，早期设计里都统一挂在 `StatusInstanceStore` 下。但三者的访问模式、生命周期、可见性差异很大，混在一起会让读写语义分裂。

同时，`StatContainer` 已经是成员属性的权威存储，具备：
- Float64Array 连续内存布局
- 属性依赖重算
- checkpoint / 快照 / fast-forward 零额外工作
- 统一的 AST 化属性读取语法（公式 / 管线 / BT / 事件 handler 共用）

需要决定：计数器/冷却这类数据应该落在 `StatusInstanceStore` 还是 `StatContainer`。

## 候选方案

### A. 全部挂 StatusInstanceStore

计数器、冷却、层数都建模为"状态实例"，每个 passive/skill 在 store 里维护自己的 Status。

- 优点：
  - 新增一类数据只需要加 StatusType 注册。
  - 与"着火有 stack/duration"在结构上对齐。
- 缺点：
  - StatusInstance 必须同时兼顾"玩家可见标签集合"和"不透明数值槽"两种角色，`tag` 语义被稀释。
  - 冷却的首次触发要靠"该 Status 不存在"来表达，引入"缺失即冷却结束"的特殊语义。
  - checkpoint 需要额外序列化 Status 实例的动态字段；快照回放要重建对象图。
  - 公式里读冷却/层数的语法与读属性不一致，JSProcessor 需要多一套路径。

### B. 全部挂 StatContainer（采纳）

为每个需要持久化槽的 passive/skill，在安装时向 StatContainer **声明属性槽**。计数器/冷却/层数都是普通属性值，与攻击力、HP 使用同一套读写语法。StatusInstanceStore 只保留"玩家可见状态"。

- 优点：见"决议"段。
- 缺点：见"代价"段。

### C. 两者并存，按字段决定

允许 passive/skill 自己选：计数器去 StatContainer，状态效果去 StatusInstanceStore，冷却随意。

- 优点：
  - 短期最灵活，每个 passive 按自己的直觉落位。
- 缺点：
  - 分界线不清，相似需求的 passive 写法不同，阅读成本上升。
  - 重构时需要逐个判断，没有统一迁移策略。
  - "直觉"随作者变化，半年后边界会糊。

## 决议

采纳方案 B。具体约定：

1. **所有需要 checkpoint 的持久化数值槽走 StatContainer**。passive / skill / buff 安装时通过 `SchemaMerge` 向 StatContainer 声明自己的属性槽。
2. **StatusInstanceStore 只承载游戏内可见状态**。核心价值是 `tag` 集合，配合编排层的状态进入/离开事件和计算层的状态查询使用。
3. **冷却用"帧号时间戳"表达**。存 `lastTriggeredFrame`，触发判定为 `$currentFrame - $lastTriggeredFrame >= CD`。首次触发用哨兵值（`-Infinity` 或 `0`）而不是"槽不存在"。
4. **属性 key 用前缀区分命名空间**。候选格式 `passive.<id>.<field>` / `skill.<id>.<field>`（前缀格式仍待定，但前缀机制本身已确定）。

理由：

1. **零额外 checkpoint 成本**。Float64Array 已在 checkpoint 中，计数器/冷却直接搭便车；StatusInstance 若承载这些则需要额外序列化逻辑。
2. **语法统一**。公式 / 管线 / BT / 事件 handler 通过同一套 AST 路径读取"攻击力"和"咏咒层数"，JSProcessor 不必分叉。
3. **首次触发语义更直接**。哨兵值是显式表达，"查无此 Status"是隐式表达；后者在 fast-forward 和回放里容易踩坑。
4. **StatusInstance 的 `tag` 语义变纯**。其他技能读 `tag` 判定（如"锤击·必暴击"要求 `targetStatusTags.has('控制类异常')`）时不会混入"存在一个名为 `passive.hpEm.cooldown` 的伪状态"。

## 代价

这个决议放弃了这些：

1. **StatContainer 的 schema 膨胀**。每新增一个 passive/skill 都可能追加属性槽，运行期内存占用与 passive 种类数成正比（不是成员数）。当前规模下可接受，但没做容量预算。
2. **属性槽的命名空间冲突风险**。前缀约定还没定稿；如果两个 passive 用了相同 key，没有工具层兜底会静默覆盖。需要在 `SchemaMerge` 加冲突检测。
3. **哨兵值依赖约定**。`-Infinity` 作为"从未触发"是全局约定，不是类型系统保证；新人接手 passive 实现时可能误用 `0`（在 frame=0 会立即命中冷却判定）。应该在文档或辅助函数里固化。
4. **放弃了"Status 即一切"的概念简洁性**。熟悉 MMORPG buff/debuff 模型的开发者可能期望所有"附加物"都在一处查看；现在要同时看两处（StatContainer 槽 + StatusInstanceStore）。

**何时可能重新考虑**：
- StatContainer schema 超过数千槽、依赖重算成为瓶颈。
- 命名冲突频发，靠人工巡查压不住。
- 出现"既是可见状态又是计数器"的混合需求（目前没有这样的技能）。

## 影响范围

- **代码**：
  - `StatContainer` / `SchemaMerge` / `SchemaTypes` 需要支持运行时 schema 合并（passive 动态加槽）。
  - `StatusInstanceStore` 边界收窄，移除冷却相关 API。
  - `Registlets/RegistletLoader` 在安装 passive 时触发属性槽声明。
- **文档**：
  - 本 ADR 定稿后，`hook与触发层设计讨论结论.md` §2.1.1 不再作为权威源。
  - 属性 key 命名前缀约定需要专门的约定文档或 ADR（`SchemaMerge` 上的注释可指向它）。
- **迁移**：
  - 现有"冷却以 Status 形式承载"的 passive 逐个改写；因为 passive 系统整体尚未大规模铺开，迁移成本可控。

## 参考

- 原始讨论：`src/lib/engine/document/hook与触发层设计讨论结论.md` §2.1.1
- Unreal GAS 的 `GameplayAttribute`（属性槽模型）与 `GameplayEffect`（可见效果）的分离
- ECS 语境下的 component（数据槽）vs tag component（布尔标签）区分
