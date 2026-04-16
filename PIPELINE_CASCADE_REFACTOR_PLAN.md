# 层叠式管线系统改造计划

## 文档目的

本文档用于固化层叠式管线系统的目标模型、职责边界、迁移顺序和验收标准。
本文档描述的是改造目标，不代表当前代码已经实现。

## 改造结论

- 管线的查找、层级合并、缓存、执行入口由引擎级服务统一负责。
- 各个会影响管线的对象只持有自身层级的 `PipelineOverlay` 数据。
- 引擎级基础管线目录是唯一基线，默认保持不可变。
- 全局层叠只用于天气、区域规则、战场机制这类真正影响全局行为的系统。
- 成员侧保留成员常驻叠加与调用期叠加，不再保存全局基础管线副本。
- `PipelineExecutionContext` 只承载单次执行上下文，不承担目录、缓存、覆盖状态管理职责。

## 当前实现的主要偏差

- `PipelineRegistry` 同时承担基础目录存储和可变注册入口，基线不可变约束尚未建立。
- `GameEngine` 将 `pipelineRegistry` 注入 `MemberManager`，`MemberManager` 再分发给每个成员。
- `Member.setPipelineRegistry()` 会把 `stagePool` 和 `pipelineDef` 快照拷入成员自己的 `pipelineManager`。
- `PipelineManager` 当前同时承担基础定义、副本持有、成员覆盖、技能覆盖、动态插桩、编译缓存、checkpoint 协调。
- 已存在成员不会自动感知引擎级 registry 后续变化，因为成员拿到的是基线副本。
- 引擎级管线目录在类型上仍与 `MemberContext` 绑定，基础设施层又被放宽成 `Record<string, any>`，边界不稳定。
- `MemberContext` 继续混合共享 runtime 数据与引擎注入服务，执行上下文与长期状态尚未拆开。

## 设计原则

- 基线唯一。任何默认管线都只在引擎级基础目录中定义一次。
- 归属一致。哪个对象产生叠加，哪份叠加就挂在该对象自身。
- 数据纯化。overlay 只表达增量规则，不保存 stage 实现、编译结果和执行时缓存。
- 合并统一。所有层级的优先级、顺序、冲突规则只在一处定义。
- 执行解耦。执行期临时数据进入 `PipelineExecutionContext`，长期状态留在对象 runtime。
- 调试可追踪。最终管线中每一个 stage 都能追溯来源层级和来源对象。
- checkpoint 可恢复。对象级 overlay 随对象状态一起保存和恢复。

## 目标架构

### 1. `PipelineCatalog`

职责：

- 保存冻结后的 `stagePool`
- 保存冻结后的 `basePipelines`
- 作为所有解析请求的唯一基线

约束：

- 默认不提供运行期任意注册接口
- 构建完成后只读
- 与成员类型解耦

建议接口：

```ts
interface PipelineCatalog<TStageName extends string = string> {
  readonly stages: Readonly<Record<TStageName, PipelineStageDef>>;
  readonly pipelines: Readonly<Record<string, readonly TStageName[]>>;
}
```

### 2. `PipelineOverlay`

职责：

- 描述某一层级对基础管线的增量修改
- 只保存纯数据

约束：

- 不保存函数引用
- 不保存编译状态
- 可序列化

建议结构：

```ts
type PipelineOverlayOperation<TStageName extends string = string> =
  | { kind: "replacePipeline"; pipelineName: string; stages: readonly TStageName[] }
  | { kind: "prependStage"; pipelineName: string; stageName: TStageName; params?: Record<string, unknown> }
  | { kind: "appendStage"; pipelineName: string; stageName: TStageName; params?: Record<string, unknown> }
  | { kind: "insertBefore"; pipelineName: string; anchorStageName: TStageName; stageName: TStageName; params?: Record<string, unknown> }
  | { kind: "insertAfter"; pipelineName: string; anchorStageName: TStageName; stageName: TStageName; params?: Record<string, unknown> }
  | { kind: "removeStage"; pipelineName: string; stageName: TStageName }
  | { kind: "overrideStageParams"; pipelineName: string; stageName: TStageName; params: Record<string, unknown> };

interface PipelineOverlay<TStageName extends string = string> {
  id: string;
  scope: PipelineScope;
  sourceType: string;
  sourceId: string;
  priority: number;
  revision: number;
  operations: readonly PipelineOverlayOperation<TStageName>[];
}
```

### 3. `PipelineResolverService`

职责：

- 收集当前调用可见的所有 overlay
- 按固定顺序合并最终管线
- 生成调试 trace
- 负责解析缓存和编译缓存
- 提供统一执行入口

建议接口：

```ts
interface ResolvePipelineRequest {
  pipelineName: string;
  memberId?: string;
  areaId?: string;
  invocationId?: string;
  includeScopes: readonly PipelineScope[];
}

interface ResolvedPipeline {
  pipelineName: string;
  stages: readonly ResolvedStageSpec[];
  signature: string;
  trace: readonly PipelineResolutionTraceItem[];
}
```

### 4. `PipelineOverlayProvider`

职责：

- 由具体对象暴露自身 overlay
- 由引擎统一收集

建议约束：

- `Member`
- `WeatherSystem`
- `Area`
- `SkillInvocation`
- 其他未来作用域对象都通过同一接口接入

建议接口：

```ts
interface PipelineOverlayProvider {
  getPipelineOverlays(): readonly PipelineOverlay[];
}
```

### 5. `PipelineExecutionContext`

职责：

- 表达单次管线执行的输入、scratch、输出、meta
- 承载本次执行可见的 services 与 runtime 视图

约束：

- 不保存基础目录
- 不保存 overlay 仓库
- 不保存解析缓存

## 作用域与归属

### 引擎级持有

- `PipelineCatalog`
- `PipelineResolverService`
- `PipelineCompiledCache`
- `PipelineResolvedCache`
- `PipelineMergePolicy`
- `OverlayIndex`

### 对象级持有

- `Member` 持有成员常驻 overlay
- `WeatherSystem` 持有天气级 overlay
- `Area` 持有区域级 overlay
- `SkillInvocation` 持有调用期 overlay
- 未来全局机制对象持有自身层级 overlay

### 不再由成员持有

- 基础管线目录副本
- 全局 stagePool 副本
- 全局解析缓存
- 全局合并规则

## 固定合并顺序

建议先固定一套全局顺序，所有调用都遵守这套顺序：

1. `engineBase`
2. `engineGlobalOverlay`
3. `worldOrWeather`
4. `area`
5. `member`
6. `invocationOrSkill`

同一层内规则：

- 先按 `priority` 排序
- 再按创建顺序排序
- 排序规则全局唯一

这套顺序一旦确定，任何对象都不能私自定义自己的覆盖链路。

## 解析流程

1. 编排层发起一次 `resolveAndRun(pipelineName, scopes, executionContext)` 请求。
2. `PipelineResolverService` 从 `PipelineCatalog` 取出基础管线。
3. `PipelineResolverService` 根据请求作用域收集所有可见 overlay。
4. `PipelineResolverService` 按固定顺序应用 overlay，生成最终 stage 列表。
5. `PipelineResolverService` 为最终结果生成 `signature` 与 `trace`。
6. 引擎用 `signature` 查找已解析缓存与已编译缓存。
7. 命中缓存时直接执行，未命中时编译并缓存后执行。
8. 执行结果写回 `PipelineExecutionContext.output` 与必要的对象 runtime。

## 缓存策略

缓存归引擎级服务统一管理。

缓存键建议包含：

- `pipelineName`
- 基线版本号
- 参与合并的 overlay id 集合
- 每个 overlay 的 revision
- 固定合并顺序版本号

失效条件建议包括：

- 任一 overlay revision 变化
- 基线目录版本变化
- 合并规则变化
- stage 实现版本变化

## checkpoint 与恢复策略

- 对象级 overlay 进入各自对象的 checkpoint 数据。
- 引擎级缓存不进入 checkpoint。
- 恢复时先恢复对象 runtime 与对象 overlay，再由引擎按当前 catalog 重新解析。
- `trace` 可选保留为调试产物，不作为恢复依据。

## 类型系统调整方向

### 目标

- 引擎级管线目录不再直接依赖 `MemberContext`
- stage 的执行上下文依赖统一的执行期契约
- 成员类型扩展放在 runtime 数据层，不进入基础目录定义层

### 建议做法

- 为 stage 执行引入独立的 `PipelineStageContext` 或直接使用 `PipelineExecutionContext`
- `PipelineCatalog` 对 `TContext` 保持泛型约束，不在基础设施层退化为 `Record<string, any>`
- `Member`、`Player`、`Mob` 的差异通过执行期传入的 runtime 视图体现

## 与现有代码的映射关系

当前文件中的职责调整建议如下：

- `src/lib/engine/core/Pipline/PipelineRegistry.ts`
  - 收缩为只读 `PipelineCatalog`
- `src/lib/engine/core/World/Member/runtime/Pipeline/PiplineManager.ts`
  - 拆成对象级 `PipelineOverlayStore` 与引擎级 `PipelineResolverService`
- `src/lib/engine/core/World/Member/Member.ts`
  - 删除基础目录副本注入
  - 改为暴露成员级 overlay
- `src/lib/engine/core/GameEngine.ts`
  - 挂载 resolver 服务与 overlay 索引服务
- `src/lib/engine/core/Pipline/PipelineExecutionContext.ts`
  - 继续作为执行期上下文边界

## 迁移步骤

### 阶段 1：冻结基础目录

目标：

- 让引擎级基础管线成为唯一基线

动作：

- 收拢 built-in pipeline 定义
- 保证所有默认管线都进入同一个 catalog
- 删除运行期对基础目录的任意写入入口
- 为 catalog 增加版本号

验收：

- 任何默认管线都只能从引擎级 catalog 获取
- 成员不再维护默认管线副本

### 阶段 2：引入 overlay 数据模型

目标：

- 把“对象声明的叠加”从执行器里拆出来

动作：

- 定义统一的 `PipelineOverlay`
- 将 `memberOverrides`、`skillOverrides`、动态插桩统一翻译为 overlay
- 给成员和未来作用域对象增加 `getPipelineOverlays()`

验收：

- 现有成员叠加和技能叠加都能用同一结构表达
- overlay 可序列化并可恢复

### 阶段 3：引入引擎级 resolver

目标：

- 让管线解析从成员本地逻辑迁移到引擎统一服务

动作：

- 增加 `PipelineResolverService`
- 实现固定合并顺序
- 增加 `ResolvedPipeline.trace`
- 增加解析缓存与编译缓存

验收：

- 同一条管线在同一组 overlay 下只解析一次
- 调试时可以看到每个 stage 的来源层级

### 阶段 4：成员侧改为 overlay store

目标：

- 让成员只保存成员级叠加状态

动作：

- 删除 `Member.setPipelineRegistry()` 的基线拷贝逻辑
- `Member.runPipeline()` 改为向引擎 resolver 发起请求
- 将当前 `PipelineManager` 的本地缓存与基线副本拆除

验收：

- 成员实例中不再保存基础目录副本
- 成员 checkpoint 只保存成员级 overlay

### 阶段 5：接入天气、区域、战场机制

目标：

- 验证多层级 overlay 模型能够承载全局叠加

动作：

- 先接入一个全局系统，例如天气
- 再接入区域级 overlay
- 用同一 resolver 路径完成解析

验收：

- 新增全局层级时不需要改成员侧模型
- 仅新增 overlay provider 与作用域收集逻辑即可接入

### 阶段 6：清理旧接口

目标：

- 删除旧模型残留，避免双轨并存

动作：

- 删除旧 `registerPipelines`、`setMemberOverrides`、`setSkillOverrides` 入口
- 删除成员侧基线副本逻辑
- 清理临时兼容适配器

验收：

- 管线系统只剩一条解析路径
- 代码中不再出现基础目录向成员复制的行为

## 兼容策略

- 第一阶段允许旧 `PipelineManager` 继续执行，前提是叠加信息同步翻译为 overlay。
- 迁移期保留适配层，将现有 `insertPipelineStage()` 调用改写为生成 `insertAfter` overlay。
- 迁移完成后删除适配层，避免系统长期保持双语义。

## 主要风险

- overlay 合并规则不稳定会直接破坏缓存命中率。
- 同一层内缺少稳定排序规则会导致回放结果漂移。
- 过早把对象差异塞回基础目录泛型，会再次让引擎层与成员类型耦合。
- checkpoint 若保存了解析结果而不是 overlay 原始数据，会让恢复逻辑依赖旧版本实现。
- 调试信息不足时，多层叠加会难以定位最终 stage 来源。

## 验收标准

- 引擎上存在唯一基础目录与唯一解析服务。
- 对象只持有自身层级 overlay 数据。
- 成员实例不再保存基础管线副本。
- 管线解析支持跨层级合并并生成最终管线。
- 全局系统接入 overlay 时不需要修改成员模型。
- checkpoint 恢复后，最终管线解析结果与恢复前一致。
- 调试界面或日志能够展示最终管线和来源 trace。

## 实施后的判断标准

- 任何人回答“某条最终管线从哪里来”时，能够先说出基线，再说出参与合并的层级和来源对象。
- 任何人回答“某个对象为什么会影响这条管线”时，能够直接定位到该对象持有的 overlay。
- 任何人回答“缓存为什么失效”时，能够定位到基线版本、overlay revision 或合并规则版本变化。
