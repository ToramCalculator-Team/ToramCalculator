/**
 * @file RepositoryGenerator.ts
 * @description Repository 自动生成器 - 从 Prisma schema 生成完整的 Repository 文件
 * @version 1.0.0
 */

import { FileUtils, LogUtils, StringUtils } from "../utils/common";
import { CascadeAnalyzer } from "../utils/cascadeAnalyzer";
import { ValidationUtils } from "../utils/validation";
import {
  repositoryConfig,
  shouldSkipModel,
  // 移除硬编码的业务逻辑导入
  // needsStatistic,
  // needsAccountTracking,
  // getSpecialCreateLogic,
  getDeleteStrategy,
  shouldSkipImportForCircularRef,
} from "../config/repository.config";
import { PATHS } from "../config/generator.config";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";

/**
 * Repository 生成器
 */
export class RepositoryGenerator {
  private dmmf: any;
  private cascadeAnalyzer!: CascadeAnalyzer;
  private models: any[] = [];

  constructor(dmmf: any) {
    this.dmmf = dmmf;
  }

  /**
   * 初始化生成器
   */
  async initialize(): Promise<void> {
    try {
      // 从 DMMF 中提取模型信息
      this.models = this.dmmf.datamodel.models.map((model: any) => ({
        name: model.name,
        fields: model.fields.map((field: any) => ({
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
          documentation: ''
        })),
        uniqueIndexes: model.uniqueIndexes || [],
        uniqueFields: model.uniqueFields || []
      }));

      // 初始化分析器
      this.cascadeAnalyzer = new CascadeAnalyzer(this.dmmf);
      
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

    LogUtils.logSuccess(`Repository 生成完成！共生成 ${generatedFiles.length} 个文件`);
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
      `import { DB, ${tableName} } from "${relativePaths.zod}";`,
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
    
      // 添加关系 schema 导入（只添加 getSchemaImports 中没有的）
      const relationSchemaImports = this.getRelationSchemaImports(modelName);
      if (relationSchemaImports.length > 0) {
        imports.push(relationSchemaImports.join("\n"));
      }
    }


    // 移除硬编码的账户跟踪导入
    // if (needsAccountTracking(modelName)) {
    //   imports.push(`import { store } from "~/store";`);
    // }

    return imports.join("\n");
  }

  /**
   * 判断是否是父级关系
   */
  private isParentRelation(fieldName: string): boolean {
    return fieldName.startsWith('belongTo') || 
           fieldName.startsWith('usedBy') || 
           fieldName === 'createdBy' || 
           fieldName === 'updatedBy';
  }

  /**
   * 判断是否是业务父级关系
   * 基于字段命名规范：belongTo*、usedBy*、createdBy、updatedBy
   */
  private isBusinessParentRelation(fieldName: string): boolean {
    return this.isParentRelation(fieldName);
  }

  /**
   * 计算相对路径
   */
  private calculateRelativePaths(): {
    database: string;
    zod: string;
    subRelationFactory: string;
  } {
    // 从输出目录到各个目标目录的相对路径
    const outputDir = PATHS.repository.output;
    const dbDir = path.dirname(path.dirname(PATHS.baseSchema)); // db 目录 (schema 的父目录)
    const repositoriesDir = path.join(dbDir, "repositories");
    const generatedDir = path.join(dbDir, "generated");

    return {
      database: path.relative(outputDir, path.join(repositoriesDir, "database")).replace(/\\/g, "/"),
      zod: path.relative(outputDir, path.join(generatedDir, "zod", "index")).replace(/\\/g, "/"),
      subRelationFactory: path.relative(outputDir, path.join(repositoriesDir, "subRelationFactory")).replace(/\\/g, "/"),
    };
  }

  /**
   * 获取模型关系
   */
  private getModelRelations(modelName: string): any[] {
    const model = this.dmmf.datamodel.models.find((m: any) => m.name === modelName);
    if (!model) return [];
    
    return model.fields
      .filter((field: any) => field.kind === 'object')
      .map((field: any) => {
        const relationType = this.determineRelationType(field, model);
        const targetTable = field.type.toLowerCase();
        const targetPrimaryKey = this.getPrimaryKeyFieldFromModel(this.dmmf.datamodel.models.find((m: any) => m.name === field.type));
        
        let buildCode = '';
        let schemaCode = '';
        
        switch (relationType) {
          case 'ONE_TO_ONE':
            buildCode = this.generateOneToOneCode(field, model, targetTable, targetPrimaryKey);
            schemaCode = this.generateSchemaCode(field, model, targetTable);
            break;
          case 'ONE_TO_MANY':
            buildCode = this.generateOneToManyCode(field, model, targetTable, targetPrimaryKey);
            schemaCode = this.generateSchemaCode(field, model, targetTable);
            break;
          case 'MANY_TO_MANY':
            buildCode = this.generateManyToManyCode(field, model, targetTable, targetPrimaryKey);
            schemaCode = this.generateSchemaCode(field, model, targetTable);
            break;
        }
        
        return {
          name: field.name,
          type: field.type,
          targetTable: targetTable,
          relationName: field.relationName,
          relationFromFields: field.relationFromFields,
          relationToFields: field.relationToFields,
          relationOnDelete: field.relationOnDelete,
          buildCode: buildCode,
          schemaCode: schemaCode
        };
      });
  }

  /**
   * 获取外键字段名
   */
  private getForeignKeyField(field: any, model: any, targetTable: string): string {
    // 从 relationFromFields 获取外键字段
    if (field.relationFromFields && field.relationFromFields.length > 0) {
      return field.relationFromFields[0];
    }
    
    // 对于反向关系，需要从目标模型中查找对应的关系字段
    const targetModel = this.models.find(m => m.name.toLowerCase() === targetTable.toLowerCase());
    if (targetModel) {
      // 查找目标模型中指向当前模型的关系字段
      const reverseField = targetModel.fields.find(f => 
        f.kind === 'object' && 
        f.type === model.name &&
        f.relationFromFields && 
        f.relationFromFields.length > 0
      );
      
      if (reverseField && reverseField.relationFromFields && reverseField.relationFromFields.length > 0) {
        return reverseField.relationFromFields[0];
      }
    }
    
    // 如果找不到，使用默认推断逻辑
    const fieldName = field.name;
    
    // 基于字段命名规范动态推断外键字段名
    if (fieldName.startsWith('belongTo')) {
      return fieldName + 'Id';
    }
    if (fieldName.startsWith('usedBy')) {
      return fieldName + 'Id';
    }
    if (fieldName === 'createdBy' || fieldName === 'updatedBy') {
      return fieldName + 'AccountId';
    }
    
    // 对于反向关系，尝试从目标模型中推断
    const targetModelForInference = this.models.find(m => m.name.toLowerCase() === targetTable.toLowerCase());
    if (targetModelForInference) {
      const primaryKeyField = this.getPrimaryKeyFieldFromModel(targetModelForInference);
      return primaryKeyField;
    }
    
    // 默认返回 id
    return 'id';
  }

  /**
   * 确定关系类型
   */
  private determineRelationType(field: any, model: any): string {
    if (field.isList) {
      // 检查是否有反向外键字段
      const hasReverseForeignKey = this.hasReverseForeignKey(field.type, model.name);
      
      if (hasReverseForeignKey) {
        return 'ONE_TO_MANY';
      } else {
        return 'MANY_TO_MANY';
      }
    }
    
    return 'ONE_TO_ONE';
  }

  /**
   * 检查是否有反向外键
   */
  private hasReverseForeignKey(targetModelName: string, currentModelName: string): boolean {
    const targetModel = this.dmmf.datamodel.models.find((m: any) => m.name === targetModelName);
    if (!targetModel) {
      return false;
    }

    // 检查目标模型是否有指向当前模型的关系字段
    return targetModel.fields.some((field: any) => 
      field.kind === 'object' && 
      field.type === currentModelName &&
      field.relationFromFields && 
      field.relationFromFields.length > 0
    );
  }

  /**
   * 生成一对一关系代码
   */
  private generateOneToOneCode(field: any, model: any, targetTable: string, targetPrimaryKey: string): string {
    const isParentRelation = this.isBusinessParentRelation(field.name);
    
    // 检查是否是自关系
    const isSelfRelation = targetTable.toLowerCase() === model.name.toLowerCase();
    
    // 检查是否是循环引用关系
    const shouldSkipImport = shouldSkipImportForCircularRef(model.name, field.name) || isSelfRelation;
    
    // 获取当前模型的主键
    const currentModelPrimaryKey = this.getPrimaryKeyFieldFromModel(model);
    
    if (isParentRelation) {
      // 父关系：外键在当前模型中，指向目标模型
      const foreignKey = this.getRelationForeignKey(field, model, targetTable);
      return `(eb: ExpressionBuilder<DB, "${model.name.toLowerCase()}">, id: Expression<string>) =>
        jsonObjectFrom(
          eb
            .selectFrom("${targetTable}")
            .where("${targetTable}.${targetPrimaryKey}", "=", id)
            .selectAll("${targetTable}")
        ).$notNull().as("${field.name}")`;
    } else {
      // 子关系：检查是否有 relationFromFields
      if (field.relationFromFields && field.relationFromFields.length > 0) {
        // 外键在当前模型中，指向目标模型
        const foreignKey = field.relationFromFields[0];
        const subRelationCode = shouldSkipImport ? '' : `.select((subEb) => ${StringUtils.toCamelCase(targetTable)}SubRelations(subEb, subEb.val("${targetTable}.${targetPrimaryKey}")))`;
        return `(eb: ExpressionBuilder<DB, "${model.name.toLowerCase()}">, id: Expression<string>) =>
          jsonObjectFrom(
            eb
              .selectFrom("${targetTable}")
              .where("${targetTable}.${targetPrimaryKey}", "=", id)
              .selectAll("${targetTable}")${subRelationCode}
          ).$notNull().as("${field.name}")`;
      } else {
        // 外键在目标表中，指向当前模型
        const reverseForeignKey = `${model.name.toLowerCase()}Id`;
        const subRelationCode = shouldSkipImport ? '' : `.select((subEb) => ${StringUtils.toCamelCase(targetTable)}SubRelations(subEb, subEb.val("${targetTable}.${targetPrimaryKey}")))`;
        return `(eb: ExpressionBuilder<DB, "${model.name.toLowerCase()}">, id: Expression<string>) =>
          jsonObjectFrom(
            eb
              .selectFrom("${targetTable}")
              .where("${targetTable}.${reverseForeignKey}", "=", id)
              .selectAll("${targetTable}")${subRelationCode}
          ).$notNull().as("${field.name}")`;
      }
    }
  }

  /**
   * 生成一对多关系代码
   */
  private generateOneToManyCode(field: any, model: any, targetTable: string, targetPrimaryKey: string): string {
    const isParentRelation = this.isBusinessParentRelation(field.name);
    
    // 检查是否是自关系
    const isSelfRelation = targetTable.toLowerCase() === model.name.toLowerCase();
    
    // 检查是否是循环引用关系
    const shouldSkipImport = shouldSkipImportForCircularRef(model.name, field.name) || isSelfRelation;
    
    // 获取当前模型的主键
    const currentModelPrimaryKey = this.getPrimaryKeyFieldFromModel(model);
    
    if (isParentRelation) {
      // 父关系：外键在目标表中，指向当前模型
      // 从目标模型中查找指向当前模型的关系字段
      const targetModel = this.models.find(m => m.name.toLowerCase() === targetTable.toLowerCase());
      if (!targetModel) {
        throw new Error(`Target model ${targetTable} not found`);
      }
      
      const reverseField = targetModel.fields.find(f => 
        f.kind === 'object' && 
        f.type === model.name &&
        f.relationFromFields && 
        f.relationFromFields.length > 0
      );
      
      if (!reverseField || !reverseField.relationFromFields || reverseField.relationFromFields.length === 0) {
        throw new Error(`Cannot find reverse relation field from ${targetTable} to ${model.name}`);
      }
      
      const reverseForeignKey = reverseField.relationFromFields[0];
      return `(eb: ExpressionBuilder<DB, "${model.name.toLowerCase()}">, id: Expression<string>) =>
        jsonArrayFrom(
          eb
            .selectFrom("${targetTable}")
            .where("${targetTable}.${reverseForeignKey}", "=", id)
            .selectAll("${targetTable}")
        ).as("${field.name}")`;
    } else {
      // 子关系：外键在目标表中，指向当前模型
      // 从目标模型中查找指向当前模型的关系字段
      const targetModel = this.models.find(m => m.name.toLowerCase() === targetTable.toLowerCase());
      if (!targetModel) {
        throw new Error(`Target model ${targetTable} not found`);
      }
      
      const reverseField = targetModel.fields.find(f => 
        f.kind === 'object' && 
        f.type === model.name &&
        f.relationFromFields && 
        f.relationFromFields.length > 0
      );
      
      if (!reverseField || !reverseField.relationFromFields || reverseField.relationFromFields.length === 0) {
        throw new Error(`Cannot find reverse relation field from ${targetTable} to ${model.name}`);
      }
      
      const reverseForeignKey = reverseField.relationFromFields[0];
      const subRelationCode = shouldSkipImport ? '' : `.select((subEb) => ${StringUtils.toCamelCase(targetTable)}SubRelations(subEb, subEb.val("${targetTable}.${targetPrimaryKey}")))`;
      return `(eb: ExpressionBuilder<DB, "${model.name.toLowerCase()}">, id: Expression<string>) =>
        jsonArrayFrom(
          eb
            .selectFrom("${targetTable}")
            .where("${targetTable}.${reverseForeignKey}", "=", id)
            .selectAll("${targetTable}")${subRelationCode}
        ).as("${field.name}")`;
    }
  }

  /**
   * 生成多对多关系代码
   */
  private generateManyToManyCode(field: any, model: any, targetTable: string, targetPrimaryKey: string): string {
    const relationName = field.relationName;
    const intermediateTable = `_${relationName}`;
    
    // 检查是否是自关系
    const isSelfRelation = targetTable.toLowerCase() === model.name.toLowerCase();
    
    // 检查是否是循环引用关系
    const shouldSkipImport = shouldSkipImportForCircularRef(model.name, field.name) || isSelfRelation;
    
    // 获取当前模型的主键
    const currentModelPrimaryKey = this.getPrimaryKeyFieldFromModel(model);
    
    const subRelationCode = shouldSkipImport ? '' : `.select((subEb) => ${StringUtils.toCamelCase(targetTable)}SubRelations(subEb, subEb.val("${targetTable}.${targetPrimaryKey}")))`;
    
    return `(eb: ExpressionBuilder<DB, "${model.name.toLowerCase()}">, id: Expression<string>) =>
      jsonArrayFrom(
        eb
          .selectFrom("${intermediateTable}")
          .innerJoin("${targetTable}", "${intermediateTable}.B", "${targetTable}.${targetPrimaryKey}")
          .where("${intermediateTable}.A", "=", id)
          .selectAll("${targetTable}")${subRelationCode}
      ).as("${field.name}")`;
  }

  /**
   * 生成 Schema 代码
   */
  private generateSchemaCode(field: any, model: any, targetTable: string): string {
    if (field.isList) {
      return `z.array(${targetTable}Schema)`;
    } else {
      return `${targetTable}Schema`;
    }
  }

  /**
   * 获取关系外键字段
   */
  private getRelationForeignKey(field: any, model: any, targetTable: string): string {
    // 优先从 relationFromFields 获取外键字段
    if (field.relationFromFields && field.relationFromFields.length > 0) {
      return field.relationFromFields[0];
    }
    
    // 对于反向关系，从目标模型中查找对应的关系字段
    const targetModel = this.models.find(m => m.name.toLowerCase() === targetTable.toLowerCase());
    if (targetModel) {
      // 查找目标模型中指向当前模型的关系字段
      const reverseField = targetModel.fields.find(f => 
        f.kind === 'object' && 
        f.type === model.name &&
        f.relationFromFields && 
        f.relationFromFields.length > 0
      );
      
      if (reverseField && reverseField.relationFromFields && reverseField.relationFromFields.length > 0) {
        return reverseField.relationFromFields[0];
      }
    }
    
    // 如果找不到，抛出错误而不是猜测
    throw new Error(`Cannot determine foreign key field for relation ${field.name} in model ${model.name}`);
  }

  /**
   * 获取主键字段
   */
  private getPrimaryKeyFieldFromModel(model: any): string {
    const idField = model.fields.find((field: any) => field.isId);
    if (!idField) {
      throw new Error(`Model ${model.name} has no primary key field`);
    }
    return idField.name;
  }

  /**
   * 检查模型是否有主键
   * @param model - 模型信息
   * @returns 是否有主键
   */
  private hasPrimaryKey(model: any): boolean {
    return model.fields.some((field: any) => field.isId);
  }

  /**
   * 生成所有关系
   */
  private generateAllRelations(modelName: string): any[] {
    return this.getModelRelations(modelName);
  }
  private getRelationSchemaImports(modelName: string): string[] {
    const imports: string[] = [];
    
    if (repositoryConfig.codeGeneration.includeRelations) {
      const relations = this.getModelRelations(modelName);
      const schemaMap = new Set<string>();
      
      // 获取已经导入的 schema
      const existingSchemas = this.getSchemaImports(modelName);
      const existingSchemaSet = new Set(existingSchemas);
      
      for (const relation of relations) {
        // 只处理非业务父级关系
        if (!this.isBusinessParentRelation(relation.name)) {
          const relationType = relation.type.toLowerCase();
          const schemaName = `${relationType}Schema`;
          
          // 只添加还没有导入的 schema
          if (!existingSchemaSet.has(schemaName)) {
            schemaMap.add(schemaName);
          }
        }
      }
      
      // 添加关系 schema 导入
      if (schemaMap.size > 0) {
        const schemaImports = Array.from(schemaMap).join(', ');
        imports.push(`import { ${schemaImports} } from "../zod/index";`);
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
      const relations = this.getModelRelations(modelName);
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
      const relations = this.getModelRelations(modelName);
      for (const relation of relations) {
        // 只添加有效的关系 schema，跳过枚举类型
        if (relation.targetTable && !relation.targetTable.includes('//')) {
          const targetSchema = `${relation.targetTable.toLowerCase()}Schema`;
          schemas.add(targetSchema);
        }
      }
    }

    // 添加 statistic schema
    // 移除硬编码的统计 schema 导入
    // if (needsStatistic(modelName)) {
    //   schemas.add("statisticSchema");
    // }

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

    const generatedRelations = this.generateAllRelations(modelName);
    
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
    
    // 检查模型是否有主键
    const model = this.models.find(m => m.name === modelName);
    const hasPK = model ? this.hasPrimaryKey(model) : true;

    // selectById - 只有有主键的模型才生成
    if (hasPK) {
      methods.push(this.generateSelectById(modelName));
    }

    // selectAll
    methods.push(this.generateSelectAll(modelName));

    // insert
    methods.push(this.generateInsert(modelName));
    
    // 对于没有主键的模型，生成基于唯一约束的查询方法
    if (!hasPK) {
      methods.push(this.generateFindByUniqueConstraint(modelName));
      methods.push(this.generateDeleteByUniqueConstraint(modelName));
    }

    // create - 暂时跳过，因为涉及复杂的嵌套创建逻辑
    // if (hasPK) {
    //   methods.push(this.generateCreate(modelName));
    // }

    // update - 只有有主键的模型才生成
    if (hasPK) {
      methods.push(this.generateUpdate(modelName));
    }

    // delete - 只有有主键的模型才生成
    if (hasPK) {
      methods.push(this.generateDelete(modelName));
    }

    // selectWithRelations - 只有有主键的模型才生成
    if (hasPK && repositoryConfig.codeGeneration.includeRelations) {
      methods.push(this.generateSelectWithRelations(modelName));
    }

    // WithRelations type - 只有有主键的模型才生成
    if (hasPK && repositoryConfig.codeGeneration.includeWithRelationsType && repositoryConfig.codeGeneration.includeRelations) {
      methods.push(`// 关联查询类型
export type ${pascalName}WithRelations = Awaited<ReturnType<typeof select${pascalName}WithRelations>>;`);
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
    
    return this.getPrimaryKeyFieldFromModel(model);
  }

  /**
   * 生成基于唯一约束的查询方法（用于无主键表）
   */
  private generateFindByUniqueConstraint(modelName: string): string {
    const tableName = modelName.toLowerCase();
    const pascalName = StringUtils.toPascalCase(modelName);
    
    // 获取模型的唯一约束字段
    const model = this.models.find(m => m.name === modelName);
    if (!model) return '';
    
    // 查找唯一约束字段（包括复合唯一约束）
    const uniqueFields = model.fields.filter((field: any) => field.isUnique);
    const uniqueIndexes = model.uniqueIndexes || [];
    
    // 如果没有唯一字段和唯一索引，返回空
    if (uniqueFields.length === 0 && uniqueIndexes.length === 0) return '';
    
    // 优先处理复合唯一索引
    if (uniqueIndexes.length > 0) {
      const index = uniqueIndexes[0]; // 取第一个复合唯一索引
      const fieldNames = index.fields; // fields 是字符串数组
      const fieldParams = fieldNames.map(f => `${f}: string`).join(', ');
      const pascalFieldNames = fieldNames.map(f => StringUtils.toPascalCase(f)).join('And');
      
      const whereConditions = fieldNames.map(f => `.where("${f}", "=", ${f})`).join('\n    ');
      
      return `export async function select${pascalName}By${pascalFieldNames}(${fieldParams}, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db.selectFrom("${tableName}")
    ${whereConditions}
    .selectAll("${tableName}")
    .executeTakeFirst();
}`;
    } else if (uniqueFields.length >= 2) {
      // 如果有多个唯一字段，生成基于所有唯一字段的查询方法
      const fieldNames = uniqueFields.map(f => f.name);
      const fieldParams = fieldNames.map(f => `${f.name}: string`).join(', ');
      const pascalFieldNames = fieldNames.map(f => StringUtils.toPascalCase(f.name)).join('And');
      
      const whereConditions = fieldNames.map(f => `.where("${f.name}", "=", ${f.name})`).join('\n    ');
      
      return `export async function select${pascalName}By${pascalFieldNames}(${fieldParams}, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db.selectFrom("${tableName}")
    ${whereConditions}
    .selectAll("${tableName}")
    .executeTakeFirst();
}`;
    } else if (uniqueFields.length === 1) {
      // 如果只有一个唯一字段，生成基于该字段的查询方法
      const firstUniqueField = uniqueFields[0];
      return `export async function select${pascalName}By${StringUtils.toPascalCase(firstUniqueField.name)}(${firstUniqueField.name}: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db.selectFrom("${tableName}")
    .where("${firstUniqueField.name}", "=", ${firstUniqueField.name})
    .selectAll("${tableName}")
    .executeTakeFirst();
}`;
    }
    
    return '';
  }

  /**
   * 生成基于唯一约束的删除方法（用于无主键表）
   */
  private generateDeleteByUniqueConstraint(modelName: string): string {
    const tableName = modelName.toLowerCase();
    const pascalName = StringUtils.toPascalCase(modelName);
    
    // 查找模型
    const model = this.models.find(m => m.name === modelName);
    if (!model) return '';
    
    // 查找唯一约束字段（包括复合唯一约束）
    const uniqueFields = model.fields.filter((field: any) => field.isUnique);
    const uniqueIndexes = model.uniqueIndexes || [];
    
    // 如果没有唯一字段和唯一索引，返回空
    if (uniqueFields.length === 0 && uniqueIndexes.length === 0) return '';
    
    // 优先处理复合唯一索引
    if (uniqueIndexes.length > 0) {
      const index = uniqueIndexes[0]; // 取第一个复合唯一索引
      const fieldNames = index.fields; // fields 是字符串数组
      const fieldParams = fieldNames.map(f => `${f}: string`).join(', ');
      const pascalFieldNames = fieldNames.map(f => StringUtils.toPascalCase(f)).join('And');
      
      const whereConditions = fieldNames.map(f => `.where("${f}", "=", ${f})`).join('\n    ');
      
      return `export async function delete${pascalName}By${pascalFieldNames}(${fieldParams}, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db.deleteFrom("${tableName}")
    ${whereConditions}
    .returningAll()
    .executeTakeFirst();
}`;
    } else if (uniqueFields.length >= 2) {
      // 如果有多个唯一字段，生成基于所有唯一字段的删除方法
      const fieldNames = uniqueFields.map(f => f.name);
      const fieldParams = fieldNames.map(f => `${f.name}: string`).join(', ');
      const pascalFieldNames = fieldNames.map(f => StringUtils.toPascalCase(f.name)).join('And');
      
      const whereConditions = fieldNames.map(f => `.where("${f.name}", "=", ${f.name})`).join('\n    ');
      
      return `export async function delete${pascalName}By${pascalFieldNames}(${fieldParams}, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db.deleteFrom("${tableName}")
    ${whereConditions}
    .returningAll()
    .executeTakeFirst();
}`;
    } else if (uniqueFields.length === 1) {
      // 如果只有一个唯一字段，生成基于该字段的删除方法
      const firstUniqueField = uniqueFields[0];
      return `export async function delete${pascalName}By${StringUtils.toPascalCase(firstUniqueField.name)}(${firstUniqueField.name}: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db.deleteFrom("${tableName}")
    .where("${firstUniqueField.name}", "=", ${firstUniqueField.name})
    .returningAll()
    .executeTakeFirst();
}`;
    }
    
    return '';
  }

  /**
   * 生成 selectById 方法
   */
  private generateSelectById(modelName: string): string {
    const tableName = modelName.toLowerCase();
    const pascalName = StringUtils.toPascalCase(modelName);
    const primaryKeyField = this.getPrimaryKeyField(modelName);

    return `export async function select${pascalName}ById(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db.selectFrom("${tableName}").where("${primaryKeyField}", "=", id).selectAll("${tableName}").executeTakeFirst();
}`;
  }

  /**
   * 生成 selectAll 方法
   */
  private generateSelectAll(modelName: string): string {
    const tableName = modelName.toLowerCase();
    const pascalName = StringUtils.toPascalCase(modelName);
    const pluralName = this.pluralize(pascalName);

    return `export async function selectAll${pluralName}(trx?: Transaction<DB>) {
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

    return `export async function insert${pascalName}(data: ${pascalName}Insert, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db.insertInto("${tableName}").values(data).returningAll().executeTakeFirstOrThrow();
}`;
  }

  /**
   * 生成 create 方法 - 暂时注释掉，因为涉及复杂的嵌套创建逻辑
   */
  /*
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
      createLogic += `  const statistic = await createStatistic({}, trx);\n\n`;
    }

    // 创建主记录
    const primaryKeyField = this.getPrimaryKeyField(modelName);
    const valueFields: string[] = [
      "    ...data",
    ];

    // 为主键字段生成 ID（动态处理所有主键字段）
    valueFields.push(`    ${primaryKeyField}: data.${primaryKeyField} || createId()`);

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

    return `export async function create${pascalName}(data: ${pascalName}Insert, trx?: Transaction<DB>) {
  const db = trx || await getDB();
${createLogic.replace(/trx/g, 'db')}
}`;
  }
  */

  /**
   * 生成 update 方法
   */
  private generateUpdate(modelName: string): string {
    const tableName = modelName.toLowerCase();
    const pascalName = StringUtils.toPascalCase(modelName);
    const primaryKeyField = this.getPrimaryKeyField(modelName);

    return `export async function update${pascalName}(id: string, data: ${pascalName}Update, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db.updateTable("${tableName}").set(data).where("${primaryKeyField}", "=", id).returningAll().executeTakeFirstOrThrow();
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

    // 根据删除策略动态生成删除方法
    if (strategy === "cascade") {
      // 简单删除，数据库处理级联
      return `export async function delete${pascalName}(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db.deleteFrom("${tableName}").where("${primaryKeyField}", "=", id).returningAll().executeTakeFirst();
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
   * 生成 selectWithRelations 方法
   */
  private generateSelectWithRelations(modelName: string): string {
    const tableName = modelName.toLowerCase();
    const pascalName = StringUtils.toPascalCase(modelName);
    const camelName = StringUtils.toCamelCase(modelName);
    const primaryKeyField = this.getPrimaryKeyField(modelName);

    return `export async function select${pascalName}WithRelations(id: string, trx?: Transaction<DB>) {
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
      const model = this.models.find(m => m.name === modelName);
      const hasPK = model ? this.hasPrimaryKey(model) : true;

      if (hasPK) {
        // 有主键的模型：标准 CRUD 方法
        crudImports.push(
          `import { insert${pascalName}, update${pascalName}, delete${pascalName}, select${pascalName}ById, select${pascalName}WithRelations, selectAll${this.pluralize(pascalName)} } from "./${modelName.toLowerCase()}";`
        );

        crudExports[modelName.toLowerCase()] = {
          insert: `insert${pascalName}`,
          update: `update${pascalName}`,
          delete: `delete${pascalName}`,
          select: `select${pascalName}ById`,
          selectWithRelation: `select${pascalName}WithRelations`,
          selectAll: `selectAll${this.pluralize(pascalName)}`
        };
      } else {
        // 无主键的模型：只有 insert 和 findAll，以及特殊的查询/删除方法
        const specialMethods = this.getSpecialMethodsForNoPKModel(modelName);
        crudImports.push(
          `import { insert${pascalName}, selectAll${this.pluralize(pascalName)}${specialMethods} } from "./${modelName.toLowerCase()}";`
        );

        const specialExports = this.getSpecialExportsForNoPKModel(modelName);
        crudExports[modelName.toLowerCase()] = {
          insert: `insert${pascalName}`,
          selectAll: `selectAll${this.pluralize(pascalName)}`,
          ...specialExports
        };
      }
    }

    // 计算相对路径
    const relativePaths = this.calculateRelativePaths();

    // 生成代码
    const indexCode = `import { DB } from "${relativePaths.zod}";
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
        // 确保所有标准字段都存在，不存在的用 null 表示
        const methodLines: string[] = [];
        methodLines.push(`    insert: ${crudMethods.insert || 'null'}`);
        methodLines.push(`    update: ${crudMethods.update || 'null'}`);
        methodLines.push(`    delete: ${crudMethods.delete || 'null'}`);
        methodLines.push(`    select: ${crudMethods.select || 'null'}`);
        methodLines.push(`    selectWithRelation: ${crudMethods.selectWithRelation || 'null'}`);
        methodLines.push(`    selectAll: ${crudMethods.selectAll || 'null'}`);
        
        // 添加特殊方法
        Object.keys(crudMethods).forEach(key => {
          if (!['insert', 'update', 'delete', 'select', 'selectWithRelation', 'selectAll'].includes(key)) {
            methodLines.push(`    ${key}: ${crudMethods[key]}`);
          }
        });
        
        lines.push(`  ${tableName}: {
${methodLines.join(',\n')}
  }`);
      } else {
        // 对于跳过的表和中间表，所有方法都设置为 null
        lines.push(`  ${tableName}: {
    insert: null,
    update: null,
    delete: null,
    select: null,
    selectWithRelation: null,
    selectAll: null
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

  /**
   * 获取无主键模型的特殊方法导入字符串
   */
  private getSpecialMethodsForNoPKModel(modelName: string): string {
    const pascalName = StringUtils.toPascalCase(modelName);
    
    // 查找模型
    const model = this.models.find(m => m.name === modelName);
    if (!model) return '';
    
    // 查找唯一约束字段（包括复合唯一约束）
    const uniqueFields = model.fields.filter((field: any) => field.isUnique);
    const uniqueIndexes = model.uniqueIndexes || [];
    
    // 如果没有唯一字段和唯一索引，返回空
    if (uniqueFields.length === 0 && uniqueIndexes.length === 0) return '';
    
    // 优先处理复合唯一索引
    if (uniqueIndexes.length > 0) {
      const index = uniqueIndexes[0]; // 取第一个复合唯一索引
      const fieldNames = index.fields; // fields 是字符串数组
      const pascalFieldNames = fieldNames.map(f => StringUtils.toPascalCase(f)).join('And');
      return `, delete${pascalName}By${pascalFieldNames}`;
    } else if (uniqueFields.length >= 2) {
      const pascalFieldNames = uniqueFields.map(f => StringUtils.toPascalCase(f.name)).join('And');
      return `, delete${pascalName}By${pascalFieldNames}`;
    } else if (uniqueFields.length === 1) {
      const firstUniqueField = uniqueFields[0];
      return `, delete${pascalName}By${StringUtils.toPascalCase(firstUniqueField.name)}`;
    }
    
    return '';
  }

  /**
   * 获取无主键模型的特殊导出对象
   */
  private getSpecialExportsForNoPKModel(modelName: string): Record<string, string> {
    const pascalName = StringUtils.toPascalCase(modelName);
    
    // 查找模型
    const model = this.models.find(m => m.name === modelName);
    if (!model) return {};
    
    // 查找唯一约束字段（包括复合唯一约束）
    const uniqueFields = model.fields.filter((field: any) => field.isUnique);
    const uniqueIndexes = model.uniqueIndexes || [];
    
    // 如果没有唯一字段和唯一索引，返回空
    if (uniqueFields.length === 0 && uniqueIndexes.length === 0) return {};
    
    // 优先处理复合唯一索引
    if (uniqueIndexes.length > 0) {
      const index = uniqueIndexes[0]; // 取第一个复合唯一索引
      const fieldNames = index.fields; // fields 是字符串数组
      const pascalFieldNames = fieldNames.map(f => StringUtils.toPascalCase(f)).join('And');
      return {
        deleteByUniqueFields: `delete${pascalName}By${pascalFieldNames}`
      };
    } else if (uniqueFields.length >= 2) {
      const pascalFieldNames = uniqueFields.map(f => StringUtils.toPascalCase(f.name)).join('And');
      return {
        deleteByUniqueFields: `delete${pascalName}By${pascalFieldNames}`
      };
    } else if (uniqueFields.length === 1) {
      const firstUniqueField = uniqueFields[0];
      return {
        deleteByUniqueField: `delete${pascalName}By${StringUtils.toPascalCase(firstUniqueField.name)}`
      };
    }
    
    return {};
  }
}

