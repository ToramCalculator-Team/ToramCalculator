/**
 * @file SchemaInfoGenerator.ts
 * @description 数据库架构信息生成器 - 重构版本
 * 
 * 功能：
 * 1. 从 Prisma DMMF 生成数据库架构信息
 * 2. 包含表名、字段信息、主键、外键关系等
 * 3. 提供完整的类型安全支持
 */

import { FileUtils, LogUtils } from "../utils/common";
import { PATHS } from "../config/generator.config";
import type { DB } from "../../generated/zod/index";
import type { DMMF } from "@prisma/generator-helper";

/**
 * 字段信息接口 - 类型安全版本
 */
export interface FieldInfo<T extends keyof DB = keyof DB> {
  name: string; // 使用 string 而不是 keyof DB[T]，避免联合类型问题
  type: string;
  kind: string;
  isRequired: boolean;
  isId: boolean;
  isUnique: boolean;
  isList: boolean;
  isArray: boolean;
  isOptional: boolean;
  defaultValue?: any;
  relationName?: string;
  relationFromFields?: string[];
  relationToFields?: string[];
  relationOnDelete?: string;
}

/**
 * 表信息接口 - 类型安全版本
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
 * 外键信息接口 - 类型安全版本
 */
export interface ForeignKeyInfo<T extends keyof DB = keyof DB> {
  field: string; // 使用 string 而不是 keyof DB[T]，避免联合类型问题
  referencedTable: keyof DB;
  referencedField: string; // 使用 string 而不是复杂的泛型约束
  onDelete: string;
  onUpdate: string;
}

/**
 * 索引信息接口 - 类型安全版本
 */
export interface IndexInfo<T extends keyof DB = keyof DB> {
  name: string;
  fields: string[]; // 使用 string[] 而不是 (keyof DB[T])[]
  isUnique: boolean;
}

/**
 * 枚举信息接口
 */
export interface EnumInfo {
  name: string;
  values: string[];
}

/**
 * 依赖关系信息接口 - 类型安全版本
 */
export interface DependencyInfo {
  table: keyof DB;
  dependsOn: (keyof DB)[];
  dependents: (keyof DB)[];
}

/**
 * 数据库架构信息接口 - 类型安全版本
 */
export interface DatabaseSchemaInfo {
  tables: TableInfo[];
  dependencies: DependencyInfo[];
  enums: EnumInfo[];
  generatedAt: string;
  version: string;
}

/**
 * SchemaInfoGenerator 类 - 重构版本
 */
export class SchemaInfoGenerator {
  private dmmf: DMMF.Document;

  constructor(dmmf: DMMF.Document) {
    this.dmmf = dmmf;
  }

  /**
   * 生成数据库架构信息
   */
  async generate(): Promise<void> {
    try {
      LogUtils.logInfo("构建架构信息...");
      const schemaInfo = this.buildSchemaInfo();
      
      LogUtils.logInfo("生成 TypeScript 文件...");
      this.generateTypeScriptFile(schemaInfo);
      
    } catch (error) {
      LogUtils.logError("架构信息生成失败", error as Error);
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
      defaultValue: field.default,
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
  private buildIndexes(model: any): IndexInfo[] {
    // 这里可以根据需要实现索引信息的构建
    return [];
  }

  /**
   * 检查是否为关系表
   */
  private isRelationTable(model: any): boolean {
    // 关系表通常没有业务字段，只有外键字段
    const businessFields = model.fields.filter((field: any) => 
      field.kind === 'scalar' && !field.isId && !field.relationFromFields
    );
    return businessFields.length === 0;
  }

  /**
   * 构建依赖关系
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
    let jsonString = JSON.stringify(schemaInfo, null, 2);
    
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
  private generateTypeScriptFile(schemaInfo: DatabaseSchemaInfo): void {
    const content = `/**
 * @file database-schema.ts
 * @description 数据库架构信息 - 类型安全版本
 * @generated ${schemaInfo.generatedAt}
 * @version ${schemaInfo.version}
 * 
 * 此文件由 SchemaInfoGenerator 自动生成，请勿手动修改
 */

import type { DB } from "./zod/index";

/**
 * 字段信息接口 - 类型安全版本
 */
export interface FieldInfo<T extends keyof DB = keyof DB> {
  name: string; // 使用 string 而不是 keyof DB[T]，避免联合类型问题
  type: string;
  kind: string;
  isRequired: boolean;
  isId: boolean;
  isUnique: boolean;
  isList: boolean;
  isArray: boolean;
  isOptional: boolean;
  defaultValue?: any;
  relationName?: string;
  relationFromFields?: string[];
  relationToFields?: string[];
  relationOnDelete?: string;
}

/**
 * 表信息接口 - 类型安全版本
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
 * 外键信息接口 - 类型安全版本
 */
export interface ForeignKeyInfo<T extends keyof DB = keyof DB> {
  field: string; // 使用 string 而不是 keyof DB[T]，避免联合类型问题
  referencedTable: keyof DB;
  referencedField: string; // 使用 string 而不是复杂的泛型约束
  onDelete: string;
  onUpdate: string;
}

/**
 * 索引信息接口 - 类型安全版本
 */
export interface IndexInfo<T extends keyof DB = keyof DB> {
  name: string;
  fields: string[]; // 使用 string[] 而不是 (keyof DB[T])[]
  isUnique: boolean;
}

/**
 * 枚举信息接口
 */
export interface EnumInfo {
  name: string;
  values: string[];
}

/**
 * 依赖关系信息接口 - 类型安全版本
 */
export interface DependencyInfo {
  table: keyof DB;
  dependsOn: (keyof DB)[];
  dependents: (keyof DB)[];
}

/**
 * 数据库架构信息接口 - 类型安全版本
 */
export interface DatabaseSchemaInfo {
  tables: TableInfo[];
  dependencies: DependencyInfo[];
  enums: EnumInfo[];
  generatedAt: string;
  version: string;
}

export const DATABASE_SCHEMA: DatabaseSchemaInfo = ${this.generateSchemaWithTypeAssertions(schemaInfo)};

  /**
   * 获取表信息
   */
export function getTableInfo<T extends keyof DB>(tableName: T): TableInfo<T> | undefined {
  return DATABASE_SCHEMA.tables.find(table => table.name === tableName) as TableInfo<T> | undefined;
}

/**
 * 获取表的外键信息
 */
export function getForeignKeyInfo<T extends keyof DB>(tableName: T): ForeignKeyInfo<T>[] {
  const table = getTableInfo(tableName);
  return table?.foreignKeys || [];
}

/**
 * 获取表的依赖关系
 */
export function getTableDependencies<T extends keyof DB>(tableName: T): DependencyInfo | undefined {
    const dependency = DATABASE_SCHEMA.dependencies.find(dep => dep.table === tableName);
  return dependency;
}

  /**
 * 获取表的所有依赖表
   */
export function getTableDependents<T extends keyof DB>(tableName: T): DependencyInfo | undefined {
    const dependency = DATABASE_SCHEMA.dependencies.find(dep => dep.table === tableName);
  return dependency;
}

  /**
   * 获取所有表名
   */
export function getAllTableNames(): (keyof DB)[] {
  return DATABASE_SCHEMA.tables.map(table => table.name) as (keyof DB)[];
}

/**
 * 获取表的依赖顺序（拓扑排序）
 */
export function getTableDependencyOrder(): (keyof DB)[] {
    return DATABASE_SCHEMA.dependencies
    .sort((a, b) => a.dependsOn.length - b.dependsOn.length)
      .map(dep => dep.table);
}

/**
 * 检查表是否有依赖
 */
export function hasDependencies<T extends keyof DB>(tableName: T): boolean {
  const dependency = DATABASE_SCHEMA.dependencies.find(dep => dep.table === tableName);
  return dependency ? dependency.dependsOn.length > 0 : false;
}

/**
 * 获取表的所有依赖表（递归）
 */
export function getAllDependencies<T extends keyof DB>(tableName: T): (keyof DB)[] {
  const visited = new Set<keyof DB>();
  const dependencies: (keyof DB)[] = [];
  
  function collectDependencies(table: keyof DB) {
    if (visited.has(table)) return;
    visited.add(table);
    
    const dependency = DATABASE_SCHEMA.dependencies.find(dep => dep.table === table);
      if (dependency) {
      dependency.dependsOn.forEach(dep => {
        dependencies.push(dep);
        collectDependencies(dep);
      });
    }
  }
  
  collectDependencies(tableName);
  return dependencies;
}

/**
 * 检查字段是否为外键字段
 */
export function isForeignKeyField<T extends keyof DB>(
  tableName: T, 
  fieldName: keyof DB[T]
): boolean {
  const foreignKeys = getForeignKeyInfo(tableName);
  return foreignKeys.some(fk => fk.field === fieldName);
}

/**
 * 获取外键字段的引用信息
 */
export function getForeignKeyReference<T extends keyof DB>(
  tableName: T, 
  fieldName: keyof DB[T]
): ForeignKeyInfo<T> | undefined {
  const foreignKeys = getForeignKeyInfo(tableName);
  return foreignKeys.find(fk => fk.field === fieldName);
}
`;

    FileUtils.safeWriteFile(PATHS.generated.databaseSchema, content);
    LogUtils.logSuccess("生成 database-schema.ts");
  }
}
