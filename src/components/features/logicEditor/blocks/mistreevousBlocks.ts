/**
 * Mistreevous MDSL 相关积木定义
 * 包括参数字面量块和函数调用块
 */

import { Blocks, FieldDropdown, FieldNumber, FieldTextInput, utils } from "blockly/core";
import { javascriptGenerator, Order } from "blockly/javascript";

// ============================== MDSL 参数字面量块 ==============================

/**
 * mdsl_literal 积木：生成 MDSL 参数（string/number/boolean/null/propertyRef）
 * 输出类型：MDSL_ARG
 */
Blocks["mdsl_literal"] = {
  init: function () {
    const typeField = new FieldDropdown([
      ["字符串", "string"],
      ["数字", "number"],
      ["布尔值", "boolean"],
      ["null", "null"],
      ["属性引用", "propertyRef"],
    ]);

    const dummyInput = this.appendDummyInput()
      .appendField("参数")
      .appendField(typeField, "TYPE");

    // 初始值输入（字符串）
    dummyInput.appendField(new FieldTextInput(""), "VALUE");

    this.setOutput(true, "MDSL_ARG");
    this.setColour(160);
    this.setTooltip("MDSL 参数字面量（字符串/数字/布尔/null/属性引用）");
    this.setHelpUrl("");

    // 根据类型更新输入字段
    const updateInput = () => {
      const type = typeField.getValue();
      const dummyInput = this.getInput("DUMMY");
      if (!dummyInput) return;

      // 移除旧的 VALUE 字段
      try {
        dummyInput.removeField("VALUE");
      } catch (e) {
        // 字段可能不存在，忽略
      }

      switch (type) {
        case "string":
          dummyInput.appendField(new FieldTextInput(""), "VALUE");
          break;
        case "number":
          dummyInput.appendField(new FieldNumber(0), "VALUE");
          break;
        case "boolean":
          dummyInput.appendField(
            new FieldDropdown([
              ["真", "true"],
              ["假", "false"],
            ]),
            "VALUE"
          );
          break;
        case "null":
          // null 不需要值输入
          break;
        case "propertyRef":
          dummyInput.appendField(new FieldTextInput("target"), "VALUE");
          break;
      }
    };

    // 监听类型变化
    typeField.setValidator((newValue) => {
      updateInput();
      return newValue;
    });
  },
};

// MDSL literal 的 JS generator（用于调试，实际生成 MDSL 时用 mdslGenerator）
javascriptGenerator.forBlock["mdsl_literal"] = function (block, generator) {
  const type = block.getFieldValue("TYPE");
  let value: any;

  switch (type) {
    case "string": {
      const strValue = block.getFieldValue("VALUE") || "";
      return [`"${strValue.replace(/"/g, '\\"')}"`, Order.ATOMIC];
    }
    case "number": {
      const numValue = parseFloat(block.getFieldValue("VALUE") || "0");
      return [String(numValue), Order.ATOMIC];
    }
    case "boolean": {
      const boolValue = block.getFieldValue("VALUE") === "true";
      return [String(boolValue), Order.ATOMIC];
    }
    case "null":
      return ["null", Order.ATOMIC];
    case "propertyRef": {
      const propName = block.getFieldValue("VALUE") || "target";
      return [`$${propName}`, Order.ATOMIC];
    }
    default:
      return ["null", Order.ATOMIC];
  }
};

