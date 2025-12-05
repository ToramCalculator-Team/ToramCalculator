/**
 * 游戏引擎属性块定义 - 基于 Schema 的动态生成系统
 * 
 * 核心功能：
 * 1. 根据 Schema 自动生成属性访问积木
 * 2. 提供 DSL 风格的属性修改积木
 * 3. 生成安全的 JS 代码而不是直接暴露 JS 语法
 * 4. 支持嵌套属性路径（如 hp.current, atk.physical）
 */

import { Blocks, FieldDropdown, FieldNumber, FieldTextInput } from "blockly/core";
import { javascriptGenerator, Order } from "blockly/javascript";
import type { NestedSchema, SchemaAttribute } from "../simulator/core/Member/runtime/StatContainer/SchemaTypes";

// ============================== 类型定义 ==============================

import { ModifierType } from "../simulator/core/Member/runtime/StatContainer/StatContainer";

/**
 * 积木类型枚举
 */
enum BlockType {
  ATTRIBUTE_GET = "attribute_get",           // 属性获取
  ATTRIBUTE_SET = "attribute_set",           // 属性设置
  ATTRIBUTE_MODIFY = "attribute_modify",     // 属性修改
  CONDITION_CHECK = "condition_check",       // 条件检查
  COMPARISON = "comparison",                 // 比较操作
  MATH_OPERATION = "math_operation",         // 数学运算
}

// ============================== Schema 驱动的积木生成器 ==============================

/**
 * 从 Schema 生成积木定义
 */
class SchemaBlockGenerator {
  private selfSchema: NestedSchema; // 自身属性 schema
  private targetSchema: NestedSchema; // 通用目标属性 schema
  private blockDefinitions: Map<string, any> = new Map();

  constructor(selfSchema: NestedSchema, targetSchema: NestedSchema) {
    this.selfSchema = selfSchema;
    this.targetSchema = targetSchema;
    this.generateBlocks();
  }

  /**
   * 生成所有积木定义
   */
  private generateBlocks(): void {
    this.generateAttributeBlocks();
    this.generateTargetAttributeGetBlocks();
    this.generateSelfAttributeGetBlocks();
    this.generateTargetAttributePercentageBlocks();
    this.generateTargetAttributeFixedBlocks();
    this.generateSelfAttributePercentageBlocks();
    this.generateSelfAttributeFixedBlocks();
    this.generateConditionBlocks();
    this.generateMathBlocks();
  }

  /**
   * 生成属性访问积木
   */
  private generateAttributeBlocks(): void {
    const selfFlattenedPaths = this.flattenSchemaPathsWithDisplayNames(this.selfSchema);
    const targetFlattenedPaths = this.flattenSchemaPathsWithDisplayNames(this.targetSchema);
    
    // 生成自身属性获取积木
    this.generateAttributeGetBlock("self", selfFlattenedPaths, 230);
    
    // 生成目标属性获取积木
    this.generateAttributeGetBlock("target", targetFlattenedPaths, 120);
    
    // 生成自身属性设置积木
    this.generateAttributeSetBlock("self", selfFlattenedPaths, 230);
    
    // 生成目标属性设置积木
    this.generateAttributeSetBlock("target", targetFlattenedPaths, 120);
  }

  /**
   * 生成属性获取积木
   */
  private generateAttributeGetBlock(accessor: "self" | "target", paths: Array<{path: string, displayName: string}>, color: number): void {
    const blockId = `${accessor}_attribute_get`;
    

    
    Blocks[blockId] = {
      init: function() {
        this.appendDummyInput()
            .appendField(accessor === "self" ? "自己" : "目标")
            .appendField(".")
            .appendField(new FieldDropdown(() => 
              paths.map(item => [item.displayName, item.path])
            ), "ATTRIBUTE_PATH");
        this.setOutput(true, "Number");
        this.setColour(color);
        this.setTooltip(`获取${accessor === "self" ? "自己" : "目标"}的指定属性值`);
        this.setHelpUrl("");
      }
    };

    // 生成对应的 JS 代码
    javascriptGenerator.forBlock[blockId] = function(block, generator) {
      const attributePath = block.getFieldValue('ATTRIBUTE_PATH');
      const code = `${accessor}.statContainer.getValue("${attributePath}")`;
      return [code, Order.MEMBER];
    };

    this.blockDefinitions.set(blockId, Blocks[blockId]);
  }

  /**
   * 生成属性设置积木
   */
  private generateAttributeSetBlock(accessor: "self" | "target", paths: Array<{path: string, displayName: string}>, color: number): void {
    const blockId = `${accessor}_attribute_fixed`;
    

    
    Blocks[blockId] = {
      init: function() {
        this.appendValueInput("VALUE")
            .setCheck("Number");
        this.appendDummyInput()
            .appendField("设置")
            .appendField(accessor === "self" ? "自己" : "目标")
            .appendField(".")
            .appendField(new FieldDropdown(() => 
              paths.map(item => [item.displayName, item.path])
            ), "ATTRIBUTE_PATH")
            .appendField("为");
        this.setInputsInline(true);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(color);
        this.setTooltip(`设置${accessor === "self" ? "自己" : "目标"}的指定属性值`);
        this.setHelpUrl("");
      }
    };

    // 生成对应的 JS 代码
    javascriptGenerator.forBlock[blockId] = function(block, generator) {
      const attributePath = block.getFieldValue('ATTRIBUTE_PATH');
      const value = generator.valueToCode(block, 'VALUE', Order.ASSIGNMENT) || '0';
      // 使用 addModifier 的 DYNAMIC_FIXED 类型来设置固定值
      return `${accessor}.statContainer.addModifier("${attributePath}", ModifierType.DYNAMIC_FIXED, ${value}, { id: "blockly_set", name: "积木设置", type: "system" });\n`;
    };

    this.blockDefinitions.set(blockId, Blocks[blockId]);
  }

  /**
   * 生成目标属性读取积木
   */
  private generateTargetAttributeGetBlocks(): void {
    const blockId = "target_attribute_get";
    const flattenedPaths = this.flattenSchemaPathsWithDisplayNames(this.targetSchema);
    
    Blocks[blockId] = {
      init: function() {
        this.appendDummyInput()
            .appendField("目标的")
            .appendField(new FieldDropdown(() => 
              flattenedPaths.map(item => [item.displayName, item.path])
            ), "ATTRIBUTE_PATH");
        this.setOutput(true, "Number");
        this.setColour(160);
        this.setTooltip("读取目标属性值");
        this.setHelpUrl("");
      }
    };

    javascriptGenerator.forBlock[blockId] = function(block, generator) {
      const attributePath = block.getFieldValue('ATTRIBUTE_PATH');
      return [`target.statContainer.getValue("${attributePath}")`, Order.ATOMIC];
    };

    this.blockDefinitions.set(blockId, Blocks[blockId]);
  }

  /**
   * 生成自身属性读取积木
   */
  private generateSelfAttributeGetBlocks(): void {
    const blockId = "self_attribute_get";
    const flattenedPaths = this.flattenSchemaPathsWithDisplayNames(this.selfSchema);
    
    Blocks[blockId] = {
      init: function() {
        this.appendDummyInput()
            .appendField("自己的")
            .appendField(new FieldDropdown(() => 
              flattenedPaths.map(item => [item.displayName, item.path])
            ), "ATTRIBUTE_PATH");
        this.setOutput(true, "Number");
        this.setColour(160);
        this.setTooltip("读取自身属性值");
        this.setHelpUrl("");
      }
    };

    javascriptGenerator.forBlock[blockId] = function(block, generator) {
      const attributePath = block.getFieldValue('ATTRIBUTE_PATH');
      return [`self.statContainer.getValue("${attributePath}")`, Order.ATOMIC];
    };

    this.blockDefinitions.set(blockId, Blocks[blockId]);
  }

  /**
   * 生成目标属性百分比修改积木
   */
  private generateTargetAttributePercentageBlocks(): void {
    const blockId = "target_attribute_percentage";
    const flattenedPaths = this.flattenSchemaPathsWithDisplayNames(this.targetSchema);
    
    Blocks[blockId] = {
      init: function() {
        this.appendDummyInput()
            .appendField("目标的")
            .appendField(new FieldDropdown(() => 
              flattenedPaths.map(item => [item.displayName, item.path])
            ), "ATTRIBUTE_PATH")
            .appendField(new FieldDropdown(() => [
              ["增加", "ADD"],
              ["减少", "SUBTRACT"],
              ["设为", "SET"]
            ]), "OPERATION");
        this.appendValueInput("VALUE")
            .setCheck("Number")
            .appendField("%");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(160);
        this.setTooltip("修改目标属性的百分比值");
        this.setHelpUrl("");
      }
    };

    javascriptGenerator.forBlock[blockId] = function(block, generator) {
      const attributePath = block.getFieldValue('ATTRIBUTE_PATH');
      const operation = block.getFieldValue('OPERATION');
      const value = generator.valueToCode(block, 'VALUE', Order.ATOMIC) || '0';
      
      let code = "";
      switch (operation) {
        case "SET":
          // 使用 BASE_VALUE 类型来设置值
          code = `target.statContainer.addModifier("${attributePath}", ${ModifierType.BASE_VALUE}, ${value}, { id: "blockly_set", name: "积木设置", type: "system" });`;
          break;
        case "ADD":
          // 使用 DYNAMIC_PERCENTAGE 类型来增加百分比
          code = `target.statContainer.addModifier("${attributePath}", ${ModifierType.DYNAMIC_PERCENTAGE}, ${value}, { id: "blockly_add", name: "积木增加", type: "system" });`;
          break;
        case "SUBTRACT":
          // 使用 DYNAMIC_PERCENTAGE 类型来减少百分比（负值）
          code = `target.statContainer.addModifier("${attributePath}", ${ModifierType.DYNAMIC_PERCENTAGE}, -${value}, { id: "blockly_subtract", name: "积木减少", type: "system" });`;
          break;
        default:
          code = `// 未知操作: ${operation}`;
      }
      
      return code + "\n";
    };

    this.blockDefinitions.set(blockId, Blocks[blockId]);
  }

  /**
   * 生成目标属性固定值修改积木
   */
  private generateTargetAttributeFixedBlocks(): void {
    const blockId = "target_attribute_fixed";
    const flattenedPaths = this.flattenSchemaPathsWithDisplayNames(this.targetSchema);
    
    Blocks[blockId] = {
      init: function() {
        this.appendDummyInput()
            .appendField("目标的")
            .appendField(new FieldDropdown(() => 
              flattenedPaths.map(item => [item.displayName, item.path])
            ), "ATTRIBUTE_PATH")
            .appendField(new FieldDropdown(() => [
              ["增加", "ADD"],
              ["减少", "SUBTRACT"],
              ["设为", "SET"]
            ]), "OPERATION");
        this.appendValueInput("VALUE")
            .setCheck("Number");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(160);
        this.setTooltip("修改目标属性的固定值");
        this.setHelpUrl("");
      }
    };

    javascriptGenerator.forBlock[blockId] = function(block, generator) {
      const attributePath = block.getFieldValue('ATTRIBUTE_PATH');
      const operation = block.getFieldValue('OPERATION');
      const value = generator.valueToCode(block, 'VALUE', Order.ATOMIC) || '0';
      
      let code = "";
      switch (operation) {
        case "SET":
          // 使用 BASE_VALUE 类型来设置值
          code = `target.statContainer.addModifier("${attributePath}", ${ModifierType.BASE_VALUE}, ${value}, { id: "blockly_set", name: "积木设置", type: "system" });`;
          break;
        case "ADD":
          // 使用 DYNAMIC_FIXED 类型来增加固定值
          code = `target.statContainer.addModifier("${attributePath}", ${ModifierType.DYNAMIC_FIXED}, ${value}, { id: "blockly_add", name: "积木增加", type: "system" });`;
          break;
        case "SUBTRACT":
          // 使用 DYNAMIC_FIXED 类型来减少固定值（负值）
          code = `target.statContainer.addModifier("${attributePath}", ${ModifierType.DYNAMIC_FIXED}, -${value}, { id: "blockly_subtract", name: "积木减少", type: "system" });`;
          break;
        default:
          code = `// 未知操作: ${operation}`;
      }
      
      return code + "\n";
    };

    this.blockDefinitions.set(blockId, Blocks[blockId]);
  }

  /**
   * 生成自身属性百分比修改积木
   */
  private generateSelfAttributePercentageBlocks(): void {
    const blockId = "self_attribute_percentage";
    const flattenedPaths = this.flattenSchemaPathsWithDisplayNames(this.selfSchema);
    
    Blocks[blockId] = {
      init: function() {
        this.appendDummyInput()
            .appendField("自己的")
            .appendField(new FieldDropdown(() => 
              flattenedPaths.map(item => [item.displayName, item.path])
            ), "ATTRIBUTE_PATH")
            .appendField(new FieldDropdown(() => [
              ["增加", "ADD"],
              ["减少", "SUBTRACT"],
              ["设为", "SET"]
            ]), "OPERATION");
        this.appendValueInput("VALUE")
            .setCheck("Number")
            .appendField("%");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(160);
        this.setTooltip("修改自身属性的百分比值");
        this.setHelpUrl("");
      }
    };

    javascriptGenerator.forBlock[blockId] = function(block, generator) {
      const attributePath = block.getFieldValue('ATTRIBUTE_PATH');
      const operation = block.getFieldValue('OPERATION');
      const value = generator.valueToCode(block, 'VALUE', Order.ATOMIC) || '0';
      
      let code = "";
      switch (operation) {
        case "SET":
          // 使用 BASE_VALUE 类型来设置值
          code = `self.statContainer.addModifier("${attributePath}", ${ModifierType.BASE_VALUE}, ${value}, { id: "blockly_set", name: "积木设置", type: "system" });`;
          break;
        case "ADD":
          // 使用 DYNAMIC_PERCENTAGE 类型来增加百分比
          code = `self.statContainer.addModifier("${attributePath}", ${ModifierType.DYNAMIC_PERCENTAGE}, ${value}, { id: "blockly_add", name: "积木增加", type: "system" });`;
          break;
        case "SUBTRACT":
          // 使用 DYNAMIC_PERCENTAGE 类型来减少百分比（负值）
          code = `self.statContainer.addModifier("${attributePath}", ${ModifierType.DYNAMIC_PERCENTAGE}, -${value}, { id: "blockly_subtract", name: "积木减少", type: "system" });`;
          break;
        default:
          code = `// 未知操作: ${operation}`;
      }
      
      return code + "\n";
    };

    this.blockDefinitions.set(blockId, Blocks[blockId]);
  }

  /**
   * 生成自身属性固定值修改积木
   */
  private generateSelfAttributeFixedBlocks(): void {
    const blockId = "self_attribute_fixed";
    const flattenedPaths = this.flattenSchemaPathsWithDisplayNames(this.selfSchema);
    
    Blocks[blockId] = {
      init: function() {
        this.appendDummyInput()
            .appendField("自己的")
            .appendField(new FieldDropdown(() => 
              flattenedPaths.map(item => [item.displayName, item.path])
            ), "ATTRIBUTE_PATH")
            .appendField(new FieldDropdown(() => [
              ["增加", "ADD"],
              ["减少", "SUBTRACT"],
              ["设为", "SET"]
            ]), "OPERATION");
        this.appendValueInput("VALUE")
            .setCheck("Number");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(160);
        this.setTooltip("修改自身属性的固定值");
        this.setHelpUrl("");
      }
    };

    javascriptGenerator.forBlock[blockId] = function(block, generator) {
      const attributePath = block.getFieldValue('ATTRIBUTE_PATH');
      const operation = block.getFieldValue('OPERATION');
      const value = generator.valueToCode(block, 'VALUE', Order.ATOMIC) || '0';
      
      let code = "";
      switch (operation) {
        case "SET":
          // 使用 BASE_VALUE 类型来设置值
          code = `self.statContainer.addModifier("${attributePath}", ${ModifierType.BASE_VALUE}, ${value}, { id: "blockly_set", name: "积木设置", type: "system" });`;
          break;
        case "ADD":
          // 使用 DYNAMIC_FIXED 类型来增加固定值
          code = `self.statContainer.addModifier("${attributePath}", ${ModifierType.DYNAMIC_FIXED}, ${value}, { id: "blockly_add", name: "积木增加", type: "system" });`;
          break;
        case "SUBTRACT":
          // 使用 DYNAMIC_FIXED 类型来减少固定值（负值）
          code = `self.statContainer.addModifier("${attributePath}", ${ModifierType.DYNAMIC_FIXED}, -${value}, { id: "blockly_subtract", name: "积木减少", type: "system" });`;
          break;
        default:
          code = `// 未知操作: ${operation}`;
      }
      
      return code + "\n";
    };

    this.blockDefinitions.set(blockId, Blocks[blockId]);
  }

  /**
   * 生成条件检查积木
   */
  private generateConditionBlocks(): void {
    // 条件检查积木
    const blockId = "condition_check";
    
    Blocks[blockId] = {
      init: function() {
        this.appendValueInput("LEFT")
            .setCheck("Number")
            .appendField("当");
        this.appendDummyInput()
            .appendField(new FieldDropdown(() => [
              ["等于", "=="],
              ["不等于", "!="],
              ["大于", ">"],
              ["小于", "<"],
              ["大于等于", ">="],
              ["小于等于", "<="]
            ]), "COMPARISON");
        this.appendValueInput("RIGHT")
            .setCheck("Number")
            .appendField("时");
        this.setOutput(true, "Boolean");
        this.setColour(210);
        this.setTooltip("条件检查");
        this.setHelpUrl("");
      }
    };

    javascriptGenerator.forBlock[blockId] = function(block, generator) {
      const left = generator.valueToCode(block, 'LEFT', Order.RELATIONAL) || '0';
      const comparison = block.getFieldValue('COMPARISON');
      const right = generator.valueToCode(block, 'RIGHT', Order.RELATIONAL) || '0';
      const code = `${left} ${comparison} ${right}`;
      return [code, Order.RELATIONAL];
    };

    this.blockDefinitions.set(blockId, Blocks[blockId]);
  }

  /**
   * 生成数学运算积木
   */
  private generateMathBlocks(): void {
    // 数学运算积木
    const blockId = "math_operation";
    
    Blocks[blockId] = {
      init: function() {
        this.appendValueInput("LEFT")
            .setCheck("Number");
        this.appendDummyInput()
            .appendField(new FieldDropdown(() => [
              ["+", "+"],
              ["-", "-"],
              ["×", "*"],
              ["÷", "/"],
              ["^", "**"],
              ["%", "%"]
            ]), "OPERATION");
        this.appendValueInput("RIGHT")
            .setCheck("Number");
        this.setOutput(true, "Number");
        this.setColour(230);
        this.setTooltip("数学运算");
        this.setHelpUrl("");
      }
    };

    javascriptGenerator.forBlock[blockId] = function(block, generator) {
      const left = generator.valueToCode(block, 'LEFT', Order.ATOMIC) || '0';
      const operation = block.getFieldValue('OPERATION');
      const right = generator.valueToCode(block, 'RIGHT', Order.ATOMIC) || '0';
      const code = `${left} ${operation} ${right}`;
              return [code, Order.ATOMIC];
    };

    this.blockDefinitions.set(blockId, Blocks[blockId]);
  }

  /**
   * 扁平化 Schema 路径（带显示名称）
   */
  private flattenSchemaPathsWithDisplayNames(schema: NestedSchema, prefix: string = ""): Array<{path: string, displayName: string}> {
    const paths: Array<{path: string, displayName: string}> = [];
    
    for (const [key, value] of Object.entries(schema)) {
      const currentPath = prefix ? `${prefix}.${key}` : key;
      
      if (this.isSchemaAttribute(value)) {
        paths.push({
          path: currentPath,
          displayName: value.displayName
        });
      } else if (typeof value === "object" && value !== null) {
        paths.push(...this.flattenSchemaPathsWithDisplayNames(value, currentPath));
      }
    }
    
    return paths;
  }

  /**
   * 扁平化 Schema 路径（向后兼容）
   */
  private flattenSchemaPaths(schema: NestedSchema, prefix: string = ""): string[] {
    const paths: string[] = [];
    
    for (const [key, value] of Object.entries(schema)) {
      const currentPath = prefix ? `${prefix}.${key}` : key;
      
      if (this.isSchemaAttribute(value)) {
        paths.push(currentPath);
      } else if (typeof value === "object" && value !== null) {
        paths.push(...this.flattenSchemaPaths(value, currentPath));
      }
    }
    
    return paths;
  }

  /**
   * 检查是否为 SchemaAttribute
   */
  private isSchemaAttribute(obj: any): obj is SchemaAttribute {
    return obj && typeof obj === "object" && typeof obj.displayName === "string" && typeof obj.expression === "string";
  }

  /**
   * 获取所有生成的积木定义
   */
  getBlockDefinitions(): Map<string, any> {
    return this.blockDefinitions;
  }

  /**
   * 获取积木 ID 列表
   */
  getBlockIds(): string[] {
    return Array.from(this.blockDefinitions.keys());
  }
}

// ============================== 默认积木定义（确保基本积木可用） ==============================



// ============================== 传统积木定义（向后兼容） ==============================

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
  const code = 'target.statContainer.getValue("hp")';
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
  // 使用 addModifier 的 BASE_VALUE 类型来设置值
  return `target.statContainer.addModifier("hp", ${ModifierType.BASE_VALUE}, ${value}, { id: "blockly_set", name: "积木设置", type: "system" });\n`;
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
  const code = 'self.statContainer.getValue("atk")';
  return [code, Order.MEMBER];
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
  const code = 'self.statContainer.getValue("mp")';
  return [code, Order.MEMBER];
};

// ============================== 导出 ==============================

export {
  SchemaBlockGenerator,
  ModifierType,
  BlockType,
  // 导出所有自定义块，确保它们被注册
};