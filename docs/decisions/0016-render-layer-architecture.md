# 0016 - 渲染层架构：应用级场景渲染器（三层模型 + 四关注点分离）

- **状态**: Proposed
- **日期**: 2026-06-15
- **决策层**: 跨层（渲染 / 编排 / 通信）
- **相关代码**: `src/lib/engine/render/SceneRuntimeCore.tsx`、`SceneRuntime.tsx`、`RendererController.ts`、`RendererCommunication.ts`、`sceneStateMachine.ts`、`ThirdPersonCameraController.ts`
- **相关 ADR**: 0009（常驻渲染运行时）、0012（意图优先视觉控制）、0014（路由即状态投影）、0015（运行时资源架构）
- **前置依据**: `src/lib/engine/document/渲染层需求分析.md`（R1–R9、4 个关注点、前瞻 P1/P2/P3）

## 背景

渲染层定位被重新厘清：它**不是模拟引擎的游戏画面渲染器，而是服务整个应用的场景渲染器**，游戏画面只是其能力之一。需求分析（前置依据）从 4 个真实消费者反推出 R1–R9，并归纳出 **4 个必然关注点**：宿主、接入闸门、内容编排、相机/注意力。其中两条需求重塑了架构：

- **R3 三层模型**：场景由「基础场景层（常驻）/ 世界内容层（随用户内容来源选择延续或重建）/ 注意力层（随页面/相位）」构成，三者解耦。世界内容**与页面解耦**——页面切换默认只切注意力、不重建世界内容。
- **R9 静态态模型替换**：静态展示态下，世界内容层中已在场实体的模型可按 modelId 替换（不涉动画接续，不碰实时命令流 R4）。

现状代码与此定位有结构性差距：

- `SceneRuntimeCore.tsx`（约 880 行）**一个文件身兼 4 职**——宿主（engine/loop/canvas）、内容编排（`setupCharacterContent`/`setupRealtimeResources`）、相机（`animateCameraTo`/`FOLLOW_POSE`）、半个接入层（`api` 对象）。
- `RendererController.ts`（约 1200 行）混了实体工厂、动画控制器、命令分发、帧同步、区域可视化 5 种关注点，且与 Core 内的内容逻辑割裂。
- **相机逻辑散落三处**（`SceneRuntimeCore` 补间 / `ThirdPersonCameraController` 跟随 / `sceneStateMachine` 过渡），靠 `followActive` 布尔门控协调，违反 R5「相机正交于内容」。
- **世界内容与页面绑死**：character 页=character 内容、模拟页=realtime 内容，无「内容来源选择」「跨页面延续」能力，违反 R3。
- **模型写死**：`loadCharacterModel()`（`RendererController.ts:575`）永远加载唯一 `/models/character.glb`，`spawn` 命令无模型标识字段，R9 无从实现。
- character 与 realtime 两条内容路径不对称：realtime 走完整命令管线，character 绕过命令直接 `createCharacter`；`realtimeRoot` 形同虚设（实体建在 scene 根），`characterRoot` 才真用了 root。

需要一个架构决策，确定：三层模型如何落成模块、4 个关注点如何切分、渲染层的世界输入契约如何定义、R9 模型替换归属何处、以及生命周期机的职责边界。

> 上游依据：`docs/concepts/interaction-context.md` 确立「交互情境」是模态无关的抽象 UI 层，其 resources 要素投影为渲染层的世界输入、attentionTargets 要素投影为相机注意力。本 ADR 据此把渲染层世界输入定为 `worldResources`（数据契约），而非业务/页面概念。

## 候选方案

### A. 最小抽取（只独立相机）

保留 `SceneRuntimeCore` 作为宿主+内容编排合体，仅把相机三处逻辑收敛成独立 `CameraSystem`，用显式相机状态替代 `followActive`。三层模型、内容来源、R9 暂不处理。

- 优点：改动面最小、风险最低；解决「相机散三处」这个最痛点；可快速验证。
- 缺点：R3 三层解耦、R9 模型替换、世界内容与页面解耦全部无法落地；宿主与内容编排仍耦合在 880 行文件里；character/realtime 不对称与 `realtimeRoot` 空转债务原样保留。只解决了需求的一小部分。

### B. 三层模型 + 四关注点分离 + worldResources 输入契约（推荐）

把 R3 三层模型落成模块结构，4 个关注点各成边界清晰的模块，**单向依赖**；渲染层对外只接受一个**模态无关的世界资源契约 `worldResources`**（由上游交互情境的 resources 要素投影而来），不认识 scenario / 页面 / 业务，使「延续/重建」退化为对 `worldResources` 的 diff；R9 模型替换归入 EntitySystem。**不**为「更多世界资源种类」（P1）搭插件框架。

> 重要修正（取代本 ADR 初版）：初版曾引入 `WorldContentSource`（把 simulator/character/dummyTarget 当平行「内容来源」做多态封装）。经评审否决——它们不是平行来源，而是同一主业务下不同界面引用的资源，区别是**数据差异不是类型差异**（character 预览场景与 simulator scenario 结构相同，见 `characterPageModel.ts:761`）。给数据差异套多态接口是过度设计。详见 `docs/concepts/interaction-context.md`。

模块与职责（括号内为对应的三层）：

1. **RenderHost（宿主 / 基础场景层）**：持有唯一 canvas/engine/scene/渲染循环/world→screen 投影/每帧主题材质同步/基础场景层（背景/灯光/粒子/舞台）。不懂业务与世界内容。对外只给：内部 scene 句柄、`registerFrameTick`、`projectWorldToScreen`、`ready`。（R1、R7、R8、R3-基础层）

2. **SceneAccess（接入闸门）**：今天的 `SceneRuntimeProvider` 保留。发 scoped session、强制 R2「业务页不碰 Babylon」、`enabled` 关闭时退化为 no-op。（R2、R1-禁用）

3. **WorldContentDirector（世界内容编排 / 世界内容层）**：管理**当前活动世界内容**——接受 `worldResources`，与上一次做 diff 决定**延续**（无变化则不重建实体）还是**重建**（R3-世界内容层）；按实时命令流建/拆/更新实体（R4），承载实体级增量修改（含 R9 模型替换）。内含 **EntitySystem**（工厂 + 实体注册表 + physics→mesh 帧同步 + 动画子系统 + 按 modelId 加载 + 静态态模型替换，R6/R9）。

4. **CameraDirector（相机 / 注意力层）**：唯一相机；内部小状态机仲裁「此刻谁驱动我」（观察环绕 / 过渡补间 / 实时跟随），显式替代 `followActive`；接收意图命令（focus/follow/reset，C4）。由**界面/相位的注意力**驱动，与世界资源正交（R3/R5）。

支撑概念（**非插件框架**）：

- **worldResources 契约**：渲染层唯一的世界输入。一组「世界里有哪些实体、各自的种类/初始位姿/模型标识」的声明，由上游交互情境的 resources 要素投影而来。渲染层据此建实体，**不关心它来自 simulator scenario 还是 character 预览**。
  - **延续** = 上游传入的 `worldResources` 与当前一致（diff 无变化）→ 不重建实体，世界内容跨界面保留。
  - **重建** = `worldResources` 变化（选木桩 / 打开分享 character / 换 simulator）→ 按 diff 增删改实体。
  - 「延续 vs 重建」的判定权在 diff，不在「来源类型」——无需 `WorldContentSource` 这层多态。
- **实时命令流**：realtime 阶段的逐实体更新仍走现有 `render:cmd` 通道（事件流 + seq 丢弃 + reconcile + 进场缓冲，R4 **完全不变**）。`worldResources` 管「世界里有谁」，命令流管「他们逐帧怎么动」，二者分工。
- **生命周期机**：`sceneStateMachine` 收窄为通用编排（`idle → loading → active → unloading`）+「同时只有一个活动世界内容」互斥。

依赖方向（严格单向）：

```
        SceneAccess  ──发 session / 关闭退化──┐
             │ 编排（按界面/相位 + worldResources）
   ┌─────────┼──────────────┐                 │
   ▼         ▼              ▼                  │
WorldContentDirector   CameraDirector   （RenderHost：谁都依赖它，
   │(含EntitySystem,         │(注意力层)      它不依赖任何人）
   │ worldResources diff,    │                │
   │ R9模型替换)             │                │
   └──────────┬──────────────┘                │
              ▼                                │
          RenderHost ◀───────────────────────────┘
```

关键正交性：**WorldContentDirector 由 `worldResources` 驱动，CameraDirector 由界面/相位的注意力驱动**，二者不互相依赖——这正是 R3 三层解耦的结构兑现（同一世界内容可被不同界面以不同注意力观察）。

- 优点：三层模型一一映射到模块，R3 解耦与 R5 正交被结构兑现；「延续/重建」退化为 diff、无需多态来源，比初版更简单；R9 模型替换有明确归属（EntitySystem 静态态入口）；统一实体基底后 `realtimeRoot` 空转、两路清理不对称的债顺带消除；各模块可独立测试。
- 缺点：改动面中等，需拆分两个巨型文件、分阶段迁移；character/布阵路径改写为「经 worldResources → EntitySystem 建实体」，短期多一层间接；需定义 `worldResources` 契约（但它只是数据结构，非多态接口，成本远低于初版的 WorldContentSource）。

### C. 完整可插拔 ScenePresenter 框架

在 B 基础上把「世界内容来源」做成一等可插拔抽象（`ScenePresenter` 接口 + 注册表），现在就为 P1（地图/多角色同台/装备预览台）建好框架。

- 优点：未来加来源时改动最小、边界最清晰。
- 缺点：当前仅 3 类来源且 P1 无代码证据（需求分析已隔离），现在建框架违反 YAGNI；插件接口在少量实例时极易设计错（过早抽象），真加来源时大概率返工接口；额外间接层让当下最需要的「读懂渲染层」目标不升反降。

## 决议

选 **B（三层模型 + 四关注点分离 + worldResources 输入契约）**。

理由：

1. **兑现重新厘清的定位**：渲染层是应用级场景渲染器。B 的三层模块（RenderHost=基础层、WorldContentDirector=世界内容层、CameraDirector=注意力层）直接映射 R3，从结构上回答「谁管什么」。
2. **R3/R5 解耦有硬依据**：WorldContentDirector 由 `worldResources` 驱动、CameraDirector 由界面/相位注意力驱动，二者互不依赖，结构上实现「同一世界内容、不同界面观察」与「相机正交于内容」。
3. **R9 有明确归属**：模型替换是 EntitySystem 的静态态入口，与 R4 实时命令共用 EntitySystem 但入口隔离，符合「仅静态态、不碰实时命令流」。
4. **统一实体基底是降债**：character/布阵改经 worldResources → EntitySystem 后，`realtimeRoot` 空转、两路清理不对称等现存债顺带清掉——故现在做。
5. **「延续/重建」退化为 diff，比初版更简单**：渲染层只认 `worldResources`、对它做 diff，无需 `WorldContentSource` 多态来源。这同时拒绝了 C 的可插拔框架——P1 无证据，过早抽象。
6. **可分阶段、可测试**：能按「抽相机 → 抽宿主 → 拆 EntitySystem → 引入 worldResources/三层」分步落地，每步可运行；生命周期机有 `sceneStateMachine.test.ts` 测试范式可复用。

## 代价

放弃了什么、何时会后悔：

- **放弃 C 的即插即用**：若 P1 来得快且世界资源种类迅速膨胀，仅靠 `worldResources` diff + 生命周期机可能不够，需补更结构化的投影层——会有一次扩展。押注「资源种类增长缓慢」，押错则后悔。
- **统一基底迁移风险**：character/布阵改经 worldResources → EntitySystem 后，若静态构造路径与 Worker 命令路径的时序假设不一致（如静态内容不需快照对齐却复用了缓冲逻辑），可能引入新边界条件。迁移阶段须为静态态单独验证。
- **worldResources 契约的前置设计成本**：需定义一个覆盖当前所有世界资源种类的数据结构；缓解方式是它只是**数据结构**（非多态接口），只覆盖现有种类的最小公因子，不为 P1 预留字段。
- **短期间接成本**：character 渲染从「一行 createCharacter」变成「经 worldResources → EntitySystem」，调试多一跳。
- **不解决相机/模型数值问题**：`SLOT_CAMERA_POSES`、`OBSERVE_POSE`、`character.glb` 模型映射等仍需真实模型联调（0012/0015 遗留），本 ADR 只管结构。

## 影响范围

代码层面（按迁移阶段，每步独立可运行、可回归）：

- **阶段 1 — 抽相机**：从 `SceneRuntimeCore` 抽出 `CameraDirector`，吸收 `ThirdPersonCameraController` + `animateCameraTo` + 过渡编排，用显式相机状态机替代 `followActive`。对外 API（`focusCamera`/`followEntity`/`resetCamera`）签名不变，C4 意图桥无感。
- **阶段 2 — 抽宿主**：从 `SceneRuntimeCore` 剥出 `RenderHost`（engine/scene/loop/投影/主题同步/基础场景层），剩余成为 `WorldContentDirector`。`SceneAccess`（Provider）基本不动。
- **阶段 3 — 拆 EntitySystem**：把 `EntityFactory` / 实体注册表 / `RenderSyncSystem` / `CharacterAnimationController` 收拢为 `EntitySystem`；命令分发归 WorldContentDirector 命令入口；区域可视化随实体走。
- **阶段 4 — 引入 worldResources 契约 + 三层**：定义 `worldResources` 数据结构（覆盖 simulator/木桩/character 当前所有世界资源种类的最小公因子）；character/布阵改为经 `worldResources` → EntitySystem 建实体；WorldContentDirector 按 diff 决定延续/重建；机体页接入「当前模拟场景 / 木桩」选择（即构造不同的 `worldResources` 传入）；删除 `characterRoot`/`realtimeRoot` 不对称处理，统一内容根管理；`sceneStateMachine` 收窄为通用生命周期 + 互斥。
- **阶段 5 — R9 模型替换**：`spawn` 协议扩 modelId 字段；`EntityFactory` 支持按 modelId 加载多 GLB；EntitySystem 增静态态 `replaceModel(entityId, modelId)`；接 `avatar`/`_avatarTocharacter` 数据；机体页换装/换角色调用之。**仅静态态启用**。

文档层面：

- 更新 `src/lib/engine/document/架构设计说明概要.md` 渲染层章节。
- `RendererProtocol.ts`（`spawn` 扩 modelId）属通信协议变更，需同步 `通信协议表.md`。
- 本 ADR 取代 0009 中关于「Core 内部结构」的隐含约定（0009 的「常驻 + session」边界仍有效，不被取代）；与 0014「路由即状态投影」呼应（场景三层是路由/相位的视觉投影）。

迁移：

- 对外契约（`useSceneRuntime` 方法集、session 形状）在阶段 1–4 全程不变，业务页 C1–C4 零改动；阶段 5 新增模型替换入口（增量，不破坏现有）。
- 改动全部在渲染层内部 + 阶段 5 的协议扩字段（向后兼容：无 modelId 时回退默认模型）。

## 参考

- 前置需求：`src/lib/engine/document/渲染层需求分析.md`（R1–R9）
- ADR 0009 常驻渲染运行时、0012 意图优先视觉控制、0014 路由即状态投影、0015 运行时资源架构
- 现状测试范式：`src/lib/engine/render/sceneStateMachine.test.ts`
