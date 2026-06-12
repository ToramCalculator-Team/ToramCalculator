# 0015 - 运行时资源架构：双引擎常驻、共享场景、注意力机为相机摆位触发器

- **状态**: Accepted
- **日期**: 2026-06-12
- **决策层**: 跨层（引擎线程 / 渲染 / 视觉意图）
- **相关代码**: `src/lib/engine/core/thread/EngineService.ts`、`src/lib/engine/render/SceneRuntime.tsx`、`src/machines/intent/visualIntentMachine.ts`、`src/machines/projections/SceneIntentBridge.tsx`
- **相关 ADR**: 0009、0012、0013、0014

## 背景

ADR 0014 确立了主业务（simulator）与配套服务（character 配置）的分类。两者都消费引擎与场景，但需求不同，且当前实现存在事实缺陷：

- **引擎共用缺陷**：character 配置页（`characterPageModel.ts` 经 `getDefaultEngine`）与 simulator 实时模拟（`RealtimeSimulator.tsx` 经 `defaultEngine()`）**共用同一个 default engine**。从 simulator 导航到 character 配置时，character 的 `loadScenario/patchMemberConfig` 会覆写主引擎场景，simulator 运行态被冲掉；跨 URL 返回后状态已变。
- **跨 URL 状态保持需求**：配套服务的导航会改变 URL（配置机体时去 wiki 查看），但用户期望回来时引擎/配置状态不变。
- **Babylon 场景重建成本**：场景冷启动耗时显著，character↔simulator 切换若每次重建场景，体验不可接受。
- **场景消费有两种模式**：character 配置经注意力机（EquipmentPanel → VisualIntentMachine → SceneIntentBridge → focusCamera）做视觉聚焦；simulator 经 `acquireRealtimeSession` 做实时战斗渲染。二者展示完全不同的世界内容，却共用同一 Babylon 实例。
- **相机控制权疑似多源**：character 配置 / simulator 设计态由注意力焦点驱动相机；simulator 验证态相机需跟随被操控成员，且用户可手动改视角。这一度被建模为「需要按 phase 仲裁多个相机驱动源」。

需要确立引擎实例数与生命周期、场景实例与内容的关系、注意力机对相机的确切契约。

## 候选方案

### A. 单引擎 + 页面级临时引擎 + 按 phase 仲裁相机

主引擎单例；character 用页面级 `createEngine`，`onCleanup` dispose；相机控制权由仲裁层在「注意力焦点」与「成员跟随」之间按 phase 切换。

- 优点：引擎资源最省（character 引擎用完即弃）。
- 缺点：character 引擎页面级生命周期 → 跨 URL（去 wiki）状态丢失，违背需求；相机仲裁层需要 phase 知识，要么钻进注意力机（违反 0013 阶段无关），要么新增一层；「成员跟随」被当成与注意力机并列的第二驱动源，引入不存在的复杂度。

### B. 双引擎常驻 + 共享场景互斥切换 + 注意力机为唯一相机摆位触发器

- **两个具名常驻引擎**：`getSimulatorEngine()`（原 default）与 `getCharacterEngine()`，均在 bootstrap engine 模块显式创建，生命周期 = app 生命周期，状态各自隔离、跨 URL 保持。
- **场景实例常驻、内容互斥切换**：SceneRuntime 的 Babylon 实例唯一且常驻（已由 `shouldMountCore` 实现，见 0009）；character 视图与 simulator 视图互斥（导航跳转，永不同屏），切换 URL 时切换「场景内容来源」而非重建实例。
- **注意力机是唯一相机驱动源，且只做「切 target + 一次摆位」**：注意力机在所有状态下行为统一——target 变化时切换焦点对象、把视角等相机参数切到该 target 对应的一组预设值，然后**放手**，不锁定/不独占相机。其他来源（用户手动拖拽、验证态成员运动）可继续自由改变相机。phase 不改变「相机听谁的」，只改变「target 由谁设定」（用户手选 vs 操控行为自动设定）。

- 优点：character 引擎常驻 → 跨 URL 状态保持 ✓；引擎状态隔离 → 修复 character 覆写 simulator 的缺陷 ✓；场景实例常驻 → Babylon 成本只付一次 ✓；注意力机保持 0013 的阶段无关纯粹性，无需仲裁层，无第二类规则；验证态「手动改视角」天然兼容（注意力机不锁相机）。
- 缺点：两个常驻引擎一直占用 worker 资源（即使当前未在该页面）；场景内容来源切换逻辑需要明确归属（SceneIntentBridge 的演进）。

## 决议

选 B。

理由：

1. **生命周期应等于状态需要存活的时长**（同 0013 判据）。character 配置状态需跨越「去 wiki 再回来」存活，故 character 引擎必须常驻，不能页面级。两个引擎都常驻、状态隔离，直接修复了共用 default engine 的覆写缺陷。
2. **区分「场景实例」与「场景内容」。** 实例常驻解决 Babylon 加载成本；内容随当前活跃页（互斥）切换。character 不「拥有」载入场景的能力，SceneRuntime 是不归任何页面所有的共享渲染服务，character 经注意力机「请求聚焦」、simulator 经 `acquireRealtimeSession`「请求战斗渲染」。
3. **注意力机是统一的相机摆位触发器，不是相机控制权所有者。** 它只在 target 变化时做一次「切焦点 + 摆位」然后放手，从不接管后续相机运动。因此「成员跟随」不是第二驱动源——验证态只是 target 恰好是被操控成员、且该 target 由操控行为自动设定而非用户手选。所有状态下注意力机是同一种模式，无特殊规则。
4. **phase 退化为「决定 target 由谁设定」**，而非「决定相机听谁的」。注意力机因此保持 0013 定义的完全阶段无关——它只认 target，不关心 target 怎么产生。
5. **两个常驻引擎在 bootstrap engine 模块显式创建**，符合 0014 引用的启动规范与本仓 `ensure*` 命名规范：常驻资源的生命周期 = app 生命周期，应在唯一显式启动点建好，不得惰性触发。

## 代价

- **常驻资源成本**：两个引擎 + 一个 Babylon 场景始终占用 worker / GPU 资源，即使用户停留在 wiki 等无需引擎的页面。押注「跨 URL 即时可用」与「避免重建成本」的收益大于常驻开销；若未来低端设备资源压力显现，需重新评估 character 引擎的惰性化（但必须配显式创建点，不可退回惰性触发生命周期）。
- **互斥假设是前提**：本架构建立在「character 视图与 simulator 视图永不同屏」之上。若未来需要分屏 / 画中画（边看战斗边调装备），场景需同时渲染两套内容，本 ADR 的「内容互斥切换」模型失效，需 Supersede。
- **场景内容来源切换归属未定**：SceneIntentBridge 当前只投影注意力机一种来源。内容来源（character 聚焦 vs simulator 战斗）随页切换的调度逻辑该挂哪一层，本 ADR 确立原则但未定具体结构，留作实现期决策。

## 影响范围

- 代码层面：
  - `EngineService`：`__default__` → 具名 `getSimulatorEngine()`；新增 `getCharacterEngine()`；bootstrap engine 模块（`modules.ts`）显式创建两者。
  - character 侧消费者（`characterPageModel.ts`、`SkillPreviewPanel.tsx`）从 `getDefaultEngine` 切到 `getCharacterEngine`；simulator 侧（`RealtimeSimulator.tsx`）指向 `getSimulatorEngine`。影响面约 8 文件 24 处，非机械改名（含行为变更与缺陷修复）。
  - `VisualIntentMachine` 契约收敛：只产出 target 与注意力强度状态（atRest/acquiring/attending/engaging/releasing），相机表现为「切 target + 一次摆位」的 entry 动作；不产出相机运动参数、不锁定相机。
  - SceneRuntime 保持实例常驻；内容来源切换调度待实现期定。
- 文档层面：与 0009（持久渲染运行时）、0012、0013、0014 共同构成应用层 + 渲染基准。
- 迁移：引擎重命名 + 拆分可作为独立一步先行（顺带修复覆写缺陷）；注意力机契约收敛、场景内容切换为后续步骤。

## 参考

- 与用户的架构讨论（2026-06-12）：双引擎常驻、场景实例 vs 内容、注意力机为「切 target + 摆位后放手」的统一模型、phase 仅决定 target 来源、互斥前提。
- ADR 0009：持久渲染运行时（场景实例常驻基础）。
- ADR 0012 / 0013：意图优先视觉控制、注意力机阶段无关根级 actor。
- 代码现状证据：`acquireRealtimeSession` 仅 `RealtimeSimulator` 调用；EquipmentPanel 经注意力机驱动场景聚焦；character 与 simulator 共用 default engine。
