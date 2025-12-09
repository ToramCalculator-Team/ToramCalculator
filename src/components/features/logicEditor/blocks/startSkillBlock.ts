import { Blocks, FieldDropdown } from "blockly/core";
import { javascriptGenerator } from "blockly/javascript";

const BLOCK_ID = "start_skill";

/**
 * 技能入口积木
 * 仅用作逻辑入口，不生成额外代码，本块下方的语句链视为技能起点
 */
export function createStartSkillBlock() {
  Blocks[BLOCK_ID] = {
    init: function () {
      this.appendDummyInput().appendField("技能入口");
      this.appendDummyInput()
        .appendField("起始管线")
        .appendField(new FieldDropdown([["前摇", "前摇"], ["蓄力", "蓄力"], ["咏唱", "咏唱"], ["发动", "发动"]]), "start");
      this.appendDummyInput()
        .appendField("结束管线")
        .appendField(new FieldDropdown([["发动", "发动"], ["咏唱", "咏唱"], ["蓄力", "蓄力"], ["前摇", "前摇"]]), "end");
      this.setPreviousStatement(false);
      this.appendStatementInput("STACK").setCheck(null);
      this.setColour(300);
      this.setTooltip("技能逻辑入口，选择起始/结束管线");
      this.setHelpUrl("");
    },
  };

  javascriptGenerator.forBlock[BLOCK_ID] = function (block) {
    const start = block.getFieldValue("start") || "";
    const end = block.getFieldValue("end") || "";
    const next = javascriptGenerator.statementToCode(block, "STACK") || "";
    // 生成配置 JSON 片段，供上层汇总
    return `/*skill_config*/({"startPipeline":"${start}","endPipeline":"${end}"});` + next;
  };

  return BLOCK_ID;
}


