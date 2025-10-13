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
   * 循环引用处理配置
   * 用于处理表之间的循环引用关系
   */
  circularReferenceHandling: {
    /**
     * 关系级别的循环引用处理
     * 格式: "表名.关系名": "处理方式"
     * 处理方式:
     * - "baseSchema": 使用基础 schema，不包含子关系查询
     * - "skipSubRelations": 跳过子关系查询，但使用 WithRelationsSchema
     * - "skipImport": 跳过导入，使用基础 schema
     */
    relations: {
      "recipe_ingredient.item": "skipImport", // recipe_ingredient 的 item 关系跳过导入
      // 可以添加更多循环引用处理规则
    } as Record<string, "baseSchema" | "skipSubRelations" | "skipImport">,
  },

  /**
   * 需要特殊处理的 model 配置
   * 合并了 statistic 和 account 跟踪的配置
   */
  modelFeatures: {
    /**
     * 需要 statistic 的 model
     */
    withStatistic: [
      "mob",
      "item", 
      "skill",
      "character",
      "simulator",
      "world",
      "address",
      "activity",
      "zone",
      "recipe",
      "npc",
      "task",
    ] as string[],

    /**
     * 需要 account 跟踪的 model
     */
    withAccountTracking: [
      "mob",
      "item",
      "skill", 
      "simulator",
      "world",
      "address",
      "activity",
      "zone",
      "recipe",
      "npc",
      "task",
    ] as string[],
  },

  /**
   * 特殊的创建逻辑
   * 某些 model 在创建时需要额外的步骤
   */
  specialCreateLogic: {
    account: {
      afterCreate: [
        `  // 创建关联的账户数据
  await trx.insertInto("account_create_data").values({ accountId: account.id }).executeTakeFirstOrThrow();
  await trx.insertInto("account_update_data").values({ accountId: account.id }).executeTakeFirstOrThrow();`,
      ],
    },
  } as Record<string, { beforeCreate?: string[]; afterCreate?: string[] }>,

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

/**
 * 检查 model 是否需要 statistic
 */
export function needsStatistic(modelName: string): boolean {
  return repositoryConfig.modelFeatures.withStatistic.includes(modelName);
}

/**
 * 检查 model 是否需要 account 跟踪
 */
export function needsAccountTracking(modelName: string): boolean {
  return repositoryConfig.modelFeatures.withAccountTracking.includes(modelName);
}

/**
 * 获取循环引用处理策略
 */
export function getCircularReferenceStrategy(
  modelName: string,
  relationName: string,
): "baseSchema" | "skipSubRelations" | "skipImport" | null {
  const key = `${modelName}.${relationName}`;
  return repositoryConfig.circularReferenceHandling.relations[key] || null;
}

/**
 * 检查是否应该跳过子关系查询（用于循环引用处理）
 */
export function shouldSkipSubRelationsForCircularRef(modelName: string, relationName: string): boolean {
  const strategy = getCircularReferenceStrategy(modelName, relationName);
  return strategy === "baseSchema" || strategy === "skipSubRelations" || strategy === "skipImport";
}

/**
 * 检查是否应该跳过导入（用于循环引用处理）
 */
export function shouldSkipImportForCircularRef(modelName: string, relationName: string): boolean {
  const strategy = getCircularReferenceStrategy(modelName, relationName);
  return strategy === "skipImport";
}

/**
 * 获取特殊的创建逻辑
 */
export function getSpecialCreateLogic(
  modelName: string,
): { beforeCreate?: string[]; afterCreate?: string[] } | undefined {
  return repositoryConfig.specialCreateLogic[modelName];
}
