import { Blocks, FieldTextInput } from "blockly/core";
import { javascriptGenerator } from "blockly/javascript";

/**
 * 参数与引用（Inputs / Refs）积木
 * - 全部输出 String（表达式字符串），供 bt_check / bt_case 使用
 * - 不生成 JS，仅作为结构化数据编译的输入源
 */
export const registerInputsRefsBlocks = () => {
  const ids: string[] = [];

  // 通用表达式（单行字符串）
  ids.push(
    createValueBlock("expr_string", {
      init() {
        this.appendDummyInput().appendField("表达式").appendField(new FieldTextInput("true"), "EXPR");
        this.setOutput(true, "String");
        this.setColour(120);
        this.setTooltip("输入一段表达式字符串（交给引擎表达式执行器解析）");
      },
    }),
  );

  // HasBuff 表达式：输出 self.buffManager.hasBuff("xxx")
  ids.push(
    createValueBlock("expr_hasBuff", {
      init() {
        this.appendDummyInput().appendField("存在Buff");
        this.appendDummyInput().appendField("buffId").appendField(new FieldTextInput("buff_id"), "BUFF_ID");
        this.setOutput(true, "String");
        this.setColour(120);
        this.setTooltip('输出表达式：self.buffManager.hasBuff("buffId")');
      },
    }),
  );

  return ids;
};

type BlockSpec = {
  init: (this: any) => void;
};

const createValueBlock = (type: string, spec: BlockSpec): string => {
  Blocks[type] = {
    init: spec.init,
  };
  // 运行时编译器不会用到 JS 生成器，这里仅保留空实现以防 Blockly 报错。
  javascriptGenerator.forBlock[type] = function () {
    return "";
  };
  return type;
};


