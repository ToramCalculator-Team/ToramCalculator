import { Workspace, serialization } from "blockly/core";
import { javascriptGenerator } from "blockly/javascript";
import {
  buildPlayerPipelineMetas,
  buildPlayerStageMetas,
  type CustomPipelineMeta,
} from "~/components/features/logicEditor/blocks/meta";
import { collectCustomPipelines } from "~/components/features/logicEditor/pipelineBlocks";
import { createBlocksRegistry } from "~/components/features/logicEditor/blocksRegistry";

export interface SkillLogicCompilationResult {
  code: string;
  customPipelines: CustomPipelineMeta[];
}

/**
 * 将存储在 skillEffect.logic 中的 Blockly 数据编译为 JS 片段
 * - 逻辑数据通常包含 workspace 序列化对象与自定义管线定义
 * - 这里采用 headless Workspace 直接用 Blockly 官方序列化加载后生成代码
 */
export function compileSkillLogicToJS(rawLogic: unknown): SkillLogicCompilationResult | null {
  if (!rawLogic) return null;

  try {
    const parsed = typeof rawLogic === "string" ? JSON.parse(rawLogic) : rawLogic;
    if (!parsed || typeof parsed !== "object") return null;

    const logicObj = parsed as any;
    const workspaceState = logicObj.workspace ?? parsed;
    const initialCustom: CustomPipelineMeta[] = logicObj.customPipelines ?? [];

    // 注册积木定义（基于玩家内置管线/阶段 + 逻辑中携带的自定义管线）
    createBlocksRegistry({
      builtinPipelineMetas: buildPlayerPipelineMetas(),
      builtinStageMetas: buildPlayerStageMetas(),
      initialCustomPipelines: initialCustom,
    });

    const workspace = new Workspace();
    serialization.workspaces.load(workspaceState, workspace);

    const code = javascriptGenerator.workspaceToCode(workspace);
    const collected = collectCustomPipelines(workspace);

    return {
      code,
      customPipelines: collected.length > 0 ? collected : initialCustom,
    };
  } catch (error) {
    console.warn("编译 skillEffect.logic 失败，返回 null:", error);
    return null;
  }
}


