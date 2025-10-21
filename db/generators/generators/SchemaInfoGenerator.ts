/**
 * @file SchemaInfoGenerator.ts
 * @description 数据库架构信息生成器
 * 
 * 功能：
 * 1. 从 Prisma schema 生成数据库架构信息
 * 2. 包含表名、字段信息、主键、外键关系等
 * 3. 为 restore.js 提供架构驱动的恢复逻辑
 */

import { FileUtils, LogUtils } from "../utils/common";
import { PATHS } from "../config/generator.config";
import { RelationProcessor, type DependencyInfo as RelationDependencyInfo } from "../processors/RelationProcessor";

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
  isOptional: boolean;
  defaultValue?: any;
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
 * 依赖关系信息接口
 */
export interface DependencyInfo {
  table: string;
  dependsOn: string[];
  dependents: string[];
}

/**
 * 数据库架构信息生成器
 */
export class SchemaInfoGenerator {
  private dmmf: any;
  private relationProcessor: RelationProcessor;

  constructor(dmmf: any, relationProcessor: RelationProcessor) {
    this.dmmf = dmmf;
    this.relationProcessor = relationProcessor;
  }

  /**
   * 生成数据库架构信息
   */
  async generate(): Promise<void> {
    try {
      LogUtils.logStep("架构信息生成", "开始生成数据库架构信息...");
      
      LogUtils.logInfo("构建架构信息...");
      const schemaInfo = this.buildSchemaInfo();
      
      LogUtils.logInfo("生成 TypeScript 文件...");
      this.generateTypeScriptFile(schemaInfo);
      
      LogUtils.logSuccess("架构信息生成完成");
    } catch (error) {
      LogUtils.logError("架构信息生成失败", error as Error);
      throw error;
    }
  }

  /**
   * 构建架构信息
   */
  private buildSchemaInfo(): DatabaseSchemaInfo {
    const tables: TableInfo[] = [];
    const enums: EnumInfo[] = [];

    // 处理每个模型
    for (const model of this.dmmf.datamodel.models) {
      const tableInfo = this.buildTableInfo(model);
      tables.push(tableInfo);
    }

    // 处理枚举：从 DMMF 中提取枚举信息
    for (const enumModel of this.dmmf.datamodel.enums) {
      const enumInfo: EnumInfo = {
        name: enumModel.name,
        values: enumModel.values.map((v: any) => v.name)
      };
      enums.push(enumInfo);
    }

    // 使用 RelationProcessor 获取依赖关系
    const dependencies = this.relationProcessor.getDependencies().map(dep => ({
      ...dep,
      dependents: [] // 暂时设为空数组，后续可以扩展
    }));

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
  private buildTableInfo(model: any): TableInfo {
    const fields: FieldInfo[] = [];
    const primaryKeys: string[] = [];
    const foreignKeys: ForeignKeyInfo[] = [];
    const indexes: IndexInfo[] = [];

    // 处理字段
    for (const field of model.fields) {
      const fieldInfo: FieldInfo = {
        name: field.name,
        type: field.type,
        kind: field.kind,
        isRequired: field.isRequired,
        isId: field.isId,
        isUnique: field.isUnique,
        isList: field.isList,
        isArray: field.isList,
        isOptional: !field.isRequired,
        defaultValue: field.default,
        relationName: field.relationName,
        relationFromFields: field.relationFromFields,
        relationToFields: field.relationToFields,
        relationOnDelete: field.relationOnDelete
      };

      fields.push(fieldInfo);

      // 收集主键
      if (field.isId) {
        primaryKeys.push(field.name);
      }

      // 收集外键
      if (field.relationFromFields && field.relationFromFields.length > 0) {
        const foreignKey: ForeignKeyInfo = {
          field: field.name,
          referencedTable: field.type,
          referencedField: field.relationToFields?.[0] || 'id',
          onDelete: field.relationOnDelete || 'CASCADE',
          onUpdate: 'CASCADE'
        };
        foreignKeys.push(foreignKey);
      }
    }

    // 判断是否为关系表
    const isRelationTable = model.name.startsWith('_') && 
                           fields.length === 2 && 
                           fields.every(f => f.type === 'String');

    return {
      name: model.name,
      fields,
      primaryKeys,
      foreignKeys,
      indexes,
      isRelationTable
    };
  }

  /**
   * 生成 TypeScript 文件
   */
  private generateTypeScriptFile(schemaInfo: DatabaseSchemaInfo): void {
    const content = `/**
 * @file database-schema.ts
 * @description 数据库架构信息
 * @generated ${schemaInfo.generatedAt}
 * @version ${schemaInfo.version}
 * 
 * 此文件由 SchemaInfoGenerator 自动生成，请勿手动修改
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
  isOptional: boolean;
  defaultValue?: any;
  relationName?: string;
  relationFromFields?: string[];
  relationToFields?: string[];
  relationOnDelete?: string;
}

export interface TableInfo {
  name: string;
  fields: FieldInfo[];
  primaryKeys: string[];
  foreignKeys: ForeignKeyInfo[];
  indexes: IndexInfo[];
  isRelationTable: boolean;
}

export interface ForeignKeyInfo {
  field: string;
  referencedTable: string;
  referencedField: string;
  onDelete: string;
  onUpdate: string;
}

export interface IndexInfo {
  name: string;
  fields: string[];
  isUnique: boolean;
}

export interface EnumInfo {
  name: string;
  values: string[];
}

export interface DatabaseSchemaInfo {
  tables: TableInfo[];
  dependencies: DependencyInfo[];
  enums: EnumInfo[];
  generatedAt: string;
  version: string;
}

export interface DependencyInfo {
  table: string;
  dependsOn: string[];
  dependents: string[];
}

export const DATABASE_SCHEMA: DatabaseSchemaInfo = ${JSON.stringify(schemaInfo, null, 2)};

// 工具函数
export const SchemaUtils = {
  /**
   * 获取表信息
   */
  getTableInfo(tableName: string): TableInfo | undefined {
    return DATABASE_SCHEMA.tables.find(table => table.name === tableName);
  },

  /**
   * 获取表的所有依赖
   */
  getTableDependencies(tableName: string): string[] {
    const dependency = DATABASE_SCHEMA.dependencies.find(dep => dep.table === tableName);
    return dependency?.dependsOn || [];
  },

  /**
   * 获取依赖此表的表
   */
  getTableDependents(tableName: string): string[] {
    const dependency = DATABASE_SCHEMA.dependencies.find(dep => dep.table === tableName);
    return dependency?.dependents || [];
  },

  /**
   * 获取所有表名
   */
  getAllTableNames(): string[] {
    return DATABASE_SCHEMA.tables.map(table => table.name);
  },

  /**
   * 获取核心表（没有依赖的表）
   */
  getCoreTables(): string[] {
    return DATABASE_SCHEMA.dependencies
      .filter(dep => dep.dependsOn.length === 0)
      .map(dep => dep.table);
  },

  /**
   * 获取表的导入顺序（拓扑排序）
   */
  getImportOrder(): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const result: string[] = [];

    const visit = (tableName: string) => {
      if (visiting.has(tableName)) {
        throw new Error(\`循环依赖检测到: \${tableName}\`);
      }
      if (visited.has(tableName)) {
        return;
      }

      visiting.add(tableName);
      
      const dependency = DATABASE_SCHEMA.dependencies.find(dep => dep.table === tableName);
      if (dependency) {
        for (const dep of dependency.dependsOn) {
          visit(dep);
        }
      }

      visiting.delete(tableName);
      visited.add(tableName);
      result.push(tableName);
    };

    for (const table of DATABASE_SCHEMA.tables) {
      visit(table.name);
    }

    return result;
  }
};
`;

    FileUtils.safeWriteFile(PATHS.generated.databaseSchema, content);
  }

}
