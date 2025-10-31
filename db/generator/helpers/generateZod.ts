/**
 * @file generateZod.ts
 * @description Zod Schema 生成器
 * 从 Prisma DMMF 生成 Zod 验证模式和 TypeScript 类型
 */

import type { DMMF } from "@prisma/generator-helper";
import { writeFileSafely } from "../utils/writeFileSafely";
import { EnumInjector } from "../enumInjector";
import { TypeName, ZodTypeName, SchemaName, IsIntermediateTable, NamingRules } from "../utils/namingRules";

/**
 * Zod Schema 生成器
 */
export class ZodGenerator {
  private dmmf: DMMF.Document;
  private allModels: readonly DMMF.Model[] = []; // 包含中间表的完整模型列表
  private enumInjector: EnumInjector;

  constructor(dmmf: DMMF.Document, allModels: DMMF.Model[]) {
    this.dmmf = dmmf;
    this.allModels = allModels;
    this.enumInjector = new EnumInjector();
    this.enumInjector.processEnums();
  }

  /**
   * 生成 Zod schemas
   */
  async generate(outputPath: string): Promise<void> {
    try {
      console.log("生成 Zod schemas...");
      
      const enumSchemas = this.generateEnumSchemas();
      const tableSchemas = this.generateTableSchemas();
      const kyselyTypes = this.generateKyselyTypes();
      const dbInterface = this.generateDBInterface();
      const dbSchema = this.generateDBSchema();
      
      const fullContent = this.buildFullContent(enumSchemas, tableSchemas, kyselyTypes, dbInterface, dbSchema);
      
      writeFileSafely(outputPath, fullContent);
      
      console.log("Zod schemas 生成完成");
    } catch (error) {
      console.error("Zod schemas 生成失败:", error);
      throw error;
    }
  }

  /**
   * 生成枚举 schemas
   */
  private generateEnumSchemas(): string {
    let enumSchemas = "";

    // 从 EnumInjector 中获取枚举信息
    const extractedEnums = (this.enumInjector as any).extractedEnums;
    
    if (extractedEnums && extractedEnums.size > 0) {
      for (const [enumName, enumValues] of extractedEnums) {
        const enumSchemaName = SchemaName(enumName); // 使用 SchemaName 规范
        const enumTypeName = ZodTypeName(enumName); // 使用 ZodTypeName 规范（snake_case）
        enumSchemas += `export const ${enumSchemaName} = z.enum([${enumValues.map((v: string) => `"${v}"`).join(", ")}]);\n`;
        enumSchemas += `export type ${enumTypeName} = z.output<typeof ${enumSchemaName}>;\n\n`;
      }
    }

    return enumSchemas;
  }

  /**
   * 生成所有表的 schemas（包括常规表和中间表）
   */
  private generateTableSchemas(): string {
    let regularTableSchemas = "";
    let intermediateTableSchemas = "";

    // 从完整的模型列表中提取所有表信息
    for (const model of this.allModels) {
      const tableName = model.dbName || model.name;
      const isIntermediateTable = IsIntermediateTable(tableName);
      
      // Schema 名称：PascalCase + Schema
      const schemaName = SchemaName(tableName);
      // 中间类型名称：snake_case（用于之后转换成 Selectable/Insertable/Updateable）
      const typeName = ZodTypeName(tableName);
      
      const fieldsStr = model.fields
        .filter((field: DMMF.Field) => {
          // 跳过关联字段，只保留标量字段和枚举字段
          return field.kind === "scalar" || field.kind === "enum";
        })
        .map((field: DMMF.Field) => {
          const zodType = this.convertFieldToZod(field);
          return `  ${field.name}: ${zodType}`;
        })
        .join(",\n");

      const schemaCode = `export const ${schemaName} = z.object({\n${fieldsStr}\n});\n`;
      const typeCode = `export type ${typeName} = z.output<typeof ${schemaName}>;\n\n`;
      const content = schemaCode + typeCode;

      if (isIntermediateTable) {
        intermediateTableSchemas += content;
      } else {
        regularTableSchemas += content;
      }
    }

    return regularTableSchemas + "\n// ===== 中间表 Schemas =====\n" + intermediateTableSchemas;
  }

  /**
   * 将字段转换为 Zod 类型
   */
  private convertFieldToZod(field: DMMF.Field): string {
    let zodType = "";

    // 处理字段类型
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
        zodType = "z.date()";
        break;
      case "Json":
        zodType = "z.any()";
        break;
      case "Bytes":
        zodType = "z.instanceof(Buffer)";
        break;
      default:
        // 检查是否为枚举类型（从 EnumInjector 中获取枚举信息）
        const extractedEnums = (this.enumInjector as any).extractedEnums;
        const isEnum = extractedEnums && extractedEnums.has(field.type);
        if (isEnum) {
          // 使用 SchemaName 规范生成枚举 schema 名称
          zodType = SchemaName(field.type);
        } else {
          zodType = "z.string()"; // 默认为字符串
        }
        break;
    }

    // 处理可选性
    if (!field.isRequired) {
      zodType += ".optional()";
    }

    // 处理数组
    if (field.isList) {
      zodType = `z.array(${zodType})`;
    }

    return zodType;
  }

  /**
   * 生成 Kysely 工具类型
   */
  private generateKyselyTypes(): string {
    return `
// Kysely 工具类型
export type Insertable<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;
export type Updateable<T> = Partial<Insertable<T>>;
export type Selectable<T> = T;
export type Whereable<T> = Partial<T>;
`;
  }

  /**
   * 生成 DB 接口
   */
  private generateDBInterface(): string {
    let dbInterface = "export interface DB {\n";

    // 添加所有模型（包括中间表）
    // DB 接口中的类型应该是 snake_case（Zod 导出的类型）
    for (const model of this.allModels) {
      const tableName = model.dbName || model.name;
      const typeName = ZodTypeName(tableName);
      
      dbInterface += `  ${tableName}: ${typeName};\n`;
    }

    dbInterface += "}\n";

    return dbInterface;
  }

  /**
   * 生成 DBSchema 对象
   * 包含所有表的 Zod Schema，用于运行时验证
   */
  private generateDBSchema(): string {
    let dbSchema = "// ===== DB Schema 对象 =====\nexport const DBSchema = {\n";

    for (const model of this.allModels) {
      const tableName = model.dbName || model.name;
      const schemaName = SchemaName(tableName);
      
      dbSchema += `  ${tableName}: ${schemaName},\n`;
    }

    dbSchema += "} as const;\n";

    return dbSchema;
  }


  /**
   * 构建完整内容
   */
  private buildFullContent(enumSchemas: string, tableSchemas: string, kyselyTypes: string, dbInterface: string, dbSchema: string): string {
    return `/**
 * @file zod/index.ts
 * @description Zod 验证模式和 TypeScript 类型
 * @generated 自动生成，请勿手动修改
 */

import { z } from "zod";

// ===== 枚举 Schemas =====
${enumSchemas}

// ===== 模型 Schemas =====
${tableSchemas}

// ===== Kysely 工具类型 =====
${kyselyTypes}

// ===== DB 接口 =====
${dbInterface}

${dbSchema}
`;
  }
}
