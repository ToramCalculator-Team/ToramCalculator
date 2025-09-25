# ToramCalculator

## 📖 项目简介

ToramCalculator 是一个为 Toram Online 游戏开发的辅助工具。通过模拟战斗过程，帮助玩家找到最优的配置方案。

### ✨ 核心功能

- 🎮 队伍配置优化
- ⚔️ 战斗过程模拟
- 📊 逐帧数据分析
- 📈 数据可视化展示
- 🔗 配置分享功能
- 📚 内置游戏 Wiki 库
- 🎯 实时战斗模拟器
- 🔄 工作流编辑器
- 🎨 3D 场景渲染

### 🌐 项目地址

🔗 [https://app.kiaclouth.com](https://app.kiaclouth.com)

## 🏗️ 技术架构

### 1. UI 层 (Presentation Layer)
- **技术栈**: SolidJS, Tailwind CSS, Babylon.js, Editor.js, TanStack (Form/Table/Virtual), OverlayScrollbars
- **职责**: 用户界面展示、交互处理、动画效果、3D渲染、表单管理

### 2. 应用逻辑层 (Application Layer)
- **技术栈**: XState, SolidJS Primitives, Solid Motion, Sequential Workflow Designer
- **职责**: 核心业务逻辑、状态管理、模拟器计算、工作流管理、动画控制

### 3. 模拟器引擎层 (Simulator Engine Layer)
- **技术栈**: Web Workers, XState, Comlink, MathJS, 事件驱动架构
- **职责**: 战斗模拟、帧循环、事件队列、状态机管理、数学计算

### 4. 数据层 (Data Layer)
- **技术栈**: PGLite, Kysely, ElectricSQL, PostgreSQL, Zod, Prisma
- **职责**: 数据访问、存储管理、数据同步、数据验证、ORM管理

### 5. 认证与安全层 (Authentication & Security Layer)
- **技术栈**: Auth.js, JOSE, bcrypt, js-cookie
- **职责**: 用户认证、JWT处理、密码加密、会话管理

### 6. 基础设施层 (Infrastructure Layer)
- **技术栈**: CUID2, Vinxi, Hotkeys.js, Lodash, dotenv
- **职责**: ID生成、构建工具、快捷键处理、工具函数、环境配置

## 📁 项目结构

```
.
├── .husky/                    # Git hooks 配置
├── backend/                   # 后端服务配置 (Docker)
├── db/                        # 数据库相关
│   ├── backups/              # 数据库备份
│   ├── generated/            # 自动生成的类型定义
│   ├── generators/           # 代码生成器
│   ├── repositories/         # 数据访问层
│   ├── schema/               # 数据库架构定义
│   └── scripts/              # 数据库脚本
├── public/                    # 静态资源
└── src/                       # 应用逻辑源代码
    ├── components/            # UI 组件
    │   ├── containers/        # 容器组件
    │   ├── controls/          # 控件组件
    │   ├── dataDisplay/       # 数据展示组件
    │   ├── effects/           # 特效组件
    │   ├── features/          # 功能特性组件
    │   │   ├── simulator/     # 模拟器相关
    │   │   │   ├── controller/  # 控制器
    │   │   │   ├── core/        # 核心引擎
    │   │   │   ├── handlers/    # 事件处理器
    │   │   │   └── legacy/      # 旧版本兼容
    │   │   ├── flowEditor/    # 工作流编辑器
    │   │   ├── nodeEditor/    # 节点编辑器
    │   │   └── logicEditor/   # 逻辑编辑器
    │   └── icons/             # 图标组件
    ├── lib/                   # 核心库
    │   ├── contexts/          # SolidJS Context
    │   └── utils/             # 工具函数
    ├── locales/               # 国际化文件
    ├── routes/                # 应用路由
    ├── styles/                # 样式文件
    └── worker/                # Web Workers
```

## 📝 Commit 规范

提交信息格式：`type(scope): subject`

### 类型说明

| 类型 | 说明 |
|------|------|
| ✨ feat | 新增功能 |
| 🐛 fix | bug 修复 |
| 📝 docs | 文档更新 |
| 💄 style | 代码格式修改（不影响逻辑） |
| 🔨 refactor | 代码重构 |
| ⚡️ perf | 性能优化 |
| ✅ test | 测试相关 |
| 📦 build | 构建系统修改 |
| 🔧 ci | CI 配置修改 |
| 🎫 chore | 其他修改 |
| ⏪ revert | 回滚提交 |

## 🚀 开发指南

### 环境要求
- 🐳 Docker
- 📦 Node.js >= 20
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

### 数据库架构

项目使用两个数据库：
1. 服务端数据库（PostgreSQL）
   - 使用 `db/baseSchema.prisma` 作为基础架构定义
   - 通过 Docker 自动初始化
   - 使用 Electric 进行数据同步

2. 客户端数据库（PGLite）
   - 基于服务端架构生成
   - 支持本地写入和数据同步
   - 使用视图合并本地和同步数据

### 类型系统

- 所有枚举类型定义在 `db/enums.ts`
- 使用 `generator.js` 将枚举注入到数据库架构
- 生成的类型定义在 `db/dataEnums.ts`

### 模拟器架构

项目包含一个完整的战斗模拟器系统：

- **核心引擎**: 事件驱动架构，支持实时和批量模拟
- **状态机**: 基于 XState 的角色状态管理
- **工作流编辑器**: 可视化的工作流设计工具
- **3D 渲染**: 基于 Babylon.js 的战斗场景渲染

### 开发命令

- `pnpm dev` - 启动开发服务器
- `pnpm dev:setup` - 重置并启动开发环境  
- `pnpm dev:init` - 初始化开发环境（生成数据库架构和类型）
- `pnpm backend:up` - 启动后端服务（PostgreSQL + Electric）
- `pnpm backend:stop` - 停止后端服务
- `pnpm backend:down` - 停止并删除后端容器和数据卷
- `pnpm db:studio` - 打开 Prisma Studio 查看数据库
- `pnpm db:backup` - 备份数据库
- `pnpm db:restore` - 恢复数据库备份
- `pnpm build` - 构建生产版本
- `pnpm start` - 启动生产服务器
- `pnpm package` - 打包应用为 bundle.tar.gz
- `pnpm clear-build` - 清理构建文件

> ⚠️ 注意：每次修改 `db/baseSchema.prisma` 或 `db/enums.ts` 后，都需要重新执行 `pnpm dev:init`。

## 生产环境部署

1. 构建应用：
```bash
pnpm package
```

2. 部署生成的 `bundle.tar.gz`
