import { Blocks, FieldTextInput, Workspace, WorkspaceSvg } from "blockly/core";
import { javascriptGenerator } from "blockly/javascript";
import { decodeActionBlockId, type CustomPipelineMeta } from "./meta";

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

      // 仅允许 action_<name> 类型的“动作块”接入
      this.appendStatementInput("ACTIONS").setCheck("PIPELINE_ACTION").appendField("动作顺序");

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

    const actions: string[] = [];
    let current = block.getInputTargetBlock("ACTIONS");
    while (current) {
      const actionName = decodeActionBlockId(current.type);
      if (actionName) {
        actions.push(actionName);
      }
      current = current.getNextBlock();
    }

    pipelines.push({
      sourceBlockId: block.id,
      name,
      desc,
      actions,
    });
  }

  return pipelines;
};


