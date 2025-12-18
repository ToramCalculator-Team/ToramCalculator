/**
 * Mistreevous 行为树（BT）积木定义
 * MVP 版本：rootTree, sequence, selector, repeat, retry, wait, action, condition, branch
 */

import { Blocks, FieldDropdown, FieldTextInput } from "blockly/core";
import { javascriptGenerator, Order } from "blockly/javascript";

// BT 节点连接类型
const BT_NODE_TYPE = "BT_NODE";

// ============================== Root Tree 块 ==============================

Blocks["bt_root"] = {
  init: function () {
    this.appendDummyInput()
      .appendField("行为树")
      .appendField(new FieldTextInput("skill_bt"), "NAME")
      .appendField(new FieldTextInput(""), "DESC");

    this.appendStatementInput("ROOT")
      .setCheck(BT_NODE_TYPE)
      .appendField("根节点");

    this.setColour(230);
    this.setTooltip("行为树根节点");
    this.setHelpUrl("");
    this.setMovable(false);
    this.setDeletable(false);
  },
};

javascriptGenerator.forBlock["bt_root"] = function () {
  return ""; // BT 块不生成 JS 代码
};

// ============================== Composite 节点 ==============================

Blocks["bt_sequence"] = {
  init: function () {
    this.appendDummyInput().appendField("顺序执行");
    this.appendStatementInput("CHILDREN")
      .setCheck(BT_NODE_TYPE);

    this.setPreviousStatement(true, BT_NODE_TYPE);
    this.setNextStatement(true, BT_NODE_TYPE);
    this.setColour(160);
    this.setTooltip("顺序执行所有子节点，任一失败则失败");
    this.setHelpUrl("");
  },
};

javascriptGenerator.forBlock["bt_sequence"] = function () {
  return "";
};

Blocks["bt_selector"] = {
  init: function () {
    this.appendDummyInput().appendField("选择执行");
    this.appendStatementInput("CHILDREN")
      .setCheck(BT_NODE_TYPE);

    this.setPreviousStatement(true, BT_NODE_TYPE);
    this.setNextStatement(true, BT_NODE_TYPE);
    this.setColour(160);
    this.setTooltip("依次尝试子节点，任一成功则成功");
    this.setHelpUrl("");
  },
};

javascriptGenerator.forBlock["bt_selector"] = function () {
  return "";
};

// ============================== Decorator 节点 ==============================

Blocks["bt_repeat"] = {
  init: function () {
    this.appendDummyInput()
      .appendField("重复")
      .appendField(new FieldTextInput(""), "ITERATIONS")
      .appendField("次");

    this.appendStatementInput("CHILD")
      .setCheck(BT_NODE_TYPE);

    this.setPreviousStatement(true, BT_NODE_TYPE);
    this.setNextStatement(true, BT_NODE_TYPE);
    this.setColour(210);
    this.setTooltip("重复执行子节点指定次数（留空表示无限）");
    this.setHelpUrl("");
  },
};

javascriptGenerator.forBlock["bt_repeat"] = function () {
  return "";
};

Blocks["bt_retry"] = {
  init: function () {
    this.appendDummyInput()
      .appendField("重试")
      .appendField(new FieldTextInput(""), "ATTEMPTS")
      .appendField("次");

    this.appendStatementInput("CHILD")
      .setCheck(BT_NODE_TYPE);

    this.setPreviousStatement(true, BT_NODE_TYPE);
    this.setNextStatement(true, BT_NODE_TYPE);
    this.setColour(210);
    this.setTooltip("重试子节点指定次数直到成功（留空表示无限）");
    this.setHelpUrl("");
  },
};

javascriptGenerator.forBlock["bt_retry"] = function () {
  return "";
};

// ============================== Leaf 节点 ==============================

Blocks["bt_wait"] = {
  init: function () {
    this.appendDummyInput()
      .appendField("等待")
      .appendField(new FieldTextInput(""), "DURATION")
      .appendField("毫秒");

    this.setPreviousStatement(true, BT_NODE_TYPE);
    this.setNextStatement(true, BT_NODE_TYPE);
    this.setColour(120);
    this.setTooltip("等待指定时间（留空表示无限等待）");
    this.setHelpUrl("");
  },
};

javascriptGenerator.forBlock["bt_wait"] = function () {
  return "";
};

Blocks["bt_action"] = {
  init: function () {
    this.appendValueInput("FUNCTION_CALL")
      .setCheck("MDSL_CALL")
      .appendField("执行动作");

    this.setPreviousStatement(true, BT_NODE_TYPE);
    this.setNextStatement(true, BT_NODE_TYPE);
    this.setColour(230);
    this.setTooltip("执行一个动作函数（嵌入函数调用块）");
    this.setHelpUrl("");
  },
};

javascriptGenerator.forBlock["bt_action"] = function () {
  return "";
};

Blocks["bt_condition"] = {
  init: function () {
    this.appendValueInput("FUNCTION_CALL")
      .setCheck("MDSL_CALL")
      .appendField("检查条件");

    this.setPreviousStatement(true, BT_NODE_TYPE);
    this.setNextStatement(true, BT_NODE_TYPE);
    this.setColour(210);
    this.setTooltip("检查一个条件函数（嵌入函数调用块）");
    this.setHelpUrl("");
  },
};

javascriptGenerator.forBlock["bt_condition"] = function () {
  return "";
};

Blocks["bt_branch"] = {
  init: function () {
    this.appendDummyInput()
      .appendField("分支引用")
      .appendField(new FieldTextInput("SubtreeName"), "REF");

    this.setPreviousStatement(true, BT_NODE_TYPE);
    this.setNextStatement(true, BT_NODE_TYPE);
    this.setColour(160);
    this.setTooltip("引用另一个行为树（通过名称）");
    this.setHelpUrl("");
  },
};

javascriptGenerator.forBlock["bt_branch"] = function () {
  return "";
};

