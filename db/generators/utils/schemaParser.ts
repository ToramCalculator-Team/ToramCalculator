/**
 * @file schemaParser.ts
 * @description Prisma Schema 分析工具类
 *
 * 功能：
 * 1. 解析 Prisma schema 文件
 * 2. 检测模型和关系
 * 3. 分析关系类型（一对多、多对多）
 * 4. 生成关系表名称
 * 5. 解析枚举定义
 * 6. 解析字段信息（包括枚举类型）
 */

interface ModelField {
  name: string;
  type: string;
  isOptional: boolean;
  enumType?: string;
}

interface Model {
  name: string;
  fields: ModelField[];
}

interface Relation {
  from: string;
  to: string;
  type: string;
}

interface SchemaAnalysis {
  models: Map<string, any>;
  relations: Relation[];
  relationTables: string[];
  enums: Record<string, string[]>;
  detailedModels: Model[];
}

export class SchemaParser {
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
          const [, fieldName, fieldType, optional] = fieldMatch;
          fields.push({
            name: fieldName,
            type: fieldType,
            isOptional: !!optional,
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
}
