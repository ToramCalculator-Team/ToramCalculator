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
- ⚡ tsx (全局安装)

### 全局安装 tsx

在开始开发之前，需要全局安装 tsx：

```bash
# 使用 npm
npm install -g tsx

# 或使用 pnpm
pnpm add -g tsx
```

### 初始化流程

首次开发或数据架构变更时，执行以下命令：

```bash
# 1. 安装依赖
pnpm install

# 2. 复制环境变量文件
cp .env.example .env

# 3. 执行完整初始化
pnpm dev:init
```

这个命令会：
- 生成所有必要的数据库架构和类型定义
- 启动 PostgreSQL 数据库（自动执行初始化 SQL）
- 启动 Electric 同步服务

### 日常开发流程

日常开发时，只需执行：

```bash
# 1. 设置开发环境（如果需要重置数据）
pnpm dev:setup

# 2. 启动开发服务器
pnpm dev
```
