# PipelineService

## 模块职责

`PipelineService` 是引擎内唯一的管线运行时服务，负责基础管线、叠加层、层级解析、编译缓存和计算执行。

调用方通过管线名称和本次计算所需的值请求一次计算：

```ts
pipelineService.run(pipelineName, values)
```

服务内部完成以下流程：

```text
基础管线定义
  -> 层级 overlay
  -> 解析后的指令序列
  -> 编译后的执行函数
  -> 计算结果值集合
```

管线指令保持纯计算语义。

## 核心概念

### PipelineInstruction

`PipelineInstruction` 是管线的最小计算单元，也是 overlay 的最小修改单元。管线中的计算全部拆分为按顺序执行的二元或一元指令。

```ts
interface PipelineInstruction {
  target: string;
  op: InstructionOp;
  a: Operand;
  b?: Operand;
}
```

### 基础管线

基础管线是静态定义，描述游戏规则中的标准计算管线。管线数量较大时，按管线拆分文件，统一存放在 `standard/` 目录：

```text
Pipeline/
└── standard/
    ├── damageCalc.ts
    ├── applyDamage.ts
    ├── hitCheck.ts
    ├── skillCost.ts
    ├── ...
    └── index.ts
```

各文件提供一条标准管线，`standard/index.ts` 汇总为标准管线清单：

```ts
export const STANDARD_PIPELINES = {
  damageCalc: damageCalcPipeline,
  applyDamage: applyDamagePipeline,
  hitCheck: hitCheckPipeline,
};
```

`STANDARD_PIPELINES` 表达游戏标准规则。`PipelineInstruction` 表达规则中的单条计算指令。`binaryOp` 属于指令实现形式，不作为标准管线清单的名称。

基础管线包含公开锚点，例如：

- `damageCalc.baseDamageReduction`
- `damageCalc.finalDamage`
- `applyDamage.damage`
- `hitCheck.statusHitModifier`
- `skill.cost.mpCostRate`

锚点使用指令的 `target` 表示。叠加层通过锚点定位插入、替换或删除位置。

基础定义在服务初始化时载入并冻结。基础定义的内容和版本属于服务初始化数据。

### Overlay

`PipelineOverlay` 描述一个来源对一条管线施加的增量修改：

```ts
interface PipelineOverlay {
  id: string;
  sourceType: string;
  sourceId: string;
  priority: number;
  pipelineName: string;
  operations: readonly OverlayOperation[];
}
```

支持的修改操作包括：

- `insertBefore`
- `insertAfter`
- `replaceInstruction`
- `removeInstruction`
- `replaceOperand`
- `replacePipeline`

overlay 的层级归属由服务登记时传入的层节点决定。overlay 本身不保存 `scope`。

### 层链

管线按以下顺序组织：

```text
world
  -> camp
    -> team
      -> member
        -> skill:<skillId>
```

层链具有以下特征：

- `world` 提供场景级规则；
- `camp` 提供阵营级规则；
- `team` 提供队伍级规则；
- `member` 提供成员自身规则，例如装备、托环和被动效果；
- `skill` 提供单个技能的专属规则。

`skill:<skillId>` 是独立节点。技能 A 的 overlay 只进入技能 A 的层链。

层节点由 `PipelineService` 内部管理。节点保存：

- 层身份；
- overlay 集合；
- 当前 revision；
- 按管线名称索引的解析结果。

层身份使用统一的 `LayerRef`：

```ts
interface LayerRef {
  kind: "world" | "camp" | "team" | "member" | "skill";
  id: string;
}
```

状态收集和管线服务共用这份层身份定义。

## PipelineService 职责

### 1. 载入基础管线

服务初始化时接收静态管线清单：

```ts
const service = new PipelineService(BUILT_IN_PIPELINES);
```

服务完成以下工作：

- 检查管线名称唯一性；
- 保存基础指令序列；
- 冻结基础指令；
- 建立管线名称索引；
- 编译基础管线；
- 保存基础管线对应的执行函数。

基础管线编译只执行一次。所有层链从基础管线的编译结果开始构建。

标准管线清单的读取、冻结和预编译收拢到 `PipelineService` 初始化流程中。

### 2. 管理层节点

服务提供层节点的创建和查询：

```ts
getOrCreateLayer(ref: LayerRef): PipelineLayerHandle
getOrCreateSkillLayer(memberId: string, skillId: string): PipelineLayerHandle
```

层节点生命周期与所属对象一致：

- `world` 随 World 创建和清理；
- `camp`、`team` 随 MemberManager 的场景状态创建和清理；
- `member` 随 Member 创建和销毁；
- `skill` 随成员技能上下文按需创建，并随成员清理。

空 overlay 集合属于正常状态。服务保留对应层节点，调用方不需要为不同层级编写特殊分支。

### 3. 添加和移除 overlay

服务统一管理 overlay 的写入：

```ts
addOverlay(layer: LayerRef, overlay: PipelineOverlay): void
removeOverlay(layer: LayerRef, sourceId: string): void
removeOverlayById(layer: LayerRef, overlayId: string): void
```

每次写入都会：

1. 校验 overlay 的管线名称；
2. 校验 overlay 的来源身份；
3. 校验 overlay 的操作结构；
4. 写入对应层节点；
5. 递增该层节点的 revision；
6. 让该层及其后代的相关解析结果进入失效状态。

overlay 集合由服务内部保存。调用方不直接修改数组。

以托环为例：

```text
RegistletCollector
  -> RuntimeAttachment
  -> PipelineService.addOverlay(memberLayer, overlay)
```

卸载托环时：

```text
PipelineService.removeOverlay(memberLayer, "registlet.xxx")
```

来源身份用于统一清理该来源产生的 overlay。

### 4. 解析层链

服务根据调用上下文取得层链：

```text
world -> camp -> team -> member -> skill
```

每一层只在父层结果上应用自身 overlay：

```text
worldResult = base + world overlays
campResult = worldResult + camp overlays
teamResult = campResult + team overlays
memberResult = teamResult + member overlays
skillResult = memberResult + skill overlays
```

服务不会在每次计算时从基础管线重新重放整条层链。父层结果可以被后代层直接复用。

overlay 应用顺序：

```text
层链顺序
  -> priority 升序
    -> revision 升序
      -> id 字典序
```

后应用的 overlay 可以读取前面产生的指令目标和锚点。

### 5. 编译和缓存

每个层节点按管线名称懒构建解析条目：

```ts
interface ResolvedPipelineEntry {
  readonly instructions: readonly PipelineInstruction[];
  readonly compiled: CompiledPipeline;
  readonly provenance: readonly LayerRevision[];
}
```

条目记录构建时的层 revision：

```ts
interface LayerRevision {
  readonly ref: LayerRef;
  readonly revision: number;
}
```

取用条目时，服务沿层链检查 provenance：

1. 从顶层开始比较当前 revision；
2. 找到第一个 revision 变化的层；
3. 复用变化层之前的父层结果；
4. 从变化层重新应用 overlay；
5. 重新编译变化层及其后代；
6. 更新相关条目的 provenance。

缓存键由以下信息决定：

```text
层链身份 + pipelineName
```

服务不根据指令内容生成 32 位 hash。解析结果的有效性由层 revision 表达。

编译结果和解析指令保存在层节点条目中。服务本身提供统一访问和失效协调。

### 6. 执行计算

服务向调用方提供统一执行入口：

```ts
run(
  pipelineName: PipelineName,
  values: PipelineValues,
): PipelineValues
```

`PipelineValues` 是本次计算使用的不可变值集合，包含成员属性、技能参数、输入标志、时间值以及前序指令产生的结果字段。

```ts
type PipelineValue = number | string | boolean | readonly string[];
type PipelineValues = Record<string, PipelineValue>;
```

执行过程：

1. 服务内部取得当前调用对应的层链；
2. 获取有效的解析条目；
3. 读取条目中的 `compiled` 函数；
4. 将 `values` 传入编译函数；
5. 返回包含计算结果的值集合。

```text
PipelineService.run
  -> getResolvedEntry
  -> entry.compiled(values)
  -> PipelineValues
```

`run` 不区分 `context`、`env` 和 `input`。调用方在执行前将本次计算所需的数据整理为 `PipelineValues`。服务内部管理层身份、overlay、解析结果和编译结果。

管线计算只读取值输出结果。

## Overlay 锚点契约

基础管线公开稳定锚点。overlay 的锚点缺失时，服务立即抛错。

错误信息至少包含：

- `pipelineName`；
- `sourceId`；
- 缺失的 anchor 或 target。

以下行为均属于配置错误：

- `insertBefore` 找不到 anchor；
- `insertAfter` 找不到 anchor；
- `replaceInstruction` 找不到 target；
- `removeInstruction` 找不到 target；
- `replaceOperand` 找不到 target。

服务不把缺失锚点转换为追加、跳过或默认结果。

## 运行时边界

### 服务负责的内容

- 基础管线定义索引；
- 基础管线编译；
- 层节点生命周期；
- overlay 注册、移除和来源清理；
- 层 revision；
- 层链解析；
- 解析条目缓存；
- 编译结果缓存；
- 指令执行；
- 配置错误显形。

## 与相关模块的关系

```text
standard/index.ts
  -> PipelineService

RuntimeAttachmentInstaller
  -> PipelineService.addOverlay / removeOverlay

Member
  -> PipelineService.run

PipelineService
  -> InstructionCompiler
  -> CompiledPipeline

CompiledPipeline
  -> PipelineValues
  -> PipelineValues
```

模块职责如下：

| 模块 | 职责 |
|---|---|
| `standard/` | 提供游戏标准计算管线的静态定义 |
| `instruction.ts` | 定义指令和操作数 |
| `operators.ts` | 提供纯运算实现 |
| `InstructionParser.ts` | 转换文本和指令对象 |
| `InstructionCompiler.ts` | 将指令序列编译为执行函数 |
| `overlay.ts` | 定义 overlay 数据结构 |
| `stageEnv.ts` | 当前执行环境数据契约，后续收敛到 PipelineValues |
| `PipelineService` | 管理、解析、编译、缓存和执行管线 |

`standard/` 提供 `STANDARD_PIPELINES` 静态清单，`PipelineService` 负责读取、冻结、解析、编译、缓存和执行。

## 生命周期

### 初始化

```text
Worker / GameEngine
  -> 创建 PipelineService
  -> 载入基础管线
  -> 冻结基础定义
  -> 编译基础管线
  -> 建立 world 层节点
```

### 场景加载

```text
World
  -> 注册场景级 overlay
MemberManager
  -> 创建 camp / team 层节点
Member
  -> 创建 member 层节点
Skill 上下文
  -> 按需创建 skill 层节点
```

### 运行

```text
Member.runPipeline
  -> PipelineService.run
  -> 获取有效层链条目
  -> 执行 compiled pipeline
```

### 重装来源

```text
RuntimeAttachmentInstaller
  -> 删除 sourceId 对应 overlay
  -> 添加新 overlay
  -> 层 revision 递增
  -> 下次 run 时重建受影响层及其后代
```

### 清理

```text
World / MemberManager
  -> 清理对应层节点
  -> 删除相关 overlay 和解析条目
```

基础管线定义和基础编译结果随 PipelineService 生命周期存在。场景层、成员层和技能层条目随所属对象清理。

## 检查点

overlay 定义属于可重建数据，可以随场景或成员装配数据恢复。解析条目和编译函数属于派生数据，恢复时重新构建。

检查点需要保存会影响后续解析的内容：

- 各层身份；
- overlay 定义；
- overlay 来源；
- overlay 优先级；
- overlay revision 所需的稳定版本信息。

检查点不需要保存：

- 编译后的函数；
- 解析结果缓存；
- 指令内容 hash；
- 调试 trace。

恢复完成后，PipelineService 根据基础清单和 overlay 定义重新建立层条目。

## 测试重点

### 基础定义

- 基础管线可以按名称读取；
- 基础指令在服务初始化后保持不可变；
- 基础管线完成预编译；
- 未知管线名称显式报错。

### Overlay

- 各类 operation 的结果正确；
- 层链顺序正确；
- 同层 priority、revision、id 排序稳定；
- overlay 来源可以完整移除；
- 空层不改变父层结果；
- 缺失 anchor 或 target 显式报错。

### 缓存

- 首次调用按需构建层条目；
- 重复调用复用解析和编译结果；
- member 层变更不重建 world、camp、team 的条目；
- 父层变更会重建该层及其后代；
- 技能 A 的变更不影响技能 B；
- 恢复 overlay 后可以重新得到相同计算结果。

### 计算

- `PipelineValues` 正确传入编译函数；
- 多次计算不修改管线定义和 overlay；
- 管线计算不产生事件、写入成员或创建区域。
