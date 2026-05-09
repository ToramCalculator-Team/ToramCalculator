# Contributing

## 开发环境

- Node.js >= 24
- pnpm 使用 `package.json` 中声明的 `packageManager`
- Docker 用于本地 PostgreSQL 和 Electric 服务

## 首次开发

```bash
# 1. 安装依赖
pnpm install

# 2. 复制环境变量文件
cp .env.example .env

# 3. 生成开发依赖文件并启动后端服务
pnpm setup
```

`pnpm setup` 会执行完整的本地初始化流程：

- `pnpm generate`
- `pnpm infra:reset`
- `pnpm db:restore`

## 日常开发

```bash
# 启动开发服务器
pnpm dev
```

首次开发、需要重置本地数据、数据库结构变化时执行：

```bash
# 设置开发环境并重置数据
pnpm setup
```

## 代码生成

修改数据库 schema、枚举注入逻辑、颜色 token 后执行：

```bash
pnpm generate
```

`pnpm generate` 包含：

- `pnpm generate:inject`：运行枚举注入脚本
- `pnpm generate:schema`：生成 Prisma Client
- `pnpm generate:colorSystem`：生成颜色系统产物

生成目录：

- `db/generated`
- `src/styles/colorSystem/generated`

生成文件会在下次生成时被覆盖，行为变更应落到源 schema、token 或 generator。

## 数据库

| 命令 | 用途 |
| --- | --- |
| `pnpm infra:up` | 启动 PostgreSQL 和 Electric |
| `pnpm infra:stop` | 停止 PostgreSQL 和 Electric |
| `pnpm infra:down` | 删除本地基础设施和卷 |
| `pnpm infra:reset` | 重建基础设施并恢复备份 |
| `pnpm db:studio` | 打开 Prisma Studio |
| `pnpm db:backup` | 导出数据库到 `db/backups` |
| `pnpm db:restore` | 从 `db/backups` 恢复数据库 |

数据库结构变化后，先更新 schema 和生成入口，再执行 `pnpm generate` 与 `pnpm setup` 验证本地恢复流程。

## 脚本

| 脚本 | 用途 |
| --- | --- |
| `pnpm setup` | 生成代码并重置本地基础设施 |
| `pnpm dev` | 启动开发服务器 |
| `pnpm start` | 启动构建产物 |
| `pnpm generate` | 执行全部代码生成 |
| `pnpm generate:inject` | 运行枚举注入脚本 |
| `pnpm generate:schema` | 生成 Prisma Client |
| `pnpm generate:colorSystem` | 生成颜色系统产物 |
| `pnpm infra:up` | 启动 PostgreSQL 和 Electric |
| `pnpm infra:stop` | 停止 PostgreSQL 和 Electric |
| `pnpm infra:down` | 删除本地基础设施和卷 |
| `pnpm infra:reset` | 重建基础设施并恢复备份 |
| `pnpm db:studio` | 打开 Prisma Studio |
| `pnpm db:backup` | 导出数据库到 `db/backups` |
| `pnpm db:restore` | 从 `db/backups` 恢复数据库 |
| `pnpm build` | 构建项目 |
| `pnpm clean` | 清理构建产物和生成物 |
| `pnpm clean:generated` | 清理 `db/generated` |
| `pnpm clean:build` | 清理构建输出 |
| `pnpm package` | 打包 `.output/` 为 `bundle.tar.gz` |

## 代码风格

代码格式以 `biome.json` 为准：

- tab 缩进
- 双引号
- 120 列宽
- import 自动整理

## 注释与设计说明

注释是代码契约的一部分，描述设计目的、历史原因、兼容性约束、构建约束、运行时边界、缓存策略、安全边界的注释需要随实现保留或同步改写。

删除注释需要满足以下条件之一：

- 注释内容已经错误
- 注释引用的代码已不存在
- 注释属于临时调试噪音

关键实现需要添加设计说明，说明目的和原理。

## 提交前检查

提交前至少执行：

```bash
pnpm build
```

涉及数据库、生成代码、颜色系统、认证、同步逻辑的改动，需要手工验证对应页面或流程。

## PR 说明

PR 描述需要包含：

- 改动目的
- 影响范围
- 是否修改环境变量
- 是否修改数据库结构或生成物
- 验证命令和结果
