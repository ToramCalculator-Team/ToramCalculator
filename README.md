# ToramCalculator

## 📖 项目简介

ToramCalculator 是一个为 Toram Online 游戏开发的辅助工具。通过模拟战斗过程，帮助玩家找到最优的配置方案。

### ✨ 核心功能

- 队伍配置优化
- 战斗过程模拟
- 逐帧数据分析
- 数据可视化展示
- 配置分享功能
- 内置游戏 Wiki 库

### 🌐 项目地址

https://app.kiaclouth.com

## 🏗️ 技术架构

### 1. UI 层 (Presentation Layer)
- **技术栈**: SolidJS, Tailwind CSS, Babylon.js, Editor.js, TanStack
- **职责**: 用户界面展示、交互处理、动画效果

### 2. 应用逻辑层 (Application Layer)
- **技术栈**: XState
- **职责**: 核心业务逻辑、状态管理、模拟器计算

### 3. 数据层 (Data Layer)
- **技术栈**: pgLite, kysely, ElectricSQL, PostgreSQL, zod
- **职责**: 数据访问、存储管理、数据同步、数据验证

### 4. 基础设施层 (Infrastructure Layer)
- **技术栈**: cuid2, jose, js-cookie
- **职责**: ID 生成、JWT 处理、Cookie 管理、Web Workers、WASM

## 📁 项目结构

```
.
├── .husky/              # Git hooks 配置
├── backend/             # 后端服务配置
├── db/                  # 数据库相关
│   ├── clientDB/        # 客户端数据库文件
│   └── serverDB/        # 服务端数据库文件
├── public/              # 静态资源
├── src/                 # 应用逻辑源代码
│   ├── components/      # 页面组件
│   ├── lib/            # 工具函数库
│   ├── locales/        # 国际化文件
│   ├── repositories/   # 数据库交互方法
│   ├── routes/         # 应用路由
│   ├── styles/         # 样式文件
│   └── worker/         # 工作线程
└── test/               # 测试文件
```

## 📝 Commit 规范

提交信息格式：`type(scope): subject`

### 类型说明

| 类型 | 说明 |
|------|------|
| feat | 新增功能 |
| fix | bug 修复 |
| docs | 文档更新 |
| style | 代码格式修改（不影响逻辑） |
| refactor | 代码重构 |
| perf | 性能优化 |
| test | 测试相关 |
| build | 构建系统修改 |
| ci | CI 配置修改 |
| chore | 其他修改 |
| revert | 回滚提交 |

## 🚀 开发指南

### 环境要求
- Docker
- Node.js
- tsx

### 首次开发/架构变更流程

当首次开发项目或数据架构发生变化时，需要执行以下完整流程：

1. 安装依赖
```bash
pnpm install
```

2. 执行完整初始化
```bash
pnpm dev:init
```

3. 访问数据库管理界面（可选）
```bash
pnpm backend:db-studio
```

### 日常开发流程

日常开发时，只需执行以下步骤：

1. 设置开发环境（重置并启动数据库，初始化数据库架构，然后还原数据）
```bash
pnpm dev:setup
```

2. 启动开发服务器
```bash
pnpm dev
```

### 生产环境部署

1. 构建生产版本
```bash
pnpm build
```

2. 启动生产服务
```bash
pnpm start
```
