/**
 * @file SchemaAnalyzer.js
 * @description Prisma Schema 分析工具类
 *
 * 功能：
 * 1. 解析 Prisma schema 文件
 * 2. 检测模型和关系
 * 3. 分析关系类型（一对多、多对多）
 * 4. 生成关系表名称
 */

export class SchemaAnalyzer {
  /**
   * 分析 Prisma schema 内容
   * @param {string} schemaContent - Prisma schema 文件内容
   * @returns {Object} 分析结果
   */
  static analyzeSchema(schemaContent) {
    const models = this.extractModels(schemaContent);
    const relations = this.extractRelations(schemaContent, models);
    const relationTables = this.detectRelationTables(schemaContent, relations);

    return {
      models,
      relations,
      relationTables,
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
      const [, fieldName, relatedModel] = arrayMatch;
      const namedRelationMatch = line.match(/@relation\("([^"]+)"\)/);

      return {
        type: "array",
        fromModel: currentModel,
        toModel: relatedModel,
        fieldName,
        relationName: namedRelationMatch ? namedRelationMatch[1] : null,
        isNamedRelation: !!namedRelationMatch,
      };
    }

    // 检测单对象关系字段
    const objectMatch = line.match(/(\w+)\s+(\w+)\s+@relation/);
    if (objectMatch) {
      const [, fieldName, relatedModel] = objectMatch;
      const namedRelationMatch = line.match(/@relation\("([^"]+)"\)/);
      const fieldsMatch = line.match(/fields:\s*\[([^\]]+)\]/);
      const referencesMatch = line.match(/references:\s*\[([^\]]+)\]/);

      return {
        type: "object",
        fromModel: currentModel,
        toModel: relatedModel,
        fieldName,
        relationName: namedRelationMatch ? namedRelationMatch[1] : null,
        isNamedRelation: !!namedRelationMatch,
        fields: fieldsMatch ? fieldsMatch[1].split(",").map((f) => f.trim()) : [],
        references: referencesMatch ? referencesMatch[1].split(",").map((f) => f.trim()) : [],
      };
    }

    return null;
  }

  /**
   * 检测需要修复的关系表名称
   *
   * 关系类型分析：
   * 1. 一对多关系：有 fields 和 references，使用外键，不生成关系表
   * 2. 多对多关系：双方都是数组字段，生成关系表
   * 3. 命名关系：只有在多对多关系中才生成关系表
   *
   * @param {string} schemaContent - Prisma schema 内容
   * @param {Array} relations - 关系信息数组
   * @returns {string[]} 需要修复的表名数组
   */
  static detectRelationTables(schemaContent, relations) {
    const relationTables = new Set();

    // console.log('🔍 开始分析关系表...');
    // console.log(`📊 发现 ${relations.length} 个关系字段`);

    // 按模型分组关系
    const modelRelations = new Map();
    relations.forEach((relation) => {
      if (!modelRelations.has(relation.fromModel)) {
        modelRelations.set(relation.fromModel, []);
      }
      modelRelations.get(relation.fromModel).push(relation);
    });

    // 检测多对多关系
    relations.forEach((relation) => {
      if (relation.type === "array") {
        // 检查是否有反向关系（多对多）
        const reverseRelation = this.findReverseRelation(relations, relation.fromModel, relation.toModel);

        if (reverseRelation) {
          // 多对多关系，需要生成关系表
          if (relation.isNamedRelation) {
            // 命名多对多关系：生成 _relationName 表
            const tableName = `_${relation.relationName}`;
            relationTables.add(tableName);
            // console.log(`✅ 检测到命名多对多关系: ${relation.fromModel} <-> ${relation.toModel} -> ${tableName}`);
          } else {
            // 默认多对多关系：生成 _Model1ToModel2 表
            const tableName = this.generateManyToManyTableName(
              relation.fromModel,
              relation.toModel,
              relation.fieldName,
            );
            relationTables.add(tableName);
            // console.log(`✅ 检测到默认多对多关系: ${relation.fromModel} <-> ${relation.toModel} -> ${tableName}`);
          }
        } else {
          //   console.log(`ℹ️  检测到一对多关系: ${relation.fromModel} -> ${relation.toModel} (不生成关系表)`);
        }
      }
    });

    const result = Array.from(relationTables);
    console.log("🔍 自动检测到需要修复的关系表:", result);
    return result;
  }

  /**
   * 查找反向关系（检查是否为多对多关系）
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
    return fieldLine.includes("[]") || fieldLine.includes("@relation");
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
}
