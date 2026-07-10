# 0016 - 渲染层架构：应用级场景渲染器（三层模型 + 四关注点分离）

- **状态**: Proposed
- **日期**: 2026-06-15
- **决策层**: 跨层（渲染 / 编排 / 通信）
- **相关代码**: `src/lib/3dScene/SceneRuntime.tsx`、`src/lib/3dScene/SceneRuntimeCore.tsx`、`src/lib/3dScene/RendererController.ts`、`src/lib/3dScene/sceneStateMachine.ts`
- **相关 ADR**: 0009、0012、0014、0015、0027

## 背景

渲染层服务整个应用，不只是模拟引擎画面。现有实现把宿主、内容编排、实体管理和相机控制混在大型模块中，并按 character/realtime 页面来源建立不同内容路径。需要让基础场景、世界内容和注意力相机独立变化。

## 候选方案

### A. 只抽离相机

- 优点：改动小，优先解决多相机控制冲突。
- 缺点：世界内容仍与页面绑定，宿主和实体管理继续耦合。

### B. 三层模型与四个职责边界

- 优点：基础场景、世界内容和注意力结构一一对应；内容延续由数据 diff 决定；相机与实体内容正交。
- 缺点：需要统一静态和实时内容路径，并定义新的世界输入契约。

### C. 建立可插拔 ScenePresenter 框架

- 优点：未来新增场景来源方便。
- 缺点：当前资源种类不足以验证插件接口，属于过早抽象。

## 决议

选 B：**渲染层按基础场景、世界内容和注意力三层组织，并分为 RenderHost、SceneAccess、WorldContentDirector、CameraDirector 四个职责边界。**

核心契约：

1. `RenderHost` 持有唯一 engine、scene、canvas、渲染循环和基础场景，不理解业务内容。
2. `SceneAccess` 是业务层唯一接入闸门，页面不得直接操作 Babylon。
3. `WorldContentDirector` 接收场景解析产生的模态无关 `worldResources`，通过 diff 决定实体延续、增删或替换；实时命令流只负责实体的持续运动和状态变化。
4. `EntitySystem` 统一静态与实时实体的创建、注册、同步、动画和模型加载。
5. `CameraDirector` 是唯一相机控制边界，接收语义 focus/follow/reset，不依赖世界内容来源。
6. `sceneStateMachine` 只负责通用内容生命周期与单活动内容互斥，不承载页面业务类型。
7. 模型替换属于静态态 EntitySystem 能力；实时命令协议如需创建动态实体，只引用 `worldResources` 中预先解析的稳定资源标识，不独立携带原始模型配置，也不建立通用插件框架。

依赖必须保持单向：SceneAccess、WorldContentDirector 和 CameraDirector 可以依赖 RenderHost；RenderHost 不反向依赖业务、内容或注意力。

## 代价

- 静态内容和实时命令路径统一时可能暴露不同的时序假设。
- `worldResources` 需要覆盖现有资源的最小公因子，过窄会频繁扩展，过宽会形成新业务模型。
- character 的简单渲染路径会增加一层间接性。
- 若未来世界资源种类快速膨胀，可能仍需引入更结构化的 presenter 边界。

## 影响范围

- 渲染层只接受 `worldResources`、实时命令和相机语义，不认识页面或 scenario 类型。
- 世界内容和相机注意力分别驱动，页面切换不再天然意味着重建实体。
- `SceneRuntime` 的受限 session 边界继续保留。

## 参考

- `src/lib/engine/document/渲染层需求分析.md`
- ADR 0009、0015
