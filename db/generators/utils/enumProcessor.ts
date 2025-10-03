/**
 * @file enumProcessor.ts
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
  private extractedEnums: Map<string, string[]>;
  private enumModels: Map<string, any>;
  private enumDefinitions: Map<string, string>;
  private enumTypeToNameMap: Map<string, string>; // 存储枚举类型名到枚举名的映射

  constructor() {
    this.extractedEnums = new Map();
    this.enumModels = new Map();
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
      
      LogUtils.logSuccess(`成功解析 ${this.extractedEnums.size} 个枚举（使用模块导入方式）`);
      
      return this;
    } catch (error) {
      LogUtils.logError("枚举处理失败", error as Error);
      throw error;
    }
  }

  /**
   * 处理 Schema
   * 将枚举定义注入到 Prisma schema 中
   * @returns 处理结果
   */
  processSchema(): { updatedSchema: string; kyselyGenerator: string; clientGenerators: string[] } {
    const baseSchema = FileUtils.safeReadFile(PATHS.baseSchema);
    
    // 生成枚举定义
    const enumDefinitions = this.generateEnumDefinitions();
    
    // 生成 Kysely generator 配置
    const kyselyGenerator = this.generateKyselyGenerator();
    
    // 生成客户端 generators 配置
    const clientGenerators = this.generateClientGenerators();
    
    return {
      updatedSchema: baseSchema,
      kyselyGenerator,
      clientGenerators,
    };
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
   * 生成 Kysely generator 配置
   * @returns Kysely generator 配置
   */
  generateKyselyGenerator(): string {
    return `generator kysely {
    provider     = "prisma-kysely"
    output       = "../generated/kysely"
    fileName     = "kysely.ts"
    enumFileName = "enums.ts"
}`;
  }

  /**
   * 生成客户端 generators 配置
   * @returns 客户端 generators 配置数组
   */
  generateClientGenerators(): string[] {
    return [
      `generator client {
    provider        = "prisma-client-js"
    previewFeatures = ["relationJoins", "fullTextSearchPostgres"]
}`,
      `generator zod {
  provider = "prisma-zod-generator"
  output = "../generated/zod"
}`,
    ];
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
