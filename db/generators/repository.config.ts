/**
 * @file repository.config.ts
 * @description Repository 生成器配置文件
 * @version 1.0.0
 */

/**
 * Repository 生成配置
 */
export const repositoryConfig = {
  /**
   * 跳过生成的 model
   * 这些 model 不会生成 repository 文件
   */
  skip: [
    "session",
    "verification_token",
    "account_create_data",
    "account_update_data",
  ] as string[],

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
   * 自定义关系配置
   * 用于覆盖自动生成的关系查询逻辑
   */
  customRelations: {
    // 示例：
    // character: {
    //   weapon: (eb, id) => customWeaponQuery(eb, id)
    // }
  } as Record<string, Record<string, any>>,

  /**
   * 需要特殊处理的 model
   * 这些 model 需要额外的创建逻辑（如创建 statistic）
   */
  modelsWithStatistic: [
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
   * 这些 model 在创建时需要记录 createdByAccountId
   */
  modelsWithAccountTracking: [
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
   * 输出目录配置
   */
  output: {
    /** 生成的 repository 文件目录 */
    repositoryDir: "db/repositories",
    /** 是否覆盖现有文件 */
    overwrite: true, // 直接替换，不跳过
    /** 是否生成到单独的 generated 目录 */
    useGeneratedDir: false,
  },

  /**
   * 代码生成选项
   */
  codeGeneration: {
    /** 是否生成注释 */
    includeComments: true,
    /** 是否生成类型导入 */
    includeTypeImports: true,
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
  return repositoryConfig.modelsWithStatistic.includes(modelName);
}

/**
 * 检查 model 是否需要 account 跟踪
 */
export function needsAccountTracking(modelName: string): boolean {
  return repositoryConfig.modelsWithAccountTracking.includes(modelName);
}

/**
 * 获取特殊的创建逻辑
 */
export function getSpecialCreateLogic(modelName: string): { beforeCreate?: string[]; afterCreate?: string[] } | undefined {
  return repositoryConfig.specialCreateLogic[modelName];
}

