/**
 * @file RepositoryGenerator.ts
 * @description Repository 自动生成器 - 从 Prisma schema 生成完整的 Repository 文件
 * @version 1.0.0
 */

import { FileUtils, LogUtils, StringUtils } from "./utils/common";
import { SchemaParser } from "./utils/schemaParser";
import { CascadeAnalyzer } from "./utils/cascadeAnalyzer";
import { ValidationUtils } from "./utils/validation";
import {
  repositoryConfig,
  shouldSkipModel,
  needsStatistic,
  needsAccountTracking,
  getSpecialCreateLogic,
  getDeleteStrategy,
  shouldSkipImportForCircularRef,
} from "./repository.config";
import { PATHS } from "./utils/config";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";

/**
 * Repository 生成器
 */
export class RepositoryGenerator {
  private schemaParser!: SchemaParser;
  private cascadeAnalyzer!: CascadeAnalyzer;
  private schema!: string;
  private models: any[] = [];

  /**
   * 初始化生成器
   */
  async initialize(): Promise<void> {
    try {
      // 读取 schema
      this.schema = FileUtils.safeReadFile(PATHS.baseSchema);

      // 使用 Prisma DMMF 获取准确的关系信息
      const { getDMMF } = await import('@prisma/internals');
      const dmmf = await getDMMF({ datamodel: this.schema });
      
      // 从 DMMF 中提取模型信息
      this.models = dmmf.datamodel.models.map(model => ({
        name: model.name,
        fields: model.fields.map(field => ({
          name: field.name,
          type: field.type,
          kind: field.kind,
          isList: field.isList,
          isRequired: field.isRequired,
          isId: field.isId,
          isUnique: field.isUnique,
          relationFromFields: field.relationFromFields,
          relationToFields: field.relationToFields,
          relationName: field.relationName,
          relationOnDelete: field.relationOnDelete,
          documentation: field.documentation || ''
        }))
      }));

      // 初始化分析器
      this.schemaParser = new SchemaParser(this.models);
      this.cascadeAnalyzer = new CascadeAnalyzer(dmmf as any);
      
      LogUtils.logSuccess("Repository 生成器初始化完成（使用 DMMF）");
    } catch (error) {
      LogUtils.logError("Repository 生成器初始化失败", error as Error);
      throw error;
    }
  }


  /**
   * 生成所有 repository 文件
   */
  async generateAll(): Promise<void> {
    LogUtils.logStep("Repository 生成", "开始生成 Repository 文件");

    await this.initialize();

    // 验证 Schema
    const schemaValidation = ValidationUtils.validateSchema({ models: this.models });
    if (!schemaValidation.isValid) {
      LogUtils.logError("Schema 验证失败", new Error(ValidationUtils.formatValidationResult(schemaValidation)));
      return;
    }

    if (schemaValidation.warnings.length > 0) {
      LogUtils.logWarning(`Schema 验证警告: ${ValidationUtils.formatValidationResult(schemaValidation)}`);
    }

    const generatedFiles: string[] = [];

    for (const model of this.models) {
      if (shouldSkipModel(model.name)) {
        LogUtils.logInfo(`跳过 ${model.name}`);
        continue;
      }

      try {
        // 验证单个模型
        const modelValidation = ValidationUtils.validateModel(model);
        if (!modelValidation.isValid) {
          LogUtils.logError(`模型 ${model.name} 验证失败`, new Error(ValidationUtils.formatValidationResult(modelValidation)));
          continue;
        }

        await this.generateRepository(model.name);
        generatedFiles.push(model.name);
        // LogUtils.logSuccess(`生成 ${model.name} Repository`);
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
    imports.push(`import { z } from "zod/v4";`);

    // 添加 schema 导入
    const schemaImports = this.getSchemaImports(modelName);
    if (schemaImports.length > 0) {
      imports.push(`import { ${schemaImports.join(", ")} } from "${relativePaths.zod}";`);
    }

    // 添加 subRelationFactory
    if (repositoryConfig.codeGeneration.includeRelations) {
      imports.push(`import { defineRelations, makeRelations } from "${relativePaths.subRelationFactory}";`);
      
      // 添加子关系函数导入
      const subRelationImports = this.getSubRelationImports(modelName);
      if (subRelationImports.length > 0) {
        imports.push(subRelationImports.join("\n"));
      }
      
      // 添加关系 schema 导入
      const relationSchemaImports = this.getRelationSchemaImports(modelName);
      if (relationSchemaImports.length > 0) {
        imports.push(relationSchemaImports.join("\n"));
      }
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
   * 判断是否是业务父级关系
   * 基于字段命名规范：belongTo*、usedBy*、createdBy、updatedBy
   */
  private isBusinessParentRelation(fieldName: string): boolean {
    return SchemaParser.RelationUtils.isParentRelation(fieldName);
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
   * 获取需要导入的关系 schema（从 repository 文件导入）
   */
  private getRelationSchemaImports(modelName: string): string[] {
    const imports: string[] = [];
    
    if (repositoryConfig.codeGeneration.includeRelations) {
      const relations = this.schemaParser.getModelRelations(modelName);
      const schemaMap = new Map<string, string[]>();
      
      for (const relation of relations) {
        if (relation.targetTable && !relation.targetTable.includes('//')) {
          const targetTable = relation.targetTable.toLowerCase();
          const withRelationsSchema = `${StringUtils.toPascalCase(relation.targetTable)}WithRelationsSchema`;
          
          if (!schemaMap.has(targetTable)) {
            schemaMap.set(targetTable, []);
          }
          
          // 只有非业务父级关系才需要 WithRelationsSchema
          const isBusinessParentRelation = this.isBusinessParentRelation(relation.name);
          if (!isBusinessParentRelation) {
            // 跳过自引用关系，避免循环导入
            if (targetTable !== modelName.toLowerCase()) {
              // 检查循环引用处理配置
              if (!shouldSkipImportForCircularRef(modelName.toLowerCase(), relation.name)) {
                schemaMap.get(targetTable)!.push(withRelationsSchema);
              }
            }
          }
        }
      }
      
      // 为每个目标表生成导入语句
      for (const [targetTable, schemas] of schemaMap) {
        const importPath = `"./${targetTable}"`;
        if (schemas.length > 0) {
          imports.push(`import { ${[...new Set(schemas)].join(", ")} } from ${importPath};`);
        }
      }
    }
    
    return imports;
  }

  /**
   * 获取需要导入的子关系函数
   */
  private getSubRelationImports(modelName: string): string[] {
    const relativePaths = this.calculateRelativePaths();
    const imports: string[] = [];
    
    if (repositoryConfig.codeGeneration.includeRelations) {
      const relations = this.schemaParser.getModelRelations(modelName);
      const subRelationMap = new Map<string, string[]>();
      
      for (const relation of relations) {
        if (relation.targetTable && !relation.targetTable.includes('//')) {
          // 只有非父级关系才需要子关系函数导入
          const isBusinessParentRelation = this.isBusinessParentRelation(relation.name);
          if (!isBusinessParentRelation) {
            const targetTable = relation.targetTable.toLowerCase();
            
            // 跳过自引用关系，避免循环导入
            if (targetTable === modelName.toLowerCase()) {
              continue;
            }
            
            // 检查循环引用处理配置
            if (shouldSkipImportForCircularRef(modelName.toLowerCase(), relation.name)) {
              continue;
            }
            
            const subRelationName = `${StringUtils.toCamelCase(targetTable)}SubRelations`;
            
            if (!subRelationMap.has(targetTable)) {
              subRelationMap.set(targetTable, []);
            }
            subRelationMap.get(targetTable)!.push(subRelationName);
          }
        }
      }
      
      // 为每个目标表生成导入语句
      for (const [targetTable, subRelations] of subRelationMap) {
        const importPath = `"./${targetTable}"`;
        imports.push(`import { ${[...new Set(subRelations)].join(", ")} } from ${importPath};`);
      }
    }
    
    return imports;
  }

  /**
   * 获取需要导入的 schema
   */
  private getSchemaImports(modelName: string): string[] {
    const tableName = modelName.toLowerCase();
    const schemas = new Set<string>([`${tableName}Schema`]);

    // 添加关系的 schema
    if (repositoryConfig.codeGeneration.includeRelations) {
      const relations = this.schemaParser.getModelRelations(modelName);
      for (const relation of relations) {
        // 只添加有效的关系 schema，跳过枚举类型
        if (relation.targetTable && !relation.targetTable.includes('//')) {
          const targetSchema = `${relation.targetTable.toLowerCase()}Schema`;
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

    const generatedRelations = this.schemaParser.generateAllRelations(modelName);
    
    // 过滤掉父级关系，只保留子级关系用于 SubRelationDefs
    const childRelations = generatedRelations.filter(rel => !this.isBusinessParentRelation(rel.name));

    // 生成 defineRelations - 即使为空也要生成
    const relationDefs = childRelations
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

export const ${camelName}RelationsFactory = makeRelations(
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
   * 获取模型的主键字段名
   */
  private getPrimaryKeyField(modelName: string): string {
    const model = this.models.find(m => m.name === modelName);
    if (!model) {
      throw new Error(`Model ${modelName} not found`);
    }
    
    return SchemaParser.RelationUtils.getPrimaryKeyField(model);
  }

  /**
   * 生成 findById 方法
   */
  private generateFindById(modelName: string): string {
    const tableName = modelName.toLowerCase();
    const pascalName = StringUtils.toPascalCase(modelName);
    const primaryKeyField = this.getPrimaryKeyField(modelName);

    return `export async function find${pascalName}ById(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db.selectFrom("${tableName}").where("${primaryKeyField}", "=", id).selectAll("${tableName}").executeTakeFirst();
}`;
  }

  /**
   * 生成 findAll 方法
   */
  private generateFindAll(modelName: string): string {
    const tableName = modelName.toLowerCase();
    const pascalName = StringUtils.toPascalCase(modelName);
    const pluralName = this.pluralize(pascalName);

    return `export async function findAll${pluralName}(trx?: Transaction<DB>) {
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
    const primaryKeyField = this.getPrimaryKeyField(modelName);
    const valueFields: string[] = [
      "    ...data",
    ];

    // 只有主键字段不是 itemId 时才添加 id 生成逻辑
    if (primaryKeyField === 'id') {
      valueFields.push(`    id: data.id || createId()`);
    }

    if (hasStatistic) {
      valueFields.push("    statisticId: statistic.id");
    }

    if (hasAccountTracking) {
      valueFields.push(
        "    createdByAccountId: store.session.account?.id",
        "    updatedByAccountId: store.session.account?.id"
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
    const primaryKeyField = this.getPrimaryKeyField(modelName);

    return `export async function update${pascalName}(trx: Transaction<DB>, id: string, data: ${pascalName}Update) {
  return await trx.updateTable("${tableName}").set(data).where("${primaryKeyField}", "=", id).returningAll().executeTakeFirstOrThrow();
}`;
  }

  /**
   * 生成 delete 方法
   */
  private generateDelete(modelName: string): string {
    const tableName = modelName.toLowerCase();
    const pascalName = StringUtils.toPascalCase(modelName);
    const primaryKeyField = this.getPrimaryKeyField(modelName);
    const strategy = getDeleteStrategy(modelName);

    if (strategy === "cascade") {
      // 简单删除，数据库处理级联
      return `export async function delete${pascalName}(trx: Transaction<DB>, id: string) {
  return await trx.deleteFrom("${tableName}").where("${primaryKeyField}", "=", id).returningAll().executeTakeFirst();
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
    const primaryKeyField = this.getPrimaryKeyField(modelName);

    return `export async function find${pascalName}WithRelations(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("${tableName}")
    .where("${primaryKeyField}", "=", id)
    .selectAll("${tableName}")
    .select((eb) => ${camelName}SubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}`;
  }

  /**
   * 生成 index.ts
   */
  private async generateIndex(generatedFiles: string[]): Promise<void> {
    const crudImports: string[] = [];
    const crudExports: Record<string, any> = {};

    // 只为实际生成的文件添加导入
    for (const modelName of generatedFiles) {
      const camelName = StringUtils.toCamelCase(modelName);
      const pascalName = StringUtils.toPascalCase(modelName);

      // CRUD 函数导入
      crudImports.push(
        `import { insert${pascalName}, update${pascalName}, delete${pascalName}, find${pascalName}ById, find${pascalName}WithRelations, findAll${this.pluralize(pascalName)} } from "./${modelName.toLowerCase()}";`
      );

      crudExports[modelName.toLowerCase()] = {
        insert: `insert${pascalName}`,
        update: `update${pascalName}`,
        delete: `delete${pascalName}`,
        select: `find${pascalName}ById`,
        selectWithRelation: `find${pascalName}WithRelations`,
        findAll: `findAll${this.pluralize(pascalName)}`
      };
    }

    // 计算相对路径
    const relativePaths = this.calculateRelativePaths();

    // 生成代码
    const indexCode = `import { DB } from "${relativePaths.kysely}";
${crudImports.join("\n")}

export const repositoryMethods = {
${this.generateCrudExports(crudExports)}
} as const;
`;

    const outputPath = path.join(PATHS.repository.output, "index.ts");
    FileUtils.safeWriteFile(outputPath, indexCode);
    LogUtils.logSuccess("生成 index.ts");
  }

  /**
   * 生成 CRUD 导出对象
   */
  private generateCrudExports(exports: Record<string, any>): string {
    // 读取所有表名（包括跳过的表和中间表）
    const allTables = this.models.map((m: any) => m.name.toLowerCase());
    
    // 从 DMMF 中动态获取中间表
    const intermediateTables = this.getIntermediateTables();
    
    // 合并所有表名
    const allTableNames = [...allTables, ...intermediateTables];

    const lines: string[] = [];
    for (const tableName of allTableNames) {
      const crudMethods = exports[tableName];
      if (crudMethods) {
        lines.push(`  ${tableName}: {
    insert: ${crudMethods.insert},
    update: ${crudMethods.update},
    delete: ${crudMethods.delete},
    select: ${crudMethods.select},
    selectWithRelation: ${crudMethods.selectWithRelation},
    findAll: ${crudMethods.findAll}
  }`);
      } else {
        // 对于跳过的表和中间表，所有方法都设置为 null
        lines.push(`  ${tableName}: {
    insert: null,
    update: null,
    delete: null,
    select: null,
    selectWithRelation: null,
    findAll: null
  }`);
      }
    }

    return lines.join(",\n");
  }

  /**
   * 从 DMMF 中获取所有中间表名称
   */
  private getIntermediateTables(): string[] {
    const intermediateTables = new Set<string>();
    
    // 遍历所有模型的关系字段
    for (const model of this.models) {
      for (const field of model.fields) {
        // 检查是否为多对多关系
        if (field.kind === 'object' && field.isList && field.relationName) {
          const relationName = field.relationName;
          
          // 检查是否为真正的多对多关系
          if (this.isManyToManyRelation(field, model)) {
            // 添加中间表名（Prisma 自动生成的中间表以 _ 开头）
            intermediateTables.add(`_${relationName}`);
          }
        }
      }
    }
    
    return Array.from(intermediateTables).sort();
  }

  /**
   * 判断是否为真正的多对多关系
   * 多对多关系的特征：
   * 1. 当前字段是 isList: true
   * 2. 当前字段没有显式的外键字段（relationFromFields 为空）
   * 3. 目标字段也是 isList: true
   * 4. 目标字段也没有显式的外键字段
   * 
   * 如果任何一边有外键字段，那就是一对多关系，不是多对多关系
   */
  private isManyToManyRelation(field: any, model: any): boolean {
    // 检查当前字段是否有显式的外键字段
    if (field.relationFromFields && field.relationFromFields.length > 0) {
      return false; // 有外键字段，不是多对多关系
    }
    
    // 检查目标模型的反向关系
    const targetModel = this.models.find(m => m.name === field.type);
    if (!targetModel) {
      return false;
    }
    
    // 找到反向关系字段
    const reverseField = targetModel.fields.find((f: any) => 
      f.relationName === field.relationName && f.name !== field.name
    );
    
    if (!reverseField) {
      return false;
    }
    
    // 反向关系也必须是 isList: true
    if (!reverseField.isList) {
      return false;
    }
    
    // 反向关系也不能有外键字段
    if (reverseField.relationFromFields && reverseField.relationFromFields.length > 0) {
      return false;
    }
    
    return true;
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

