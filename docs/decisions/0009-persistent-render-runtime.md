# 0009 - 常驻渲染运行时作为应用级场景底座

- **状态**: Proposed
- **日期**: 2026-06-03
- **决策层**: 跨层（渲染 / 通信 / UI）
- **相关代码**: `src/lib/engine/render/SceneRuntime.tsx`、`src/lib/engine/render/SceneRuntimeCore.tsx`、`src/routes/(app)/(features)/simulator/RealtimeSimulator.tsx`
- **相关 ADR**: 0008

## 背景

应用此前同时存在全局 3D 背景 canvas 与实时模拟 `GameView` canvas。两者各自创建 Babylon engine/scene、加载背景模型、维护光照/粒子/相机和渲染循环。进入实时模拟时，画面并不是激活应用背景中的同一场景，而是在页面内部再创建一个独立渲染世界。

沉浸式 UI 需要把 3D 场景提升为应用底座：普通 UI 浮在常驻场景上，实时模拟进入后复用同一 canvas/scene，并只激活战斗渲染与控制器输入。该变化会影响根布局、渲染通信、实时模拟 HUD 和本地设置语义，需要明确场景所有权和页面可用能力边界。

## 候选方案

### A. 子页面继续拥有实时 canvas

保留 `GameView` 自建 canvas/scene，只把视觉样式改成全屏覆盖。

- 优点：改动小，现有实时模拟代码迁移成本低。
- 缺点：仍然是双 canvas/双 scene，背景态到战斗态没有连续性；渲染资源重复加载；页面组件继续拥有底层 scene，无法形成应用级输入边界。

### B. 根部常驻 SceneRuntime，页面申请 scoped session

根部创建唯一 Babylon canvas/scene。普通状态下只运行背景组；实时模拟页面通过 `acquireRealtimeSession` 申请战斗渲染能力，离开时释放 session。

- 优点：唯一场景事实源，资源生命周期集中；页面只提交意图，不直接修改 Babylon 对象；普通 UI、战斗 HUD 和场景输入可以在同一运行时边界下协调。
- 缺点：需要重构根布局、实时模拟视图和渲染通信；session 生命周期必须防止路由切换竞态。

### C. Service Worker / SharedWorker 承载共享实时场景

把多窗口控制作为首版目标，让 worker 成为跨 tab 的模拟或渲染会话协调者。

- 优点：更接近未来多玩家/多窗口控制的形态。
- 缺点：Service Worker 生命周期不适合高频实时权威模拟；SharedWorker 会扩大线程协议和构建范围，超出当前“单应用内唯一 canvas”的问题边界。

## 决议

选 B：建立根部常驻 SceneRuntime，实时模拟通过 scoped session 激活。

理由：

1. 3D 场景是游戏渲染层，不是普通图片背景；底层 scene/engine/canvas 必须由应用级运行时持有。
2. 页面需要表达“进入实时模拟、设置主控、跟随实体、释放会话”等意图，但不应直接持有 Babylon 对象。
3. 单 canvas/单 scene 与逻辑 render group 能解决重复加载和切换割裂，同时避免重新引入多 renderer 调度复杂度。
4. 跨 tab 控制仅预留，不在本次落地；未来若需要实时权威共享，应另行评估 host-tab 或 SharedWorker，而不是把 SW 当实时模拟宿主。

## 代价

这个决策把渲染生命周期集中到根部，意味着普通 UI、实时 HUD、输入系统都要尊重 SceneRuntime 的状态机和 session token。短期实现成本高于继续维护 `GameView`，并且 session 释放、快速路由切换、设置关闭 3D 时的降级都必须被显式处理。

如果未来需要多个独立视口同时显示不同相机，单 canvas/单 scene 的逻辑分组可能不够，需要新增离屏渲染或多 renderer 方案；届时应通过新 ADR Supersede 本决策。

## 影响范围

- 代码层面：根布局挂载 `SceneRuntimeProvider`；实时模拟不再渲染 `GameView` canvas；渲染通信从全局单例迁移为 session 内实例；3D 背景设置改为正向字段。
- 文档层面：ADR README 索引需要补齐 0008 并追加 0009。
- 迁移：旧 `is3DbackgroundDisabled` 本地缓存按反向语义迁移到 `is3DSceneEnabled` 后清理。

## 参考

- 讨论目标：常驻 3D 场景作为应用背景，实时模拟进入后激活同一场景与控制器。
- 相关实现：`RendererProtocol`、`RendererCommunication`、`MemberController`、`RealtimeSimulator`。
