/**
 * Zod Schema 生成器
 * 负责生成 Zod 验证模式
 */

import { PATHS } from "./utils/config";
import { FileUtils, LogUtils, StringUtils } from "./utils/common";
import { PrismaExecutor } from "./utils/PrismaExecutor";
import * as enums from "../schema/enums";
import { DATABASE_SCHEMA, type TableInfo, type FieldInfo } from '../generated/database-schema.js';

export class ZodGenerator {

  /**
   * JSON 类型的 Zod schema 定义
   */
  private static readonly JSON_ZOD_TYPE = `z.unknown()`;

  /**
   * 使用 prisma generate 生成 Zod 类型
   */
  static generateZodTypes(): void {
    PrismaExecutor.generateZodTypes();
  }

  /**
   * 生成 Zod schemas
   */
  static generate(): void {
    LogUtils.logStep("Zod 生成", "开始生成 Zod schemas...");
    
    LogUtils.logInfo("生成枚举 schemas...");
    const enumSchemas = this.generateEnumSchemas();

    LogUtils.logInfo("生成模型 schemas...");
    const generatedSchemas = this.generateModelSchemasFromDatabaseSchema();

    LogUtils.logInfo("写入 Zod schemas 文件...");
    const zodFileContent = `// 由脚本自动生成，请勿手动修改
import { z } from "zod/v4";

${enumSchemas}
${generatedSchemas}
`;

    FileUtils.safeWriteFile(PATHS.zod.schemas, zodFileContent);
    
    LogUtils.logSuccess("Zod 生成完成");
  }

  /**
   * 生成枚举 schemas
   * @returns 枚举 schemas 内容
   */
  static generateEnumSchemas(): string {
    let enumSchemas = "";
    const enumMap = new Map<string, string[]>();

    try {
      // 遍历所有导出的枚举常量
      for (const [key, value] of Object.entries(enums)) {
        // 检查是否是数组类型的枚举常量（排除类型定义）
        if (Array.isArray(value) && !key.endsWith("Type")) {
          const values = value as string[];
          if (values.length > 0) {
            // 使用 StringUtils.toPascalCase 进行正确的转换
            const pascalCaseEnumName = StringUtils.toPascalCase(key);
            enumSchemas += `export const ${pascalCaseEnumName}Schema = z.enum([${values.map((v) => `"${v}"`).join(", ")}]);\n`;
            enumSchemas += `export type ${pascalCaseEnumName}Type = z.infer<typeof ${pascalCaseEnumName}Schema>;\n\n`;
            enumMap.set(key.toLowerCase(), values);
          }
        }
      }
    } catch (error) {
      LogUtils.logError("导入枚举模块失败", error as Error);
    }

    return enumSchemas;
  }

  /**
   * 从 DATABASE_SCHEMA 生成模型 schemas
   * @returns 模型 schemas 内容
   */
  static generateModelSchemasFromDatabaseSchema(): string {
    // 生成模型 schemas
    const modelSchemas = DATABASE_SCHEMA.tables
      .map((table: TableInfo) => {
        const schemaName = `${table.name.toLowerCase()}Schema`;
        const fieldsStr = table.fields
          .filter((field: FieldInfo) => {
            // 跳过关联字段，只保留标量字段和枚举字段
            return field.kind === "scalar" || field.kind === "enum";
          })
          .map((field: FieldInfo) => {
            const zodType = this.convertFieldToZod(field, table.name);
            return `  ${field.name}: ${zodType}`;
          })
          .join(",\n");

        return `export const ${schemaName} = z.object({\n${fieldsStr}\n});`;
      })
      .join("\n\n");

    // 生成 dbSchema
    const dbSchema = this.generateDbSchemaFromDatabaseSchema();

    return modelSchemas + "\n\n" + dbSchema;
  }

  /**
   * 将 FieldInfo 转换为 Zod 类型
   * @param field - FieldInfo 字段
   * @param tableName - 表名称
   * @returns Zod 类型字符串
   */
  static convertFieldToZod(field: FieldInfo, tableName: string): string {
    let zodType = "";

    // 处理字段类型
    switch (field.kind) {
      case "scalar":
        // 标量字段
        switch (field.type) {
          case "String":
            // 检查是否是枚举类型
            const enumType = this.getEnumTypeFromField(field, tableName);
            if (enumType) {
              // 将大写下划线格式转换为 PascalCase 格式
              const pascalCaseEnumName = StringUtils.toPascalCase(enumType);
              zodType = `${pascalCaseEnumName}Schema`;
            } else {
              zodType = "z.string()";
            }
            break;
          case "Int":
          case "Float":
            zodType = "z.number()";
            break;
          case "Boolean":
            zodType = "z.boolean()";
            break;
          case "DateTime":
            zodType = "z.date()";
            break;
          case "Json":
            zodType = this.JSON_ZOD_TYPE;
            break;
          case "Bytes":
            zodType = "z.instanceof(Buffer)";
            break;
          default:
            // 检查是否是枚举类型
            if (DATABASE_SCHEMA.enums.some(e => e.name === field.type)) {
              zodType = `${field.type}Schema`;
            } else {
              // 对于未知类型，使用更安全的 JSON 类型
              zodType = this.JSON_ZOD_TYPE;
            }
        }
        break;
      case "enum":
        // 枚举字段
        zodType = `${field.type}Schema`;
        break;
      default:
        // 对于未知类型，使用更安全的 JSON 类型
        zodType = this.JSON_ZOD_TYPE;
    }

    // 处理数组类型
    if (field.isArray) {
      zodType = `z.array(${zodType})`;
    }

    // 处理可选字段
    if (field.isOptional) {
      zodType = `${zodType}.optional()`;
    }

    return zodType;
  }

  /**
   * 从字段中提取枚举类型
   * @param field - FieldInfo 字段
   * @param tableName - 表名称
   * @returns 枚举类型名称或 null
   */
  static getEnumTypeFromField(field: FieldInfo, tableName: string): string | null {
    // 如果字段本身就是枚举类型
    if (field.kind === "enum") {
      return field.type;
    }
    
    // 对于 String 类型，检查是否是枚举
    if (field.kind === "scalar" && field.type === "String") {
      // 检查 DATABASE_SCHEMA 中的枚举
      const enumType = DATABASE_SCHEMA.enums.find(e => 
        e.values.some(v => v === field.name || field.name.includes(v))
      );
      return enumType ? enumType.name : null;
    }
    
    return null;
  }

  /**
   * 从 DATABASE_SCHEMA 生成 dbSchema
   * @returns dbSchema 内容
   */
  static generateDbSchemaFromDatabaseSchema(): string {
    // 生成 dbSchema，包含所有表
    const fieldsStr = DATABASE_SCHEMA.tables
      .map((table: TableInfo) => {
        const schemaName = `${table.name.toLowerCase()}Schema`;
        return `  ${table.name.toLowerCase()}: ${schemaName}`;
      })
      .join(",\n");

    return `export const dbSchema = z.object({\n${fieldsStr}\n});`;
  }


}
