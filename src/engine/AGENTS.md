# Engine — 代理工作指南

## 通信机制角色（权威定义）

引擎里所有「事件 / 通知 / 订阅」类机制必须归入以下三个角色之一，不要新增第四类总线。各机制类注释以本节为准。

| 角色 | 实现 | 方向 | 用途 | 不负责 |
|---|---|---|---|---|
| **调度器** | `EventQueue`（归 `World` 持有） | 跨帧 → FSM | 按模拟时间把消息投递给成员 FSM（`member.actor.send`） | 不做发布订阅、不投影 UI |
| **成员内响应总线** | `ProcBus` | 成员内、同步 | passive / buff 声明「XXX 时 YYY」，发布订阅 | 不做跨帧调度、不投影 UI |
| **出 UI 投影** | `DomainEventBus` | 成员 → UI，单向 | 把 MemberDomainEvent 投影给控制器 / UI | 不参与成员内逻辑、不做调度 |

派生信号一律视为「喂入某个角色的适配器」，不是独立机制：

- `StatusInstanceStore` 变更、`Pipeline.emit` → 喂 ProcBus。
- `AttributeWatcher` 阈值穿越 → 当前是独立订阅系统，**规划中**降格为 ProcBus 的事件源（见 ADR 待拆清单）。
- 外部控制器意图 → 经输入黑板快照进入 `World`，由成员按目标身份标记接收。

判据：若新机制是「按时间延迟触达 FSM」→ EventQueue；「成员内某条件满足时响应」→ ProcBus；「让 UI 知道发生了什么」→ DomainEventBus。三者都不匹配时先提 ADR，不要私自加总线。

成员之间相互影响的写入不进队列也不立即施加，而是记入 Tick 内的阶段缓冲，由结算相统一交付。判据是写入目标：写自身的立即执行，写其他成员或共享集合的走阶段缓冲。

## 线程间通道

引擎与主线程之间的数据面只有两类通道，不要新增第三类：

- **状态区**：成员与区域的连续世界状态、共享时间轴映射，由引擎逐 Tick 覆盖提交，读取方只取最新提交。输入侧对称：控制器槽位写入共享内存，引擎每 Tick 生成一份输入快照。
- **事件区**：需要逐次消费的离散事实按追加顺序写入，顺序以模拟时刻为主键、同刻序号为兜底。

控制面（生命周期命令与结果、一次性变长查询、运行故障）不走共享内存。

引擎不持有任何外部回调，也不假设输出一定有消费者。

## 文档与 ADR

引擎设计意图通过模块旁的模块架构文档、`src/engine/document/` 和 `docs/decisions/` 保留。工作时读取相关文档；新设计内容写入项目级 ADR，历史叙述文档只作为历史快照读取。

历史叙述文档包括 `src/engine/document/架构设计说明概要.md`、`src/engine/document/hook与触发层设计讨论结论.md`、`src/engine/document/WorldAreaSystem.md`。

ADR 规则的权威来源是 `docs/decisions/README.md`；写 ADR 前必须阅读。

满足以下任一条件时，先向用户提议新增 ADR，并等待确认：

- 跨越至少 2 个引擎顶层目录，或修改契约：`PipelineCatalog`、`EventCatalog`、`AttributeSchema`、`StatusTypeRegistry`、线程间协议、checkpoint 格式。
- 将已经实现的方案切换为另一种方案。
- 引入新的 registry、通信机制或分层方式。
- 建立未来 passive、skill、pipeline 必须遵守的约定。

不要静默修改已 `Accepted` 的 ADR 正文；实质修正应新增 ADR，并在新 ADR 中写 `Supersedes: NNNN`。ADR 使用中文书写。
