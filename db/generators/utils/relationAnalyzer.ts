/**
 * @file relationAnalyzer.ts
 * @description 关系分析器 - 解析 Prisma DMMF 关系并生成 Kysely 查询代码
 * @version 1.0.0
 */

import { DMMF } from "@prisma/generator-helper";
import { StringUtils } from "./common";

/**
 * 关系类型
 */
export enum RelationType {
  OneToOne = "ONE_TO_ONE",
  OneToMany = "ONE_TO_MANY",
  ManyToMany = "MANY_TO_MANY",
}

/**
 * 关系信息
 */
export interface RelationInfo {
  /** 关系名称 */
  name: string;
  /** 关系类型 */
  type: RelationType;
  /** 目标 model 名称 */
  targetModel: string;
  /** 是否为数组关系 */
  isList: boolean;
  /** 外键字段 */
  foreignKey?: string;
  /** 关联的字段 */
  relationFromFields?: readonly string[];
  /** 关联到的字段 */
  relationToFields?: readonly string[];
  /** 中间表名称（多对多） */
  relationTable?: string;
  /** 关系描述（用于注释） */
  description?: string;
}

/**
 * 生成的关系查询代码
 */
export interface GeneratedRelation {
  /** 关系名称 */
  name: string;
  /** build 函数代码 */
  buildCode: string;
  /** schema 导入 */
  schemaImport: string;
  /** schema 代码 */
  schemaCode: string;
  /** 描述 */
  description: string;
}

/**
 * 关系分析器
 */
export class RelationAnalyzer {
  private models: readonly DMMF.Model[];

  constructor(dmmf: DMMF.Document) {
    this.models = dmmf.datamodel.models;
  }

  /**
   * 获取指定 model 的所有关系
   */
  getModelRelations(modelName: string): RelationInfo[] {
    const model = this.models.find((m) => m.name === modelName);
    if (!model) {
      throw new Error(`Model ${modelName} not found`);
    }

    const relations: RelationInfo[] = [];

    for (const field of model.fields) {
      if (field.kind === "object") {
        const relationType = this.determineRelationType(field, model);
        const relationInfo: RelationInfo = {
          name: field.name,
          type: relationType,
          targetModel: field.type,
          isList: field.isList,
          foreignKey: this.getForeignKey(field, model),
          relationFromFields: field.relationFromFields,
          relationToFields: field.relationToFields,
          relationTable: this.getRelationTable(field, model),
          description: field.documentation || `${field.name} relation`,
        };
        relations.push(relationInfo);
      }
    }

    return relations;
  }

  /**
   * 确定关系类型
   */
  private determineRelationType(field: DMMF.Field, model: DMMF.Model): RelationType {
    // 如果是列表，可能是一对多或多对多
    if (field.isList) {
      // 检查是否有显式的关系表名（多对多特征）
      if (field.relationName && field.relationName.startsWith("_")) {
        return RelationType.ManyToMany;
      }
      return RelationType.OneToMany;
    }

    // 如果不是列表，是一对一
    return RelationType.OneToOne;
  }

  /**
   * 获取外键字段
   */
  private getForeignKey(field: DMMF.Field, model: DMMF.Model): string | undefined {
    if (field.relationFromFields && field.relationFromFields.length > 0) {
      return field.relationFromFields[0];
    }
    return undefined;
  }

  /**
   * 获取关系表名（用于多对多）
   */
  private getRelationTable(field: DMMF.Field, model: DMMF.Model): string | undefined {
    if (field.relationName && field.relationName.startsWith("_")) {
      return field.relationName;
    }
    return undefined;
  }

  /**
   * 生成关系查询代码
   */
  generateRelationCode(
    modelName: string,
    relation: RelationInfo
  ): GeneratedRelation {
    const tableName = modelName.toLowerCase();
    const targetTable = relation.targetModel.toLowerCase();
    const targetPascal = StringUtils.toPascalCase(relation.targetModel);
    
    let buildCode: string;
    let schemaCode: string;

    switch (relation.type) {
      case RelationType.OneToOne:
        buildCode = this.generateOneToOneCode(tableName, relation);
        schemaCode = `${targetTable}Schema.describe("${relation.description}")`;
        break;

      case RelationType.OneToMany:
        buildCode = this.generateOneToManyCode(tableName, relation);
        schemaCode = `z.array(${targetTable}Schema).describe("${relation.description}")`;
        break;

      case RelationType.ManyToMany:
        buildCode = this.generateManyToManyCode(tableName, relation);
        schemaCode = `z.array(${targetTable}Schema).describe("${relation.description}")`;
        break;
    }

    return {
      name: relation.name,
      buildCode,
      schemaImport: `${relation.targetModel.toLowerCase()}Schema`,
      schemaCode,
      description: relation.description || "",
    };
  }

  /**
   * 生成一对一关系代码
   */
  private generateOneToOneCode(tableName: string, relation: RelationInfo): string {
    const targetTable = relation.targetModel.toLowerCase();
    const foreignKey = relation.foreignKey || `${targetTable}Id`;

    return `(eb) =>
      jsonObjectFrom(
        eb
          .selectFrom("${targetTable}")
          .whereRef("id", "=", "${tableName}.${foreignKey}")
          .selectAll("${targetTable}")
      ).$notNull().as("${relation.name}")`;
  }

  /**
   * 生成一对多关系代码
   */
  private generateOneToManyCode(tableName: string, relation: RelationInfo): string {
    const targetTable = relation.targetModel.toLowerCase();
    
    // 找到反向关系的外键
    const targetModel = this.models.find((m) => m.name === relation.targetModel);
    if (!targetModel) {
      throw new Error(`Target model ${relation.targetModel} not found`);
    }

    // 查找指向当前 model 的字段
    const reverseField = targetModel.fields.find(
      (f) => f.type === tableName.charAt(0).toUpperCase() + tableName.slice(1) && !f.isList
    );

    const foreignKey = reverseField?.relationFromFields?.[0] || `${tableName}Id`;

    return `(eb, id) =>
      jsonArrayFrom(
        eb
          .selectFrom("${targetTable}")
          .whereRef("${targetTable}.${foreignKey}", "=", "${tableName}.id")
          .selectAll("${targetTable}")
      ).as("${relation.name}")`;
  }

  /**
   * 生成多对多关系代码
   */
  private generateManyToManyCode(tableName: string, relation: RelationInfo): string {
    const targetTable = relation.targetModel.toLowerCase();
    const relationTable = relation.relationTable || `_${tableName}To${targetTable}`;

    // Prisma 的隐式多对多关系表命名规则：按字母顺序排列
    const sortedNames = [tableName, targetTable].sort();
    const actualRelationTable = `_${sortedNames[0]}To${sortedNames[1]}`;

    // 确定当前表在关系表中的列名（A 或 B）
    const isA = sortedNames[0] === tableName;
    const currentColumn = isA ? "A" : "B";
    const targetColumn = isA ? "B" : "A";

    return `(eb, id) =>
      jsonArrayFrom(
        eb
          .selectFrom("${actualRelationTable}")
          .innerJoin("${targetTable}", "${actualRelationTable}.${targetColumn}", "${targetTable}.id")
          .where("${actualRelationTable}.${currentColumn}", "=", id)
          .selectAll("${targetTable}")
      ).as("${relation.name}")`;
  }

  /**
   * 生成所有关系的代码
   */
  generateAllRelations(modelName: string): GeneratedRelation[] {
    const relations = this.getModelRelations(modelName);
    return relations.map((relation) =>
      this.generateRelationCode(modelName, relation)
    );
  }

  /**
   * 获取需要导入的 schema
   */
  getRequiredSchemaImports(modelName: string): string[] {
    const relations = this.getModelRelations(modelName);
    const schemas = new Set<string>();

    for (const relation of relations) {
      schemas.add(`${relation.targetModel.toLowerCase()}Schema`);
    }

    return Array.from(schemas);
  }
}

