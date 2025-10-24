/**
 * @file repository.config.ts
 * @description Repository 生成器配置文件
 * @version 2.0.0
 */

/**
 * Repository 生成配置
 */
export const repositoryConfig = {
  /**
   * 跳过生成的 model
   * 这些 model 不会生成 repository 文件
   */
  skip: [] as string[],

  /**
   * 自定义删除逻辑配置
   * 
   * - 'cascade': 使用数据库级联删除（默认）
   * - 'resetReferences': 重置引用为默认值
   * - 'setNull': 将引用设为 null
   */
  deleteStrategy: {
    item: "resetReferences", // item 删除时重置引用
    // 其他 model 使用默认策略
  } as Record<string, "cascade" | "resetReferences" | "setNull">,


  /**
   * 输出配置
   */
  output: {
    /** 是否覆盖现有文件 */
    overwrite: true, // 直接替换，不跳过
  },

  /**
   * 代码生成选项
   */
  codeGeneration: {
    /** 是否生成关系查询 */
    includeRelations: true,
    /** 是否生成 WithRelations 类型 */
    includeWithRelationsType: true,
  },
};

/**
 * 获取指定 model 的删除策略
 */
export function getDeleteStrategy(modelName: string): "cascade" | "resetReferences" | "setNull" {
  return repositoryConfig.deleteStrategy[modelName] || "cascade";
}

/**
 * 检查 model 是否应该跳过生成
 */
export function shouldSkipModel(modelName: string): boolean {
  return repositoryConfig.skip.includes(modelName);
}

