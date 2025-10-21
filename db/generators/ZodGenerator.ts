/**
 * Zod Schema 生成器
 * 负责生成 Zod 验证模式和所有 TypeScript 类型
 */

import { PATHS } from "./utils/config";
import { FileUtils, LogUtils, StringUtils } from "./utils/common";
import { EnumProcessor } from "./processors/EnumProcessor";

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
    LogUtils.logStep("Zod 生成", "开始生成 Zod schemas...");
    
    LogUtils.logInfo("生成枚举 schemas...");
    const enumSchemas = this.generateEnumSchemas();
    
    LogUtils.logInfo("生成模型 schemas...");
    const modelSchemas = this.generateModelSchemas();
    
    LogUtils.logInfo("生成 Kysely 工具类型...");
    const kyselyTypes = this.generateKyselyTypes();
    
    LogUtils.logInfo("生成 DB 接口...");
    const dbInterface = this.generateDBInterface();
    
    LogUtils.logInfo("写入文件...");
    this.writeZodFile(enumSchemas, modelSchemas, kyselyTypes, dbInterface);
    
    LogUtils.logSuccess("Zod schemas 生成完成");
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
    
    for (const model of this.dmmf.datamodel.models) {
      dbInterface += `  ${model.name.toLowerCase()}: ${model.name};\n`;
    }
    
    dbInterface += "}";
    return dbInterface;
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
  private writeZodFile(enumSchemas: string, modelSchemas: string, kyselyTypes: string, dbInterface: string): void {
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

${dbInterface}
`;

    FileUtils.safeWriteFile(PATHS.zod.schemas, content);
  }
}