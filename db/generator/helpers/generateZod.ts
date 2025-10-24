/**
 * @file generateZod.ts
 * @description Zod Schema 生成器
 * 从 Prisma DMMF 生成 Zod 验证模式和 TypeScript 类型
 */

import type { DMMF } from "@prisma/generator-helper";
import { writeFileSafely } from "../utils/writeFileSafely";

/**
 * Zod Schema 生成器
 */
export class ZodGenerator {
  private dmmf: DMMF.Document;

  constructor(dmmf: DMMF.Document) {
    this.dmmf = dmmf;
  }

  /**
   * 生成 Zod schemas
   */
  async generate(outputPath: string): Promise<void> {
    try {
      console.log("🔍 生成 Zod schemas...");
      
      const enumSchemas = this.generateEnumSchemas();
      const modelSchemas = this.generateModelSchemas();
      const intermediateSchemas = this.generateIntermediateTableSchemas();
      const kyselyTypes = this.generateKyselyTypes();
      const dbInterface = this.generateDBInterface();
      
      const fullContent = this.buildFullContent(enumSchemas, modelSchemas, intermediateSchemas, kyselyTypes, dbInterface);
      
      writeFileSafely(outputPath, fullContent);
      
      console.log("✅ Zod schemas 生成完成");
    } catch (error) {
      console.error("❌ Zod schemas 生成失败:", error);
      throw error;
    }
  }

  /**
   * 生成枚举 schemas
   */
  private generateEnumSchemas(): string {
    let enumSchemas = "";

    // 从 DMMF 中提取枚举信息
    for (const enumModel of this.dmmf.datamodel.enums) {
      const enumName = enumModel.name;
      const enumValues = enumModel.values.map((v: DMMF.EnumValue) => v.name);
      
      enumSchemas += `export const ${enumName}Schema = z.enum([${enumValues.map((v: string) => `"${v}"`).join(", ")}]);\n`;
      enumSchemas += `export type ${enumName} = z.output<typeof ${enumName}Schema>;\n\n`;
    }

    return enumSchemas;
  }

  /**
   * 生成模型 schemas
   */
  private generateModelSchemas(): string {
    let modelSchemas = "";

    // 从 DMMF 中提取模型信息
    for (const model of this.dmmf.datamodel.models) {
      const schemaName = `${model.name.toLowerCase()}Schema`;
      const typeName = model.name;
      
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

      modelSchemas += `export const ${schemaName} = z.object({\n${fieldsStr}\n});\n`;
      modelSchemas += `export type ${typeName} = z.output<typeof ${schemaName}>;\n\n`;
    }

    return modelSchemas;
  }

  /**
   * 生成中间表 schemas（以 _ 开头的表）
   */
  private generateIntermediateTableSchemas(): string {
    let intermediateSchemas = "";

    // 从 DMMF 中提取中间表信息
    for (const model of this.dmmf.datamodel.models) {
      // 检查是否为中间表（通常以 _ 开头或包含两个外键字段）
      const isIntermediateTable = model.name.startsWith('_') || 
        (model.fields.length === 2 && 
         model.fields.every(field => field.kind === 'scalar' && field.type.includes('Id')));

      if (isIntermediateTable) {
        const schemaName = `${model.name.toLowerCase()}Schema`;
        const typeName = model.name;
        
        const fieldsStr = model.fields
          .filter((field: DMMF.Field) => field.kind === "scalar")
          .map((field: DMMF.Field) => {
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
        // 检查是否为枚举类型
        const isEnum = this.dmmf.datamodel.enums.some(e => e.name === field.type);
        if (isEnum) {
          zodType = `${field.type}Schema`;
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

    // 添加所有模型
    for (const model of this.dmmf.datamodel.models) {
      dbInterface += `  ${model.name}: ${model.name};\n`;
    }

    dbInterface += "}\n";

    return dbInterface;
  }

  /**
   * 构建完整内容
   */
  private buildFullContent(enumSchemas: string, modelSchemas: string, intermediateSchemas: string, kyselyTypes: string, dbInterface: string): string {
    return `/**
 * @file zod/index.ts
 * @description Zod 验证模式和 TypeScript 类型
 * @generated 自动生成，请勿手动修改
 */

import { z } from "zod";

// ===== 枚举 Schemas =====
${enumSchemas}

// ===== 模型 Schemas =====
${modelSchemas}

// ===== 中间表 Schemas =====
${intermediateSchemas}

// ===== Kysely 工具类型 =====
${kyselyTypes}

// ===== DB 接口 =====
${dbInterface}
`;
  }
}
