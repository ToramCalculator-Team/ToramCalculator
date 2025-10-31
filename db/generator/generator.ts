import type { GeneratorOptions } from "@prisma/generator-helper";
import pkg from "@prisma/generator-helper";
import path from "node:path";

import { generateImplicitManyToManyModels } from "./helpers/generateImplicitManyToManyModels";
import { sorted } from "./utils/sorted";
import { validateConfig } from "./utils/validateConfig";

import { type EnumType, generateEnumType } from "./helpers/generateEnumType";
import { parseMultiSchemaMap } from "./helpers/multiSchemaHelpers";

// 导入新的工具类
import { SchemaCollector } from "./utils/schemaCollector";
import { ZodGenerator } from "./helpers/generateZod";
import { DMMFUtilsGenerator } from "./helpers/generateDMMFUtils";
import { QueryBuilderGenerator } from "./helpers/generateQueryBuilder";
import { RepositoryGenerator } from "./helpers/generateRepository";
import { SQLGenerator } from "./helpers/generateSQL";
import { PATHS } from "./config";
import { writeFileSafely } from "./utils/writeFileSafely";

const { generatorHandler } = pkg;

generatorHandler({
  onManifest() {
    return {
      version: "1.0.0",
      defaultOutput: PATHS.generatedFolder,
      prettyName: "Prisma Generator",
    };
  },
  onGenerate: async (options: GeneratorOptions) => {
    const schemaCollector = new SchemaCollector();

    try {
      console.log("开始 Prisma 生成器流程...");

      // Schema 准备阶段
      // 注意：此时临时 schema 文件应该已经由第一阶段的脚本生成
      console.log("Schema 准备完成（使用临时 schema 文件）");

      // 读取临时 schema 文件
      const finalSchema = schemaCollector.readTempSchema(PATHS.tempSchema);

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
      const implicitManyToManyModels = generateImplicitManyToManyModels(options.dmmf.datamodel.models);

      const hasMultiSchema = options.datasources.some((d) => d.schemas.length > 0);

      const multiSchemaMap =
        config.groupBySchema || hasMultiSchema ? parseMultiSchemaMap(options.datamodel) : undefined;

      // 包含中间表的完整模型列表
      let allModels = sorted([...options.dmmf.datamodel.models, ...implicitManyToManyModels], (a, b) =>
        a.name.localeCompare(b.name),
      );

      console.log("开始生成文件（分阶段执行）...");
      const outputDir = options.generator.output?.value || "";

      // 阶段1: 生成 Zod schemas (产出 DB 类型)
      console.log("阶段1: 生成 Zod schemas...");
      const zodGenerator = new ZodGenerator(options.dmmf, allModels);
      const zodPath = PATHS.zodSchema;
      await zodGenerator.generate(zodPath);

      // 阶段2: 生成 DMMF 工具 (可以引用 DB 类型)
      console.log("阶段2: 生成 DMMF 工具文件...");
      const dmmfUtilsGenerator = new DMMFUtilsGenerator(options.dmmf, allModels);
      const dmmfUtilsPath = PATHS.dmmfUtils;
      await dmmfUtilsGenerator.generate(dmmfUtilsPath);

      // 阶段3: 并行生成其他文件
      console.log("阶段3: 并行生成其他文件...");
      const generationResults = await Promise.allSettled([
        // Generate QueryBuilder rules
        (async () => {
          const queryBuilderGenerator = new QueryBuilderGenerator(options.dmmf, allModels);
          const queryBuilderPath = PATHS.queryBuilderRules;
          await queryBuilderGenerator.generate(queryBuilderPath);
        })(),

        // Generate Repository
        (async () => {
          const repositoryGenerator = new RepositoryGenerator(options.dmmf, allModels);
          const repositoryPath = PATHS.repositoriesOutput;
          await repositoryGenerator.generate(repositoryPath);
        })(),
      ]);

      // 检查生成结果
      const failedGenerations = generationResults.filter((result) => result.status === "rejected");
      if (failedGenerations.length > 0) {
        console.warn(`⚠️  ${failedGenerations.length} 个生成器失败，但继续执行其他任务`);
        failedGenerations.forEach((result, index) => {
          console.error(`生成器 ${index + 1} 失败:`, result.reason);
        });
      }

      // Generate SQL (需要 schema 内容，所以单独执行)
      try {
        const sqlGenerator = new SQLGenerator(outputDir);
        await sqlGenerator.generate(finalSchema);
      } catch (error) {
        console.warn("⚠️  SQL 生成失败，但继续执行其他任务:", error);
      }

      // 跳过 types.ts 生成，因为类型应该从 zod 导出
      console.log("跳过 types.ts 生成，类型从 zod/index.ts 导出");

      console.log("Prisma 生成器流程完成");
    } catch (error) {
      console.error("Prisma 生成器流程失败:", error);
      throw error;
    } finally {
      // 确保临时文件被清理
      schemaCollector.cleanupTempSchema();
    }
  },
});
