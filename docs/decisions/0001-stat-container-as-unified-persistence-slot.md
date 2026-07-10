# 0001 - StatContainer 作为持久化槽的统一载体

- **状态**: Accepted
- **日期**: 2026-05（从 `hook与触发层设计讨论结论.md` §2.1.1 拆出）
- **决策层**: 数据层
- **相关代码**: `src/lib/engine/core/World/Member/runtime/StatContainer/StatContainer.ts`、`src/lib/engine/core/World/Member/runtime/StatContainer/SchemaTypes.ts`、`src/lib/engine/core/World/Member/runtime/Status/StatusInstanceStore.ts`

## 背景

成员需要保存游戏内可见状态、技能层数/计数器和被动冷却等跨帧数据。早期设计倾向把它们都放进 `StatusInstanceStore`，但可见状态依赖标签和进入/离开语义，数值槽则需要统一计算、公式读取和 checkpoint。两类数据职责不同，需要确定唯一边界。

## 候选方案

### A. 全部放入 StatusInstanceStore

- 优点：所有附加状态集中管理。
- 缺点：可见状态和不透明数值槽混合；冷却依赖“状态不存在”的特殊语义；公式与 checkpoint 需要第二套读写和序列化路径。

### B. 持久数值放入 StatContainer

- 优点：复用属性计算、统一读取语法和既有 checkpoint；可见状态的标签语义保持纯粹。
- 缺点：schema 会增加技能和被动的私有槽；需要稳定命名空间和冲突检测。

### C. 由各功能自行选择

- 优点：短期灵活。
- 缺点：相似数据会落入不同系统，边界依赖作者直觉并持续漂移。

## 决议

选 B：**所有需要 checkpoint 的持久数值槽统一放入 `StatContainer`；`StatusInstanceStore` 只承载游戏内可见状态。**

核心约束：

1. passive、skill、buff 在安装时声明自己的属性槽。
2. 冷却、层数和计数器使用普通数值槽，与其他属性共享公式和快照语义。
3. 冷却使用显式时间戳和哨兵值，不用“槽不存在”表示首次触发。
4. 私有属性 key 必须使用稳定前缀，并由 schema 合并阶段检测冲突。

## 代价

- `StatContainer` schema 会随能力种类增长，需要关注容量和命名冲突。
- 哨兵值和命名前缀是跨模块约定，需要通过辅助函数或类型固化。
- 可见状态与持久数值分属两个组件，排查成员完整状态时需要同时查看两处。

如果属性槽规模成为性能瓶颈，或出现大量同时兼具可见状态与复杂数值生命周期的需求，应重新评估本决议。

## 影响范围

- `StatContainer` 与 schema 合并机制负责持久数值槽及其冲突检测。
- `StatusInstanceStore` 不提供通用冷却或计数器存储能力。
- 所有能力安装入口必须在 `StatContainer` 构造前收集属性槽。

## 参考

- `src/lib/engine/document/hook与触发层设计讨论结论.md` §2.1.1
- Unreal GAS 中 GameplayAttribute 与 GameplayEffect 的职责分离
