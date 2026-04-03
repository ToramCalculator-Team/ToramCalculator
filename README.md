# ToramCalculator

## 📖 项目简介

ToramCalculator 是一个为 Toram Online 游戏开发的辅助工具。通过模拟战斗过程，帮助玩家找到最优的配置方案。

### ✨ 核心功能

- 📚 游戏 Wiki 库
- 🎮 队伍配置优化 + 分享
- ⚔️ 战斗过程模拟
- 📊 逐帧数据分析 + 可视化展示

### 🌐 应用程序URL

🔗 [https://app.kiaclouth.com](https://app.kiaclouth.com)


### 🌐 Wiki地址

🔗 [https://deepwiki.com/ToramCalculator-Team/ToramCalculator](https://deepwiki.com/ToramCalculator-Team/ToramCalculator)


### 环境要求
- 🐳 Docker
- 📦 Node.js >= 24
- 🔧 pnpm >= 9.15.2

### 安装依赖

首次开发时，执行以下命令：

```bash
# 1. 安装依赖
pnpm install

# 2. 复制环境变量文件
cp .env.example .env
```


### 初始化流程

首次开发或数据架构变更时，执行以下命令：

```bash
# 1. 生成开发依赖文件并启动后端服务
pnpm run setup
```

这个命令会：
- 生成所有必要的数据库架构和类型定义以及数据操作方法
- 启动 PostgreSQL 数据库（自动执行初始化 SQL）
- 启动 Electric 同步服务

### 日常开发流程

日常开发时，只需执行：

```bash
# 1. 设置开发环境（如果需要重置数据）
pnpm run setup

# 2. 启动开发服务器
pnpm dev
```

## 脚本

| 脚本 | 用途 |
| --- | --- |
| `pnpm setup` | 生成代码并重置本地基础设施 |
| `pnpm dev` | 启动开发服务器 |
| `pnpm start` | 启动构建产物 |
| `pnpm generate` | 执行全部代码生成 |
| `pnpm generate:inject` | 运行枚举注入脚本 |
| `pnpm generate:schema` | 生成 Prisma Client |
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

