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

  constructor(dmmf: any, enumProcessor: EnumProcessor) {
    this.dmmf = dmmf;
    this.enumProcessor = enumProcessor;
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
   * 从 DMMF 生成模型 schemas
   * @returns 模型 schemas 内容
   */
  private generateModelSchemas(): string {
    let modelSchemas = "";

    // 从 DMMF 中提取模型信息
    for (const model of this.dmmf.datamodel.models) {
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
   * 从 SQL 文件中提取中间表信息
   * @returns 中间表信息数组
   */
  private extractIntermediateTables(): Array<{name: string, fields: Array<{name: string, type: string}>}> {
    const intermediateTables: Array<{name: string, fields: Array<{name: string, type: string}>}> = [];
    
    try {
      const sqlContent = FileUtils.safeReadFile(PATHS.serverDB.sql);
      
      // 匹配 CREATE TABLE "_tableName" 的模式
      const createTableRegex = /CREATE TABLE "(_[^"]+)"\s*\(([\s\S]*?)\);/g;
      let match;
      
      while ((match = createTableRegex.exec(sqlContent)) !== null) {
        const tableName = match[1];
        const fieldsContent = match[2];
        
        // 提取字段信息
        const fields: Array<{name: string, type: string}> = [];
        
        // 匹配字段定义：字段名 类型 [NOT NULL]
        const fieldRegex = /"([^"]+)"\s+([A-Z]+)(?:\s+NOT\s+NULL)?(?:,|\s*$)/g;
        let fieldMatch;
        
        while ((fieldMatch = fieldRegex.exec(fieldsContent)) !== null) {
          const fieldName = fieldMatch[1];
          const fieldType = fieldMatch[2];
          
          // 确保是真正的字段定义，不是约束
          if (fieldName && fieldType && !fieldName.includes('CONSTRAINT') && !fieldName.includes('PRIMARY') && !fieldName.includes('FOREIGN')) {
            fields.push({
              name: fieldName,
              type: fieldType
            });
          }
        }
        
        if (fields.length > 0) {
          intermediateTables.push({
            name: tableName,
            fields: fields
          });
        }
      }
    } catch (error) {
      console.warn('Failed to extract intermediate tables from SQL:', error);
    }
    
    return intermediateTables;
  }

  /**
   * 生成中间表的 Zod schemas
   * @returns 中间表 schemas 内容
   */
  private generateIntermediateTableSchemas(): string {
    let intermediateSchemas = "";
    
    const intermediateTables = this.extractIntermediateTables();
    
    for (const table of intermediateTables) {
      const schemaName = `${table.name.toLowerCase()}Schema`;
      const typeName = this.convertToPascalCase(table.name);
      
      const fieldsStr = table.fields
        .map(field => {
          // 将 SQL 类型转换为 Zod 类型
          let zodType = "z.string()";
          
          switch (field.type.toLowerCase()) {
            case 'int':
            case 'integer':
              zodType = "z.number().int()";
              break;
            case 'bigint':
              zodType = "z.bigint()";
              break;
            case 'boolean':
            case 'bool':
              zodType = "z.boolean()";
              break;
            case 'timestamp':
            case 'timestamptz':
              zodType = "z.coerce.date()";
              break;
            case 'json':
            case 'jsonb':
              zodType = "z.unknown()";
              break;
            default:
              zodType = "z.string()";
          }
          
          return `  ${field.name}: ${zodType}`;
        })
        .join(",\n");

      intermediateSchemas += `export const ${schemaName} = z.object({\n${fieldsStr}\n});\n`;
      intermediateSchemas += `export type ${typeName} = z.output<typeof ${schemaName}>;\n\n`;
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
    
    // 添加常规模型
    for (const model of this.dmmf.datamodel.models) {
      dbInterface += `  ${model.name.toLowerCase()}: ${model.name};\n`;
    }
    
    // 添加中间表
    const intermediateTables = this.extractIntermediateTables();
    for (const table of intermediateTables) {
      // 中间表名保持小写，但类型名使用正确的 PascalCase
      const pascalCaseName = this.convertToPascalCase(table.name);
      dbInterface += `  ${table.name}: ${pascalCaseName};\n`;
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