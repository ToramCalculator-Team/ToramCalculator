# ToramCalculator — 代理工作指南

## 核心原则

- 优先解决根因，而不是局部症状
- 优先重构错误抽象，而不是添加补丁
- 避免增加状态、effect、adapter、特殊case
- 保持数据流单向且可追踪
- 不要为减少diff保留错误结构
- 重复问题通常意味着更高层设计错误
- 优先删除代码，而不是增加代码
- 模块必须职责明确且边界清晰
- 保持系统一致性，避免出现第二套模式

## 常用命令

WSL 内的 Node.js 由 root 用户的 nvm 管理。需要从 PowerShell 调用 `node`、`pnpm`、`tsx`、`tsc`、`biome` 等 Node 工具时，用交互 shell 加载 nvm，例如：

```powershell
wsl -d Ubuntu-24.04 --cd /root/code/ToramCalculator -- bash -ic 'node -v && pnpm -v'
```

当前 WSL Node 信息：

- Node.js：`v24.4.1`，路径 `/root/.nvm/versions/node/v24.4.1/bin/node`
- pnpm：`10.33.2`，路径 `/root/.nvm/versions/node/v24.4.1/bin/pnpm`

避免在 Windows 侧直接对 WSL UNC 路径运行 `pnpm`；`cmd.exe` 不支持 UNC 工作目录，会退回到 `C:\Windows` 并找不到仓库或 node。

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

## 验证策略

| 变更类型 | 默认验证 | 升级条件 |
|---|---|---|
| 文档 / AGENTS | `git diff` | 无需构建 |
| TS / UI 小改 | `pnpm biome check <相关路径>` | 影响路由、包入口或构建链路时再构建 |
| schema / enums | `pnpm generate` | 需要重新初始化基础设施时运行 `pnpm setup` |
| Service Worker / Vite / 生成产物引用 | `pnpm build` | 默认需要完整构建 |

任务完成验证不默认执行 `pnpm build`；仅在修改构建链路、Service Worker、Vite 配置、包入口、生成产物引用，或用户明确要求完整构建时运行。

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
- 修改 schema 或枚举后，默认运行 `pnpm generate`；首次初始化或需要重新初始化基础设施时运行 `pnpm setup`。

**数据库访问**：使用 Kysely（`kysely`），类型来自 `@db/generated/zod/index`。

- 服务端：PostgreSQL，通过 `pg` pool 访问。
- 客户端：PGlite Web Worker（`src/lib/pglite/`），通过 ElectricSQL 同步。

**变更 API**：`POST /api/changes`，这是 JWT 认证的写入端点；只允许 insert/update，禁止 delete。

## 基础设施

- Docker Compose 文件位于 `backend/docker-compose.yaml`，包含 PostgreSQL 16（tmpfs、logical WAL）和 ElectricSQL。
- 初始化 SQL 来自 `db/generated/server.sql`。
- `infra:reset` 会执行 `down --volumes`、重新启动服务并恢复备份；通常用于干净环境测试。

## 构建与 Service Worker

`pnpm build` 执行两步：

1. Service Worker 构建：`node src/worker/sw/build.mjs`（使用 esbuild，输出 `public/service.worker.js`）。
2. Vite 构建：`NODE_OPTIONS=--max-old-space-size=4096 vite build`。

SW 版本号从 `src/store.ts` 的 `version` 字段提取。

## 注释规则

新增非显然抽象、跨层约束、缓存/同步/兼容边界时，添加中文注释说明设计目的和原理；直观实现无需为了形式添加注释。
用any和as类型时添加注释说明

## 约定

- **路径别名**：`~/` 指向 `src/`，`@db/` 指向 `db/`。
- **TypeScript**：启用 strict、`noEmit`、`moduleResolution: bundler`，JSX 使用 preserve（Solid）。
- **环境变量**：使用 `.env` 和 `dotenv-expand`，支持 `${VAR}` 引用；新环境从 `.env.example` 复制。
- **文本编码**：源文件使用 UTF-8。从 PowerShell 读取或编辑文件时显式指定 UTF-8，例如 `Get-Content -Encoding UTF8`，避免中文注释变成乱码。
- **测试**：当前仓库没有测试。

## 额外约束

你可以使用 `uvx codetre` 查看代码大纲

## 文档与 ADR

修改 `src/lib/engine/` 时同时遵守 `src/lib/engine/AGENTS.md`。引擎设计意图通过 `src/lib/engine/document/` 保留。
