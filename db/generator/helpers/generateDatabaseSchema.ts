/**
 * @file generateDatabaseSchema.ts
 * @description 数据库架构信息生成器
 * 从 Prisma DMMF 生成数据库架构信息
 */

import type { DMMF } from "@prisma/generator-helper";
import { writeFileSafely } from "../utils/writeFileSafely";

/**
 * 字段信息接口
 */
export interface FieldInfo {
  name: string;
  type: string;
  kind: string;
  isRequired: boolean;
  isId: boolean;
  isUnique: boolean;
  isList: boolean;
  isArray: boolean;
  isOptional: boolean
  relationName?: string;
  relationFromFields?: string[];
  relationToFields?: string[];
  relationOnDelete?: string;
}

/**
 * 表信息接口
 */
export interface TableInfo {
  name: string;
  fields: FieldInfo[];
  primaryKeys: string[];
  foreignKeys: ForeignKeyInfo[];
  indexes: IndexInfo[];
  isRelationTable: boolean;
}

/**
 * 外键信息接口
 */
export interface ForeignKeyInfo {
  field: string;
  referencedTable: string;
  referencedField: string;
  onDelete: string;
  onUpdate: string;
}

/**
 * 索引信息接口
 */
export interface IndexInfo {
  name: string;
  fields: string[];
  unique: boolean;
}

/**
 * 依赖关系信息接口
 */
export interface DependencyInfo {
  table: string;
  dependsOn: string[];
  dependents: string[];
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
  private allModels: readonly DMMF.Model[];

  constructor(dmmf: DMMF.Document, allModels: DMMF.Model[]) {
    this.dmmf = dmmf;
    this.allModels = allModels;
  }

  /**
   * 生成数据库架构信息
   */
  async generate(outputPath: string): Promise<void> {
    try {
      console.log("📊 生成数据库架构信息...");
      
      const schemaInfo = this.buildSchemaInfo();
      
      // 生成 TypeScript 文件
      this.generateTypeScriptFile(schemaInfo, outputPath);
      
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
    return this.allModels.map((model: DMMF.Model) => {
      const fields = this.buildFields(model);
      const primaryKeys = this.buildPrimaryKeys(model);
      const foreignKeys = this.buildForeignKeys(model);
      const indexes = this.buildIndexes(model);
      const isRelationTable = this.isRelationTable(model);

      // 使用 dbName 或 name，与 DB 接口保持一致
      const tableName = model.dbName || model.name;

      return {
        name: tableName,
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
    
    // 构建表名映射（模型名 -> 表名）
    const modelToTableName = new Map<string, string>();
    this.allModels.forEach((m: DMMF.Model) => {
      const tableName = m.dbName || m.name;
      modelToTableName.set(m.name, tableName);
    });
    
    for (const field of model.fields) {
      if (field.kind === 'object' && field.relationFromFields && field.relationFromFields.length > 0) {
        // 这是一个外键字段
        const relationFromField = field.relationFromFields[0];
        const relationToField = field.relationToFields?.[0] || 'id';
        
        // 获取引用表的实际表名
        const referencedTableName = modelToTableName.get(field.type) || field.type;
        
        foreignKeys.push({
          field: relationFromField,
          referencedTable: referencedTableName,
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
    
    // 构建表名映射（模型名 -> 表名）
    const modelToTableName = new Map<string, string>();
    this.allModels.forEach((model: DMMF.Model) => {
      const tableName = model.dbName || model.name;
      modelToTableName.set(model.name, tableName);
    });
    
    // 简化的依赖关系构建
    this.allModels.forEach((model: DMMF.Model) => {
      const tableName = model.dbName || model.name;
      const dependsOn: string[] = [];
      
      model.fields.forEach((field: DMMF.Field) => {
        if (field.kind === 'object' && field.type !== model.name && field.relationFromFields && field.relationFromFields.length > 0) {
          // 获取引用表的实际表名
          const referencedTableName = modelToTableName.get(field.type) || field.type;
          dependsOn.push(referencedTableName);
        }
      });
      
      if (dependsOn.length > 0) {
        dependencies.push({
          table: tableName,
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
   * 生成 TypeScript 文件
   */
  private generateTypeScriptFile(schemaInfo: DatabaseSchemaInfo, outputPath: string): void {
    const jsonContent = JSON.stringify(schemaInfo, null, 2);

    const tsContent = `/**
 * @file database-schema.ts
 * @description 数据库架构信息
 * @generated 自动生成，请勿手动修改
 */

import type { DB } from "@db/generated/zod/index";

// 字段信息接口
export interface FieldInfo {
  name: string;
  type: string;
  kind: string;
  isRequired: boolean;
  isId: boolean;
  isUnique: boolean;
  isList: boolean;
  isArray: boolean;
  isOptional: boolean;
  relationName?: string;
  relationFromFields?: string[];
  relationToFields?: string[];
  relationOnDelete?: string;
}

// 表信息接口
export interface TableInfo {
  name: string;
  fields: FieldInfo[];
  primaryKeys: string[]; // 主键字段名数组
  foreignKeys: ForeignKeyInfo[];
  indexes: IndexInfo[];
  isRelationTable: boolean;
}

// 外键信息接口
export interface ForeignKeyInfo {
  field: string;
  referencedTable: string;
  referencedField: string;
  onDelete: string;
  onUpdate: string;
}

// 索引信息接口
export interface IndexInfo {
  name: string;
  fields: string[];
  unique: boolean;
}

// 依赖关系信息接口
export interface DependencyInfo {
  table: string;
  dependsOn: string[];
  dependents: string[];
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
export const DATABASE_SCHEMA: DatabaseSchemaInfo = ${jsonContent};

// 类型安全的辅助函数
export function getTableInfo(tableName: keyof DB): TableInfo | undefined {
  return DATABASE_SCHEMA.tables.find(table => table.name === tableName);
}

export function getForeignKeyInfo(tableName: keyof DB, fieldName: string): ForeignKeyInfo | undefined {
  const table = getTableInfo(tableName);
  return table?.foreignKeys.find(fk => fk.field === fieldName);
}

export function isForeignKeyField(tableName: keyof DB, fieldName: string): boolean {
  return getForeignKeyInfo(tableName, fieldName) !== undefined;
}

export function getForeignKeyReference(tableName: keyof DB, fieldName: string): { table: keyof DB; field: string } | undefined {
  const fkInfo = getForeignKeyInfo(tableName, fieldName);
  if (!fkInfo) return undefined;
  
  // 类型断言：确保返回值符合 keyof DB
  return {
    table: fkInfo.referencedTable as keyof DB,
    field: fkInfo.referencedField
  };
}

export function getForeignKeyFields(tableName: keyof DB): string[] {
  const table = getTableInfo(tableName);
  return table?.foreignKeys.map(fk => fk.field) || [];
}

export function getPrimaryKeyFields(tableName: keyof DB): string[] {
  const table = getTableInfo(tableName);
  return table?.primaryKeys || [];
}

export function isPrimaryKeyField(tableName: keyof DB, fieldName: string): boolean {
  const pkFields = getPrimaryKeyFields(tableName);
  return pkFields.includes(fieldName);
}

// 类型安全的包装函数（可选，提供额外的类型安全）
export function getPrimaryKeyFieldsTyped<T extends keyof DB>(tableName: T): (keyof DB[T])[] {
  const table = getTableInfo(tableName);
  return table?.primaryKeys as (keyof DB[T])[] || [];
}
`;

    writeFileSafely(outputPath, tsContent);
  }
}
