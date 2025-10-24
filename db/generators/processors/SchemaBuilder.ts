/**
 * @file SchemaBuilder.ts
 * @description Schema 构建器
 * 负责构建完整的 Prisma schema
 * @version 1.0.0
 */

import { LogUtils } from "../utils/common.js";
import { EnumProcessor } from "./EnumProcessor.js";

/**
 * Schema 构建器类
 * 负责构建完整的 Prisma schema，包括枚举定义注入
 */
export class SchemaBuilder {
  private enumProcessor: EnumProcessor;

  constructor(enumProcessor: EnumProcessor) {
    this.enumProcessor = enumProcessor;
  }

  /**
   * 构建完整的 Prisma schema
   * @returns 完整的 Prisma schema 字符串
   */
  build(): string {
    // 处理枚举并替换字段类型
    const updatedSchema = this.enumProcessor.processSchema();
    
    // 获取枚举定义
    const enumDefinitions = this.enumProcessor.getEnumDefinitions();
    
    // 生成最终的完整 schema
    const finalSchema = updatedSchema + "\n" + Array.from(enumDefinitions.values()).join("\n\n");
    
    LogUtils.logSuccess("Schema 构建完成");
    
    return finalSchema;
  }
}
