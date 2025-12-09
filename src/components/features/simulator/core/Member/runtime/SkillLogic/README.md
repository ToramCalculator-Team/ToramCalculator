# SkillLogic 执行概要

- 入口：`runSkillLogic(options)`，由 `skillLogicActor` 调用，仅负责技能逻辑（成员 AI 的行为树仍在独立模块）。
- 编译：`compileSkillLogicToJS` 将 `skillEffect.logic` 中的 Blockly workspace 生成 JS；同时收集自定义管线定义。
- 运行时上下文：
  - `ctx.runPipeline(name, params?)`：优先调用成员的 `pipelineManager` 静态管线；否则尝试自定义管线。
  - `ctx.runStage(name, params?)`：直接调用阶段池。
  - `ctx.schedulePipeline` / `ctx.scheduleFunction`：通过事件队列延迟执行。
- 兜底：若 `logic` 为空或编译失败，使用最小兜底脚本（可在 `skillLogicExecutor.ts` 调整或改为直接报错）。
- 缓存：按 `logic` 内容（或 skillId 标识）缓存编译结果，减少重复解析。

