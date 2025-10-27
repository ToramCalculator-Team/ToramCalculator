/**
 * @file RelationProcessor.ts
 * @description 关系处理器
 * 负责处理表间关系和依赖
 * @version 1.0.0
 */

import { LogUtils } from "../utils/common.js";

export interface DependencyInfo {
  table: string;
  dependsOn: string[];
}

/**
 * 关系处理器类
 * 负责从 DMMF 提取表之间的依赖关系，构建依赖图，生成拓扑排序
 */
export class RelationProcessor {
  private dmmf: any;
  private dependencies: DependencyInfo[] = [];

  constructor(dmmf: any) {
    this.dmmf = dmmf;
  }

  /**
   * 处理表间关系
   * @returns 当前实例，支持链式调用
   */
  processRelations(): this {
    this.extractDependencies();
    
    LogUtils.logSuccess(`提取到 ${this.dependencies.length} 个依赖关系`);
    
    return this;
  }

  /**
   * 从 DMMF 提取表之间的依赖关系
   */
  private extractDependencies(): void {
    const dependencies: DependencyInfo[] = [];
    
    for (const model of this.dmmf.datamodel.models) {
      const tableDependencies: string[] = [];
      
      for (const field of model.fields) {
        // 检查外键关系
        if (field.relationName && field.relationFromFields && field.relationFromFields.length > 0) {
          // 这是一个外键字段，添加依赖
          if (field.type !== model.name) {
            tableDependencies.push(field.type);
          }
        }
      }
      
      if (tableDependencies.length > 0) {
        dependencies.push({
          table: model.name,
          dependsOn: tableDependencies
        });
      }
    }
    
    this.dependencies = dependencies;
  }

  /**
   * 生成拓扑排序
   * @returns 表的创建顺序
   */
  getTopologicalOrder(): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const result: string[] = [];
    
    const visit = (tableName: string) => {
      if (visiting.has(tableName)) {
        throw new Error(`循环依赖检测到: ${tableName}`);
      }
      if (visited.has(tableName)) {
        return;
      }
      
      visiting.add(tableName);
      
      const dependency = this.dependencies.find(dep => dep.table === tableName);
      if (dependency) {
        for (const depTable of dependency.dependsOn) {
          visit(depTable);
        }
      }
      
      visiting.delete(tableName);
      visited.add(tableName);
      result.push(tableName);
    };
    
    // 获取所有表名
    const allTables = this.dmmf.datamodel.models.map((model: any) => model.name);
    
    for (const table of allTables) {
      visit(table);
    }
    
    return result;
  }

  /**
   * 获取依赖关系
   * @returns 依赖关系数组
   */
  getDependencies(): DependencyInfo[] {
    return this.dependencies;
  }
}
