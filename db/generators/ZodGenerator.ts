/**
 * Zod Schema 生成器
 * 负责生成 Zod 验证模式
 */

import fs from "fs";
import { PATHS } from "./utils/config";
import { FileUtils, LogUtils, StringUtils } from "./utils/common";
import { PrismaExecutor } from "./utils/PrismaExecutor";
import * as enums from "../schema/enums";

interface ParsedFields {
  [fieldName: string]: string;
}

interface ParsedTypes {
  [typeName: string]: ParsedFields;
}

export class ZodGenerator {

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
    // 从 db/schema/enums.ts 生成 zod 枚举
    const enumSchemas = this.generateEnumSchemas();

    // 从 Kysely 类型定义生成 Zod schemas
    const generatedSchemas = this.generateModelSchemas();

    // 生成最终的 Zod schemas 文件内容
    const zodFileContent = `// 由脚本自动生成，请勿手动修改
import { z } from "zod";

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
        // 只处理以 _TYPE 结尾的常量（枚举定义）
        if (key.endsWith('_TYPE') && Array.isArray(value)) {
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
   * 生成模型 schemas
   * @returns 模型 schemas 内容
   */
  static generateModelSchemas(): string {
    const kyselyTypes = FileUtils.safeReadFile(PATHS.kysely.types);
    const parsedTypes = this.parseTypes(kyselyTypes);

    // 生成 Zod schemas
    const modelSchemas = Object.entries(parsedTypes)
      .map(([typeName, fields]) => {
        const schemaName = `${typeName.toLowerCase()}Schema`;
        const fieldsStr = Object.entries(fields)
          .map(([fieldName, zodType]) => `  ${fieldName}: ${zodType}`)
          .join(",\n");

        return `export const ${schemaName} = z.object({\n${fieldsStr}\n});`;
      })
      .join("\n\n");

    // 生成 dbSchema
    const dbSchema = this.generateDbSchema(kyselyTypes);

    return modelSchemas + "\n\n" + dbSchema;
  }

  /**
   * 生成 dbSchema
   * @param kyselyTypes - Kysely 类型内容
   * @returns dbSchema 内容
   */
  static generateDbSchema(kyselyTypes: string): string {
    // 查找 DB 类型定义
    const dbTypeRegex = /export\s+type\s+DB\s*=\s*\{([\s\S]*?)\};/g;
    const dbMatch = dbTypeRegex.exec(kyselyTypes);

    if (!dbMatch) {
      return "";
    }

    const dbFieldsStr = dbMatch[1];
    const dbFields = this.parseFields(dbFieldsStr);

    // 生成 dbSchema
    const fieldsStr = Object.entries(dbFields)
      .map(([fieldName, zodType]) => `  ${fieldName}: ${zodType}`)
      .join(",\n");

    return `export const dbSchema = z.object({\n${fieldsStr}\n});`;
  }

  /**
   * 检查类型是否是关联类型
   * @param type - TypeScript 类型
   * @returns 是否是关联类型
   */
  static isRelationType(type: string): boolean {
    // 检查是否是关联类型（包含 To 的类型，如 armorTocrystal, avatarTocharacter 等）
    if (type.includes('To') || type.includes('Relation')) {
      return true;
    }

    // 检查是否在 Kysely 类型文件中定义（如 campA, campB 等）
    if (fs.existsSync(PATHS.kysely.types)) {
      const typesContent = FileUtils.safeReadFile(PATHS.kysely.types);
      const escapedType = type.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const typeRegex = new RegExp(`export\\s+type\\s+${escapedType}\\s*=\\s*\\{`);
      return typeRegex.test(typesContent);
    }

    return false;
  }

  /**
   * 检查类型是否是枚举类型
   * @param type - TypeScript 类型
   * @returns 是否是枚举类型
   */
  static isEnumType(type: string): boolean {
    // 从 Kysely enums.ts 文件中读取枚举定义
    if (fs.existsSync(PATHS.kysely.enums)) {
      const enumsContent = FileUtils.safeReadFile(PATHS.kysely.enums);

      // 检查是否存在对应的枚举定义
      const enumRegex = new RegExp(`export const ${type.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} = \\{`);
      return enumRegex.test(enumsContent);
    }

    return false;
  }

  /**
   * 转换类型到 Zod 类型
   * @param type - TypeScript 类型
   * @returns Zod 类型
   */
  static convertTypeToZod(type: string): string {
    // 处理联合类型
    if (type.includes("|")) {
      const types = type.split("|").map((t) => t.trim());
      // 如果包含 null，使用 nullable()
      if (types.includes("null")) {
        const nonNullTypes = types.filter((t) => t !== "null");
        if (nonNullTypes.length === 1) {
          return `${this.convertTypeToZod(nonNullTypes[0])}.nullable()`;
        }
        return `z.union([${nonNullTypes.map((t) => this.convertTypeToZod(t)).join(", ")}]).nullable()`;
      }
      return `z.union([${types.map((t) => this.convertTypeToZod(t)).join(", ")}])`;
    }

    // 处理数组类型
    if (type.endsWith("[]")) {
      const baseType = type.slice(0, -2);
      return `z.array(${this.convertTypeToZod(baseType)})`;
    }

    // 处理基本类型
    switch (type) {
      case "string":
        return "z.string()";
      case "number":
        return "z.number()";
      case "boolean":
        return "z.boolean()";
      case "Date":
        return "z.date()";
      case "Timestamp":
        return "z.string()"; // 从数据库查询返回的 Timestamp 类型是 Date
      case "JsonValue":
      case "InputJsonValue":
        return `z.lazy(() => z.union([
          z.string(),
          z.number(),
          z.boolean(),
          z.literal(null),
          z.record(z.lazy(() => z.union([z.any(), z.literal(null)]))),
          z.array(z.lazy(() => z.union([z.any(), z.literal(null)])))
        ]))`;
      case "unknown":
        return `z.record(z.unknown())`;
      default:
        // 检查是否是枚举类型（以 Type 结尾）
        if (type.endsWith("Type")) {
          const enumName = type.replace("Type", "");
          // 确保枚举名称首字母大写
          const pascalCaseEnum = enumName.charAt(0).toUpperCase() + enumName.slice(1);
          return `${pascalCaseEnum}TypeSchema`;
        }

        // 检查是否是直接的枚举类型（如 MobDifficultyFlag）
        if (this.isEnumType(type)) {
          return `${type}Schema`;
        }

        // 检查是否是关联类型（如 armorTocrystal, avatarTocharacter 等）
        if (this.isRelationType(type)) {
          return `${type.toLowerCase()}Schema`;
        }

        // 检查是否是字面量类型
        if (type.startsWith('"') && type.endsWith('"')) {
          return `z.literal(${type})`;
        }

        // 对于未知类型，使用更安全的 JSON 类型
        return `z.lazy(() => z.union([
          z.string(),
          z.number(),
          z.boolean(),
          z.literal(null),
          z.record(z.lazy(() => z.union([z.any(), z.literal(null)]))),
          z.array(z.lazy(() => z.union([z.any(), z.literal(null)])))
        ]))`;
    }
  }

  /**
   * 解析字段
   * @param fieldsStr - 字段字符串
   * @returns 字段映射
   */
  static parseFields(fieldsStr: string): ParsedFields {
    const fields: ParsedFields = {};
    const fieldRegex = /(\w+)(\?)?:\s*([^;]+);/g;
    let match;

    while ((match = fieldRegex.exec(fieldsStr)) !== null) {
      const [, name, option, type] = match;
      const zodType = this.convertTypeToZod(type.trim());
      fields[name] = option ? `${zodType}.nullable()` : zodType;
    }

    return fields;
  }

  /**
   * 解析类型定义
   * @param kyselyTypes - Kysely 类型内容
   * @returns 类型映射
   */
  static parseTypes(kyselyTypes: string): ParsedTypes {
    const types: ParsedTypes = {};
    const typeRegex = /export\s+type\s+(\w+)\s*=\s*\{([\s\S]*?)\};/g;
    let match;

    while ((match = typeRegex.exec(kyselyTypes)) !== null) {
      const [, typeName, fieldsStr] = match;

      // 跳过不需要的类型
      if (
        typeName === "Generated" ||
        typeName === "Timestamp" ||
        typeName === "DB"
      ) {
        continue;
      }

      types[typeName] = this.parseFields(fieldsStr);
    }

    return types;
  }
}

