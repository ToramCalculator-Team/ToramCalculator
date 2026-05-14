# ToramCalculator — 代理工作指南

## 常用命令

| 操作 | 命令 |
|------|------|
| 首次初始化 / schema 变更后初始化 | `pnpm setup` |
| 只生成代码 | `pnpm generate` |
| 启动开发服务器 | `pnpm dev` |
| 提交前构建 | `pnpm build` |
| 检查并格式化 | `pnpm biome check --write src/ db/` |
| 启动基础设施 | `pnpm infra:up` |
| 重置基础设施（会删除 volumes） | `pnpm infra:reset` |
| 打开 Prisma Studio（使用生成后的 schema） | `pnpm db:studio` |

## 架构

- **框架**：SolidJS + SolidStart v2 alpha（`@solidjs/start`）、Vite 7，**关闭 SSR**（`ssr: false`），以 SPA 模式运行。
- **路由**：基于文件系统（`src/routes/`），使用括号目录组织布局：`(app)`、`(features)`、`(toolPages)`。
- **状态**：SolidJS store（`src/store.ts`）+ XState 状态机（`xstate`）。
- **3D**：Babylon.js 8.53（core、loaders、materials；inspector 仅开发时使用）。
- **3D vendor chunk**：`babylon-runtime`、`babylon-debug`（后者包含 inspector 所需的 React/FluentUI）。

## 数据库与代码生成

**生成代码**位于 `db/generated/`，该目录被 git 忽略。需要重新生成时运行 `pnpm generate`。

生成流程按以下顺序执行：

1. `generate:inject`：读取 `db/schema/enums.ts`，通过 `EnumInjector` 将枚举注入 Prisma schema。
2. `generate:schema`：运行自定义 Prisma generator（`db/generator/generator.ts`），生成 Zod schema、DMMF 工具、Kysely query builder 规则、SQL（server + client）和 repository。
3. `generate:colorSystem`：从 `src/styles/colorSystem/generator/generator.ts` 生成 CSS 颜色 token。

**Schema 源文件**：`db/schema/main.prisma` + `db/schema/models/*.prisma` + `db/schema/enums.ts`

- `enums.ts` 是数据库枚举的**唯一事实源**；修改枚举时改它，不要直接改 prisma 文件。
- 修改 schema 或枚举后，运行 `pnpm generate` 或 `pnpm setup`；`pnpm setup` 会同时重置基础设施。

**数据库访问**：使用 Kysely（`kysely`），类型来自 `@db/generated/zod/index`。

- 服务端：PostgreSQL，通过 `pg` pool 访问。
- 客户端：PGlite Web Worker（`src/lib/pglite/`），通过 ElectricSQL 同步。

**变更 API**：`POST /api/changes`，这是 JWT 认证的写入端点；只允许 insert/update，禁止 delete。

## 基础设施

- Docker Compose 文件位于 `backend/docker-compose.yaml`，包含 PostgreSQL 16（tmpfs、logical WAL）和 ElectricSQL。
- 初始化 SQL 来自 `db/generated/server.sql`。
- `infra:reset` 会执行 `down --volumes`、重新启动服务并恢复备份；该操作会删除所有数据。

## 构建与 Service Worker

`pnpm build` 执行两步：

1. Service Worker 构建：`node src/worker/sw/build.mjs`（使用 esbuild，输出 `public/service.worker.js`）。
2. Vite 构建：`NODE_OPTIONS=--max-old-space-size=4096 vite build`。

SW 版本号从 `src/store.ts` 的 `version` 字段提取。

## 代码生成

新增内容时，添加中文注释，说明设计意图
类型检查使用biome而不是tsc

## 约定

- **路径别名**：`~/` 指向 `src/`，`@db/` 指向 `db/`。
- **TypeScript**：启用 strict、`noEmit`、`moduleResolution: bundler`，JSX 使用 preserve（Solid）。
- **环境变量**：使用 `.env` 和 `dotenv-expand`，支持 `${VAR}` 引用；新环境从 `.env.example` 复制。
- **文本编码**：源文件使用 UTF-8。从 PowerShell 读取或编辑文件时显式指定 UTF-8，例如 `Get-Content -Encoding UTF8`，避免中文注释变成乱码。
- **测试**：当前仓库没有测试。

## 额外约束

你可以使用 `uvx codetre` 查看代码大纲

## 文档与 ADR

设计文档位于 `src/lib/engine/document/`。代码不是唯一事实源；引擎设计意图需要通过文档保留。工作时应读取并扩展相关文档。

### 目录结构

- `src/lib/engine/document/README.md`：文档入口，按读者视角组织导航。
- `src/lib/engine/document/decisions/`：ADR（架构决策记录）。
- `src/lib/engine/document/decisions/README.md`：**ADR 规则的权威来源**；写 ADR 前必须阅读。
- `src/lib/engine/document/decisions/0000-template.md`：ADR 模板。
- 历史叙述文档（`架构设计说明概要.md`、`hook与触发层设计讨论结论.md`、`通信协议表.md`、`WorldAreaSystem.md`）：这些是历史快照。不要继续扩写它们；新内容拆入 ADR。

### 何时提议新增 ADR

变更满足以下任一条件时，先向用户提议新增 ADR，并等待确认：

- 跨越至少 2 个引擎顶层目录，或修改契约：`PipelineCatalog`、`EventCatalog`、`AttributeSchema`、`StatusTypeRegistry`、线程间协议、checkpoint 格式。
- 将已经实现的方案切换为另一种方案。
- 引入新的 registry、通信机制或分层方式。
- 建立未来 passive、skill、pipeline 必须遵守的约定，例如命名前缀、bitfield 分配、payload 字段新增。

以下场景不新增 ADR：单文件重构、缺陷修复、格式调整、纯探索想法。此类内容用提交信息和行内注释承载。

### 硬性规则

1. **不要静默修改已 `Accepted` 的 ADR 正文。** 实质修正应新增 ADR，并在新 ADR 中写 `Supersedes: NNNN`。只有状态字段、损坏链接、代码行号和错别字可以在原 ADR 中直接修正。
2. **不要复用 ADR 编号。** 已废弃或被取代的 ADR 也永久保留原编号。
3. **`代价`部分必填。** 如果说不清决策放弃了什么，停下来向用户确认；此时设计还未准备好。
4. **每个 ADR 只处理一个关注点。** 多个独立取舍应拆成多个 ADR。
5. **ADR 不复述代码。** ADR 解释“为什么”，不解释“代码写了什么”。用 `path:line` 链接代码，不粘贴签名。
6. **候选方案必须同时列出优点和缺点。** 只有单边论证说明分析不完整。

### 编写流程

完整流程见 `decisions/README.md` 的“维护规则”章节。简版如下：

1. 先 grep ADR 索引和待拆清单，确认没有重复议题，也没有应被取代的现有 ADR。
2. 取当前最大编号 + 1，使用四位数字。文件名格式：`NNNN-<英文短横线-slug>.md`。
3. 复制 `0000-template.md`，初始状态设为 `Proposed`。
4. 更新索引表；如果命中待拆清单，同时勾掉对应项。
5. 只在不明显的代码位置添加 `// 见 src/lib/engine/document/decisions/NNNN-xxx.md`；不要到处添加。
6. ADR 和代码放在同一个提交中，提交信息以 `(ADR-NNNN)` 开头。纯文档修订使用 `docs:` 前缀，并单独提交。

### 语言

ADR 使用中文书写，以匹配现有文档集；只有用户明确要求时才使用其他语言。元数据键（`状态`、`日期`、`决策层`）保持中文。

