/**
 * @file generateDatabaseSchema.ts
 * @description 数据库架构信息生成器
 * 从 Prisma DMMF 生成数据库架构信息
 */

import type { DMMF } from "@prisma/generator-helper";
import type { DB } from "../../generated/zod/index";
import { writeFileSafely } from "../utils/writeFileSafely";

/**
 * 字段信息接口
 */
export interface FieldInfo<T extends keyof DB = keyof DB> {
  name: string;
  type: string;
  kind: string;
  isRequired: boolean;
  isId: boolean;
  isUnique: boolean;
  isList: boolean;
  isArray: boolean;
  isOptional: boolean;
  defaultValue: any;
  relationName?: string;
  relationFromFields?: string[];
  relationToFields?: string[];
  relationOnDelete?: string;
}

/**
 * 表信息接口
 */
export interface TableInfo<T extends keyof DB = keyof DB> {
  name: T;
  fields: FieldInfo<T>[];
  primaryKeys: string[]; // 使用 string[] 用于生成，最终会被类型断言
  foreignKeys: ForeignKeyInfo<T>[];
  indexes: IndexInfo<T>[];
  isRelationTable: boolean;
}

/**
 * 外键信息接口
 */
export interface ForeignKeyInfo<T extends keyof DB = keyof DB> {
  field: string;
  referencedTable: keyof DB;
  referencedField: string;
  onDelete: string;
  onUpdate: string;
}

/**
 * 索引信息接口
 */
export interface IndexInfo<T extends keyof DB = keyof DB> {
  name: string;
  fields: string[];
  unique: boolean;
}

/**
 * 依赖关系信息接口
 */
export interface DependencyInfo<T extends keyof DB = keyof DB> {
  table: T;
  dependsOn: (keyof DB)[];
  dependents: (keyof DB)[];
}

/**
 * 枚举信息接口
 */
export interface EnumInfo {
  name: string;
  values: string[];
}

/**
 * 数据库架构信息接口
 */
export interface DatabaseSchemaInfo {
  tables: TableInfo[];
  dependencies: DependencyInfo[];
  enums: EnumInfo[];
  generatedAt: string;
  version: string;
}

/**
 * 数据库架构信息生成器
 */
export class DatabaseSchemaGenerator {
  private dmmf: DMMF.Document;

  constructor(dmmf: DMMF.Document) {
    this.dmmf = dmmf;
  }

  /**
   * 生成数据库架构信息
   */
  async generate(outputPath: string): Promise<void> {
    try {
      console.log("📊 生成数据库架构信息...");
      
      const schemaInfo = this.buildSchemaInfo();
      const typeSafeSchema = this.generateSchemaWithTypeAssertions(schemaInfo);
      
      // 生成 TypeScript 文件
      this.generateTypeScriptFile(typeSafeSchema, outputPath);
      
      console.log("✅ 数据库架构信息生成完成");
    } catch (error) {
      console.error("❌ 数据库架构信息生成失败:", error);
      throw error;
    }
  }

  /**
   * 构建架构信息
   */
  private buildSchemaInfo(): DatabaseSchemaInfo {
    const tables = this.buildTables();
    const dependencies = this.buildDependencies();
    const enums = this.buildEnums();

    return {
      tables,
      dependencies,
      enums,
      generatedAt: new Date().toISOString(),
      version: "2.0.0"
    };
  }

  /**
   * 构建表信息
   */
  private buildTables(): TableInfo[] {
    return this.dmmf.datamodel.models.map((model: DMMF.Model) => {
      const fields = this.buildFields(model);
      const primaryKeys = this.buildPrimaryKeys(model);
      const foreignKeys = this.buildForeignKeys(model);
      const indexes = this.buildIndexes(model);
      const isRelationTable = this.isRelationTable(model);

      return {
        name: model.name as keyof DB,
        fields,
        primaryKeys,
        foreignKeys,
        indexes,
        isRelationTable
      };
    });
  }

  /**
   * 构建字段信息
   */
  private buildFields(model: DMMF.Model): FieldInfo[] {
    return model.fields.map((field: DMMF.Field) => ({
      name: field.name,
      type: field.type,
      kind: field.kind,
      isRequired: field.isRequired || false,
      isId: field.isId || false,
      isUnique: field.isUnique || false,
      isList: field.isList || false,
      isArray: false, // DMMF 中没有 isArray 属性
      isOptional: !field.isRequired, // 根据 isRequired 推导
      defaultValue: field.default || undefined, // 确保 defaultValue 始终存在
      relationName: field.relationName,
      relationFromFields: field.relationFromFields ? [...field.relationFromFields] : undefined,
      relationToFields: field.relationToFields ? [...field.relationToFields] : undefined,
      relationOnDelete: field.relationOnDelete
    }));
  }

  /**
   * 构建主键信息
   */
  private buildPrimaryKeys(model: DMMF.Model): string[] {
    return model.fields
      .filter((field: DMMF.Field) => field.isId)
      .map((field: DMMF.Field) => field.name);
  }

  /**
   * 构建外键信息
   */
  private buildForeignKeys(model: DMMF.Model): ForeignKeyInfo[] {
    const foreignKeys: ForeignKeyInfo[] = [];
    
    for (const field of model.fields) {
      if (field.kind === 'object' && field.relationFromFields && field.relationFromFields.length > 0) {
        // 这是一个外键字段
        const relationFromField = field.relationFromFields[0];
        const relationToField = field.relationToFields?.[0] || 'id';
        
        foreignKeys.push({
          field: relationFromField,
          referencedTable: field.type as keyof DB,
          referencedField: relationToField,
          onDelete: field.relationOnDelete || 'CASCADE',
          onUpdate: 'CASCADE'
        });
      }
    }
    
    return foreignKeys;
  }

  /**
   * 构建索引信息
   */
  private buildIndexes(model: DMMF.Model): IndexInfo[] {
    // 这里可以根据需要实现索引信息的构建
    // 目前返回空数组
    return [];
  }

  /**
   * 判断是否为关系表
   */
  private isRelationTable(model: DMMF.Model): boolean {
    // 简单判断：如果表名包含下划线且只有两个字段，可能是关系表
    return model.name.includes('_') && model.fields.length <= 2;
  }

  /**
   * 构建依赖关系信息
   */
  private buildDependencies(): DependencyInfo[] {
    const dependencies: DependencyInfo[] = [];
    
    // 简化的依赖关系构建
    this.dmmf.datamodel.models.forEach((model: DMMF.Model) => {
      const dependsOn: (keyof DB)[] = [];
      
      model.fields.forEach((field: DMMF.Field) => {
        if (field.kind === 'object' && field.type !== model.name) {
          dependsOn.push(field.type as keyof DB);
        }
      });
      
      if (dependsOn.length > 0) {
        dependencies.push({
          table: model.name as keyof DB,
          dependsOn,
          dependents: []
        });
      }
    });
    
    return dependencies;
  }

  /**
   * 构建枚举信息
   */
  private buildEnums(): EnumInfo[] {
    return this.dmmf.datamodel.enums.map((enumItem: DMMF.DatamodelEnum) => ({
      name: enumItem.name,
      values: enumItem.values.map((value: DMMF.EnumValue) => value.name)
    }));
  }

  /**
   * 生成带有类型断言的架构数据
   */
  private generateSchemaWithTypeAssertions(schemaInfo: DatabaseSchemaInfo): string {
    // 使用自定义 replacer 确保 defaultValue 属性始终存在
    const jsonString = JSON.stringify(schemaInfo, (key, value) => {
      if (key === 'defaultValue' && value === undefined) {
        return null; // 将 undefined 转换为 null，确保属性存在
      }
      return value;
    }, 2);

    // 为每个表的 primaryKeys 添加类型断言
    schemaInfo.tables.forEach(table => {
      const tableName = table.name;

      // 构建匹配模式，包含表名上下文
      const tableContextPattern = `"name": "${tableName}"[\\s\\S]*?"primaryKeys": \\[([\\s\\S]*?)\\]`;
      const match = jsonString.match(new RegExp(tableContextPattern));

      if (match) {
        const arrayContent = match[1] || '';
        const trimmedContent = arrayContent.trim();

        let replacement;
        if (trimmedContent === '') {
          // 空数组
          replacement = `"primaryKeys": [] as (keyof DB["${tableName}"])[]`;
        } else {
          // 非空数组，保持原有格式但添加类型断言
          replacement = `"primaryKeys": [${trimmedContent}] as (keyof DB["${tableName}"])[]`;
        }

        // 替换整个匹配的部分
        jsonString = jsonString.replace(match[0], match[0].replace(/\"primaryKeys\": \[[\s\S]*?\]/, replacement));
      }
    });

    return jsonString;
  }

  /**
   * 生成 TypeScript 文件
   */
  private generateTypeScriptFile(schemaContent: string, outputPath: string): void {
    const tsContent = `/**
 * @file database-schema.ts
 * @description 数据库架构信息
 * @generated 自动生成，请勿手动修改
 */

import type { DB } from "./zod/index";

// 字段信息接口
export interface FieldInfo<T extends keyof DB = keyof DB> {
  name: string;
  type: string;
  kind: string;
  isRequired: boolean;
  isId: boolean;
  isUnique: boolean;
  isList: boolean;
  isArray: boolean;
  isOptional: boolean;
  defaultValue: any;
  relationName?: string;
  relationFromFields?: string[];
  relationToFields?: string[];
  relationOnDelete?: string;
}

// 表信息接口
export interface TableInfo<T extends keyof DB = keyof DB> {
  name: T;
  fields: FieldInfo<T>[];
  primaryKeys: (keyof DB[T])[]; // 类型安全的主键
  foreignKeys: ForeignKeyInfo<T>[];
  indexes: IndexInfo<T>[];
  isRelationTable: boolean;
}

// 外键信息接口
export interface ForeignKeyInfo<T extends keyof DB = keyof DB> {
  field: string;
  referencedTable: keyof DB;
  referencedField: string;
  onDelete: string;
  onUpdate: string;
}

// 索引信息接口
export interface IndexInfo<T extends keyof DB = keyof DB> {
  name: string;
  fields: string[];
  unique: boolean;
}

// 依赖关系信息接口
export interface DependencyInfo<T extends keyof DB = keyof DB> {
  table: T;
  dependsOn: (keyof DB)[];
  dependents: (keyof DB)[];
}

// 枚举信息接口
export interface EnumInfo {
  name: string;
  values: string[];
}

// 数据库架构信息接口
export interface DatabaseSchemaInfo {
  tables: TableInfo[];
  dependencies: DependencyInfo[];
  enums: EnumInfo[];
  generatedAt: string;
  version: string;
}

// 数据库架构信息
export const DATABASE_SCHEMA: DatabaseSchemaInfo = ${schemaContent};

// 类型安全的辅助函数
export function getTableInfo<T extends keyof DB>(tableName: T): TableInfo<T> | undefined {
  return DATABASE_SCHEMA.tables.find(table => table.name === tableName) as TableInfo<T> | undefined;
}

export function getForeignKeyInfo<T extends keyof DB>(tableName: T, fieldName: string): ForeignKeyInfo<T> | undefined {
  const table = getTableInfo(tableName);
  return table?.foreignKeys.find(fk => fk.field === fieldName);
}

export function isForeignKeyField<T extends keyof DB>(tableName: T, fieldName: string): boolean {
  return getForeignKeyInfo(tableName, fieldName) !== undefined;
}

export function getForeignKeyReference<T extends keyof DB>(tableName: T, fieldName: string): { table: keyof DB; field: string } | undefined {
  const fkInfo = getForeignKeyInfo(tableName, fieldName);
  return fkInfo ? { table: fkInfo.referencedTable, field: fkInfo.referencedField } : undefined;
}
`;

    writeFileSafely(outputPath, tsContent);
  }
}
