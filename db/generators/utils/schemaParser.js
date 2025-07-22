/**
 * @file SchemaParser.js
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

export class SchemaParser {
  /**
   * 分析 Prisma schema 内容
   * @param {string} schemaContent - Prisma schema 文件内容
   * @returns {Object} 分析结果
   */
  static analyzeSchema(schemaContent) {
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
   * @param {string} schemaContent - Prisma schema 内容
   * @returns {Map<string, Object>} 模型信息映射
   */
  static extractModels(schemaContent) {
    const models = new Map();
    const modelRegex = /model\s+(\w+)\s*\{/g;
    let match;

    while ((match = modelRegex.exec(schemaContent)) !== null) {
      const modelName = match[1];
      models.set(modelName, {
        name: modelName,
        fields: [],
        relations: [],
      });
    }

    return models;
  }

  /**
   * 提取所有关系信息
   * @param {string} schemaContent - Prisma schema 内容
   * @param {Map<string, Object>} models - 模型信息
   * @returns {Array} 关系信息数组
   */
  static extractRelations(schemaContent, models) {
    const relations = [];
    const lines = schemaContent.split("\n");
    let currentModel = null;

    for (const line of lines) {
      const trimmed = line.trim();

      // 检测模型开始
      const modelMatch = trimmed.match(/^model\s+(\w+)\s*\{$/);
      if (modelMatch) {
        currentModel = modelMatch[1];
        continue;
      }

      // 检测模型结束
      if (trimmed === "}") {
        currentModel = null;
        continue;
      }

      // 检测关系字段
      if (currentModel && (trimmed.includes("[]") || trimmed.includes("@relation"))) {
        const relation = this.parseRelationField(line, currentModel);
        if (relation) {
          relations.push(relation);
        }
      }
    }

    return relations;
  }

  /**
   * 解析关系字段
   * @param {string} line - 字段行
   * @param {string} currentModel - 当前模型名
   * @returns {Object|null} 关系信息
   */
  static parseRelationField(line, currentModel) {
    // 检测数组关系字段
    const arrayMatch = line.match(/(\w+)\s+(\w+)\[\]/);
    if (arrayMatch) {
      const [, fieldName, targetModel] = arrayMatch;
      return {
        type: "array",
        fromModel: currentModel,
        toModel: targetModel,
        fieldName,
      };
    }

    // 检测 @relation 字段
    const relationMatch = line.match(/(\w+)\s+(\w+)\s+@relation/);
    if (relationMatch) {
      const [, fieldName, targetModel] = relationMatch;
      return {
        type: "relation",
        fromModel: currentModel,
        toModel: targetModel,
        fieldName,
      };
    }

    return null;
  }

  /**
   * 检测关系表
   * @param {string} schemaContent - Prisma schema 内容
   * @param {Array} relations - 关系信息数组
   * @returns {Array} 关系表名称数组
   */
  static detectRelationTables(schemaContent, relations) {
    const relationTables = new Set();

    // 检测多对多关系
    for (const relation of relations) {
      if (relation.type === "array") {
        const reverseRelation = this.findReverseRelation(relations, relation.fromModel, relation.toModel);
        if (reverseRelation) {
          // 多对多关系，生成关系表名
          const tableName = this.generateManyToManyTableName(relation.fromModel, relation.toModel, relation.fieldName);
          relationTables.add(tableName);
        }
      }
    }

    return Array.from(relationTables);
  }

  /**
   * 查找反向关系
   *
   * 多对多关系特征：
   * - Model1 中有 Model2[] 字段
   * - Model2 中有 Model1[] 字段
   * - 双方都是数组字段，没有外键约束
   *
   * @param {Array} relations - 关系信息数组
   * @param {string} model1 - 第一个模型名
   * @param {string} model2 - 第二个模型名
   * @returns {Object|null} 反向关系信息
   */
  static findReverseRelation(relations, model1, model2) {
    return relations.find(
      (relation) => relation.type === "array" && relation.fromModel === model2 && relation.toModel === model1,
    );
  }

  /**
   * 生成多对多关系表名称
   *
   * Prisma 的命名规则：
   * 1. 如果字段名包含 "To"，使用字段名
   * 2. 否则使用 _Model1ToModel2 格式
   *
   * @param {string} model1 - 第一个模型名
   * @param {string} model2 - 第二个模型名
   * @param {string} fieldName - 字段名
   * @returns {string} 关系表名
   */
  static generateManyToManyTableName(model1, model2, fieldName) {
    // 如果字段名包含 "To"，直接使用
    if (fieldName.toLowerCase().includes("to")) {
      return `_${fieldName}`;
    }

    // 检查字段名是否暗示了关系方向
    const fieldNameLower = fieldName.toLowerCase();
    if (fieldNameLower.includes(model2.toLowerCase())) {
      // 字段名包含目标模型，使用 _Model1ToModel2
      return `_${model1}To${model2}`;
    } else {
      // 默认使用 _Model1ToModel2
      return `_${model1}To${model2}`;
    }
  }

  /**
   * 获取模型的所有字段
   * @param {string} schemaContent - Prisma schema 内容
   * @param {string} modelName - 模型名
   * @returns {Array} 字段信息数组
   */
  static getModelFields(schemaContent, modelName) {
    const fields = [];
    const lines = schemaContent.split("\n");
    let inTargetModel = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // 检测模型开始
      if (trimmed === `model ${modelName} {`) {
        inTargetModel = true;
        continue;
      }

      // 检测模型结束
      if (inTargetModel && trimmed === "}") {
        break;
      }

      // 收集字段
      if (inTargetModel && trimmed && !trimmed.startsWith("//")) {
        fields.push(trimmed);
      }
    }

    return fields;
  }

  /**
   * 检查字段是否为关系字段
   * @param {string} fieldLine - 字段行
   * @returns {boolean} 是否为关系字段
   */
  static isRelationField(fieldLine) {
    // 包含 @relation 的字段是关系字段
    if (fieldLine.includes("@relation")) {
      return true;
    }
    
    // 检查是否是模型数组关系（如 crystal[]）
    const modelArrayMatch = fieldLine.match(/(\w+)\s+(\w+)\[\]/);
    if (modelArrayMatch) {
      const [, fieldName, modelName] = modelArrayMatch;
      // 如果字段名和模型名不同，且模型名首字母大写，则可能是关系字段
      if (fieldName !== modelName && modelName.charAt(0) === modelName.charAt(0).toUpperCase()) {
        return true;
      }
    }
    
    // 检查是否是单模型关系（如 item @relation）
    const singleModelMatch = fieldLine.match(/(\w+)\s+(\w+)\s+@relation/);
    if (singleModelMatch) {
      const [, fieldName, modelName] = singleModelMatch;
      // 如果字段名和模型名不同，且模型名首字母大写，则可能是关系字段
      if (fieldName !== modelName && modelName.charAt(0) === modelName.charAt(0).toUpperCase()) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * 获取字段类型
   * @param {string} fieldLine - 字段行
   * @returns {string} 字段类型
   */
  static getFieldType(fieldLine) {
    const typeMatch = fieldLine.match(/(\w+)\s+(\w+)/);
    return typeMatch ? typeMatch[2] : null;
  }

  /**
   * 解析枚举定义
   * 从 schema 内容中提取所有枚举定义
   * @param {string} schemaContent - Prisma schema 内容
   * @returns {Object} 枚举定义映射
   */
  static parseEnums(schemaContent) {
    const enums = {};
    const enumRegex = /enum\s+(\w+)\s*\{([\s\S]*?)\}/g;
    let match;

    while ((match = enumRegex.exec(schemaContent)) !== null) {
      const [, enumName, enumBody] = match;
      const values = enumBody
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('//'))
        .map(line => line.replace(',', '').replace(/"/g, ''));

      enums[enumName] = values;
    }

    return enums;
  }

  /**
   * 解析详细的模型信息
   * 包括字段的详细信息（类型、枚举、可选性等）
   * @param {string} schemaContent - Prisma schema 内容
   * @returns {Array} 详细模型信息数组
   */
  static parseDetailedModels(schemaContent) {
    const models = [];
    const lines = schemaContent.split('\n');
    let currentModel = null;
    let inModel = false;

    for (const line of lines) {
      const trimmed = line.trim();
      
      // 检测模型开始
      const modelMatch = trimmed.match(/^model (\w+) \{$/);
      if (modelMatch) {
        currentModel = {
          name: modelMatch[1],
          fields: [],
          comments: []
        };
        inModel = true;
        continue;
      }

      // 检测模型结束
      if (trimmed === '}' && inModel) {
        if (currentModel) {
          models.push(currentModel);
        }
        currentModel = null;
        inModel = false;
        continue;
      }

      // 收集模型内容
      if (inModel && currentModel) {
        // 检测字段定义 - 改进正则表达式以匹配更多字段类型
        const fieldMatch = trimmed.match(/^(\w+)\s+(\w+(?:\?|\[\])?)(?:\s+\/\/\s*Enum\s+(\w+))?(?:\s+@relation.*)?$/);
        if (fieldMatch) {
          const [, fieldName, fieldType, enumType] = fieldMatch;
          
          // 只跳过真正的关系字段，保留数组类型字段（如 String[]）
          if (!this.isRelationField(trimmed)) {
            currentModel.fields.push({
              name: fieldName,
              type: fieldType,
              enumType: enumType,
              isOptional: fieldType.includes('?'),
              isArray: this.isArrayType(fieldType),
              comments: currentModel.comments.slice()
            });
          }
          currentModel.comments = [];
        } else if (trimmed.startsWith('//') && inModel) {
          currentModel.comments.push(trimmed);
        }
      }
    }

    return models;
  }

  /**
   * 检查是否为数组类型
   * @param {string} type - 类型字符串
   * @returns {boolean} 是否为数组类型
   */
  static isArrayType(type) {
    return type.includes("[]") || type.includes("Array");
  }

  /**
   * 检查是否为枚举类型
   * @param {string} type - 类型字符串
   * @returns {boolean} 是否为枚举类型
   */
  static isEnumType(type) {
    return type.includes("Enum") || type.includes("enum");
  }

  /**
   * 检查是否为关系类型
   * @param {string} type - 类型字符串
   * @returns {boolean} 是否为关系类型
   */
  static isRelationType(type) {
    return type.includes("Relation") || type.includes("relation");
  }

  /**
   * 提取基础类型
   * 移除可选标记、数组标记等，提取核心类型
   * @param {string} type - 类型字符串
   * @returns {string} 基础类型
   */
  static extractBaseType(type) {
    if (!type) return "String";
    
    // 移除可选标记和数组标记
    let baseType = type.replace(/\?$/, "").replace(/\[\]$/, "");
    
    // 如果是枚举类型，提取基础类型
    if (baseType.includes("Enum")) {
      return "Enum";
    }
    
    // 如果是关系类型，返回 String
    if (baseType.includes("Relation")) {
      return "String";
    }
    
    return baseType;
  }
}
