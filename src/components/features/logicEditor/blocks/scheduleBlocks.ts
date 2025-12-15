import { Blocks, FieldDropdown } from "blockly/core";
import { javascriptGenerator, Order } from "blockly/javascript";
import { PlayerActionPool } from "../../simulator/core/Member/types/Player/PlayerPipelines";

/**
 * 延迟执行管线积木
 */
export function createSchedulePipelineBlock(getPipelineNames?: () => string[], pipelineNames?: string[]) {
  const blockId = "schedule_pipeline";
  const fallbackNames = (Object.keys(PlayerActionPool) as (keyof PlayerActionPool)[]).slice();

  Blocks[blockId] = {
    init: function () {
      this.appendDummyInput().appendField("延迟执行管线");
      this.setInputsInline(false);

      this.appendValueInput("delayFrames").appendField("延迟帧数").setCheck("Number");

      this.appendDummyInput()
        .appendField("管线名称")
        .appendField(
          new FieldDropdown(() => {
            const names = getPipelineNames ? getPipelineNames() : pipelineNames;
            const list =
              names && names.length > 0
                ? names
                : pipelineNames && pipelineNames.length > 0
                  ? pipelineNames
                  : fallbackNames;
            return list.map((name) => [name, name]);
          }),
          "pipelineName",
        );

      this.appendValueInput("params").appendField("参数(可选)").setCheck(null);
      this.appendValueInput("source").appendField("来源(可选)").setCheck("String");

      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(210); // 动作分类逻辑色系
      this.setTooltip("延迟执行指定的管线");
      this.setHelpUrl("");
    },
  };

  javascriptGenerator.forBlock[blockId] = function (block, generator) {
    const delayFramesCode = generator.valueToCode(block, "delayFrames", Order.NONE) || "0";
    const names =
      (getPipelineNames ? getPipelineNames() : pipelineNames) && (getPipelineNames ? getPipelineNames() : pipelineNames)!.length > 0
        ? getPipelineNames
          ? getPipelineNames()!
          : (pipelineNames as string[])
        : fallbackNames;
    const pipelineName = block.getFieldValue("pipelineName") || names[0];
    const paramsCode = generator.valueToCode(block, "params", Order.NONE);
    const sourceCode = generator.valueToCode(block, "source", Order.NONE);

    const args: string[] = [];
    args.push(delayFramesCode);
    args.push(`"${pipelineName}"`);
    args.push(paramsCode || "undefined");
    args.push(sourceCode || "undefined");

    const code = `ctx.schedulePipeline(${args.join(", ")});\n`;
    return code;
  };

  return blockId;
}


