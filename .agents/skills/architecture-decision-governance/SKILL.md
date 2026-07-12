---
name: architecture-decision-governance
description: Govern architecture decision knowledge for ToramCalculator and compatible repositories. Use when assessing whether a design choice needs an ADR; creating, revising, superseding, reviewing, indexing, or reorganizing ADRs; extracting decisions from plans or discussions; resolving ADR granularity; or auditing an existing decision repository. Enforces document classification, an ATAM-inspired significance gate, independent-evolution clustering, MADR-style records, typed decision relations, lifecycle rules, and current-decision views.
---

# Architecture Decision Governance

把 ADR 当作架构知识库中的长期决策证据，而不是讨论日志。先判断信息应该放在哪里，再判断是否需要 ADR，最后才写文件。

## 必读规范

在评估、创建、修改或整理 ADR 前，完整读取 [references/governance-standard.md](references/governance-standard.md)。不得只凭本文件中的摘要执行治理。

同时读取仓库根级和目标目录适用的 `AGENTS.md`，以及现有 ADR 的 `README`、模板和相关计划。仓库规则优先于通用示例；若仓库规则与治理标准冲突，明确指出冲突，不能静默混用两套模式。

## 工作模式

先识别用户请求属于哪一种模式：

- **评估**：判断一项选择是否需要 ADR，默认只报告结论，不写文件。
- **创建**：从已收敛的设计中提炼一个或多个 ADR。
- **修订**：纠错、补关系、改变状态或用新 ADR 取代旧 ADR。
- **整理**：分类、合并尚未发布的草稿、建立当前决策视图。
- **审计**：检查准入、颗粒度、状态、关系、索引和当前实现之间的偏差。

用户只要求解释、评估或审计时，不得擅自修改文档。用户要求创建、完善、整理或治理时，完成相应编辑和验证。

## 强制流程

### 1. 建立事实基线

1. 定位仓库根目录、决策目录、计划目录、概念目录和相关代码。
2. 读取决策索引、模板、相关 ADR、相关计划与必要代码。
3. 创建或整理 ADR 前，运行只读审计脚本：

   ```bash
   python3 <skill-dir>/scripts/audit_decisions.py <repo-root>
   ```

4. 使用 `rg` 检索相同术语、相同决策问题、被取代关系和代码引用。不得仅扫描标题。

脚本结果只代表机械一致性。不得把“脚本通过”解释成颗粒度或架构结论正确。

### 2. 先分类，后决定是否写 ADR

把每项信息分类到且只分类到一个主要载体：

- 当前架构事实
- 领域或产品概念
- 架构决策
- 实施计划
- 问题或调查
- 代码契约

使用治理标准中的“文档分类”规则。分类为非 ADR 时，给出正确落点和理由，不创建占位 ADR。

### 3. 执行架构显著性门槛

ADR 候选必须同时通过四道门：

1. 改变架构边界或质量属性；
2. 存在至少两个当时可行的方案；
3. 逆转成本有实际意义；
4. 理由无法由最终代码自然解释。

任一道未通过，结论必须是“不创建 ADR”。用户明确要求 ADR 也不能静默跳过检查；先报告未通过项，再按用户进一步明确的治理例外执行。

### 4. 确定颗粒度

从讨论中列出候选决策节点，并逐对检查：

- 是否共享同一问题和主要决策驱动；
- A 能否在 B 不变时被独立接受、逆转或取代；
- A 是否只是 B 的不变量、直接推论、代价或实施方式；
- 两者是否具有不同生命周期和重新评估条件。

不能独立演化的节点合并为同一 ADR。可以独立演化且各自通过显著性门槛的节点才拆分。不得用“一句结论一篇”“一个 schema 字段一篇”或“影响一个模块一篇”决定颗粒度。

在写文件前先输出或形成以下工作结论：

```text
决策问题：...
载体分类：ADR / 非 ADR
显著性：通过 / 不通过，并逐项说明
候选节点：...
聚合结果：...
已有权威决策：...
预期关系：Supersedes / Depends on / Refines / Conflicts with
```

### 5. 处理生命周期和历史

- 未提交、未共享的草稿仍是工作材料：直接合并、拆分、重写或删除，不制造 `Superseded` 历史。
- `Accepted` ADR 是历史证据：不改写原决议；结论变化时创建新 ADR 并建立 `Supersedes` 双向关系。
- 实现进度、代码现状或背景事实变化，不自动构成新 ADR。
- `Proposed` 只表示正在主动评审的决策，不得作为长期想法仓库。
- 被取代或撤回的 ADR 保留编号，但从当前权威决策视图移出。
- 对已有错误分类，保留可追踪说明并把活跃内容迁到正确载体。

### 6. 写作与关系

使用仓库模板；若模板缺少治理标准要求的语义，在不创建第二套格式的前提下更新仓库模板。ADR 至少表达：

- 一个清晰的决策问题；
- 决策驱动；
- 实际可行的候选方案；
- 一句话决议；
- 决议确立的不变量；
- 接受的代价；
- 可验证的重新评估条件；
- 有类型的决策关系。

实施阶段、任务清单、逐文件修改、命令、负责人和进度属于计划，不写入 ADR。代码位置只作为证据或边界引用。

### 7. 维护两种入口

- **当前决策视图**：人工策展，按问题域只展示当前权威 ADR，并概括共同建立的边界。
- **完整历史目录**：列出所有编号、状态和日期，用于追溯。

不得让按编号平铺的历史表成为唯一入口。物理文件可以保持扁平；导航按问题域和有类型关系组织。

### 8. 验证

文档编辑完成后：

1. 再次运行 `audit_decisions.py`。
2. 使用 `rg` 检查旧编号、旧标题、失效关系和计划引用。
3. 检查 `git diff`，确认没有重写无关历史或覆盖用户改动。
4. 文档变更只执行仓库规定的文档验证，不擅自运行完整构建。
5. 向用户报告：创建、合并、迁移、保留和未处理的内容，以及审计仍发现的问题。

## 审计要求

审计存量 ADR 时，按以下顺序给出发现：

1. 非 ADR 内容占用 ADR 编号；
2. 同一决策过程被过度拆分；
3. 当前权威决策互相冲突或存在双事实源；
4. 状态与实现或索引不一致；
5. 关系缺失、错误或只有模糊的“相关”；
6. 长期悬空的 `Proposed`；
7. 缺少当前决策视图；
8. 格式和链接等机械问题。

先保护已发布历史，再整理未发布草稿。不要为了编号连续或目录整洁而伪造历史。

## 资源

- [references/governance-standard.md](references/governance-standard.md)：完整的规范性分类、准入、颗粒度、生命周期和索引标准。
- `scripts/audit_decisions.py`：跨平台、只读、仅使用 Python 标准库的机械一致性审计工具。
