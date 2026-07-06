# 0017 · 已知问题:数据同步收敛缺陷与写入端点越权

- 状态:B 组(同步收敛)已修复(2026-07-06,见 ADR 0018);A 组(安全)暂不处理
- 日期:2026-07-06
- 相关:`0015-runtime-resource-architecture`、`0018-close-write-id-convergence-loop`,ElectricSQL through-the-db 模式
- 验证:`src/lib/pglite/localFirstConvergence.test.ts`(PGlite 真集成)、`src/routes/api/changes.test.ts`(服务端策略)

## 背景

客户端写链路采用 ElectricSQL "through-the-db"(pattern 4):每张业务表在 PGlite
里拆成 `<t>_synced`(Electric 只读回灌)+ `<t>_local`(乐观写覆盖)+ `<t>` 视图
(FULL OUTER JOIN,挂 INSTEAD OF 触发器)。写入经视图触发器 → `changes` 日志 →
`ChangeLogSynchronizer` POST `/api/changes` → 服务端 Kysely 落库 → Electric 回灌收敛。

审阅发现若干缺陷,分安全类与同步收敛类两组。

---

## A. 安全类(暂不处理 —— 用户为玩家、数据价值低,排到最后)

### A-1 · 写入端点只校验 JWT 有效性,不校验 JWT 与被改数据的归属

`POST /api/changes`(`src/routes/api/changes.ts`)只做到 `if (!user) 401`。表名仅过
正则 `^[_a-zA-Z][_a-zA-Z0-9]*$`(防注入,非白名单),没有任何"这个 user 能否改这张
表这一行"的判断。

**后果**:任意持有效 JWT 的用户可 insert/update 任意表任意行 —— 包括全局只读数据
(`mob`/`item`/`skill`/`world`/`statistic`)与他人的 `character`/`simulator`/`team`。

**根因**:用户身份/行级归属校验被放在客户端。服务端信任客户端提交的一切。

**处置**:暂不修。修复方向 —— 服务端按表白名单区分"只读全局表 / 用户可写表",
对可写表做行归属校验(如 `character` 经 `player.belongToAccountId == jwt.sub`;
仓库层已有 `canEditCharacterSkill` 这类归属查询可复用)。

### A-2 · 字段级无白名单

`cleanValue` 只剔除 `undefined`,其余键原样进 `.set()/.values()`。虽 Kysely 参数化避免
SQL 注入,但客户端可写入非预期列(伪造归属字段等)。与 A-1 同源,一并延后。

---

## B. 同步收敛类(致命,优先处理)

> **处置(2026-07-06):B-1～B-5 已全部修复,见 ADR 0018。**
> B-1 服务端持久化 write_id(生成器 + `/api/changes`)、B-2 服务端接受 delete、
> B-3 insert 改幂等 upsert、B-4 rollback 恢复官方"清 outbox + 清所有 local"语义、
> B-5 上行按 changes.id 数值序。核对结论:B-1/B-2/B-4 是移植官方 pattern 4 时抄漏/抄错,
> 修法=恢复官方;B-3/B-5 是官方示例本就未做生产加固,修法=超越官方补齐。
> **B-6(列级合并)未做**,理由见文末"改进优先级"与 0018"未来项"。

### B-1 · write_id 回环断裂 → 乐观覆盖行永不清理 + 服务端更新被永久遮蔽

**机制**:客户端清理触发器(`client.sql`,`delete_local_on_synced_*`)靠
`write_id IS NOT NULL AND write_id = NEW.write_id` 删除 `<t>_local` 覆盖行。但:

1. `db/generated/server.sql` 里业务表**完全没有 write_id 列**(`grep -c write_id` = 0);
2. 上行 `changes.value` 快照只含业务列,连 write_id 都不上传(触发器 `jsonb_build_object`
   只塞业务字段)。

因此 Electric 从服务端回灌到 `<t>_synced` 的行 `write_id` 恒为 NULL → 清理条件永不成立
→ `<t>_local` 覆盖行永不删除。

**后果**:(a) `<t>_local` 随每次编辑无界增长(idb 持久化,跨刷新累积);
(b) insert 的 `changed_columns` = 全列,视图对该行**永远返回 local 值**,日后其它设备
或服务端对同行的修改进入 synced 却被 local 永久遮蔽 → 写后读长期发散。

**验证**:`localFirstConvergence.test.ts` —— 回灌 write_id=NULL 后 local 残留;之后服务端
把 seq 改成 999,视图仍返回旧值 1;对照组回传正确 write_id 则立即收敛(证明缺口只在服务端)。

### B-2 · 本地 delete 卡死整条上行队列(已被真实功能触发)

**机制**:客户端视图支持 delete(触发器产生 `operation='delete'` 变更),但服务端
`ALLOWED_OPS` 只有 insert/update → delete 变更命中 `throw` → catch 返回 500 →
`ChangeLogSynchronizer.send` 判 5xx 为 `retry` → `process()` 无限重投同一批。加之服务端
整批单事务(HOL 阻塞),**position 永不前移**,该 delete 之后排队的所有写入被永久冻结。

**触发面(非理论)**:`characterPageModel.ts:560` 编辑角色技能时调
`deleteCharacterSkill`(走客户端视图 `deleteFrom("character_skill")`)。普通用户改技能
即触发。

### B-3 · 崩溃窗口重投 → 主键冲突死循环

**机制**:`#position` 是内存变量,worker 每次启动归 0。若服务端已 accepted(200)但
`proceed()` 的 `DELETE FROM changes` 未落盘(worker 崩溃/页面关闭),重启后重读同一
change 重投;insert 无 `ON CONFLICT` → 服务端唯一键冲突 → 500 → 陷入 B-2 式死循环。

**触发面**:移动端浏览器激进回收 worker,该窗口在规模用户下会稳定出现。

### B-4 · rejected 时 rollback 清空整个 outbox 而不回滚本地态

**机制**:服务端返回 <500(如 400 结构非法)时 `rollback()` 执行 `DELETE from changes`
清空整个上行队列,但回滚本地态的 `DELETE from <t>_local` 被注释掉。

**后果**:一个被拒的写会丢弃全部待上传变更(波及无辜的其它排队写),而本地视图仍显示
这些从未到达服务端的数据 → 永久静默发散,用户无感知。

### B-5 · 跨事务排序用字符串比较 XID8 → 依赖顺序被打乱

**机制**:`send()` 以 `transaction_id.localeCompare` 排序,而 `transaction_id` 是
`pg_current_xact_id()`(XID8 数字)。字典序下 `"1000" < "999"`,事务乱序应用。整批单事务
内若父行 insert 排到子行之后 → 外键 immediate 约束失败 → 500 → 死循环。

**触发面**:较窄 —— 需服务端全局 XID 跨十进制位数边界(…999→1000)且用户离线积压了多个
有外键依赖的事务。但一旦边界对齐,会同时命中所有此类用户(关联爆发)。

### B-6 · update 上行全列快照 → 列级并发合并退化为整行 last-write-wins

`changed_columns` 在本地做了列级追踪,但上行 `changes.value` 是全列快照,服务端
`set(cleanValue)` 整行覆盖。两客户端改同一行不同列时,后到者用旧值覆盖对方已提交的列。
列级 CRDT 语义在上行链路丢失。

---

## 修复优先级建议(B 组)

1. **B-2**:客户端根本不产生 delete 上行(软删语义),或服务端支持 delete + 归属校验。
   这是唯一"普通操作即触发"的致命项,应最先处理。
2. **B-1**:服务端业务表加并持久化 write_id、由 Electric 回传,使清理触发器生效;
   否则 local-first 收敛闭环不成立。
3. **B-3 / B-5 / B-4**:insert 改 `ON CONFLICT DO UPDATE/NOTHING`(幂等);排序改按
   `changes.id` 或 BigInt(xid8)数值;逐事务成独立服务端事务并逐事务 ack;rollback 改为
   标记重试而非清空 outbox。
4. **B-6**:上行仅发送 `changed_columns` 子集。
