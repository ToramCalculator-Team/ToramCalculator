/**
 * @file EnumProcessor.ts
 * @description 枚举处理器
 * 负责处理 Prisma schema 中的枚举定义和映射
 * @version 2.0.0
 */

import { createRequire } from "module";
import { StringUtils, FileUtils, LogUtils } from "../utils/common.js";
import { PATHS } from "../config/generator.config.js";

const require = createRequire(import.meta.url);

/**
 * 枚举处理器类
 * 负责解析 enums.ts 文件，处理 schema 中的枚举字段，建立类型映射
 */
export class EnumProcessor {
  private extractedEnums: Map<string, string[]>;
  private enumDefinitions: Map<string, string>;
  private enumTypeToNameMap: Map<string, string>; // 存储枚举类型名到枚举名的映射

  constructor() {
    this.extractedEnums = new Map();
    this.enumDefinitions = new Map();
    this.enumTypeToNameMap = new Map();
  }

  /**
   * 处理枚举定义
   * 从 enums.ts 文件中提取所有枚举值
   * @returns 当前实例，支持链式调用
   */
  processEnums(): this {
    try {
      LogUtils.logStep("枚举处理", "解析 enums.ts 文件");
      
      // 直接导入 enums.ts 模块，让 JS 引擎处理所有展开操作符
      const enumsModule = require(PATHS.enums);
      
      // 处理所有导出的枚举
      for (const [key, value] of Object.entries(enumsModule)) {
        // 跳过类型定义（以 Type 结尾的）
        if (key.endsWith('Type')) {
          continue;
        }
        
        const enumName = StringUtils.toPascalCase(key);
        
        if (Array.isArray(value)) {
          this.extractedEnums.set(enumName, value);
          this.enumTypeToNameMap.set(`${enumName}Type`, enumName);
        }
      }
      
      LogUtils.logSuccess(`成功解析 ${this.extractedEnums.size} 个枚举`);
      
      return this;
    } catch (error) {
      LogUtils.logError("枚举处理失败", error as Error);
      throw error;
    }
  }

  /**
   * 处理 Schema
   * 将枚举定义注入到 Prisma schema 中，并替换字段类型
   * @returns 处理后的 Schema 内容
   */
  processSchema(): string {
    LogUtils.logStep("Schema 处理", "注入枚举定义并替换字段类型");
    
    const baseSchema = FileUtils.safeReadFile(PATHS.baseSchema);
    
    // 生成枚举定义并存储到实例变量中
    this.enumDefinitions = this.generateEnumDefinitions();
    
    // 处理 Schema 内容，替换枚举字段类型
    const updatedSchema = this.replaceEnumFieldTypes(baseSchema);
    
    LogUtils.logSuccess("Schema 处理完成");
    
    return updatedSchema;
  }

  /**
   * 替换 Schema 中的枚举字段类型
   * @param schemaContent - Schema 内容
   * @returns 处理后的 Schema 内容
   */
  replaceEnumFieldTypes(schemaContent: string): string {
    const lines = schemaContent.split('\n');
    let updatedSchema = '';
    let currentModel = '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // 处理模型定义
      const modelMatch = trimmed.match(/^model (\w+) \{$/);
      if (modelMatch) {
        currentModel = modelMatch[1];
        updatedSchema += line + '\n';
        continue;
      }
      
      // 处理模型结束
      if (trimmed === '}') {
        currentModel = '';
        updatedSchema += line + '\n';
        continue;
      }
      
      // 处理枚举字段
      let newLine = line;
      const enumMatch = line.match(/(\w+)\s+\w+\s+\/\/ Enum (\w+)/);
      if (enumMatch && currentModel) {
        const [, fieldName, originalEnumName] = enumMatch;
        const pascalCaseEnum = StringUtils.toPascalCase(originalEnumName);
        
        if (this.extractedEnums.has(pascalCaseEnum)) {
          newLine = line.replace('String', pascalCaseEnum);
          
          // 建立枚举类型名到枚举名的映射
          this.enumTypeToNameMap.set(originalEnumName, pascalCaseEnum);
        }
      }
      
      updatedSchema += newLine + '\n';
    }
    
    return updatedSchema;
  }

  /**
   * 生成枚举定义
   * @returns 枚举定义映射
   */
  generateEnumDefinitions(): Map<string, string> {
    const enumDefinitions = new Map();
    
    for (const [enumName, values] of this.extractedEnums) {
      const enumDefinition = `enum ${enumName} {
  ${values.map(value => `  ${value}`).join('\n')}
}`;
      enumDefinitions.set(enumName, enumDefinition);
    }
    
    return enumDefinitions;
  }

  /**
   * 获取提取的枚举
   * @returns 枚举映射
   */
  getExtractedEnums(): Map<string, string[]> {
    return this.extractedEnums;
  }

  /**
   * 获取枚举定义
   * @returns 枚举定义映射
   */
  getEnumDefinitions(): Map<string, string> {
    return this.enumDefinitions;
  }

  /**
   * 获取枚举类型到名称的映射
   * @returns 枚举类型映射
   */
  getEnumTypeToNameMap(): Map<string, string> {
    return this.enumTypeToNameMap;
  }
}
