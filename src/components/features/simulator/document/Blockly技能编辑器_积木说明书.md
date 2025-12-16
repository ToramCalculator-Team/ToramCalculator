### 说明

本文档列出技能编辑器（Blockly）在 MVP 阶段需要用到的积木，并描述：
- **积木类型**：语句块 / 值块（输出）
- **输入形式**：下拉 / 文本 / 数字 / 可选输入
- **返回值类型**：Number / Boolean / String / 无（语句）
- **用途**：用于生成 `SkillEffectLogicV1` 的哪一部分
- **运行时映射**：编译后对应的 behavior3 节点或 pipeline/stage 行为

术语：
- **stage/action**：运行时内置“动作实现”，来自 ActionPool（例如 `PlayerActionPool`/`CommonActions`）。
- **pipeline**：语义化动作组（stage 顺序），对应 `logic.pipelines.overrides[pipelineName] = [stageName...]`。
- **BT**：behavior3 行为树（`logic.trees.skillBT`）。

---

## A. 行为树（BT）积木

### A1. `bt_root`（行为树根节点）
- **积木类型**：语句块（作为配置入口，不参与执行）
- **输入**：
  - `name`：文本输入（TreeData.name）
  - `desc`：文本输入（TreeData.desc，可选）
  - `ROOT`：语句输入（连接一个 BT 节点链作为 root）
- **输出/返回值**：无
- **用途**：生成 `SkillEffectLogicV1.trees.skillBT`
- **运行时映射**：behavior3 TreeData `{ name, desc, root, group }`

---

### A2. `bt_sequence`（Sequence）
- **积木类型**：语句块
- **输入**：`CHILDREN`（语句输入，连接多个子节点）
- **输出/返回值**：无
- **用途**：BT 控制流（顺序执行）
- **运行时映射**：behavior3 node `{ name:"Sequence", children:[...] }`

---

### A3. `bt_switch`（Switch）
- **积木类型**：语句块
- **输入**：`CASES`（语句输入，连接多个 `bt_case`）
- **输出/返回值**：无
- **用途**：BT 分支选择
- **运行时映射**：behavior3 node `{ name:"Switch", children:[case...] }`

---

### A4. `bt_case`（Case）
- **积木类型**：语句块
- **输入**：
  - `COND`：值输入（建议接 `表达式(字符串)` 或 `属性读取` 组合，最终编译为 `Check` 表达式）
  - `CHILDREN`：语句输入（case 命中后执行）
- **输出/返回值**：无
- **用途**：Switch 的条件分支
- **运行时映射**：behavior3 node `{ name:"Case", children:[Check, ...] }`

备注：MVP 编译器可以把 `bt_case` 编译为：
1) 内部隐式插入一个 `Check(value=<COND>)`
2) 其后串联 `CHILDREN`

---

### A5. `bt_check`（Check）
- **积木类型**：语句块
- **输入**：`VALUE`（值输入，最终应是表达式字符串）
- **输出/返回值**：无（behavior3 节点返回 success/failure）
- **用途**：条件判断（如 `buffExists`、`currentSkillActionFrames > 0`）
- **运行时映射**：behavior3 node `{ name:"Check", args:{ value:<expr> } }`

---

### A6. `bt_runPipelineSync`（同步执行管线）
- **积木类型**：语句块
- **输入**：
  - `pipelineName`：**下拉**（来自 `pipeline_definition` 收集的管线名）
  - `params`：可选结构化参数输入（MVP 可先只支持空对象；后续由专用参数块填充）
- **输出/返回值**：无
- **用途**：执行语义化管线（同 tick 生效，输出写回上下文）
- **运行时映射**：behavior3 自定义节点 `RunPipelineSync(actionGroupName, params?)`

---

### A7. `bt_waitFrames`（等待帧）
- **积木类型**：语句块
- **输入**：
  - `field`：下拉（含“自定义字段名”）/ 文本
  - `min`：数字（可选）
- **输出/返回值**：无
- **用途**：按上下文字段等待（例如 `currentSkillStartupFrames`、`currentSkillActionFrames`）
- **运行时映射**：behavior3 自定义节点 `WaitFrames(field, min)`

---

### A8. `bt_hasBuff`（查询 Buff）
- **积木类型**：语句块
- **输入**：
  - `buffId`：文本输入（后续可升级为下拉：来自技能声明的 buffs）
  - `outputVar`：文本输入（默认 `buffExists`）
- **输出/返回值**：无（结果写入 blackboard 与 owner）
- **用途**：分支判断（是否有充能、是否有形态等）
- **运行时映射**：behavior3 自定义节点 `HasBuff(buffId, outputVar)`

---

### A9. `bt_scheduleFsmEvent`（调度 FSM 事件）
- **积木类型**：语句块
- **输入**：
  - `eventType`：文本或下拉（事件名）
  - `delayFrames`：数字（可选）
  - `payload`：结构化输入（可选）
- **输出/返回值**：无
- **用途**：技能结束通知、受击流程推进等
- **运行时映射**：behavior3 自定义节点 `ScheduleFSMEvent(eventType, delayFrames?, payload?)`（通过 Intent 落地）

---

## B. 管线（Pipeline）相关积木

### B1. `pipeline_definition`（定义管线）
- **积木类型**：语句块（仅收集元数据）
- **输入**：
  - `pipelineName`：文本输入（语义化名称）
  - `desc`：文本输入（可选）
  - `STAGES`：语句输入（连接多个 `stage_<name>`）
- **输出/返回值**：无
- **用途**：生成 `SkillEffectLogicV1.pipelines.overrides`
- **运行时映射**：编译为 `overrides[pipelineName] = [stageName...]`

---

## C. 动作（Stage/Action）积木

### C1. `stage_<name>`（动态生成）
- **积木类型**：语句块（用于 pipeline_definition 内部）
- **输入**：基于该 stage 的 zod inputSchema 自动生成（MVP 可不在编辑器层强校验）
- **输出/返回值**：通常无；若 outputSchema 为标量，可作为值块（已有 StageBlockGenerator 推导逻辑）
- **用途**：作为管线的组成步骤
- **运行时映射**：`PipelineManager.run(pipelineName)` 中顺序执行的 stage

MVP 推荐先重点支持的 stage（来自现有项目实践）：\n+- 帧数/动作：`前摇帧数计算`、`发动帧数计算`、`启动前摇动画`、`启动发动动画`\n+- Buff：`添加Buff`、`移除Buff`、`获取buff计数器值`\n+- 伤害：`对目标造成伤害`\n+- 表达式：`应用数值表达式`\n+
---

## D. 参数与引用积木（建议新增/复用）

### D1. `表达式(单行字符串)`（建议新增）
- **积木类型**：值块（String）
- **输入**：单行文本
- **输出/返回值**：String
- **用途**：供 `bt_check`、`对目标造成伤害.damageFormula`、`应用数值表达式.expression` 等使用
- **运行时映射**：交给引擎 `JSProcessor.evaluateExpression` 执行

---

### D2. `字段名选择`（下拉 + 自定义输入，建议新增）
- **积木类型**：值块（String）
- **输入**：下拉（第一个选项为“自定义…”）
- **输出/返回值**：String
- **用途**：避免 `WaitFrames.field` 等字段名拼写错误
- **可枚举来源**：
  - ActionContext / PlayerActionContext 已知字段
  - 已选 stage 的 outputSchema keys（例如 `chargeCounter`）
  - statContainer paths（来自 schema，见 `gameAttributeBlocks.ts`）

---

### D3. `添加Buff(结构化)`（建议新增，多插槽）
- **积木类型**：值块（内部编译为 params 对象，不对用户暴露 JSON）
- **输入**：`buffId`/`buffName`/`duration`/`treeId?`/`variables?`
- **输出**：用于 `bt_runPipelineSync.params`
- **用途**：无需 JSON 输入框即可配置 `添加Buff` stage 所需字段

---

### D4. `伤害请求(结构化)`（建议新增，多插槽）
- **积木类型**：值块
- **输入**：`damageFormula`（必填字符串），`extraVars`（可选，后续扩展）
- **输出**：用于 `bt_runPipelineSync.params`
- **用途**：配置 `对目标造成伤害` stage

---

## 备注：为什么不提供通用 JSON 输入框
- `SkillEffectLogicV1.pipelines.overrides` 只保存 stage 名称序列，不支持“每个 stage 单独携参”。\n+- 所需的配置（如 buffId、damageFormula、targetPath/expression）由专用积木结构化输入，编译器组装为 pipeline 入口 params 注入。\n+- 用户体验更接近“积木搭流程”，而不是“手写对象”。\n+

