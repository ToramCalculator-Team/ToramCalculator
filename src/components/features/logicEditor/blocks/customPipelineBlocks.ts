import { Blocks, FieldTextInput, Workspace, WorkspaceSvg } from "blockly/core";
import { javascriptGenerator } from "blockly/javascript";
import { decodeStageBlockId, type CustomPipelineMeta } from "./meta";

/**
 * 管线定义积木（仅用于收集元数据，不生成运行时代码）
 */
export function createPipelineDefinitionBlock() {
  const blockId = "pipeline_definition";

  Blocks[blockId] = {
    init: function () {
      this.appendDummyInput().appendField("定义管线");
      this.appendDummyInput().appendField("名称").appendField(new FieldTextInput("自定义管线"), "pipelineName");
      this.appendDummyInput().appendField("描述(可选)").appendField(new FieldTextInput(""), "desc");

      this.appendStatementInput("STAGES").setCheck(null).appendField("阶段顺序");

      this.setColour(230); // 对齐管线分类色系
      this.setTooltip("定义一个自定义管线（仅收集元数据）");
      this.setHelpUrl("");
    },
  };

  javascriptGenerator.forBlock[blockId] = function () {
    return "";
  };

  return blockId;
}

/**
 * 从 workspace 中收集自定义管线定义
 */
export const collectCustomPipelines = (workspace: Workspace | WorkspaceSvg): CustomPipelineMeta[] => {
  const blocks = workspace.getBlocksByType("pipeline_definition", false);
  const pipelines: CustomPipelineMeta[] = [];

  for (const block of blocks) {
    const name = block.getFieldValue("pipelineName")?.trim();
    if (!name) continue;
    const desc = block.getFieldValue("desc")?.trim() || undefined;

    const stages: string[] = [];
    let current = block.getInputTargetBlock("STAGES");
    while (current) {
      const stageName = decodeStageBlockId(current.type);
      if (stageName) {
        stages.push(stageName);
      }
      current = current.getNextBlock();
    }

    pipelines.push({
      name,
      desc,
      stages,
    });
  }

  return pipelines;
};


