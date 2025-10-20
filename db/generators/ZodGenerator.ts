/**
 * Zod Schema 生成器
 * 负责生成 Zod 验证模式
 */

import { PATHS } from "./utils/config";
import { FileUtils, LogUtils, StringUtils } from "./utils/common";
import { PrismaExecutor } from "./utils/PrismaExecutor";
import * as enums from "../schema/enums";

export class ZodGenerator {
  private static dmmf: any = null;

  /**
   * JSON 类型的 Zod schema 定义
   */
  private static readonly JSON_ZOD_TYPE = `z.unknown()`;

  /**
   * 初始化 DMMF
   */
  private static async initializeDMMF(): Promise<void> {
    if (this.dmmf) return;
    
    try {
      const { getDMMF } = await import('@prisma/internals');
      const schema = FileUtils.safeReadFile(PATHS.baseSchema);
      this.dmmf = await getDMMF({ datamodel: schema });
    } catch (error) {
      LogUtils.logError("初始化 DMMF 失败", error as Error);
      throw error;
    }
  }

  /**
   * 使用 prisma generate 生成 Zod 类型
   */
  static generateZodTypes(): void {
    PrismaExecutor.generateZodTypes();
  }

  /**
   * 生成 Zod schemas
   */
  static async generate(): Promise<void> {
    // 初始化 DMMF
    await this.initializeDMMF();

    // 从 db/schema/enums.ts 生成 zod 枚举
    const enumSchemas = this.generateEnumSchemas();

    // 从 DMMF 生成 Zod schemas
    const generatedSchemas = this.generateModelSchemasFromDMMF();

    // 生成最终的 Zod schemas 文件内容
    const zodFileContent = `// 由脚本自动生成，请勿手动修改
import { z } from "zod/v4";

${enumSchemas}
${generatedSchemas}
`;

    // 写入 Zod schemas 文件
    FileUtils.safeWriteFile(PATHS.zod.schemas, zodFileContent);
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
   * 从 DMMF 生成模型 schemas
   * @returns 模型 schemas 内容
   */
  static generateModelSchemasFromDMMF(): string {
    if (!this.dmmf) {
      throw new Error("DMMF 未初始化");
    }

    // 生成模型 schemas
    const modelSchemas = this.dmmf.datamodel.models
      .map((model: any) => {
        const schemaName = `${model.name.toLowerCase()}Schema`;
        const fieldsStr = model.fields
          .filter((field: any) => {
            // 跳过关联字段，只保留标量字段和枚举字段
            return field.kind === "scalar" || field.kind === "enum";
          })
          .map((field: any) => {
            const zodType = this.convertDMMFFieldToZod(field, model.name);
            return `  ${field.name}: ${zodType}`;
          })
          .join(",\n");

        return `export const ${schemaName} = z.object({\n${fieldsStr}\n});`;
      })
      .join("\n\n");

    // 生成 dbSchema
    const dbSchema = this.generateDbSchemaFromDMMF();

    return modelSchemas + "\n\n" + dbSchema;
  }

  /**
   * 将 DMMF 字段转换为 Zod 类型
   * @param field - DMMF 字段
   * @param modelName - 模型名称
   * @returns Zod 类型字符串
   */
  static convertDMMFFieldToZod(field: any, modelName: string): string {
    let zodType = "";

    // 处理字段类型
    switch (field.kind) {
      case "scalar":
        // 标量字段
        switch (field.type) {
          case "String":
            // 检查是否是枚举类型（通过注释判断）
            const enumType = this.getEnumTypeFromComment(field, modelName);
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
          default:
            // 检查是否是枚举类型
            if (this.dmmf.datamodel.enums.some((e: any) => e.name === field.type)) {
              zodType = `${field.type}Schema`;
            } else {
              // 对于未知类型，使用更安全的 JSON 类型
              zodType = this.JSON_ZOD_TYPE;
            }
        }
        break;
      case "object":
        // 关联字段 - 跳过，因为关联字段不应该在 schema 中定义
        // 关联字段通常通过 ID 字段来引用
        return "SKIP_FIELD";
      case "enum":
        // 枚举字段
        zodType = `${field.type}Schema`;
        break;
      default:
        // 对于未知类型，使用更安全的 JSON 类型
        zodType = this.JSON_ZOD_TYPE;
    }

    // 处理数组类型
    if (field.isList) {
      zodType = `z.array(${zodType})`;
    }

    // 处理可选字段
    if (!field.isRequired) {
      zodType = `${zodType}.nullable()`;
    }

    return zodType;
  }

  /**
   * 从字段注释中提取枚举类型
   * @param field - DMMF 字段
   * @param modelName - 模型名称
   * @returns 枚举类型名称或 null
   */
  static getEnumTypeFromComment(field: any, modelName: string): string | null {
    // 从原始 schema 中解析注释
    const schema = FileUtils.safeReadFile(PATHS.baseSchema);
    
    // 查找模型定义
    const modelRegex = new RegExp(`model\\s+${modelName}\\s*\\{[\\s\\S]*?\\}`, 'g');
    const modelMatch = modelRegex.exec(schema);
    
    if (!modelMatch) {
      return null;
    }
    
    const modelContent = modelMatch[0];
    
    // 查找字段定义和注释
    const fieldRegex = new RegExp(`\\s+${field.name}\\s+String\\s*//\\s*Enum\\s+(\\w+)`, 'g');
    const fieldMatch = fieldRegex.exec(modelContent);
    
    if (fieldMatch) {
      return fieldMatch[1]; // 返回枚举类型名称
    }
    
    return null;
  }

  /**
   * 从 DMMF 生成 dbSchema
   * @returns dbSchema 内容
   */
  static generateDbSchemaFromDMMF(): string {
    if (!this.dmmf) {
      throw new Error("DMMF 未初始化");
    }

    // 生成 dbSchema，包含所有模型
    const fieldsStr = this.dmmf.datamodel.models
      .map((model: any) => {
        const schemaName = `${model.name.toLowerCase()}Schema`;
        return `  ${model.name.toLowerCase()}: ${schemaName}`;
      })
      .join(",\n");

    return `export const dbSchema = z.object({\n${fieldsStr}\n});`;
  }


}
