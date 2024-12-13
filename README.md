# ToramCalculator

## 项目信息

- 概述：出于兴趣为Toram Online开发的小工具￣ω￣=
- 功能：配置队伍组成后，系统模拟战斗过程，并生成逐帧数据再可视化为图表。玩家可分享自己的机体配置和战斗模拟配置。
- 数据架构：这是一个localfirst应用，服务端负责分发资源和广播数据库变更（由ElectricSQL引擎完成），客户端订阅对应数据表接口，实现本地数据同步
- 

## 依赖说明

- prisma model：生成中央数据库架构和本地数据DDL
- prisma client：生成静态数据类型
- electric：postgresql的同步引擎

### 目录说明

- .husky: git hooks
- prisma: 存放服务端数据库架构的Prisma模型
- public: 公共静态资源
- src: 前端项目文件夹
- - components: 页面组件
- - lib：工具函数库
- - locales: 国际化相关
- - repositories：本地数据库交互方法
- - routes: 应用程序路由
- - styles: 项目公用样式、动画、主题、变量等
- - worker: 工作线程文件
- test：测试文件

### Commit 规范

type: 类型

```
 * feat：新增功能
 * fix：bug 修复
 * docs：文档更新
 * style：不影响程序逻辑的代码修改(修改空白字符，格式缩进，补全缺失的分号等，没有改变代码逻辑)
 * refactor：重构代码(既没有新增功能，也没有修复 bug)
 * perf：性能, 体验优化
 * test：新增测试用例或是更新现有测试
 * build：主要目的是修改项目构建系统(例如 glup，webpack，rollup 的配置等)的提交
 * ci：主要目的是修改项目继续集成流程(例如 Travis，Jenkins，GitLab CI，Circle等)的提交
 * chore：不属于以上类型的其他类型，比如构建流程, 依赖管理
 * revert：回滚某个更早之前的提交
```

scope: 可选,影响范围
subject: 对 commit 的简短描述

### 项目构建流程

首先确保具备docker和node环境

#### 启动后端服务
```bash
# 启动postgreSQL和Electric服务
docker compose up

# 填充测试数据(将此sql文件中的架构和数据填充到postgres数据库)
psql -U postgres -h localhost -d postgres -f .\test\db-csv\toram.sql 
```

#### 启动前端应用
```bash
# install dependencies
# 安装依赖
pnpm install

# generate types
# 生成静态数据类型
pnpm dbGenerate：type

# start dev
# 以开发模式试运行
pnpm dev

# build production
# 构建生产模式代码
pnpm build

# run
# 以生成模式运行
pnpm start
```

### 开发概要

- Solid Start
- TypeScript
- Tailwind CSS
- Prisma & Kysely
- Electric & PGlite
