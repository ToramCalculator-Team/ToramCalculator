/**
 * Zod Schema 生成器
 * 负责生成 Zod 验证模式和所有 TypeScript 类型
 */

import { PATHS } from "../config/generator.config";
import { FileUtils, LogUtils, StringUtils } from "../utils/common";
import { EnumProcessor } from "../processors/EnumProcessor";

export class ZodGenerator {
  private dmmf: any;
  private enumProcessor: EnumProcessor;
  private allModels: any[]; // 包含所有表的完整模型列表

  constructor(dmmf: any, enumProcessor: EnumProcessor, allModels: any[] = []) {
    this.dmmf = dmmf;
    this.enumProcessor = enumProcessor;
    this.allModels = allModels.length > 0 ? allModels : dmmf.datamodel.models;
  }

  /**
   * 生成 Zod schemas
   */
  generate(): void {
    LogUtils.logInfo("生成枚举 schemas...");
    const enumSchemas = this.generateEnumSchemas();
    
    LogUtils.logInfo("生成模型 schemas...");
    const modelSchemas = this.generateModelSchemas();
    
    LogUtils.logInfo("生成中间表 schemas...");
    const intermediateSchemas = this.generateIntermediateTableSchemas();
    
    LogUtils.logInfo("生成 Kysely 工具类型...");
    const kyselyTypes = this.generateKyselyTypes();
    
    LogUtils.logInfo("生成 DB 接口...");
    const dbInterface = this.generateDBInterface();
    
    LogUtils.logInfo("写入文件...");
    this.writeZodFile(enumSchemas, modelSchemas, intermediateSchemas, kyselyTypes, dbInterface);
    
  }

  /**
   * 生成枚举 schemas
   * @returns 枚举 schemas 内容
   */
  private generateEnumSchemas(): string {
    let enumSchemas = "";

    // 从 DMMF 中提取枚举信息
    for (const enumModel of this.dmmf.datamodel.enums) {
      const enumName = enumModel.name;
      const enumValues = enumModel.values.map((v: any) => v.name);
      
      enumSchemas += `export const ${enumName}Schema = z.enum([${enumValues.map((v: string) => `"${v}"`).join(", ")}]);\n`;
      enumSchemas += `export type ${enumName} = z.output<typeof ${enumName}Schema>;\n\n`;
    }

    return enumSchemas;
  }

  /**
   * 从 allModels 生成模型 schemas（不包括中间表）
   * @returns 模型 schemas 内容
   */
  private generateModelSchemas(): string {
    let modelSchemas = "";

    // 从 allModels 中提取常规模型（排除中间表）
    for (const model of this.allModels) {
      // 跳过中间表（以下划线开头）
      if (model.dbName?.startsWith('_') || model.name.startsWith('_')) {
        continue;
      }
      
      const schemaName = `${model.name.toLowerCase()}Schema`;
      const typeName = model.name;
      
      const fieldsStr = model.fields
        .filter((field: any) => {
          // 跳过关联字段，只保留标量字段和枚举字段
          return field.kind === "scalar" || field.kind === "enum";
        })
        .map((field: any) => {
          const zodType = this.convertFieldToZod(field);
          return `  ${field.name}: ${zodType}`;
        })
        .join(",\n");

      modelSchemas += `export const ${schemaName} = z.object({\n${fieldsStr}\n});\n`;
      modelSchemas += `export type ${typeName} = z.output<typeof ${schemaName}>;\n\n`;
    }

    return modelSchemas;
  }

  /**
   * 生成中间表的 Zod schemas（从 allModels 中提取）
   * @returns 中间表 schemas 内容
   */
  private generateIntermediateTableSchemas(): string {
    let intermediateSchemas = "";
    
    // 从 allModels 中提取中间表（以下划线开头的表）
    for (const model of this.allModels) {
      // 检查是否为中间表（以下划线开头）
      if (model.dbName?.startsWith('_') || model.name.startsWith('_')) {
        const tableName = model.dbName || model.name;
        const schemaName = `${tableName.toLowerCase()}Schema`;
        const typeName = this.convertToPascalCase(tableName);
        
        const fieldsStr = model.fields
          .filter((field: any) => field.kind === "scalar")
          .map((field: any) => {
            const zodType = this.convertFieldToZod(field);
            return `  ${field.name}: ${zodType}`;
          })
          .join(",\n");

        intermediateSchemas += `export const ${schemaName} = z.object({\n${fieldsStr}\n});\n`;
        intermediateSchemas += `export type ${typeName} = z.output<typeof ${schemaName}>;\n\n`;
      }
    }
    
    return intermediateSchemas;
  }

  /**
   * 生成 Kysely 工具类型
   * @returns Kysely 工具类型内容
   */
  private generateKyselyTypes(): string {
    return `// Kysely 工具类型
export type Generated<T> = T extends ColumnType<infer S, infer I, infer U> 
  ? ColumnType<S, I | undefined, U> 
  : ColumnType<T, T | undefined, T>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;`;
  }

  /**
   * 生成 DB 接口
   * @returns DB 接口内容
   */
  private generateDBInterface(): string {
    let dbInterface = "// DB 接口\nexport interface DB {\n";
    
    // 添加所有模型（包括中间表）
    for (const model of this.allModels) {
      const tableName = model.dbName || model.name;
      
      if (tableName.startsWith('_')) {
        // 中间表使用 PascalCase 类型名
        const pascalCaseName = this.convertToPascalCase(tableName);
        dbInterface += `  ${tableName}: ${pascalCaseName};\n`;
      } else {
        // 常规模型使用原始名称
        dbInterface += `  ${tableName}: ${tableName};\n`;
      }
    }
    
    dbInterface += "}";
    return dbInterface;
  }

  /**
   * 将下划线命名转换为 PascalCase
   * @param name - 下划线命名的字符串
   * @returns PascalCase 字符串
   */
  private convertToPascalCase(name: string): string {
    return name
      .split('_')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join('');
  }

  /**
   * 将字段转换为 Zod 类型
   * @param field - DMMF 字段
   * @returns Zod 类型字符串
   */
  private convertFieldToZod(field: any): string {
    let zodType = "";

    // 处理字段类型
    switch (field.kind) {
      case "scalar":
        // 标量字段
        switch (field.type) {
          case "String":
            zodType = "z.string()";
            break;
          case "Int":
            zodType = "z.number().int()";
            break;
          case "Float":
            zodType = "z.number()";
            break;
          case "Boolean":
            zodType = "z.boolean()";
            break;
          case "DateTime":
            zodType = "z.coerce.date()";
            break;
          case "Json":
            zodType = "z.unknown()";
            break;
          default:
            zodType = "z.string()";
        }
        break;
      case "enum":
        // 枚举字段
        zodType = `${field.type}Schema`;
        break;
      default:
        zodType = "z.string()";
    }

    // 处理可空性
    if (!field.isRequired) {
      zodType += ".nullable()";
    }

    // 处理数组
    if (field.isList) {
      zodType = `z.array(${zodType})`;
    }

    return zodType;
  }

  /**
   * 写入 Zod 文件
   */
  private writeZodFile(enumSchemas: string, modelSchemas: string, intermediateSchemas: string, kyselyTypes: string, dbInterface: string): void {
    const content = `/**
 * @file index.ts
 * @description Zod schemas 和 TypeScript 类型定义
 * @generated ${new Date().toISOString()}
 */

import { z } from "zod";
import type { ColumnType } from "kysely";

${kyselyTypes}

${enumSchemas}

${modelSchemas}

${intermediateSchemas}

${dbInterface}
`;

    FileUtils.safeWriteFile(PATHS.zod.schemas, content);
  }
}