# ToramCalculator

## 项目简介

ToramCalculator 是一个面向 Toram Online 的辅助工具，用于游戏 Wiki 数据管理、队伍配置优化、战斗过程模拟和逐帧数据分析。

## 在线地址

- 应用程序：[https://app.kiaclouth.com](https://app.kiaclouth.com)
- Wiki：[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/ToramCalculator-Team/ToramCalculator)

## 本地运行

### 环境要求

- Docker
- Node.js >= 24
- pnpm 使用 `package.json` 中声明的 `packageManager`

### 快速启动

```bash
# 1. 安装依赖
pnpm install

# 2. 复制环境变量文件
cp .env.example .env

# 3. 初始化本地环境
pnpm setup

# 4. 启动开发服务器
pnpm dev
```

## 参与开发

开发流程、数据库、代码生成、脚本说明和提交前检查见 [CONTRIBUTING.md](./CONTRIBUTING.md)。
