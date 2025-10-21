/**
 * @file schemaParser.ts
 * @description Prisma Schema 解析器和关系分析器
 *
 * 功能：
 * 1. 解析 Prisma schema 文件
 * 2. 检测模型和关系
 * 3. 分析关系类型（一对多、多对多）
 * 4. 生成关系表名称
 * 5. 解析枚举定义
 * 6. 解析字段信息（包括枚举类型）
 * 7. 生成 Kysely 查询代码
 * 8. 关系工具函数
 */

import { DMMF } from "@prisma/generator-helper";
import { StringUtils } from "./common";
import { shouldSkipSubRelationsForCircularRef, getCircularReferenceStrategy } from "../repository.config";

/**
 * 关系类型
 */
export enum RelationType {
  OneToOne = "ONE_TO_ONE",
  OneToMany = "ONE_TO_MANY",
  ManyToMany = "MANY_TO_MANY",
}

/**
 * 关系信息接口
 */
export interface RelationInfo {
  name: string;
  type: RelationType;
  targetTable: string;
  foreignKey?: string;
  relationName?: string;
  relationFromFields?: string[];
  relationToFields?: string[];
  buildCode: string;
  schemaCode: string;
}

/**
 * 生成的关系代码接口
 */
export interface GeneratedRelation {
  name: string;
  buildCode: string;
  schemaCode: string;
}

/**
 * 模型字段接口
 */
interface ModelField {
  name: string;
  type: string;
  isOptional: boolean;
  enumType?: string;
}

/**
 * 模型接口
 */
interface Model {
  name: string;
  fields: ModelField[];
}

/**
 * 关系接口
 */
interface Relation {
  from: string;
  to: string;
  type: string;
}

/**
 * Schema 分析结果接口
 */
interface SchemaAnalysis {
  models: Map<string, any>;
  relations: Relation[];
  relationTables: string[];
  enums: Record<string, string[]>;
  detailedModels: Model[];
}

/**
 * Schema 解析器和关系分析器
 */
export class SchemaParser {
  private models: any[] = [];

  constructor(models: any[]) {
    this.models = models;
  }

  /**
   * 分析 Prisma schema 内容
   * @param schemaContent - Prisma schema 文件内容
   * @returns 分析结果
   */
  static analyzeSchema(schemaContent: string): SchemaAnalysis {
    const models = this.extractModels(schemaContent);
    const relations = this.extractRelations(schemaContent, models);
    const relationTables = this.detectRelationTables(schemaContent, relations);
    const enums = this.parseEnums(schemaContent);
    const detailedModels = this.parseDetailedModels(schemaContent);

    return {
      models,
      relations,
      relationTables,
      enums,
      detailedModels,
    };
  }

  /**
   * 提取所有模型信息
   * @param schemaContent - Prisma schema 内容
   * @returns 模型信息映射
   */
  static extractModels(schemaContent: string): Map<string, any> {
    const models = new Map();
    const modelRegex = /model\s+(\w+)\s*\{/g;
    let match;

    while ((match = modelRegex.exec(schemaContent)) !== null) {
      const modelName = match[1];
      models.set(modelName, {
        name: modelName,
        fields: [],
      });
    }

    return models;
  }

  /**
   * 提取关系信息
   * @param schemaContent - Prisma schema 内容
   * @param models - 模型映射
   * @returns 关系数组
   */
  static extractRelations(schemaContent: string, models: Map<string, any>): Relation[] {
    const relations: Relation[] = [];
    const relationRegex = /(\w+)\s+(\w+)\s+@relation\([^)]*\)/g;
    let match;

    while ((match = relationRegex.exec(schemaContent)) !== null) {
      const [, fromModel, toModel] = match;
      relations.push({
        from: fromModel,
        to: toModel,
        type: 'relation',
      });
    }

    return relations;
  }

  /**
   * 检测关系表
   * @param schemaContent - Prisma schema 内容
   * @param relations - 关系数组
   * @returns 关系表名称数组
   */
  static detectRelationTables(schemaContent: string, relations: Relation[]): string[] {
    const relationTables: string[] = [];
    
    // 查找多对多关系表
    const manyToManyRegex = /model\s+(_\w+To\w+)\s*\{/g;
    let match;

    while ((match = manyToManyRegex.exec(schemaContent)) !== null) {
      relationTables.push(match[1]);
    }

    return relationTables;
  }

  /**
   * 解析枚举定义
   * @param schemaContent - Prisma schema 内容
   * @returns 枚举映射
   */
  static parseEnums(schemaContent: string): Record<string, string[]> {
    const enums: Record<string, string[]> = {};
    const enumRegex = /enum\s+(\w+)\s*\{([^}]+)\}/g;
    let match;

    while ((match = enumRegex.exec(schemaContent)) !== null) {
      const enumName = match[1];
      const enumBody = match[2];
      const values = enumBody
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('//'))
        .map(line => line.replace(/,/g, '').trim());

      enums[enumName] = values;
    }

    return enums;
  }

  /**
   * 解析详细模型信息
   * @param schemaContent - Prisma schema 内容
   * @returns 详细模型数组
   */
  static parseDetailedModels(schemaContent: string): Model[] {
    const models: Model[] = [];
    const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
    let match;

    while ((match = modelRegex.exec(schemaContent)) !== null) {
      const modelName = match[1];
      const modelBody = match[2];
      
      const fields: ModelField[] = [];
      const fieldLines = modelBody.split('\n');

      for (const line of fieldLines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith('//') || trimmedLine.startsWith('@@')) {
          continue;
        }

        const fieldMatch = trimmedLine.match(/(\w+)\s+(\w+)(\?)?/);
        if (fieldMatch) {
          const [, fieldName, fieldType, option] = fieldMatch;
          fields.push({
            name: fieldName,
            type: fieldType,
            isOptional: !!option,
            enumType: this.isEnumType(fieldType) ? fieldType : undefined,
          });
        }
      }

      models.push({
        name: modelName,
        fields,
      });
    }

    return models;
  }

  /**
   * 检查是否为枚举类型
   * @param type - 类型名称
   * @returns 是否为枚举类型
   */
  private static isEnumType(type: string): boolean {
    // 简单的枚举类型检测逻辑
    return /^[A-Z][a-zA-Z]*$/.test(type.replace(/\?$/, '').replace(/\[\]$/, ''));
  }

  // ==================== 关系分析功能 ====================

  /**
   * 获取模型的所有关系
   */
  getModelRelations(modelName: string): RelationInfo[] {
    const model = this.models.find(m => m.name === modelName);
    if (!model) {
      return [];
    }

    const relations: RelationInfo[] = [];
    
    for (const field of model.fields) {
      if (field.kind === 'object') {
        const relationInfo = this.analyzeRelation(field, model);
        if (relationInfo) {
          relations.push(relationInfo);
        }
      }
    }

    return relations;
  }

  /**
   * 分析单个关系字段
   */
  private analyzeRelation(field: any, model: any): RelationInfo | null {
    const relationType = this.determineRelationType(field, model);
    const targetTable = field.type.toLowerCase();
    const targetPrimaryKey = this.getPrimaryKeyField(field.type);

    let buildCode = '';
    let schemaCode = '';

    switch (relationType) {
      case RelationType.OneToOne:
        buildCode = this.generateOneToOneCode(field, model, targetTable, targetPrimaryKey);
        schemaCode = this.generateSchemaCode(field, model, targetTable);
        break;
      case RelationType.OneToMany:
        buildCode = this.generateOneToManyCode(field, model, targetTable, targetPrimaryKey);
        schemaCode = this.generateSchemaCode(field, model, targetTable);
        break;
      case RelationType.ManyToMany:
        buildCode = this.generateManyToManyCode(field, model, targetTable, targetPrimaryKey);
        schemaCode = this.generateSchemaCode(field, model, targetTable);
        break;
    }

    return {
      name: field.name,
      type: relationType,
      targetTable,
      foreignKey: field.relationFromFields?.[0],
      relationName: field.relationName,
      relationFromFields: field.relationFromFields,
      relationToFields: field.relationToFields,
      buildCode,
      schemaCode,
    };
  }

  /**
   * 确定关系类型
   */
  private determineRelationType(field: any, model: any): RelationType {
    if (field.isList) {
      // 检查是否有反向外键字段
      const hasReverseForeignKey = this.hasReverseForeignKey(field.type, model.name);
      
      if (hasReverseForeignKey) {
        return RelationType.OneToMany;
      } else {
        return RelationType.ManyToMany;
      }
    }
    
    return RelationType.OneToOne;
  }

  /**
   * 检查是否有反向外键
   */
  private hasReverseForeignKey(targetModelName: string, currentModelName: string): boolean {
    const targetModel = this.models.find(m => m.name === targetModelName);
    if (!targetModel) {
      return false;
    }

    // 检查目标模型是否有指向当前模型的关系字段
    return targetModel.fields.some((field: any) => 
      field.kind === 'object' && 
      field.type === currentModelName &&
      field.relationFromFields && 
      field.relationFromFields.length > 0
    );
  }

  /**
   * 生成一对一关系代码
   */
  private generateOneToOneCode(field: any, model: any, targetTable: string, targetPrimaryKey: string): string {
    const isParentRelation = this.isBusinessParentRelation(field.name);
    const shouldSkipForCircularRef = shouldSkipSubRelationsForCircularRef(model.name.toLowerCase(), field.name);
    
    if (isParentRelation || shouldSkipForCircularRef) {
      // 父关系或循环引用处理：外键在当前模型中，指向目标模型
      // whereRef("targetTable.targetPrimaryKey", "=", "currentModel.foreignKey")
      const foreignKey = this.getRelationForeignKey(field, model, targetTable);
      return `(eb) =>
        jsonObjectFrom(
          eb
            .selectFrom("${targetTable}")
            .whereRef("${targetTable}.${targetPrimaryKey}", "=", "${model.name.toLowerCase()}.${foreignKey}")
            .selectAll("${targetTable}")
        ).$notNull().as("${field.name}")`;
    } else {
      // 子关系：检查是否有 relationFromFields
      if (field.relationFromFields && field.relationFromFields.length > 0) {
        // 外键在当前模型中，指向目标模型
        // whereRef("targetTable.targetPrimaryKey", "=", "currentModel.foreignKey")
        const foreignKey = field.relationFromFields[0];
        if (shouldSkipForCircularRef) {
          // 循环引用处理：不包含子关系查询
          return `(eb) =>
            jsonObjectFrom(
              eb
                .selectFrom("${targetTable}")
                .whereRef("${targetTable}.${targetPrimaryKey}", "=", "${model.name.toLowerCase()}.${foreignKey}")
                .selectAll("${targetTable}")
            ).$notNull().as("${field.name}")`;
        } else {
          // 正常情况：包含子关系查询
          return `(eb) =>
            jsonObjectFrom(
              eb
                .selectFrom("${targetTable}")
                .whereRef("${targetTable}.${targetPrimaryKey}", "=", "${model.name.toLowerCase()}.${foreignKey}")
                .selectAll("${targetTable}")
                .select((subEb) => ${StringUtils.toCamelCase(targetTable)}SubRelations(subEb, subEb.val("${targetTable}.${targetPrimaryKey}"))),
            ).$notNull().as("${field.name}")`;
        }
      } else {
        // 外键在目标表中，指向当前模型
        // whereRef("targetTable.foreignKey", "=", "currentModel.primaryKey")
        const reverseForeignKey = `${model.name.toLowerCase()}Id`;
        if (shouldSkipForCircularRef) {
          // 循环引用处理：不包含子关系查询
          return `(eb) =>
            jsonObjectFrom(
              eb
                .selectFrom("${targetTable}")
                .whereRef("${targetTable}.${reverseForeignKey}", "=", "${model.name.toLowerCase()}.${this.getPrimaryKeyField(model.name)}")
                .selectAll("${targetTable}")
            ).$notNull().as("${field.name}")`;
        } else {
          // 正常情况：包含子关系查询
          return `(eb) =>
            jsonObjectFrom(
              eb
                .selectFrom("${targetTable}")
                .whereRef("${targetTable}.${reverseForeignKey}", "=", "${model.name.toLowerCase()}.${this.getPrimaryKeyField(model.name)}")
                .selectAll("${targetTable}")
                .select((subEb) => ${StringUtils.toCamelCase(targetTable)}SubRelations(subEb, subEb.val("${targetTable}.${targetPrimaryKey}"))),
            ).$notNull().as("${field.name}")`;
        }
      }
    }
  }

  /**
   * 生成一对多关系代码
   */
  private generateOneToManyCode(field: any, model: any, targetTable: string, targetPrimaryKey: string): string {
    // 一对多关系通常是子关系，外键在目标表中
    // 使用 DMMF 提供的关系信息
    let foreignKey: string;
    if (field.relationToFields && field.relationToFields.length > 0) {
      // 使用 relationToFields 确定目标表中的外键字段名
      foreignKey = field.relationToFields[0];
    } else {
      // 对于隐式关系，从目标表中找到实际的外键字段名
      const targetModel = this.models.find(m => m.name === targetTable);
      if (targetModel) {
        // 查找指向当前模型的外键字段
        const foreignKeyField = targetModel.fields.find((f: any) => 
          f.relationFromFields && f.relationFromFields.length > 0 && 
          f.type === model.name
        );
        if (foreignKeyField) {
          foreignKey = foreignKeyField.relationFromFields[0];
        } else {
          // 使用默认命名
          foreignKey = `${model.name.toLowerCase()}Id`;
        }
      } else {
        // 使用默认命名
        foreignKey = `${model.name.toLowerCase()}Id`;
      }
    }
    
    return `(eb) =>
      jsonArrayFrom(
        eb
          .selectFrom("${targetTable}")
          .whereRef("${targetTable}.${foreignKey}", "=", "${model.name.toLowerCase()}.${this.getPrimaryKeyField(model.name)}")
          .selectAll("${targetTable}")
          .select((subEb) => ${StringUtils.toCamelCase(targetTable)}SubRelations(subEb, subEb.val("${targetTable}.${targetPrimaryKey}"))),
      ).as("${field.name}")`;
  }

  /**
   * 生成多对多关系代码
   */
  private generateManyToManyCode(field: any, model: any, targetTable: string, targetPrimaryKey: string): string {
    // 确定关系表名
    let actualRelationTable = field.relationName;
    if (!actualRelationTable) {
      // 生成默认关系表名
      const table1 = model.name.toLowerCase();
      const table2 = targetTable;
      const sortedNames = [table1, table2].sort();
      actualRelationTable = `_${sortedNames[0]}To${sortedNames[1]}`;
    } else {
      actualRelationTable = `_${actualRelationTable}`;
    }

    // 检查是否为自引用关系
    const isSelfReference = model.name.toLowerCase() === targetTable.toLowerCase();
    
    if (isSelfReference) {
      // 自引用关系不使用子关系查询，避免循环引用
      return `(eb, id) =>
      jsonArrayFrom(
        eb
          .selectFrom("${actualRelationTable}")
          .innerJoin("${targetTable}", (join) => join.onRef("${actualRelationTable}.B", "=", "${targetTable}.${targetPrimaryKey}"))
          .where("${actualRelationTable}.A", "=", id)
          .selectAll("${targetTable}")
      ).as("${field.name}")`;
    } else {
      // 非自引用关系使用子关系查询
      return `(eb, id) =>
      jsonArrayFrom(
        eb
          .selectFrom("${actualRelationTable}")
          .innerJoin("${targetTable}", (join) => join.onRef("${actualRelationTable}.B", "=", "${targetTable}.${targetPrimaryKey}"))
          .where("${actualRelationTable}.A", "=", id)
          .selectAll("${targetTable}")
          .select((subEb) => ${StringUtils.toCamelCase(targetTable)}SubRelations(subEb, subEb.val("${targetTable}.${targetPrimaryKey}"))),
      ).as("${field.name}")`;
    }
  }

  /**
   * 生成 Schema 代码
   */
  private generateSchemaCode(field: any, model: any, targetTable: string): string {
    const isParentRelation = this.isBusinessParentRelation(field.name);
    const isSelfReference = model.name.toLowerCase() === targetTable.toLowerCase();
    const shouldSkipForCircularRef = shouldSkipSubRelationsForCircularRef(model.name.toLowerCase(), field.name);
    
    // 对于自引用关系、父级关系或循环引用处理，使用基础 schema
    const schemaName = (isParentRelation || isSelfReference || shouldSkipForCircularRef) ? `${targetTable}Schema` : `${StringUtils.toPascalCase(targetTable)}WithRelationsSchema`;
    
    if (field.isList) {
      return `z.array(${schemaName}).describe("${field.name} relation")`;
    } else {
      return `${schemaName}.describe("${field.name} relation")`;
    }
  }

  /**
   * 生成所有关系的代码
   */
  generateAllRelations(modelName: string): GeneratedRelation[] {
    const relations = this.getModelRelations(modelName);
    return relations.map(relation => ({
      name: relation.name,
      buildCode: relation.buildCode,
      schemaCode: relation.schemaCode,
    }));
  }

  /**
   * 获取必需的 Schema 导入
   */
  getRequiredSchemaImports(modelName: string): string[] {
    const relations = this.getModelRelations(modelName);
    const imports: string[] = [];

    for (const relation of relations) {
      const isParentRelation = this.isBusinessParentRelation(relation.name);
      if (!isParentRelation) {
        const schemaName = `${StringUtils.toPascalCase(relation.targetTable)}WithRelationsSchema`;
        imports.push(schemaName);
      }
    }

    return [...new Set(imports)]; // 去重
  }

  /**
   * 获取子关系函数导入
   */
  getSubRelationImports(modelName: string): string[] {
    const relations = this.getModelRelations(modelName);
    const imports: string[] = [];

    for (const relation of relations) {
      const isParentRelation = this.isBusinessParentRelation(relation.name);
      if (!isParentRelation) {
        const functionName = `${StringUtils.toCamelCase(relation.targetTable)}SubRelations`;
        imports.push(functionName);
      }
    }

    return [...new Set(imports)]; // 去重
  }

  // ==================== 工具函数 ====================

  /**
   * 判断是否是业务父级关系
   * 基于字段命名规范：belongTo*、usedBy*、createdBy、updatedBy
   * 特殊处理：account.user 是父关系，但不遵循 belongTo 命名
   */
  private isBusinessParentRelation(fieldName: string): boolean {
    const parentPatterns = [
      /^belongTo/,           // belongTo*
      /^usedBy/,            // usedBy*
      /^(created|updated)By$/, // createdBy, updatedBy
    ];
    
    // 特殊处理：account.user 是父关系
    if (fieldName === 'user') {
      return true;
    }
    
    return parentPatterns.some(pattern => pattern.test(fieldName));
  }

  /**
   * 获取关系字段名称 - 只参考 @relation 属性
   * 返回当前模型中的外键字段名
   */
  private getRelationForeignKey(field: any, model: any, targetTable: string): string {
    // 如果有 relationFromFields，使用它（这是当前模型中的外键字段）
    if (field.relationFromFields && field.relationFromFields.length > 0) {
      return field.relationFromFields[0];
    }

    // 否则使用默认命名
    return `${targetTable}Id`;
  }

  /**
   * 获取模型的主键字段名
   */
  private getPrimaryKeyField(modelName: string): string {
    const model = this.models.find(m => m.name === modelName);
    if (!model) {
      throw new Error(`Model ${modelName} not found`);
    }
    
    // 查找主键字段
    const primaryKeyField = model.fields.find((field: any) => field.isId);
    if (primaryKeyField) {
      return primaryKeyField.name;
    }
    
    // 如果没有找到主键，默认使用 id
    return 'id';
  }

  // ==================== 静态工具函数 ====================

  /**
   * 关系工具类
   */
  static RelationUtils = {
    /**
     * 父级关系模式
     */
    PARENT_PATTERNS: [
      /^belongTo/,           // belongTo*
      /^usedBy/,            // usedBy*
      /^(created|updated)By$/, // createdBy, updatedBy
    ],

    /**
     * 判断是否是父级关系
     */
    isParentRelation(fieldName: string): boolean {
      return this.PARENT_PATTERNS.some(pattern => pattern.test(fieldName));
    },

    /**
     * 获取外键字段名
     */
    getForeignKey(field: any, model: any): string | undefined {
      // 如果有 relationFromFields，使用它
      if (field.relationFromFields && field.relationFromFields.length > 0) {
        return field.relationFromFields[0];
      }

      // 否则使用默认命名
      const targetTable = field.type.toLowerCase();
      return `${targetTable}Id`;
    },

    /**
     * 获取主键字段名
     */
    getPrimaryKeyField(model: any): string {
      const idField = model.fields?.find((f: any) => f.isId);
      return idField ? idField.name : 'id';
    },

    /**
     * 获取关系表名
     */
    getRelationTable(field: any, model: any): string | undefined {
      if (field.relationName) {
        return `_${field.relationName}`;
      }

      // 对于隐式多对多关系，生成默认表名
      if (field.isList && !field.relationFromFields && !field.relationToFields) {
        const table1 = model.name.toLowerCase();
        const table2 = field.type.toLowerCase();
        const sortedNames = [table1, table2].sort();
        return `_${sortedNames[0]}To${sortedNames[1]}`;
      }

      return undefined;
    },

    /**
     * 确定关系类型
     */
    determineRelationType(field: any, model: any): 'ONE_TO_ONE' | 'ONE_TO_MANY' | 'MANY_TO_MANY' {
      if (field.isList) {
        // 检查是否有反向外键字段
        const hasReverseForeignKey = this.hasReverseForeignKey(field.type, model.name);
        
        if (hasReverseForeignKey) {
          return 'ONE_TO_MANY';
        } else {
          return 'MANY_TO_MANY';
        }
      }
      
      return 'ONE_TO_ONE';
    },

    /**
     * 检查是否有反向外键
     */
    hasReverseForeignKey(targetModelName: string, currentModelName: string): boolean {
      // 这里需要访问模型信息，暂时返回 false
      // 在实际实现中，应该检查目标模型是否有指向当前模型的外键
      return false;
    },

    /**
     * 生成 whereRef 条件
     */
    generateWhereRefCondition(
      currentTable: string,
      currentField: string,
      targetTable: string,
      targetField: string
    ): string {
      return `"${targetTable}.${targetField}", "=", "${currentTable}.${currentField}"`;
    },

    /**
     * 生成子关系查询
     */
    generateSubRelationQuery(targetTable: string, targetPrimaryKey: string): string {
      const subRelationName = `${StringUtils.toCamelCase(targetTable)}SubRelations`;
      return `.select((subEb) => ${subRelationName}(subEb, subEb.val("${targetTable}.${targetPrimaryKey}")))`;
    },

    /**
     * 转换为驼峰命名
     */
    toCamelCase(str: string): string {
      return StringUtils.toCamelCase(str);
    },

    /**
     * 转换为帕斯卡命名
     */
    toPascalCase(str: string): string {
      return StringUtils.toPascalCase(str);
    },

    /**
     * 转换为蛇形命名
     */
    toSnakeCase(str: string): string {
      return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
    },

    /**
     * 验证关系字段
     */
    validateRelationField(field: any, model: any): { isValid: boolean; errors: string[] } {
      const errors: string[] = [];

      if (!field.type) {
        errors.push(`Field ${field.name} in model ${model.name} has no type`);
      }

      if (field.kind === 'object' && !field.type) {
        errors.push(`Relation field ${field.name} in model ${model.name} has no target type`);
      }

      if (field.relationFromFields && field.relationFromFields.length > 0) {
        const foreignKeyField = model.fields?.find((f: any) => f.name === field.relationFromFields[0]);
        if (!foreignKeyField) {
          errors.push(`Foreign key field ${field.relationFromFields[0]} not found in model ${model.name}`);
        }
      }

      return {
        isValid: errors.length === 0,
        errors
      };
    },

    /**
     * 获取关系描述
     */
    getRelationDescription(field: any): string {
      return field.documentation || `${field.name} relation`;
    }
  };
}