/**
 * @file cascadeAnalyzer.ts
 * @description 级联删除分析器 - 分析删除依赖和生成级联删除逻辑
 * @version 1.0.0
 */

import { StringUtils } from "./common";

/**
 * 删除操作类型
 */
export enum DeleteAction {
  Cascade = "CASCADE",
  SetNull = "SET_NULL",
  SetDefault = "SET_DEFAULT",
  Restrict = "RESTRICT",
  NoAction = "NO_ACTION",
}

/**
 * 删除依赖信息
 */
export interface DeleteDependency {
  /** 依赖的表名 */
  tableName: string;
  /** 外键字段 */
  foreignKeyField: string;
  /** 删除操作 */
  action: DeleteAction;
  /** 是否必需（NOT NULL） */
  required: boolean;
  /** 关系名称 */
  relationName: string;
}

/**
 * 生成的删除代码
 */
export interface GeneratedDeleteCode {
  /** 删除前的操作（如重置引用） */
  beforeDelete: string[];
  /** 删除语句 */
  deleteStatement: string;
  /** 删除后的操作（如删除统计信息） */
  afterDelete: string[];
}

/**
 * 级联删除分析器
 */
export class CascadeAnalyzer {
  private models: readonly any[];
  private modelMap: Map<string, any>;

  constructor(dmmf: any) {
    this.models = dmmf.datamodel.models;
    this.modelMap = new Map(this.models.map((model) => [model.name, model]));
  }

  /**
   * 获取表的主键字段名
   */
  private getPrimaryKeyField(tableName: string): string {
    const model = this.models.find(m => m.name === tableName);
    if (!model) {
      throw new Error(`Model ${tableName} not found`);
    }
    
    // 查找主键字段
    const primaryKeyField = model.fields.find((field: any) => field.isId);
    if (primaryKeyField) {
      return primaryKeyField.name;
    }
    
    // 如果没有找到主键，默认使用 id
    return 'id';
  }

  /**
   * 获取指定表被哪些其他表引用
   */
  getReferencedBy(tableName: string): DeleteDependency[] {
    const dependencies: DeleteDependency[] = [];

    for (const model of this.models) {
      for (const field of model.fields) {
        // 检查是否是引用当前表的关系字段
        if (field.kind === "object" && field.type === tableName) {
          const action = this.getDeleteAction(field);
          const foreignKeyField = field.relationFromFields?.[0];

          if (foreignKeyField) {
            // 检查字段是否必需
            const foreignKeyFieldDef = model.fields.find((f: any) => f.name === foreignKeyField);
            const required = foreignKeyFieldDef?.isRequired ?? false;

            dependencies.push({
              tableName: model.name.toLowerCase(),
              foreignKeyField,
              action,
              required,
              relationName: field.name,
            });
          }
        }
      }
    }

    return dependencies;
  }

  /**
   * 获取删除操作类型
   */
  private getDeleteAction(field: any): DeleteAction {
    // 从 field 的 relationOnDelete 属性获取删除操作
    const onDelete = field.relationOnDelete;

    switch (onDelete) {
      case "Cascade":
        return DeleteAction.Cascade;
      case "SetNull":
        return DeleteAction.SetNull;
      case "SetDefault":
        return DeleteAction.SetDefault;
      case "Restrict":
        return DeleteAction.Restrict;
      case "NoAction":
        return DeleteAction.NoAction;
      default:
        // 默认行为：如果字段是可选的，使用 SetNull；否则使用 Restrict
        return field.isRequired ? DeleteAction.Restrict : DeleteAction.SetNull;
    }
  }

  /**
   * 检查是否有 statistic 字段
   */
  private hasStatisticField(tableName: string): boolean {
    const model = this.modelMap.get(tableName);
    if (!model) return false;

    return model.fields.some(
      (f: any) => f.name === "statisticId" || (f.name === "statistic" && f.type === "statistic")
    );
  }

  /**
   * 获取需要删除的关联记录（如 statistic）
   */
  private getRelatedDeletions(tableName: string): string[] {
    const deletions: string[] = [];
    const model = this.modelMap.get(tableName);
    if (!model) return deletions;

    // 检查是否有 statistic 关系
    if (this.hasStatisticField(tableName)) {
      deletions.push("statistic");
    }

    return deletions;
  }

  /**
   * 生成删除代码
   */
  generateDeleteCode(
    tableName: string,
    customConfig?: {
      resetReferences?: boolean;
      customBeforeDelete?: string[];
      customAfterDelete?: string[];
    }
  ): GeneratedDeleteCode {
    const tableNameLower = tableName.toLowerCase();
    const dependencies = this.getReferencedBy(tableName);
    const beforeDelete: string[] = [];
    const afterDelete: string[] = [];

    // 如果需要重置引用，先查询一次数据
    const needsResetReferences = customConfig?.resetReferences && 
      dependencies.some(dep => dep.action !== DeleteAction.Cascade);
    
    if (needsResetReferences) {
      beforeDelete.push(
        `  // 获取 ${tableNameLower} 信息用于重置引用
  const ${tableNameLower} = await trx
    .selectFrom("${tableNameLower}")
    .where("${this.getPrimaryKeyField(tableName)}", "=", id)
    .selectAll()
    .executeTakeFirstOrThrow();`
      );
    }

    // 处理依赖
    for (const dep of dependencies) {
      if (dep.action === DeleteAction.Cascade) {
        // Cascade 由数据库自动处理，不需要额外代码
        continue;
      } else if (dep.action === DeleteAction.SetNull && !dep.required) {
        // SetNull: 将外键设为 undefined
        beforeDelete.push(
          `  // 重置 ${dep.tableName} 表的引用
  await trx
    .updateTable("${dep.tableName}")
    .set({ ${dep.foreignKeyField}: undefined })
    .where("${dep.foreignKeyField}", "=", id)
    .execute();`
        );
      } else if (customConfig?.resetReferences) {
        // 自定义重置逻辑（如 item 的情况）
        beforeDelete.push(
          `  // 重置 ${dep.tableName} 表的引用为默认值
  await trx
    .updateTable("${dep.tableName}")
    .set({
      ${dep.foreignKeyField}: \`default\${${tableNameLower}.${this.getTypeField(tableName)}}Id\`,
    })
    .where("${dep.foreignKeyField}", "=", id)
    .execute();`
        );
      }
    }

    // 添加自定义的前置删除操作
    if (customConfig?.customBeforeDelete) {
      beforeDelete.push(...customConfig.customBeforeDelete);
    }

    // 生成主删除语句
    const deleteStatement = `  // 删除 ${tableNameLower}
  await trx
    .deleteFrom("${tableNameLower}")
    .where("${this.getPrimaryKeyField(tableName)}", "=", id)
    .executeTakeFirstOrThrow();`;

    // 处理关联删除（如 statistic）
    const relatedDeletions = this.getRelatedDeletions(tableName);
    for (const related of relatedDeletions) {
      afterDelete.push(
        `  // 删除关联的 ${related}
  await trx
    .deleteFrom("${related}")
    .where("${this.getPrimaryKeyField(related)}", "=", ${tableNameLower}.${related}Id)
    .executeTakeFirstOrThrow();`
      );
    }

    // 添加自定义的后置删除操作
    if (customConfig?.customAfterDelete) {
      afterDelete.push(...customConfig.customAfterDelete);
    }

    return {
      beforeDelete,
      deleteStatement,
      afterDelete,
    };
  }

  /**
   * 获取类型字段（用于生成默认值）
   */
  private getTypeField(tableName: string): string {
    const model = this.modelMap.get(tableName);
    if (!model) return "type";

    // 查找带有 "type" 或 "Type" 的字段，优先查找完全匹配的字段
    const exactMatch = model.fields.find(
      (f: any) => f.name === "type" && (f.type === "String" || f.type.includes("Type"))
    );
    
    if (exactMatch) {
      return exactMatch.name;
    }

    // 如果没有完全匹配的 "type" 字段，查找包含 "type" 的字段
    const typeField = model.fields.find(
      (f: any) => f.name.toLowerCase().includes("type") && (f.type === "String" || f.type.includes("Type"))
    );

    return typeField?.name || "type";
  }

  /**
   * 检测循环依赖
   */
  detectCircularDependencies(modelName: string, visited: Set<string> = new Set()): string[] {
    if (visited.has(modelName)) {
      return [modelName];
    }

    visited.add(modelName);
    const dependencies = this.getReferencedBy(modelName);

    for (const dep of dependencies) {
      if (dep.action === DeleteAction.Cascade) {
        const circular = this.detectCircularDependencies(dep.tableName, new Set(visited));
        if (circular.length > 0) {
          return [modelName, ...circular];
        }
      }
    }

    return [];
  }

  /**
   * 生成完整的删除函数代码
   */
  generateDeleteFunction(
    modelName: string,
    customConfig?: {
      resetReferences?: boolean;
      customBeforeDelete?: string[];
      customAfterDelete?: string[];
    }
  ): string {
    const pascalName = StringUtils.toPascalCase(modelName);
    const camelName = StringUtils.toCamelCase(modelName);
    const deleteCode = this.generateDeleteCode(modelName, customConfig);

    const allOperations = [
      ...deleteCode.beforeDelete,
      deleteCode.deleteStatement,
      ...deleteCode.afterDelete,
    ].join("\n\n");

    return `export async function delete${pascalName}(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
${allOperations.replace(/trx/g, 'db')}
}`;
  }

  /**
   * 分析删除顺序（拓扑排序）
   */
  analyzeDeletionOrder(modelNames: string[]): string[] {
    const graph = new Map<string, Set<string>>();
    const inDegree = new Map<string, number>();

    // 初始化
    for (const modelName of modelNames) {
      graph.set(modelName, new Set());
      inDegree.set(modelName, 0);
    }

    // 构建依赖图
    for (const modelName of modelNames) {
      const dependencies = this.getReferencedBy(modelName);
      for (const dep of dependencies) {
        if (dep.action === DeleteAction.Cascade && modelNames.includes(dep.tableName)) {
          graph.get(dep.tableName)?.add(modelName);
          inDegree.set(modelName, (inDegree.get(modelName) || 0) + 1);
        }
      }
    }

    // 拓扑排序
    const result: string[] = [];
    const queue: string[] = [];

    // 找到所有入度为 0 的节点
    for (const [node, degree] of inDegree) {
      if (degree === 0) {
        queue.push(node);
      }
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      for (const neighbor of graph.get(current) || []) {
        const newDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }

    // 如果结果数量不等于输入数量，说明存在循环依赖
    if (result.length !== modelNames.length) {
      console.warn("⚠️ 检测到循环依赖，部分 model 无法完全排序");
      // 添加未排序的 model
      for (const modelName of modelNames) {
        if (!result.includes(modelName)) {
          result.push(modelName);
        }
      }
    }

    return result;
  }
}

