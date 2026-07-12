# 0002 - Member runtime attachments as prebattle assembly contract

- **状态**: Accepted
- **日期**: 2026-05-14
- **决策层**: 跨层
- **相关代码**: `src/lib/engine/core/World/Member/attachments/RuntimeAttachment.ts`、`src/lib/engine/core/World/Member/attachments/RuntimeAttachmentInstaller.ts`、`src/lib/engine/core/World/Member/construction/collectPlayerRuntimeAttachments.ts`
- **相关 ADR**: Depends on 0001

## 背景

装备、技能、雷吉斯托环、料理和道具来自不同数据源，却都会向成员安装 modifier、pipeline patch、事件订阅、阈值监听和属性槽。按来源分别维护 loader 会重复实现安装、卸载和时序控制，也会迫使 `MemberManager` 理解每种来源。

## 候选方案

### A. 每个来源维护自己的安装器

- 优点：来源逻辑局部集中。
- 缺点：相同运行时能力存在多条安装路径；时序和卸载规则重复。

### B. 统一 RuntimeAttachment 契约

- 优点：来源只负责翻译数据，运行时能力通过单一 installer 安装；构造时序和卸载边界集中。
- 缺点：公共契约需要长期维护，collector 承担翻译成本。

### C. 所有附加内容都建模为运行时 component

- 优点：适合战斗中动态增删。
- 缺点：会扩大运行期调度和 checkpoint 复杂度，超过当前战前装配需求。

## 决议

选 B：**各来源输出 `RuntimeAttachment[]`，统一 installer 按能力安装。**

核心约束：

1. collector 只把来源数据翻译成统一契约，不直接修改运行时组件。
2. `attributeSlots` 必须先合入 schema，再构造 `StatContainer`。
3. modifier、pipeline patch、subscription 和 threshold watcher 各自只有一条安装路径。
4. 稳定 `sourceId` 是跨能力的追踪和卸载边界。
5. `MemberManager` 只负责装配阶段，不感知具体数据来源。

## 代价

- `RuntimeAttachment` 容易膨胀，必须拒绝来源私有字段进入公共契约。
- 来源 schema 变化时需要同步维护 collector，否则会出现“数据存在但未安装”。
- 当前决议覆盖战前装配；战斗中动态增删能力仍需补充生命周期协议。

## 影响范围

- 所有战前能力来源通过 collector 进入统一 installer。
- `RuntimeAttachment` 是来源层与成员运行时之间的跨层契约。
- 新能力类型应扩展统一安装边界，而不是新增来源专用 loader。

## 参考

- ADR 0001：StatContainer 作为持久化槽的统一载体
- `src/lib/engine/document/hook与触发层设计讨论结论.md` §2.2–2.3
