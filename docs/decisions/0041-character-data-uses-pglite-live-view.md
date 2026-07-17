# 0041 - Character 持久数据以 PGlite business view 为唯一响应式读源

- **状态**: Accepted
- **日期**: 2026-07-14
- **决策层**: 数据层 / 应用层
- **相关 ADR**: Depends on 0018

## 决策问题

Character 编辑需要同时响应当前页面写入、其他本地写入、同步回灌和服务端拒绝。PGlite business view 已表达本地覆盖与同步回退，系统需要决定 CharacterSession 是否仍维护一份乐观领域副本，还是所有持久领域变化都通过同一响应式读路径收敛。

## 决策驱动

- 所有本地写入和同步结果必须通过同一条可追踪读路径影响 Character。
- ADR 0018 已在 PGlite 层闭合本地覆盖、服务端确认与拒写回退。
- Character 聚合不能同时由 Session、界面 store 和数据库视图共同拥有。
- Session 需要拥有命令和会话状态，但不需要取得持久领域数据所有权。

## 候选方案

### A. Session 维护乐观 Character 领域副本

- 优点：界面可以立即读取应用层修改后的聚合。
- 缺点：Session 与 PGlite 同时成为事实源，外部写入和同步回退需要第二套回灌与补偿协议。

### B. PGlite business view 作为唯一响应式读源

- 优点：本地事务、其他写入和同步结果自然通过同一路径收敛。
- 缺点：正式领域值必须等待本地事务和响应式查询回显，读面实现缺陷会直接影响 Character 投影。

### C. 把聚合完整复制进 actor context

- 优点：Session snapshot 表面上包含全部状态。
- 缺点：actor context 成为数据库之外的第二份可变权威，仍需处理外部数据回灌。

## 决议

选择 B：**PGlite business view 是 Character 持久领域数据的唯一响应式事实源；CharacterSession 不持有第二份 Character 领域副本，所有本地写入、同步确认和回退都通过同一读路径收敛。**

- Session 只拥有业务命令、会话生命周期和非持久运行状态，不通过覆盖数据改变正式 Character 投影。
- 界面可以保留尚未形成合法领域值的原始输入 draft；draft 不是 Character 聚合或持久事实源。
- 当前页面、其他本地模块和同步系统产生的持久变化都从 business view 进入同一 Character 投影，不建立来源专用回灌通道。
- 非权威应用层不得实现独立 rollback，也不得维护 live 数据之上的渲染覆盖副本。

## 代价

合法领域值不再由应用层覆盖立即显示，而要经过本地事务和响应式查询回显。响应式聚合读面成为关键基础设施；本地订阅或聚合解析失败会直接暴露为数据错误，不建立第二份查询 fallback 或应用层恢复协议。

## 重新评估条件

- Character 聚合在目标数据规模下无法稳定建立一致的响应式快照。
- 本地事务到响应式投影的延迟持续破坏输入体验，原始控件 draft 无法补足反馈。
- 产品需要长期离线分支、多人合并或可恢复领域草稿，从而引入新的持久数据身份。

## 参考

- [ADR 0018](./0018-close-write-id-convergence-loop.md)
