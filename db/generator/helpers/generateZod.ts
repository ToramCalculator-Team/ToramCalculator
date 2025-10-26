/**
 * @file generateZod.ts
 * @description Zod Schema 生成器
 * 从 Prisma DMMF 生成 Zod 验证模式和 TypeScript 类型
 */

import type { DMMF } from "@prisma/generator-helper";
import { writeFileSafely } from "../utils/writeFileSafely";
import { EnumInjector } from "./enumInjector";

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

    // 从 EnumInjector 中获取枚举信息
    const extractedEnums = (this.enumInjector as any).extractedEnums;
    
    if (extractedEnums && extractedEnums.size > 0) {
      for (const [enumName, enumValues] of extractedEnums) {
        enumSchemas += `export const ${enumName}Schema = z.enum([${enumValues.map((v: string) => `"${v}"`).join(", ")}]);\n`;
        enumSchemas += `export type ${enumName} = z.output<typeof ${enumName}Schema>;\n\n`;
      }
    }

    return enumSchemas;
  }

  /**
   * 生成模型 schemas
   */
  private generateModelSchemas(): string {
    let modelSchemas = "";

    // 从完整的模型列表中提取模型信息（包含中间表）
    for (const model of this.allModels) {
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

    // 从完整的模型列表中提取中间表信息
    for (const model of this.allModels) {
      // 检查是否为中间表（以 _ 开头）
      if (model.name.startsWith('_') || (model.dbName && model.dbName.startsWith('_'))) {
        // 使用 dbName 作为表名（如果存在），否则使用 name
        const tableName = model.dbName || model.name;
        const schemaName = `${tableName.toLowerCase()}Schema`;
        const typeName = this.convertToPascalCase(tableName);
        
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
        // 检查是否为枚举类型（从 EnumInjector 中获取枚举信息）
        const extractedEnums = (this.enumInjector as any).extractedEnums;
        const isEnum = extractedEnums && extractedEnums.has(field.type);
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

    dbInterface += "}\n";

    return dbInterface;
  }

  /**
   * 将下划线命名转换为 PascalCase
   */
  private convertToPascalCase(name: string): string {
    return name
      .split('_')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join('');
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
