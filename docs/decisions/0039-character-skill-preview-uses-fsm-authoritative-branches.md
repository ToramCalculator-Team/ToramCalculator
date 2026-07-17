# 0039 - Character 技能预览复用 Member FSM 权威

- **状态**: Accepted
- **日期**: 2026-07-14
- **决策层**: 跨层（Character 用例 / 模拟任务 / Member 运行时）
- **相关 ADR**: Refines 0024；Depends on 0046

## 决策问题

Character 技能预览需要在运行时状态下判断行动是否可执行并计算结果。系统需要决定由 Character 读面静态推算、为 Worker 建立 Character 专用执行逻辑，还是复用通用模拟与 Member FSM 的行动裁决。

## 决策驱动

- 预览必须反映技能 Pipeline、资源、冷却和动作状态的真实运行语义。
- Member FSM 已是行动接纳或拒绝的权威边界，不能复制第二套可用性算法。
- 各候选预览必须从等价输入独立运行，不能共享其他候选的副作用。
- Worker 和引擎任务边界必须保持业务无关。

## 候选方案

### A. Character 读面静态计算

- 优点：延迟和计算成本低。
- 缺点：需要复制 FSM、Pipeline 和运行时状态判定，结果容易与真实执行分叉。

### B. Worker 实现 Character 专用预览步骤

- 优点：仍能在 Worker 中运行完整场景。
- 缺点：通用执行边界开始理解 Character 用例，并与 Member behavior 形成第二套编排。

### C. Character 用例编译隔离的通用模拟分支

- 优点：预览复用普通 Member 行为、FSM 和 Pipeline，Worker 仍只执行通用任务。
- 缺点：每个候选需要独立分支，并由 Character 应用层解释通用运行事实。

## 决议

选择 C：**Character 技能预览通过隔离的通用模拟分支执行，并复用 Member FSM 与 Pipeline 作为唯一行动裁决；Character 和 Worker 层不得复制技能可用性算法。**

- Character 用例负责把明确的预览策略转换为普通 Member 可执行行为。
- 每个候选从等价、不可变的输入独立运行，不继承其他候选的运行态。
- Worker 只接受通用场景、行为和停止条件，不理解 Character 预览阶段或业务结果文案。
- 行动接纳、拒绝、消耗和运行结果均由 Member 运行时产生；Character 应用层只解释这些事实。

## 代价

基础过程会随候选数量重复执行，预览成本随候选和策略复杂度增长。调试需要同时观察转换后的 Member 行为、通用模拟输入、FSM 判决和 Character 投影。

## 重新评估条件

- 重复分支成为主要性能瓶颈，且共享检查点能够证明分支隔离和确定性不变。
- Member FSM 不再是技能行动接纳的唯一权威边界。
- Character 产品语义改为只展示静态技能说明，不再要求真实模拟结果。

## 参考

- [ADR 0003](./0003-skill-cost-as-pipeline-contract.md)
- [ADR 0032](./0032-resolve-member-flow-and-intrinsic-mob-ai-by-type.md)
- [ADR 0046](./0046-compile-business-workflows-to-generic-engine-contracts.md)
