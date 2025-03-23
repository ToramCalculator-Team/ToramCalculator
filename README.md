# ToramCalculator

## 项目信息

- 概述：出于兴趣为Toram Online开发的小工具￣ω￣=.
- 核心功能：帮助玩家找到最合适的配置。配置队伍组成后，系统模拟战斗过程，并生成逐帧数据再可视化为图表。玩家可分享自己的机体配置和战斗模拟配置。为了方便配置，附带了wiki库。
- 项目地址：https://app.kiaclouth.com

## 依赖说明

- UI 层 (Presentation Layer):
- - 负责用户界面展示和用户交互。
- - 使用 SolidJS、Tailwind CSS、Babylon.js、Editor.js、TanStack 等技术。
- - 处理用户输入、UI 渲染、动画效果等。
- 应用逻辑层 (Application Layer/Business Logic Layer):
- - 负责处理应用程序的核心业务逻辑，例如模拟器计算、数据分析、状态管理等。
- - 使用 XState 管理应用状态。
- - 协调 UI 层和数据层之间的交互。
- 数据层 (Data Layer):
- - 负责数据的访问、存储和管理。
- - 使用 pgLite、kysely、ElectricSQL、PostgreSQL 等技术。
- - 处理本地数据库操作、数据同步、数据验证（zod）、数据搜索等。
- 基础设施层 (Infrastructure Layer):
- - 负责提供底层支持，例如 ID 生成、JWT 处理、Cookie 管理等。
- - 包含 cuid2、jose、js-cookie 等工具。
- - 也包含与 Web Workers 和 WASM 相关的代码。

### 目录说明

- .husky: git hooks
- backend: 后端服务配置
- db: 数据库文件
- - clientDB: 客户端数据库文件
- - serverDB: 服务端数据库文件
- public: 公共静态资源
- src: 前端项目文件夹
- - components: 组件
- - lib：工具函数库
- - locales: 国际化相关
- - repositories：数据库交互方法
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
# 1.安装依赖
pnpm install

# 2.启动postgreSQL和Electric服务,确保postgreSQL和Electric服务都已启动后
pnpm backend:up

# 3.打开新的终端，生成服务端数据库架构（同时会生成客户端数据库架构）
node db/generator.js

# 4.根据生成的schema.prisma初始化数据库
pnpm prisma db push --schema db/serverDB/schema.prisma

# 5.将测试数据导入数据库(在windows上可以使用gitbash来执行)
bash db_restore.sh
```

#### 启动前端应用
```bash
# 1.生成PGlite的DDL
pnpm dev:db-ddl

# 2.由于目前无法保证同步顺序因此需要删除DDL中的外键关联
node db/clientDB/remove_foreign_keys.js

# 3.生成本地数据类型
pnpm dev:db-type

# 4.以开发模式试运行
pnpm dev

# 5.构建生产模式代码
pnpm build

# 6.以生产模式运行
pnpm start
```
