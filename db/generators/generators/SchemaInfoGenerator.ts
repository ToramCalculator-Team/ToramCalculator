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

    // 处理中间表
    const intermediateTables = this.extractIntermediateTables();
    for (const table of intermediateTables) {
      tables.push(table);
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
   * 从 SQL 文件中提取中间表信息
   * @returns 中间表信息数组
   */
  private extractIntermediateTables(): TableInfo[] {
    const intermediateTables: TableInfo[] = [];
    
    try {
      const sqlContent = FileUtils.safeReadFile(PATHS.serverDB.sql);
      
      // 匹配 CREATE TABLE "_tableName" 的模式
      const createTableRegex = /CREATE TABLE "(_[^"]+)"\s*\(([\s\S]*?)\);/g;
      let match;
      
      while ((match = createTableRegex.exec(sqlContent)) !== null) {
        const tableName = match[1];
        const fieldsContent = match[2];
        
        // 提取字段信息
        const fields: FieldInfo[] = [];
        const primaryKeys: string[] = [];
        
        // 匹配字段定义：字段名 类型 [NOT NULL]
        const fieldRegex = /"([^"]+)"\s+([A-Z]+)(?:\s+NOT\s+NULL)?(?:,|\s*$)/g;
        let fieldMatch;
        
        while ((fieldMatch = fieldRegex.exec(fieldsContent)) !== null) {
          const fieldName = fieldMatch[1];
          const fieldType = fieldMatch[2];
          
          // 确保是真正的字段定义，不是约束
          if (fieldName && fieldType && !fieldName.includes('CONSTRAINT') && !fieldName.includes('PRIMARY') && !fieldName.includes('FOREIGN')) {
            const fieldInfo: FieldInfo = {
              name: fieldName,
              type: this.convertSqlTypeToPrismaType(fieldType),
              kind: 'scalar',
              isRequired: true,
              isId: false,
              isUnique: false,
              isList: false,
              isArray: false,
              isOptional: false
            };
            
            fields.push(fieldInfo);
            primaryKeys.push(fieldName); // 中间表的所有字段都是主键的一部分
          }
        }
        
        if (fields.length > 0) {
          const tableInfo: TableInfo = {
            name: tableName,
            fields: fields,
            primaryKeys: primaryKeys,
            foreignKeys: [],
            indexes: [],
            isRelationTable: true
          };
          
          intermediateTables.push(tableInfo);
        }
      }
    } catch (error) {
      console.warn('Failed to extract intermediate tables from SQL:', error);
    }
    
    return intermediateTables;
  }

  /**
   * 将 SQL 类型转换为 Prisma 类型
   */
  private convertSqlTypeToPrismaType(sqlType: string): string {
    switch (sqlType.toLowerCase()) {
      case 'varchar':
      case 'text':
      case 'char':
        return 'String';
      case 'int':
      case 'integer':
      case 'serial':
        return 'Int';
      case 'bigint':
      case 'bigserial':
        return 'BigInt';
      case 'boolean':
      case 'bool':
        return 'Boolean';
      case 'timestamp':
      case 'timestamptz':
        return 'DateTime';
      case 'json':
      case 'jsonb':
        return 'Json';
      default:
        return 'String';
    }
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
