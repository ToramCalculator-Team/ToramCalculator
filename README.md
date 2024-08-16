# ToramCalculator

## 项目信息

- 出于兴趣为Toram Online开发的小工具￣ω￣=


### 分支规则说明

- master 分支为最新稳定版本的代码
- dev 分支项目负责人才有合并权限
- 其他开发成员分支命名规则为 dev-feat-xxx，xxx 代表开发者名称拼音小写首字母
- 开发版本分支名称 v1.0-dev
- 发布版本分支名称 v1.0-release
- 每个版本封版后需要打一个 tag

### 目录说明

- .husky: git hooks
- dirzzle: drizzle orm
- public: 公共静态资源
- src: 项目文件夹
- - components: 页面组件
- - styles: 项目公用样式、动画、主题、变量等
- - lib：工具库
- - routes: 应用程序路由
- - schema: 应用程序数据结构定义
- - dictionaries: 应用程序文本字典（i18n）

### Commit 规范

<type>(<scope>): <subject>

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

### Build Setup

```bash
# install dependencies
# 安装依赖
pnpm install

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

### 引入新的 pnpm 包

- devDependencies 预编译时用到的模块，生产环境用不上
  `pnpm install --save-dev moduleName`
- dependencies 实际运行时要用到的模块，生产环境也要用到
  `pnpm install --save moduleName`

### 开发概要

- Solid Start
- TypeScript
- Tailwind CSS
- Prisma & Drizzle
- 团队规范
  eslint
