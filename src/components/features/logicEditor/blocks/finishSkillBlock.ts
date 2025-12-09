import { Blocks, FieldDropdown } from "blockly/core";
import { javascriptGenerator, Order } from "blockly/javascript";

const BLOCK_ID = "finish_skill";

/**
 * 技能结束积木
 * - 立即结束：ctx.finishSkill(status)
 * - 可选延迟：若 delayFrames > 0，调度特殊函数名 "__skill_finish__" 由执行器拦截
 */
export function createFinishSkillBlock() {
  Blocks[BLOCK_ID] = {
    init: function () {
      this.appendDummyInput().appendField("技能结束");
      this.appendDummyInput()
        .appendField("状态")
        .appendField(
          new FieldDropdown([
            ["成功", "success"],
            ["失败", "failure"],
          ]),
          "status",
        );
      this.appendValueInput("delay")
        .setCheck("Number")
        .appendField("延迟帧数(可选)");

      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(210);
      this.setTooltip("结束当前技能逻辑，可选延迟；延迟>0时将调度结束事件");
      this.setHelpUrl("");
    },
  };

  javascriptGenerator.forBlock[BLOCK_ID] = function (block, generator) {
    const status = block.getFieldValue("status") || "success";
    const delayCode = generator.valueToCode(block, "delay", Order.NONE) || "0";
    const code = `(function(){const d=${delayCode}; if(d>0){ctx.scheduleFunction(d,"__skill_finish__", { status: "${status}" }, "finish_skill");} else {ctx.finishSkill("${status}");}})();\n`;
    return code;
  };

  return BLOCK_ID;
}


