/**
 * @file enumProcessor.js
 * @description 枚举处理器
 * 负责处理 Prisma schema 中的枚举定义和映射
 * @version 1.0.0
 */

import { createRequire } from "module";
import { StringUtils, FileUtils, LogUtils } from "./common.js";
import { PATHS } from "./config.js";

const require = createRequire(import.meta.url);

/**
 * 枚举处理器类
 * 负责解析 enums.ts 文件，处理 schema 中的枚举字段，建立类型映射
 */
export class EnumProcessor {
  constructor() {
    this.extractedEnums = new Map();
    this.enumModels = new Map();
    this.enumDefinitions = new Map();
    this.enumTypeToNameMap = new Map(); // 存储枚举类型名到枚举名的映射
  }

  /**
   * 处理枚举定义
   * 从 enums.ts 文件中提取所有枚举值
   * @returns {EnumProcessor} 当前实例，支持链式调用
   */
  processEnums() {
    try {
      // 直接导入 enums.ts 模块，让 JS 引擎处理所有展开操作符
      const enumsModule = require(PATHS.enums);
      
      // LogUtils.logInfo("开始处理枚举，模块导出的键值对：");
      // for (const [key, value] of Object.entries(enumsModule)) {
      //   LogUtils.logInfo(`  - ${key}: ${Array.isArray(value) ? `[${value.join(', ')}]` : typeof value}`);
      // }
      
      // 处理所有导出的枚举
      for (const [key, value] of Object.entries(enumsModule)) {
        // 跳过类型定义（以 Type 结尾的）
        if (key.endsWith('Type')) {
          // LogUtils.logInfo(`跳过类型定义: ${key}`);
          continue;
        }
        
        const enumName = StringUtils.toPascalCase(key);
        // LogUtils.logInfo(`处理枚举: ${key} -> ${enumName}`);
        
        if (Array.isArray(value)) {
          // 直接使用数组值，JS 引擎已经处理了所有展开操作符
          this.extractedEnums.set(enumName, value);
          // LogUtils.logInfo(`  ✓ 已添加枚举: ${enumName} = [${value.join(', ')}]`);
        } else {
          // LogUtils.logInfo(`  ✗ 跳过非数组值: ${key} (${typeof value})`);
        }
      }
      
      LogUtils.logSuccess(`成功解析 ${this.extractedEnums.size} 个枚举（使用模块导入方式）`);
      // LogUtils.logInfo("提取的枚举列表：");
      // for (const [enumName, values] of this.extractedEnums) {
      //   LogUtils.logInfo(`  - ${enumName}: [${values.join(', ')}]`);
      // }
      
    } catch (error) {
      LogUtils.logError("无法导入 enums.ts 模块", error);
      throw error;
    }
    
    return this;
  }

  /**
   * 处理 schema 文件
   * 解析 baseSchema.prisma，处理枚举字段，生成临时 schema
   * @returns {Object} 处理结果
   */
  processSchema() {
    let schemaContent = FileUtils.safeReadFile(PATHS.baseSchema);
    const lines = schemaContent.split("\n");
    let updatedSchema = "";
    let currentModel = "";
    let skipGenerators = false;
    let inKyselyGenerator = false;
    let kyselyGenerator = "";
    let clientGenerators = [];
    let tempGenerator = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // 处理 generator 块
      if (trimmed.startsWith("generator ")) {
        if (trimmed.includes("kysely")) {
          inKyselyGenerator = true;
          tempGenerator = [line];
        } else {
          skipGenerators = true;
          tempGenerator = [line];
        }
        continue;
      }

      // 收集 generator 块内容
      if (inKyselyGenerator || skipGenerators) {
        tempGenerator.push(line);
        if (trimmed === "}") {
          if (inKyselyGenerator) {
            kyselyGenerator += tempGenerator.join("\n") + "\n";
            inKyselyGenerator = false;
          } else {
            clientGenerators.push(tempGenerator.join("\n"));
            skipGenerators = false;
          }
        }
        continue;
      }

      // 处理模型定义
      const modelMatch = trimmed.match(/^model (\w+) \{$/);
      if (modelMatch) {
        currentModel = modelMatch[1];
        this.enumModels.set(currentModel, new Map());
        updatedSchema += line + "\n";
        continue;
      }

      // 处理模型结束
      if (trimmed === "}") {
        currentModel = "";
        updatedSchema += line + "\n";
        continue;
      }

      // 处理枚举字段
      let newLine = line;
      const enumMatch = line.match(/(\w+)\s+\w+\s+\/\/ Enum (\w+)/);
      if (enumMatch && currentModel) {
        const [, fieldName, originalEnumName] = enumMatch;
        const pascalCaseEnum = StringUtils.toPascalCase(originalEnumName);

        // LogUtils.logInfo(`发现枚举字段: ${currentModel}.${fieldName} -> ${originalEnumName} (${pascalCaseEnum})`);

        if (this.extractedEnums.has(pascalCaseEnum)) {
          newLine = line.replace("String", pascalCaseEnum);
          // LogUtils.logInfo(`  ✓ 成功替换: ${line.trim()} -> ${newLine.trim()}`);
          
          if (!this.enumDefinitions.has(pascalCaseEnum)) {
            this.enumDefinitions.set(
              pascalCaseEnum,
              `enum ${pascalCaseEnum} {\n  ${this.extractedEnums.get(pascalCaseEnum).join("\n  ")}\n}`,
            );
            // LogUtils.logInfo(`  ✓ 添加枚举定义: ${pascalCaseEnum}`);
          }
          this.enumModels.get(currentModel).set(fieldName, originalEnumName);
          
          // 建立枚举类型名到枚举名的映射
          this.enumTypeToNameMap.set(originalEnumName, pascalCaseEnum);
        } else {
          // LogUtils.logError(`  ✗ 未找到枚举定义: ${pascalCaseEnum} (原始: ${originalEnumName})`);
          // LogUtils.logInfo(`  可用枚举: ${Array.from(this.extractedEnums.keys()).join(', ')}`);
        }
      }

      updatedSchema += newLine + "\n";
    }

    return {
      updatedSchema,
      kyselyGenerator,
      clientGenerators,
    };
  }

  /**
   * 根据枚举类型名查找对应的枚举名
   * @param {string} enumType - 枚举类型名（如 "CHARACTER_PERSONALITY_TYPE"）
   * @returns {string|null} 对应的枚举名（如 "Characterpersonalitytype"）
   */
  findEnumName(enumType) {
    // 建立枚举类型名到枚举名的映射
    const enumTypeToNameMap = new Map();
    
    // 遍历所有提取的枚举，建立映射关系
    for (const [enumName, values] of this.extractedEnums) {
      // 将枚举名转换为可能的枚举类型名
      const possibleEnumTypes = [
        enumName.toUpperCase(), // 直接转大写
        enumName.toUpperCase().replace(/TYPE$/, '_TYPE'), // 添加 _TYPE 后缀
        enumName.toUpperCase().replace(/TYPE$/, '') + '_TYPE', // 替换 TYPE 为 _TYPE
      ];
      
      for (const possibleEnumType of possibleEnumTypes) {
        enumTypeToNameMap.set(possibleEnumType, enumName);
      }
    }
    
    return enumTypeToNameMap.get(enumType) || null;
  }

  /**
   * 获取枚举映射信息
   * @returns {Map} 枚举类型名到枚举名的映射
   */
  getEnumTypeToNameMap() {
    return this.enumTypeToNameMap;
  }

  /**
   * 获取提取的枚举信息
   * @returns {Map} 提取的枚举信息
   */
  getExtractedEnums() {
    return this.extractedEnums;
  }

  /**
   * 获取枚举定义
   * @returns {Map} 枚举定义
   */
  getEnumDefinitions() {
    return this.enumDefinitions;
  }
} 