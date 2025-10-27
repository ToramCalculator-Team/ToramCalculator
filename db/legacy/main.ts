/**
 * @file main.ts
 * @description 开发环境生成器
 *
 * 架构设计：
 * 1. MainGenerator - 主协调器，管理整个生成流程
 * 2. SQLGenerator - 专注于 SQL 脚本生成和数据库架构处理
 * 3. TypeScriptGenerator - 专注于 TypeScript 类型生成（Kysely）
 * 4. ZodGenerator - 专注于 Zod 验证模式生成
 * 5. QueryBuilderGenerator - 专注于查询构建器规则生成
 * 6. EnumProcessor - 处理枚举定义和 Schema 注入
 *
 * 生成流程：
 * 1. 处理枚举和 Schema
 * 2. 生成 SQL 初始化脚本
 * 3. 生成 TypeScript 类型定义
 * 4. 生成 Zod 验证模式
 * 5. 生成 QueryBuilder 规则
 */

// 导入工具模块
import { GENERATOR_CONFIG, PATHS } from "./config/generator.config";
import { CommandUtils, FileUtils, LogUtils } from "./utils/common";

// 导入处理器
import { EnumProcessor } from "./processors/EnumProcessor";
import { SchemaBuilder } from "./processors/SchemaBuilder";
import { DMMFProvider } from "./processors/DMMFProvider";
import { RelationProcessor } from "./processors/RelationProcessor";

// 导入生成器类
import { SQLGenerator } from "./generators/SQLGenerator";
import { ZodGenerator } from "./generators/ZodGenerator";
import { QueryBuilderGenerator } from "./generators/QueryBuilderGenerator";
import { RepositoryGenerator } from "./generators/RepositoryGenerator";
import { SchemaInfoGenerator } from "./generators/SchemaInfoGenerator";

// 导入隐式多对多关系表生成函数
import { generateImplicitManyToManyModels } from "../generator/helpers/generateImplicitManyToManyModels";

// 辅助函数：排序
function sorted<T>(array: T[], compareFn?: (a: T, b: T) => number): T[] {
  return [...array].sort(compareFn);
}

/**
 * 主生成器
 * 协调所有生成器的执行
 */
class MainGenerator {
  /**
   * 执行完整的生成流程
   */
  static async generate(): Promise<void> {
    try {
      LogUtils.logStep("初始化", "开始生成...");

      // 确保目录存在
      FileUtils.ensureDirectories(GENERATOR_CONFIG.directories);

      // 1. 枚举处理
      LogUtils.logStep("枚举处理", "处理枚举和 Schema");
      const enumProcessor = new EnumProcessor();
      enumProcessor.processEnums();
      
      // 2. 构建完整 schema
      LogUtils.logStep("Schema 构建", "构建完整的 Prisma schema");
      const schemaBuilder = new SchemaBuilder(enumProcessor);
      const fullSchema = schemaBuilder.build();
      
      // 3. 生成 DMMF
      LogUtils.logStep("DMMF 生成", "从 Prisma schema 生成 DMMF");
      const dmmfProvider = new DMMFProvider(fullSchema);
      const dmmf = await dmmfProvider.getDMMF();
      
      // 4. 生成隐式多对多关系表
      LogUtils.logStep("中间表处理", "生成隐式多对多关系表");
      const implicitManyToManyModels = generateImplicitManyToManyModels(dmmf.datamodel.models);
      
      // 包含中间表的完整模型列表
      const allModels = sorted([...dmmf.datamodel.models, ...implicitManyToManyModels], (a, b) =>
        a.name.localeCompare(b.name)
      );
      
      // 5. 处理关系
      LogUtils.logStep("关系处理", "提取表间依赖关系");
      const relationProcessor = new RelationProcessor(dmmf);
      relationProcessor.processRelations();
      
      // 6. 并行生成（互不依赖）
      LogUtils.logStep("并行生成", "生成所有输出文件");
      await Promise.all([
        // 生成 database-schema.ts（供外部使用）
        new SchemaInfoGenerator(dmmf, relationProcessor).generate(),
        
        // 生成 SQL
        SQLGenerator.generate(fullSchema),
        
        // 生成 Zod + TS 类型
        new ZodGenerator(dmmf, enumProcessor, allModels).generate(),
        
        // 生成 QueryBuilder 规则
        new QueryBuilderGenerator(dmmf, enumProcessor, allModels).generate(),
        
        // 生成 Repository
        (async () => {
          const repositoryGenerator = new RepositoryGenerator(dmmf, allModels);
          await repositoryGenerator.initialize();
          await repositoryGenerator.generateAll();
        })(),
      ]);

      // 清理临时文件
      FileUtils.cleanupTempFiles(GENERATOR_CONFIG.tempFiles);

      LogUtils.logSuccess("所有生成完成！");
    } catch (error) {
      LogUtils.logError("生成失败", error as Error);
      process.exit(1);
    }
  }
}

/**
 * 主函数
 * 协调所有生成器的执行
 */
async function main(): Promise<void> {
  await MainGenerator.generate();
}

// 如果直接运行此文件，则执行主函数
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
