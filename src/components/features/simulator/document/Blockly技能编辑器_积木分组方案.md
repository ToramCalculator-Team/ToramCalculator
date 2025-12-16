### 目标

为“技能效果编辑器（Blockly）→ 编译为 `SkillEffectLogicV1` → 在 worker 中生成 behavior3 JSON + pipelines.overrides 执行”提供一个**精简且可维护**的工具箱分组方案。

本方案假设：
- **不再把 Blockly 当作 JS 语言编辑器**（不依赖 JS 执行）。
- 主要产出：`SkillEffectLogicV1`（`pipelines.overrides` + `trees.skillBT`，后续扩展 `buffBTs/buffs/areas`）。
- 动作（action）来自运行时内置 ActionPool（例如 `PlayerActionPool`/`CommonActions`），用户不定制动作实现，只编排顺序与配置少量参数。

---

### 工具箱分组（MVP）

#### 1) 行为树（BT）
用途：构建 `logic.trees.skillBT`（behavior3 TreeData）。

包含积木（Block Type / 含义）：
- `bt_root`：行为树根节点（TreeData 的 name/desc + root 输入）
- `bt_sequence`：顺序节点（children）
- `bt_switch`：分支节点（cases）
- `bt_case`：分支项（条件 + children）
- `bt_check`：条件判断（表达式字符串）
- `bt_runPipelineSync`：同步执行管线（从下拉选择管线名 + 可选参数输入）
- `bt_waitFrames`：按上下文字段等待（field 下拉/自定义 + min 数字）
- `bt_hasBuff`：查询 Buff 是否存在（buffId + outputVar）
- `bt_scheduleFsmEvent`：调度状态机事件（eventType + delayFrames + payload 结构化输入）

说明：
- BT 节点只负责“决策/顺序/等待/触发”，真实副作用通过 pipeline/action 落地。
- `bt_runPipelineSync` 的管线名来自“管线定义”分组收集的 `pipeline_definition` 名称（下拉）。

---

#### 2) 管线（Pipeline）
用途：构建 `logic.pipelines.overrides`（语义化管线名 → action 列表）。

包含积木：
- `pipeline_definition`：定义自定义管线（名称 + actions 顺序）

说明：
- 管线名建议语义化，如：`魔法炮.释放.前摇` / `魔法炮.释放.动作`。
- `pipeline_definition` 只收集元数据，不直接生成运行时代码。

---

#### 3) 动作（Action）
用途：在 `pipeline_definition` 的 `ACTIONS` 输入里编排 action 顺序。

包含积木（动态生成）：
- `action_<name>`：由 ActionPool 自动生成的“阶段积木”（例如 `前摇帧数计算`、`启动前摇动画`、`添加Buff`、`对目标造成伤害` 等）。

MVP 筛选策略（先简单后精细）：
- 第一版：开放 “Member 基础动作集合”（通用动作 + Player 常用动作）。
- 后续：按 `selfType / targetType` 做可用动作过滤与提示（不阻塞生成）。

---

#### 4) 参数与引用（Inputs / Refs）
用途：减少拼写错误，提供“下拉 + 自定义输入”的字段/路径选择；提供少量结构化参数块（避免 JSON 输入）。

包含积木（建议新增/保留）：
- **表达式**：单行文本（返回 `string`）用于 `Check`、伤害公式、数值表达式等
- **上下文字段引用**：下拉选择（含“自定义字段名”）用于 `WaitFrames.field`、以及表达式里常用字段提示
- **BuffId 输入**：单行文本（后续可对接已声明 `logic.buffs[]` 的下拉）
- **添加Buff 参数块（结构化）**：buffId/buffName/duration/treeId/variables
- **伤害请求 参数块（结构化）**：damageFormula/extraVars（MVP 可只做 damageFormula）
- **FSM事件 参数块（结构化）**：eventType/delayFrames/payload（MVP payload 可为空）

说明：
- 不提供“通用 JSON 输入框”；参数由结构化积木组合后由编译器组装成对象。
- `statContainer` 属性路径已可枚举（已有 `gameAttributeBlocks.ts`），应作为参数/表达式的辅助块保留。

---

### 不纳入 MVP 的默认分组（可移除/隐藏）
这些分组属于“把 Blockly 当编程语言”的典型配置，若不执行 JS，默认隐藏：
- 逻辑、循环、数学、文本
- 自定义变量、函数

例外：
- 若某些既有块（如 `gameAttributeBlocks.ts` 的比较/数学）被用于构造表达式字符串，可保留在“参数与引用”下作为辅助，但不作为主流程入口。


