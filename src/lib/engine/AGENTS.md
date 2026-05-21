# Engine — 代理工作指南

## 文档与 ADR

引擎设计意图通过 `src/lib/engine/document/` 保留。工作时读取相关文档；新设计内容写入 ADR，历史叙述文档只作为历史快照读取。

历史叙述文档包括 `src/lib/engine/document/架构设计说明概要.md`、`src/lib/engine/document/hook与触发层设计讨论结论.md`、`src/lib/engine/document/通信协议表.md`、`src/lib/engine/document/WorldAreaSystem.md`。

ADR 规则的权威来源是 `src/lib/engine/document/decisions/README.md`；写 ADR 前必须阅读。

满足以下任一条件时，先向用户提议新增 ADR，并等待确认：

- 跨越至少 2 个引擎顶层目录，或修改契约：`PipelineCatalog`、`EventCatalog`、`AttributeSchema`、`StatusTypeRegistry`、线程间协议、checkpoint 格式。
- 将已经实现的方案切换为另一种方案。
- 引入新的 registry、通信机制或分层方式。
- 建立未来 passive、skill、pipeline 必须遵守的约定。

不要静默修改已 `Accepted` 的 ADR 正文；实质修正应新增 ADR，并在新 ADR 中写 `Supersedes: NNNN`。ADR 使用中文书写。
