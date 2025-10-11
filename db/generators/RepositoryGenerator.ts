/**
 * @file RepositoryGenerator.ts
 * @description Repository 自动生成器 - 从 Prisma schema 生成完整的 Repository 文件
 * @version 1.0.0
 */

import { FileUtils, LogUtils, StringUtils } from "./utils/common";
import { RelationAnalyzer } from "./utils/relationAnalyzer";
import { CascadeAnalyzer } from "./utils/cascadeAnalyzer";
import {
  repositoryConfig,
  shouldSkipModel,
  needsStatistic,
  needsAccountTracking,
  getSpecialCreateLogic,
  getDeleteStrategy,
} from "./repository.config";
import { PATHS } from "./utils/config";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";

/**
 * Repository 生成器
 */
export class RepositoryGenerator {
  private relationAnalyzer!: RelationAnalyzer;
  private cascadeAnalyzer!: CascadeAnalyzer;
  private schema!: string;
  private models: any[] = [];

  /**
   * 初始化生成器
   */
  async initialize(): Promise<void> {
    // 读取 schema
    this.schema = FileUtils.safeReadFile(PATHS.baseSchema);

    // 解析 schema 获取 models
    this.models = this.parseModelsFromSchema(this.schema);

    // 初始化分析器
    const mockDMMF = {
      datamodel: {
        models: this.models,
        enums: [],
        types: [],
        indexes: []
      }
    };
    this.relationAnalyzer = new RelationAnalyzer(mockDMMF as any);
    this.cascadeAnalyzer = new CascadeAnalyzer(mockDMMF as any);
  }

  /**
   * 从 schema 字符串中解析 models
   */
  private parseModelsFromSchema(schema: string): any[] {
    const models: any[] = [];
    const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
    let match;

    while ((match = modelRegex.exec(schema)) !== null) {
      const modelName = match[1];
      const modelBody = match[2];
      
      const fields = this.parseFieldsFromModelBody(modelBody);
      
      models.push({
        name: modelName,
        fields: fields
      });
    }

    return models;
  }

  /**
   * 从 model body 中解析 fields
   */
  private parseFieldsFromModelBody(modelBody: string): any[] {
    const fields: any[] = [];
    // 改进正则表达式，更好地处理注释和复杂类型
    const fieldRegex = /(\w+)\s+([^{}]+?)(?:\s+\/\/\/.*)?$/gm;
    let match;

    // 标量类型列表
    const scalarTypes = ['String', 'Int', 'Float', 'Boolean', 'DateTime', 'Json', 'Bytes'];

    while ((match = fieldRegex.exec(modelBody)) !== null) {
      const fieldName = match[1];
      const fieldType = match[2].trim();
      
      // 解析字段属性
      const isList = fieldType.includes('[]');
      const isOptional = fieldType.includes('?');
      const isId = fieldType.includes('@id');
      const isUnique = fieldType.includes('@unique');
      
      // 清理类型名称，移除注释和属性
      let cleanType = fieldType.replace(/\/\/.*$/, '').trim(); // 移除注释
      cleanType = cleanType.replace(/[\[\]?@].*/, '').trim(); // 移除数组、可选、属性标记
      
      // 检查是否是关系字段
      // 1. 必须是标量类型
      // 2. 不能是枚举注释
      // 3. 必须有 @relation 属性才算是关系字段
        const hasRelationAttribute = fieldType.includes('@relation');
        const isEnumComment = cleanType.includes('// Enum') || cleanType.includes('// enum');
        const isScalarType = scalarTypes.includes(cleanType);
        
        // 关系字段判断：必须有@relation属性才是关系字段
        const isRelation = hasRelationAttribute && !scalarTypes.includes(cleanType) && !isEnumComment && cleanType.length > 0;
      
      // 解析外键信息
      const foreignKeyMatch = fieldType.match(/@relation\([^)]*fields:\s*\[([^\]]+)\]/);
      const relationFromFields = foreignKeyMatch ? [foreignKeyMatch[1]] : undefined;
      
      // 解析删除行为
      const onDeleteMatch = fieldType.match(/onDelete:\s*(\w+)/);
      const relationOnDelete = onDeleteMatch ? onDeleteMatch[1] : undefined;

      fields.push({
        name: fieldName,
        type: cleanType,
        kind: isRelation ? 'object' : 'scalar',
        isList: isList,
        isRequired: !isOptional,
        isId: isId,
        isUnique: isUnique,
        relationFromFields: relationFromFields,
        relationOnDelete: relationOnDelete,
        documentation: ''
      });
    }

    return fields;
  }

  /**
   * 生成所有 repository 文件
   */
  async generateAll(): Promise<void> {
    LogUtils.logStep("Repository 生成", "开始生成 Repository 文件");

    await this.initialize();

    const generatedFiles: string[] = [];

    for (const model of this.models) {
      if (shouldSkipModel(model.name)) {
        LogUtils.logInfo(`跳过 ${model.name}`);
        continue;
      }

      try {
        await this.generateRepository(model.name);
        generatedFiles.push(model.name);
        LogUtils.logSuccess(`生成 ${model.name} Repository`);
      } catch (error) {
        LogUtils.logError(`生成 ${model.name} Repository 失败`, error as Error);
      }
    }

    // 生成 index.ts
    await this.generateIndex(generatedFiles);

    LogUtils.logSuccess(
      `Repository 生成完成！共生成 ${generatedFiles.length} 个文件`
    );
  }

  /**
   * 生成单个 repository 文件
   */
  private async generateRepository(modelName: string): Promise<void> {
    const code = await this.generateRepositoryCode(modelName);
    const fileName = `${modelName.toLowerCase()}.ts`;
    const outputPath = path.join(PATHS.repository.output, fileName);

    // 检查是否需要覆盖
    if (!repositoryConfig.output.overwrite && fs.existsSync(outputPath)) {
      LogUtils.logInfo(`文件已存在，跳过: ${fileName}`);
      return;
    }

    FileUtils.safeWriteFile(outputPath, code);
  }

  /**
   * 生成 repository 代码
   */
  private async generateRepositoryCode(modelName: string): Promise<string> {
    const tableName = modelName.toLowerCase();
    const pascalName = StringUtils.toPascalCase(modelName);
    const camelName = StringUtils.toCamelCase(modelName);

    // 生成各个部分
    const imports = this.generateImports(modelName);
    const types = this.generateTypes(modelName);
    const relations = this.generateRelations(modelName);
    const crudMethods = this.generateCrudMethods(modelName);

    return `${imports}

${types}

${relations}

${crudMethods}
`;
  }

  /**
   * 生成导入语句
   */
  private generateImports(modelName: string): string {
    const tableName = modelName.toLowerCase();
    const pascalName = StringUtils.toPascalCase(modelName);

    // 计算相对路径
    const relativePaths = this.calculateRelativePaths();

    const imports: string[] = [
      `import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";`,
      `import { getDB } from "${relativePaths.database}";`,
      `import { DB, ${tableName} } from "${relativePaths.kysely}";`,
    ];

    // 添加 kysely helpers
    if (repositoryConfig.codeGeneration.includeRelations) {
      imports.push(
        `import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";`
      );
    }

    // 添加 cuid2
    imports.push(`import { createId } from "@paralleldrive/cuid2";`);

    // 添加 zod
    imports.push(`import { z } from "zod";`);

    // 添加 schema 导入
    const schemaImports = this.getSchemaImports(modelName);
    if (schemaImports.length > 0) {
      imports.push(`import { ${schemaImports.join(", ")} } from "${relativePaths.zod}";`);
    }

    // 添加 subRelationFactory
    if (repositoryConfig.codeGeneration.includeRelations) {
      imports.push(`import { defineRelations, makeRelations } from "${relativePaths.subRelationFactory}";`);
    }

    // 添加特殊导入
    if (needsStatistic(modelName)) {
      imports.push(`import { createStatistic } from "${relativePaths.statistic}";`);
    }

    if (needsAccountTracking(modelName)) {
      imports.push(`import { store } from "~/store";`);
    }

    return imports.join("\n");
  }

  /**
   * 计算相对路径
   */
  private calculateRelativePaths(): {
    database: string;
    kysely: string;
    zod: string;
    subRelationFactory: string;
    statistic: string;
  } {
    // 从输出目录到各个目标目录的相对路径
    const outputDir = PATHS.repository.output;
    const dbDir = path.dirname(path.dirname(PATHS.baseSchema)); // db 目录 (schema 的父目录)
    const repositoriesDir = path.join(dbDir, "repositories");
    const generatedDir = path.join(dbDir, "generated");

    return {
      database: path.relative(outputDir, path.join(repositoriesDir, "database")).replace(/\\/g, "/"),
      kysely: path.relative(outputDir, path.join(generatedDir, "kysely", "kysely")).replace(/\\/g, "/"),
      zod: path.relative(outputDir, path.join(generatedDir, "zod", "index")).replace(/\\/g, "/"),
      subRelationFactory: path.relative(outputDir, path.join(repositoriesDir, "subRelationFactory")).replace(/\\/g, "/"),
      statistic: path.relative(outputDir, path.join(repositoriesDir, "statistic")).replace(/\\/g, "/"),
    };
  }

  /**
   * 获取需要导入的 schema
   */
  private getSchemaImports(modelName: string): string[] {
    const tableName = modelName.toLowerCase();
    const schemas = new Set<string>([`${tableName}Schema`]);

    // 添加关系的 schema
    if (repositoryConfig.codeGeneration.includeRelations) {
      const relations = this.relationAnalyzer.getModelRelations(modelName);
      for (const relation of relations) {
        // 只添加有效的关系 schema，跳过枚举类型
        if (relation.targetModel && !relation.targetModel.includes('//')) {
          const targetSchema = `${relation.targetModel.toLowerCase()}Schema`;
          schemas.add(targetSchema);
        }
      }
    }

    // 添加 statistic schema
    if (needsStatistic(modelName)) {
      schemas.add("statisticSchema");
    }

    return Array.from(schemas);
  }

  /**
   * 生成类型定义
   */
  private generateTypes(modelName: string): string {
    const tableName = modelName.toLowerCase();
    const pascalName = StringUtils.toPascalCase(modelName);

    return `// 1. 类型定义
export type ${pascalName} = Selectable<${tableName}>;
export type ${pascalName}Insert = Insertable<${tableName}>;
export type ${pascalName}Update = Updateable<${tableName}>;`;
  }

  /**
   * 生成关系定义
   */
  private generateRelations(modelName: string): string {
    if (!repositoryConfig.codeGeneration.includeRelations) {
      return "";
    }

    const tableName = modelName.toLowerCase();
    const pascalName = StringUtils.toPascalCase(modelName);
    const camelName = StringUtils.toCamelCase(modelName);

    const generatedRelations = this.relationAnalyzer.generateAllRelations(modelName);

    if (generatedRelations.length === 0) {
      return `// 2. 无关系定义`;
    }

    // 生成 defineRelations
    const relationDefs = generatedRelations
      .map((rel) => {
        return `  ${rel.name}: {
    build: ${rel.buildCode},
    schema: ${rel.schemaCode},
  }`;
      })
      .join(",\n");

    const relationCode = `// 2. 关系定义
const ${camelName}SubRelationDefs = defineRelations({
${relationDefs}
});

export const ${camelName}RelationsFactory = makeRelations<"${tableName}", typeof ${camelName}SubRelationDefs>(
  ${camelName}SubRelationDefs
);

export const ${pascalName}WithRelationsSchema = z.object({
  ...${tableName}Schema.shape,
  ...${camelName}RelationsFactory.schema.shape,
});

export const ${camelName}SubRelations = ${camelName}RelationsFactory.subRelations;`;

    return relationCode;
  }

  /**
   * 生成 CRUD 方法
   */
  private generateCrudMethods(modelName: string): string {
    const tableName = modelName.toLowerCase();
    const pascalName = StringUtils.toPascalCase(modelName);
    const camelName = StringUtils.toCamelCase(modelName);

    const methods: string[] = [];

    // findById
    methods.push(this.generateFindById(modelName));

    // findAll
    methods.push(this.generateFindAll(modelName));

    // insert
    methods.push(this.generateInsert(modelName));

    // create
    methods.push(this.generateCreate(modelName));

    // update
    methods.push(this.generateUpdate(modelName));

    // delete
    methods.push(this.generateDelete(modelName));

    // findWithRelations
    if (repositoryConfig.codeGeneration.includeRelations) {
      methods.push(this.generateFindWithRelations(modelName));
    }

    // WithRelations type
    if (repositoryConfig.codeGeneration.includeWithRelationsType && repositoryConfig.codeGeneration.includeRelations) {
      methods.push(`// 关联查询类型
export type ${pascalName}WithRelations = Awaited<ReturnType<typeof find${pascalName}WithRelations>>;`);
    }

    return `// 3. CRUD 方法\n${methods.join("\n\n")}`;
  }

  /**
   * 生成 findById 方法
   */
  private generateFindById(modelName: string): string {
    const tableName = modelName.toLowerCase();
    const pascalName = StringUtils.toPascalCase(modelName);

    return `export async function find${pascalName}ById(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return (await db.selectFrom("${tableName}").where("id", "=", id).selectAll("${tableName}").executeTakeFirst()) || null;
}`;
  }

  /**
   * 生成 findAll 方法
   */
  private generateFindAll(modelName: string): string {
    const tableName = modelName.toLowerCase();
    const pascalName = StringUtils.toPascalCase(modelName);
    const pluralName = this.pluralize(pascalName);

    return `export async function find${pluralName}(trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db.selectFrom("${tableName}").selectAll("${tableName}").execute();
}`;
  }

  /**
   * 生成 insert 方法
   */
  private generateInsert(modelName: string): string {
    const tableName = modelName.toLowerCase();
    const pascalName = StringUtils.toPascalCase(modelName);

    return `export async function insert${pascalName}(trx: Transaction<DB>, data: ${pascalName}Insert) {
  return await trx.insertInto("${tableName}").values(data).returningAll().executeTakeFirstOrThrow();
}`;
  }

  /**
   * 生成 create 方法
   */
  private generateCreate(modelName: string): string {
    const tableName = modelName.toLowerCase();
    const pascalName = StringUtils.toPascalCase(modelName);
    const hasStatistic = needsStatistic(modelName);
    const hasAccountTracking = needsAccountTracking(modelName);
    const specialLogic = getSpecialCreateLogic(modelName);

    const beforeCreate = specialLogic?.beforeCreate || [];
    const afterCreate = specialLogic?.afterCreate || [];

    let createLogic = "";

    // 添加前置逻辑
    if (beforeCreate.length > 0) {
      createLogic += beforeCreate.join("\n") + "\n\n";
    }

    // 创建 statistic
    if (hasStatistic) {
      createLogic += `  const statistic = await createStatistic(trx);\n\n`;
    }

    // 创建主记录
    const valueFields: string[] = [
      "    ...data",
      `    id: data.id || createId()`,
    ];

    if (hasStatistic) {
      valueFields.push("    statisticId: statistic.id");
    }

    if (hasAccountTracking) {
      valueFields.push(
        "    createdByAccountId: store.session.user.account?.id",
        "    updatedByAccountId: store.session.user.account?.id"
      );
    }

    createLogic += `  const ${tableName} = await trx
    .insertInto("${tableName}")
    .values({
${valueFields.join(",\n")},
    })
    .returningAll()
    .executeTakeFirstOrThrow();\n`;

    // 添加后置逻辑
    if (afterCreate.length > 0) {
      createLogic += "\n" + afterCreate.join("\n");
    }

    createLogic += `\n  return ${tableName};`;

    return `export async function create${pascalName}(trx: Transaction<DB>, data: ${pascalName}Insert) {
${createLogic}
}`;
  }

  /**
   * 生成 update 方法
   */
  private generateUpdate(modelName: string): string {
    const tableName = modelName.toLowerCase();
    const pascalName = StringUtils.toPascalCase(modelName);

    return `export async function update${pascalName}(trx: Transaction<DB>, id: string, data: ${pascalName}Update) {
  return await trx.updateTable("${tableName}").set(data).where("id", "=", id).returningAll().executeTakeFirstOrThrow();
}`;
  }

  /**
   * 生成 delete 方法
   */
  private generateDelete(modelName: string): string {
    const tableName = modelName.toLowerCase();
    const pascalName = StringUtils.toPascalCase(modelName);
    const strategy = getDeleteStrategy(modelName);

    if (strategy === "cascade") {
      // 简单删除，数据库处理级联
      return `export async function delete${pascalName}(trx: Transaction<DB>, id: string) {
  return (await trx.deleteFrom("${tableName}").where("id", "=", id).returningAll().executeTakeFirst()) || null;
}`;
    } else {
      // 复杂删除逻辑
      const deleteCode = this.cascadeAnalyzer.generateDeleteFunction(modelName, {
        resetReferences: strategy === "resetReferences",
      });
      return deleteCode;
    }
  }

  /**
   * 生成 findWithRelations 方法
   */
  private generateFindWithRelations(modelName: string): string {
    const tableName = modelName.toLowerCase();
    const pascalName = StringUtils.toPascalCase(modelName);
    const camelName = StringUtils.toCamelCase(modelName);

    return `export async function find${pascalName}WithRelations(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("${tableName}")
    .where("id", "=", id)
    .selectAll("${tableName}")
    .select((eb) => ${camelName}SubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}`;
  }

  /**
   * 生成 index.ts
   */
  private async generateIndex(models: string[]): Promise<void> {
    const imports: string[] = [];
    const exports: Record<string, any> = {};

    for (const modelName of models) {
      const camelName = StringUtils.toCamelCase(modelName);
      const pascalName = StringUtils.toPascalCase(modelName);

      imports.push(
        `import { find${pascalName}WithRelations } from "./${modelName.toLowerCase()}";`
      );

      exports[modelName.toLowerCase()] = `find${pascalName}WithRelations`;
    }

    // 计算相对路径
    const relativePaths = this.calculateRelativePaths();

    // 生成代码
    const indexCode = `import { DB } from "${relativePaths.kysely}";
${imports.join("\n")}

export const relationsDataFinder: Record<keyof DB, any> = {
${this.generateIndexExports(exports)}
};
`;

    const outputPath = path.join(PATHS.repository.output, "index.ts");
    FileUtils.safeWriteFile(outputPath, indexCode);
    LogUtils.logSuccess("生成 index.ts");
  }

  /**
   * 生成 index.ts 的导出对象
   */
  private generateIndexExports(exports: Record<string, any>): string {
    // 读取所有表名
    const allTables = this.models.map((m: any) => m.name.toLowerCase());

    const lines: string[] = [];
    for (const tableName of allTables) {
      const value = exports[tableName] || "null";
      lines.push(`  ${tableName}: ${value}`);
    }

    return lines.join(",\n");
  }

  /**
   * 简单的复数化（英文）
   */
  private pluralize(word: string): string {
    if (word.endsWith("y")) {
      return word.slice(0, -1) + "ies";
    } else if (
      word.endsWith("s") ||
      word.endsWith("x") ||
      word.endsWith("ch") ||
      word.endsWith("sh")
    ) {
      return word + "es";
    } else {
      return word + "s";
    }
  }
}

