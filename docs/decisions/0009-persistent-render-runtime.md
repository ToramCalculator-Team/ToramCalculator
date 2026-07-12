# 0009 - 常驻渲染运行时作为应用级场景底座

- **状态**: Accepted
- **日期**: 2026-06-03
- **决策层**: 跨层（渲染 / 通信 / UI）
- **相关代码**: `src/lib/3dScene/SceneRuntime.tsx`、`src/lib/3dScene/SceneRuntimeCore.tsx`、`src/routes/(app)/(features)/simulator/RealtimeSimulator.tsx`
- **相关 ADR**: Related to 0008

## 背景

应用曾同时维护全局背景场景和实时模拟场景，两者各自创建 Babylon engine、scene、canvas 和渲染循环。沉浸式 UI 需要普通页面与实时模拟共享同一场景底座，因此必须明确场景所有权和页面接入边界。

## 候选方案

### A. 子页面继续持有实时 canvas

- 优点：迁移小。
- 缺点：双场景重复加载，页面继续越过应用边界操作 Babylon。

### B. 根部常驻 SceneRuntime，页面申请 scoped session

- 优点：场景生命周期和资源唯一；页面只提交意图；普通 UI 与战斗 HUD 可共享同一运行时。
- 缺点：session 生命周期和快速切换竞态需要显式处理。

### C. 使用 Service Worker/SharedWorker 承载共享场景

- 优点：为跨 tab 共享预留空间。
- 缺点：实时渲染和权威模拟不适合 Service Worker 生命周期；线程协议复杂度超出当前需求。

## 决议

选 B：**应用根部持有唯一常驻 SceneRuntime，业务页面通过 scoped session 申请场景能力。**

页面不得直接持有 Babylon scene、engine 或 canvas。跨 tab 场景共享不在本决议范围内，未来需要时另行评估。

## 代价

- 根部运行时需要处理 session 释放、路由竞态和 3D 禁用降级。
- 普通 UI、实时 HUD 和输入系统都必须尊重同一场景生命周期。
- 若未来需要同时显示多个独立视口，单 canvas/scene 可能需要被新决议取代。

## 影响范围

- 根布局拥有 SceneRuntime 生命周期。
- 实时模拟和其他页面只能通过受限 session 接入场景。
- 背景与战斗内容是同一运行时中的逻辑内容，不再创建第二套场景。
