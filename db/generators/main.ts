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
import { GENERATOR_CONFIG } from "./utils/config";
import { FileUtils, LogUtils } from "./utils/common";
import { EnumProcessor } from "./utils/enumProcessor";

// 导入生成器类
import { SQLGenerator } from "./SQLGenerator";
import { TypeScriptGenerator } from "./TypeScriptGenerator";
import { ZodGenerator } from "./ZodGenerator";
import { QueryBuilderGenerator } from "./QueryBuilderGenerator";

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

      // 1. 处理枚举和 Schema
      LogUtils.logStep("枚举处理", "处理枚举和 Schema");
      const enumProcessor = new EnumProcessor();
      const result = enumProcessor.processEnums().processSchema();
      const { updatedSchema, kyselyGenerator, clientGenerators } = result as {
        updatedSchema: string;
        kyselyGenerator: string;
        clientGenerators: string[];
      };

      // 2. 生成 SQL
      LogUtils.logStep("SQL生成", "生成 SQL");
      SQLGenerator.generate(updatedSchema, kyselyGenerator, clientGenerators, enumProcessor.getEnumDefinitions());

      // 3. 生成 TypeScript 类型
      TypeScriptGenerator.generate();

      // 4. 生成 Zod schemas
      LogUtils.logStep("Zod生成", "生成 Zod schemas");
      ZodGenerator.generate();

      // 5. 生成 QueryBuilder 规则
      LogUtils.logStep("QueryBuilder生成", "生成 QueryBuilder 规则");
      QueryBuilderGenerator.generate(enumProcessor.getEnumTypeToNameMap());

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
