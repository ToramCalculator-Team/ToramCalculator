# 引擎文档导引

本目录是引擎模块（`src/lib/engine/`）的设计文档。**目的不是描述代码现状**——代码本身才是现状的真实来源——而是承载代码无法表达的内容：意图、权衡、设计边界、跨模块的因果链。

## 阅读路径

按读者目标分四类，参考 [Diátaxis](https://diataxis.fr/) 的分法：

| 你想做什么 | 该读什么 |
|---|---|
| **入门**：理解引擎整体怎么运转 | `架构设计说明概要.md`、`通信协议表.md` |
| **实现**：要修改/扩展某模块，需要知道边界和约束 | `docs/decisions/` 下相关 ADR；模块自身的 catalog 代码（`PipelineCatalog`、`EventCatalog`、`AttributeSchema`） |
| **追因**：跨模块串一次端到端流程 | `flows/`（伤害分发、预览模式…）、`hook与触发层设计讨论结论.md` §2.99 |
| **决策**：想知道"为什么这样设计"或"是否还能改" | `docs/decisions/`（ADR），按编号或主题查 |

## 文档分层

```
document/
├── README.md                    本文件
├── 架构设计说明概要.md          L1 架构总览
├── 通信协议表.md                L2 契约（主线程↔Worker）
├── WorldAreaSystem.md           L1 子系统设计
├── 未来性能提升方向.md          路线图 / 备忘
└── flows/                       L4 端到端流程叙事（按需创建）
```

项目级 ADR 位于 `docs/decisions/`；引擎相关决策也进入该目录并通过主题列区分范围。
`hook与触发层设计讨论结论.md` 的内容会被增量拆进 `docs/decisions/`，原文档保留作为历史快照不再演进。

## 三条纪律

这套文档能用还是会腐烂，取决于这三条：

1. **每层只承担它的精度**。ADR 不写"是什么"（那是代码的职责），只写"为什么"和"权衡是什么"；契约文档用行号引用代码，不抄签名；模块账本只写到 5 行原则，不展开到方法级。
2. **决策只增不改**。ADR 一旦定稿就不回头修；如果决议被推翻，写一篇新的 ADR 标 `Supersedes: NNNN`，旧 ADR 状态改为 `Superseded by NNNN`。
3. **写不下去就停**。文档卡住的地方常常是设计还没想清楚的地方——回去改设计，不要硬写文档。

## Catalog 即 IR

引擎里有一批"事实上的中间表示"，它们是代码形式但承担规约职责，文档应当把它们当作权威：

| Catalog | 位置 | 职责 |
|---|---|---|
| `AttributeSchema` | `core/World/Member/runtime/StatContainer/SchemaTypes.ts` | 属性槽契约 |
| `StatusTypeRegistry` | `core/World/Member/runtime/Status/` | 可见状态类型契约 |
| `PipelineCatalog` | `core/Pipeline/PipelineCatalog.ts` | 计算管线契约 |
| `EventCatalog` | `core/Event/`（建设中） | 事件契约 |
| BT mdsl | `BtEditor/modes/` | 行为树 DSL |

修改这些文件等于修改契约。文档解释它们"为什么长这样"，不复述它们"长什么样"。
