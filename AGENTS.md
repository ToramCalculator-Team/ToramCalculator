# ToramCalculator — 代理工作指南

## 回复风格

- 输出请务必使用中文
- 回复时尽量不要使用比喻等修辞，直接输出正论，不举反例
- 尽量使用常用术语和已有概念以降低认知负荷

## 核心原则

- 优先解决根因，而不是局部症状，重复问题通常意味着更高层设计错误
- 优先重构错误抽象，而不是添加补丁
- 保持数据流单向且可追踪
- 优先删除代码，而不是增加代码
- 模块必须职责明确且边界清晰
- 保持系统一致性，避免出现第二套模式

## 编码守则

编写代码的时候遵守以下原则

- **单一职责原则 (SRP)**
- **开闭原则 (OCP)**
- **依赖倒转原则 (DIP)**
- **合成复用原则 (CRP)**
- **迪米特法则 (LoD)**
- **KISS 原则 (Keep It Simple, Stupid)**。
- **DRY 原则 (Don't Repeat Yourself)**
- **YAGNI 原则 (You Ain't Gonna Need It)**

## 文档守则

编写注释和代码文档的时候遵守以下守则

- 文档面向最终用户而不是开发日志; 不要: 此函数基于(A5)任务,见D6要求; 好的: 此函数的用法...
- 说不要做一件事情的最好方式是不提那件事情.
- 文档和agents.md不要写显而易见的东西. 代码即注释.
- 文档的作用: 1. 引用源,帮助agent找到来源; 2.快速索引,提高搜索效率; 3.澄清易错点; 4. 给出用法
- 文档的`删除测试`, 设想删除这段文档. 后续别人读到这个位置的时候这个内容是否是必须的.

## 常用命令

| 操作 | 命令 |
|------|------|
| 首次初始化 / 需要重置基础设施 | `pnpm setup` |
| 只生成代码 | `pnpm generate` |
| 启动开发服务器 | `pnpm dev` |
| 完整构建（资源重，明确需要时使用） | `pnpm build` |
| 检查代码 | `pnpm biome check src/ db/` |
| 检查并格式化 | `pnpm biome check --write src/ db/` |
| 启动基础设施 | `pnpm infra:up` |
| 重置基础设施（干净环境测试） | `pnpm infra:reset` |
| 打开 Prisma Studio（使用生成后的 schema） | `pnpm db:studio` |

## 约定

- **`ensure*` 命名**：`ensure*` 只用于**幂等的补齐/修复**（get-or-create、create-if-not-exists，如 `ensureTemporaryAccount`、`ensureMigrationTables`），从任意位置多次调用都安全。**禁止**用 `ensure*` 惰性触发应用级生命周期（启动 worker/编排器、初始化服务单例）——那会把"启动"和"读取"柔和在一起，导致触发点不唯一、"从哪开始"无法定位。生命周期触发用 `start*`/`init*` 且必须有唯一显式入口；就绪校验用只读的 `is*`/`assert*`（漏启动时 `assert*` 抛错让问题显形，不得偷偷补救）。
- **文本编码**：源文件使用 UTF-8。从 PowerShell 读取或编辑文件时显式指定 UTF-8，例如 `Get-Content -Encoding UTF8`，避免中文注释变成乱码。
- **网络抓取**：当抓取公开网页时，如果默认curl得到空白或明显不完整的内容，请尝试使用搜索/AI爬虫UA（如OAl-SearchBot、Claude-UserBytespider）重新请求以尝试获取完整信息

## 文档与 ADR

项目级 ADR 位于 `docs/decisions/`，覆盖应用层、引擎、数据层和跨层契约。
评估、创建、修订、取代、整理或审计 ADR 时，必须先读取并遵守 `.agents/skills/architecture-decision-governance/SKILL.md`。
`docs/plans/` 只保存尚未完成的实施计划；计划执行完成后直接删除，不提交到 Git 历史。长期有效的领域事实、架构决策和代码契约分别迁移到概念文档、ADR 和代码。
修改 `src/engine/` 时同时遵守 `src/engine/AGENTS.md`。引擎历史文档通过 `src/engine/document/` 保留。
