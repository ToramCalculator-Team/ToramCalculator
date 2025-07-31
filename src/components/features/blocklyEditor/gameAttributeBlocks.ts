/**
 * 游戏引擎属性块定义
 * 定义目标属性和自身属性的自定义变量块
 */

import { Block, Blocks, FieldNumber, FieldTextInput, FieldVariable } from "blockly/core";
import { javascriptGenerator, Order } from "blockly/javascript";

// 目标HP变量获取块
Blocks['target_hp_get'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("目标HP");
    this.setOutput(true, "Number");
    this.setColour(120);
    this.setTooltip("获取目标的HP值");
    this.setHelpUrl("");
  }
};

javascriptGenerator.forBlock['target_hp_get'] = function(block, generator) {
  const code = 'target.hp';
  return [code, Order.MEMBER];
};

// 目标HP变量设置块
Blocks['target_hp_set'] = {
  init: function() {
    this.appendValueInput("VALUE")
        .setCheck("Number")
        .appendField("设置目标HP为");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(120);
    this.setTooltip("设置目标的HP值");
    this.setHelpUrl("");
  }
};

javascriptGenerator.forBlock['target_hp_set'] = function(block, generator) {
  const value = generator.valueToCode(block, 'VALUE', Order.ASSIGNMENT) || '0';
  return `target.hp = ${value};\n`;
};

// 目标防御力变量获取块
Blocks['target_defense_get'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("目标防御力");
    this.setOutput(true, "Number");
    this.setColour(120);
    this.setTooltip("获取目标的防御力值");
    this.setHelpUrl("");
  }
};

javascriptGenerator.forBlock['target_defense_get'] = function(block, generator) {
  const code = 'target.defense';
  return [code, Order.MEMBER];
};

// 目标防御力变量设置块
Blocks['target_defense_set'] = {
  init: function() {
    this.appendValueInput("VALUE")
        .setCheck("Number")
        .appendField("设置目标防御力为");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(120);
    this.setTooltip("设置目标的防御力值");
    this.setHelpUrl("");
  }
};

javascriptGenerator.forBlock['target_defense_set'] = function(block, generator) {
  const value = generator.valueToCode(block, 'VALUE', Order.ASSIGNMENT) || '0';
  return `target.defense = ${value};\n`;
};

// 自己攻击力变量获取块
Blocks['self_attack_get'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("自己攻击力");
    this.setOutput(true, "Number");
    this.setColour(230);
    this.setTooltip("获取自己的攻击力值");
    this.setHelpUrl("");
  }
};

javascriptGenerator.forBlock['self_attack_get'] = function(block, generator) {
  const code = 'self.attack';
  return [code, Order.MEMBER];
};

// 自己攻击力变量设置块
Blocks['self_attack_set'] = {
  init: function() {
    this.appendValueInput("VALUE")
        .setCheck("Number")
        .appendField("设置自己攻击力为");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(230);
    this.setTooltip("设置自己的攻击力值");
    this.setHelpUrl("");
  }
};

javascriptGenerator.forBlock['self_attack_set'] = function(block, generator) {
  const value = generator.valueToCode(block, 'VALUE', Order.ASSIGNMENT) || '0';
  return `self.attack = ${value};\n`;
};

// 自己MP变量获取块
Blocks['self_mp_get'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("自己MP");
    this.setOutput(true, "Number");
    this.setColour(230);
    this.setTooltip("获取自己的MP值");
    this.setHelpUrl("");
  }
};

javascriptGenerator.forBlock['self_mp_get'] = function(block, generator) {
  const code = 'self.mp';
  return [code, Order.MEMBER];
};

// 自己MP变量设置块
Blocks['self_mp_set'] = {
  init: function() {
    this.appendValueInput("VALUE")
        .setCheck("Number")
        .appendField("设置自己MP为");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(230);
    this.setTooltip("设置自己的MP值");
    this.setHelpUrl("");
  }
};

javascriptGenerator.forBlock['self_mp_set'] = function(block, generator) {
  const value = generator.valueToCode(block, 'VALUE', Order.ASSIGNMENT) || '0';
  return `self.mp = ${value};\n`;
};

// 目标属性获取块（动态）
Blocks['target_attribute'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("目标.")
        .appendField(new FieldTextInput("hp"), "ATTRIBUTE_NAME");
    this.setOutput(true, "Number");
    this.setColour(120);
    this.setTooltip("获取目标的指定属性值");
    this.setHelpUrl("");
  }
};

javascriptGenerator.forBlock['target_attribute'] = function(block, generator) {
  const attributeName = block.getFieldValue('ATTRIBUTE_NAME');
  const code = `target.${attributeName}`;
  return [code, Order.MEMBER];
};

// 目标属性设置块（动态）
Blocks['target_attribute_set'] = {
  init: function() {
    this.appendValueInput("VALUE")
        .setCheck("Number");
    this.appendDummyInput()
        .appendField("设置目标.")
        .appendField(new FieldTextInput("hp"), "ATTRIBUTE_NAME")
        .appendField("为");
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(120);
    this.setTooltip("设置目标的指定属性值");
    this.setHelpUrl("");
  }
};

javascriptGenerator.forBlock['target_attribute_set'] = function(block, generator) {
  const attributeName = block.getFieldValue('ATTRIBUTE_NAME');
  const value = generator.valueToCode(block, 'VALUE', Order.ASSIGNMENT) || '0';
  return `target.${attributeName} = ${value};\n`;
};

// 自身属性获取块（动态）
Blocks['self_attribute'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("自己.")
        .appendField(new FieldTextInput("attack"), "ATTRIBUTE_NAME");
    this.setOutput(true, "Number");
    this.setColour(230);
    this.setTooltip("获取自己的指定属性值");
    this.setHelpUrl("");
  }
};

javascriptGenerator.forBlock['self_attribute'] = function(block, generator) {
  const attributeName = block.getFieldValue('ATTRIBUTE_NAME');
  const code = `self.${attributeName}`;
  return [code, Order.MEMBER];
};

// 自身属性设置块（动态）
Blocks['self_attribute_set'] = {
  init: function() {
    this.appendValueInput("VALUE")
        .setCheck("Number");
    this.appendDummyInput()
        .appendField("设置自己.")
        .appendField(new FieldTextInput("attack"), "ATTRIBUTE_NAME")
        .appendField("为");
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(230);
    this.setTooltip("设置自己的指定属性值");
    this.setHelpUrl("");
  }
};

javascriptGenerator.forBlock['self_attribute_set'] = function(block, generator) {
  const attributeName = block.getFieldValue('ATTRIBUTE_NAME');
  const value = generator.valueToCode(block, 'VALUE', Order.ASSIGNMENT) || '0';
  return `self.${attributeName} = ${value};\n`;
};

export {
  // 导出所有自定义块，确保它们被注册
};