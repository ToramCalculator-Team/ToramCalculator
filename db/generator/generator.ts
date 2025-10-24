import type { GeneratorOptions } from "@prisma/generator-helper";
import pkg from "@prisma/generator-helper";
import path from "node:path";

import { generateDatabaseType } from "./helpers/generateDatabaseType";
import { generateFiles } from "./helpers/generateFiles";
import { generateImplicitManyToManyModels } from "./helpers/generateImplicitManyToManyModels";
import { generateModel } from "./helpers/generateModel";
import { sorted } from "./utils/sorted";
import { validateConfig } from "./utils/validateConfig";
import { writeFileSafely } from "./utils/writeFileSafely";

import { type EnumType, generateEnumType } from "./helpers/generateEnumType";
import {
  convertToMultiSchemaModels,
  parseMultiSchemaMap,
} from "./helpers/multiSchemaHelpers";

// 导入新的工具类
import { SchemaCollector } from "./utils/schemaCollector";
import { EnumInjector } from "./helpers/enumInjector";
import { DatabaseSchemaGenerator } from "./helpers/generateDatabaseSchema";
import { ZodGenerator } from "./helpers/generateZod";
import { QueryBuilderGenerator } from "./helpers/generateQueryBuilder";
import { RepositoryGenerator } from "./helpers/generateRepository";
import { SQLGenerator } from "./helpers/generateSQL";

const { generatorHandler } = pkg;

generatorHandler({
  onManifest() {
    return {
      version: "1.0.0",
      defaultOutput: "./db/generated",
      prettyName: "Prisma Generator",
    };
  },
  onGenerate: async (options: GeneratorOptions) => {
    const schemaCollector = new SchemaCollector();
    
    try {
      console.log("🚀 开始 Prisma 生成器流程...");

      // Schema 准备阶段
      console.log("📋 准备 Schema 文件...");
      const enumInjector = new EnumInjector();

      // 1. 收集和合并 schema 文件
      const mergedSchema = schemaCollector.collectAndMerge();

      // 2. 处理枚举
      enumInjector.processEnums();
      const processedSchema = enumInjector.processSchema(mergedSchema);
      const finalSchema = enumInjector.injectEnumDefinitions(processedSchema);

      // 3. 写入临时 schema 文件
      const tempSchemaPath = schemaCollector.writeTempSchema(finalSchema);

      console.log("✅ Schema 准备完成");
      
      // Parse the config
      const config = validateConfig({
        ...options.generator.config,
        databaseProvider: options.datasources[0].provider,
      });

    // Generate enum types
    let enums = options.dmmf.datamodel.enums
      .map(({ name, values }) => generateEnumType(name, values))
      .filter((e): e is EnumType => !!e);

    // Generate DMMF models for implicit many to many tables
    //
    // (I don't know why you would want to use implicit tables
    // with kysely, but hey, you do you)
    const implicitManyToManyModels = generateImplicitManyToManyModels(
      options.dmmf.datamodel.models
    );

    const hasMultiSchema = options.datasources.some(
      (d) => d.schemas.length > 0
    );

    const multiSchemaMap =
      config.groupBySchema || hasMultiSchema
        ? parseMultiSchemaMap(options.datamodel)
        : undefined;

    // Generate model types
    let models = sorted(
      [...options.dmmf.datamodel.models, ...implicitManyToManyModels],
      (a, b) => a.name.localeCompare(b.name)
    ).map((m) =>
      generateModel(m, config, {
        groupBySchema: config.groupBySchema,
        defaultSchema: config.defaultSchema,
        multiSchemaMap,
      })
    );

    // Extend model table names with schema names if using multi-schemas
    if (hasMultiSchema) {
      const filterBySchema = config.filterBySchema
        ? new Set(config.filterBySchema)
        : null;

      models = convertToMultiSchemaModels({
        models,
        groupBySchema: config.groupBySchema,
        defaultSchema: config.defaultSchema,
        filterBySchema,
        multiSchemaMap,
      });
      
      enums = convertToMultiSchemaModels({
        models: enums,
        groupBySchema: config.groupBySchema,
        defaultSchema: config.defaultSchema,
        filterBySchema,
        multiSchemaMap,
      });
    }

    // Generate the database type that ties it all together
    const databaseType = generateDatabaseType(models, config);

    // 并行生成所有文件（除了 SQL，因为它需要 schema 内容）
    console.log("📊 并行生成所有文件...");
    const outputDir = options.generator.output?.value || "";
    
    const generationResults = await Promise.allSettled([
      // Generate database schema info
      (async () => {
        console.log("📊 生成数据库架构信息...");
        const databaseSchemaGenerator = new DatabaseSchemaGenerator(options.dmmf);
        const databaseSchemaPath = path.join(outputDir, "database-schema.ts");
        await databaseSchemaGenerator.generate(databaseSchemaPath);
      })(),

      // Generate Zod schemas
      (async () => {
        console.log("🔍 生成 Zod schemas...");
        const zodGenerator = new ZodGenerator(options.dmmf);
        const zodPath = path.join(outputDir, "zod/index.ts");
        await zodGenerator.generate(zodPath);
      })(),

      // Generate QueryBuilder rules
      (async () => {
        console.log("🔍 生成 QueryBuilder 规则...");
        const queryBuilderGenerator = new QueryBuilderGenerator(options.dmmf);
        const queryBuilderPath = path.join(outputDir, "queryBuilderRules.ts");
        await queryBuilderGenerator.generate(queryBuilderPath);
      })(),

               // Generate Repository
               (async () => {
                 console.log("🔍 生成 Repository 文件...");
                 const repositoryGenerator = new RepositoryGenerator(options.dmmf);
                 const repositoryPath = path.join(outputDir, "repositories", "index.ts");
                 await repositoryGenerator.generate(repositoryPath);
               })(),
    ]);

    // 检查生成结果
    const failedGenerations = generationResults.filter(result => result.status === 'rejected');
    if (failedGenerations.length > 0) {
      console.warn(`⚠️  ${failedGenerations.length} 个生成器失败，但继续执行其他任务`);
      failedGenerations.forEach((result, index) => {
        console.error(`生成器 ${index + 1} 失败:`, result.reason);
      });
    }

    // Generate SQL (需要 schema 内容，所以单独执行)
    console.log("🔍 生成 SQL 初始化脚本...");
    try {
      const sqlGenerator = new SQLGenerator(outputDir);
      await sqlGenerator.generate(finalSchema);
    } catch (error) {
      console.warn("⚠️  SQL 生成失败，但继续执行其他任务:", error);
    }

      // 跳过 types.ts 生成，因为类型应该从 zod 导出
      console.log("ℹ️  跳过 types.ts 生成，类型从 zod/index.ts 导出");
      
      console.log("✅ Prisma 生成器流程完成");
      
    } catch (error) {
      console.error("❌ Prisma 生成器流程失败:", error);
      throw error;
    } finally {
      // 确保临时文件被清理
      schemaCollector.cleanupTempSchema();
    }
  },
});
