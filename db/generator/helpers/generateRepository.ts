/**
 * @file generateRepository.ts
 * @description Repository 生成器
 * 从 Prisma DMMF 生成 Repository 文件
 * 
 * TODO: 如果需要更复杂的功能（如级联删除分析、复杂验证等），
 * 可以参考 db/generators/generators/RepositoryGenerator.ts 的实现
 */

import type { DMMF } from "@prisma/generator-helper";
import { writeFileSafely } from "../utils/writeFileSafely";
import { 
  ZodTypeName, 
  SchemaName, 
  TypeName, 
  FileName,
  NamingRules 
} from "../utils/namingRules";
import path from "path";
import fs from "fs";

/**
 * Repository 生成器
 */
export class RepositoryGenerator {
  private dmmf: DMMF.Document;
  private models: any[] = [];
  private allModels: readonly DMMF.Model[] = []; // 包含中间表的完整模型列表

  constructor(dmmf: DMMF.Document, allModels: DMMF.Model[]) {
    this.dmmf = dmmf;
    this.allModels = allModels;
  }

  /**
   * 生成 Repository 文件
   */
  async generate(outputPath: string): Promise<void> {
    try {
      console.log("🔍 生成 Repository 文件...");
      
      // 初始化模型信息
      await this.initialize();
      
      // 创建 repositories 目录
      const repositoriesDir = path.dirname(outputPath);
      if (!fs.existsSync(repositoriesDir)) {
        fs.mkdirSync(repositoriesDir, { recursive: true });
      }
      
      // 生成所有 repository 文件
      await this.generateAll();
      
      console.log("✅ Repository 文件生成完成");
    } catch (error) {
      console.error("❌ Repository 文件生成失败:", error);
      throw error;
    }
  }

  /**
   * 初始化生成器
   */
  private async initialize(): Promise<void> {
    try {
      // 从完整的模型列表中提取模型信息（包含中间表）
      this.models = this.allModels.map((model: DMMF.Model) => ({
        name: model.name,
        dbName: model.dbName, // 保留 dbName 信息
        fields: model.fields.map((field: DMMF.Field) => ({
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
      
      console.log(`✅ 成功初始化 ${this.models.length} 个模型（包含中间表）`);
    } catch (error) {
      console.error("❌ Repository 生成器初始化失败:", error);
      throw error;
    }
  }

  /**
   * 生成所有 repository 文件
   */
  private async generateAll(): Promise<void> {
    const generatedFiles: string[] = [];

    for (const model of this.models) {
      if (this.shouldSkipModel(model.name)) {
        console.log(`跳过 ${model.name}`);
        continue;
      }

      try {
        // 生成单个 repository 文件，使用 dbName（如果存在）或 name
        const modelIdentifier = model.dbName || model.name;
        await this.generateRepository(modelIdentifier);
        generatedFiles.push(modelIdentifier);
      } catch (error) {
        console.error(`生成 ${model.name} Repository 失败:`, error);
      }
    }

    // 生成 index.ts
    await this.generateIndex(generatedFiles);

    console.log(`Repository 生成完成！共生成 ${generatedFiles.length} 个文件`);
  }

  /**
   * 生成单个 repository 文件
   */
  private async generateRepository(modelName: string): Promise<void> {
    const code = await this.generateRepositoryCode(modelName);
    // 使用 FileName 规范生成文件名
    const fileName = FileName(modelName);
    const outputPath = path.join("db", "generated", "repositories", fileName);

    // 确保目录存在
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    writeFileSafely(outputPath, code);
  }

  /**
   * 生成 repository 代码
   */
  private async generateRepositoryCode(modelName: string): Promise<string> {
    const tableName = NamingRules.toLowerCase(modelName);
    const pascalName = TypeName(modelName, modelName);
    const camelName = NamingRules.toCamelCase(modelName);

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
    const tableName = NamingRules.toLowerCase(modelName);
    const pascalName = TypeName(modelName, modelName);

    // 计算相对路径
    const relativePaths = this.calculateRelativePaths();

    // 使用 ZodTypeName 规范（从 zod 导入的 snake_case 类型）
    const typeName = ZodTypeName(modelName);

    const imports: string[] = [
      `import { type Expression, type ExpressionBuilder, type Transaction, type Selectable, type Insertable, type Updateable } from "kysely";`,
      `import { getDB } from "${relativePaths.database}";`,
      `import { type DB, type ${typeName} } from "${relativePaths.zod}";`,
    ];

    // 添加 kysely helpers
    imports.push(
      `import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";`
    );

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
    imports.push(`import { defineRelations, makeRelations } from "${relativePaths.subRelationFactory}";`);

    return imports.join("\n");
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
    const outputDir = "db/generated/repositories";
    const dbDir = "db"; // db 目录
    const repositoriesDir = path.join(dbDir, "repositories");
    const generatedDir = path.join(dbDir, "generated");

    return {
      database: path.relative(outputDir, path.join(repositoriesDir, "database")).replace(/\\/g, "/"),
      zod: path.relative(outputDir, path.join(generatedDir, "zod", "index")).replace(/\\/g, "/"),
      subRelationFactory: path.relative(outputDir, path.join(repositoriesDir, "subRelationFactory")).replace(/\\/g, "/"),
    };
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
   */
  private isBusinessParentRelation(fieldName: string): boolean {
    return this.isParentRelation(fieldName);
  }

  /**
   * 生成类型定义
   */
  private generateTypes(modelName: string): string {
    const tableName = NamingRules.toLowerCase(modelName);
    const pascalName = TypeName(modelName, modelName);

    return `// 1. 类型定义
export type ${pascalName} = Selectable<${tableName}>;
export type ${pascalName}Insert = Insertable<${tableName}>;
export type ${pascalName}Update = Updateable<${tableName}>;`;
  }

  /**
   * 生成关系定义
   */
  private generateRelations(modelName: string): string {
    const tableName = NamingRules.toLowerCase(modelName);
    const schemaName = SchemaName(tableName); // 使用 SchemaName 规范
    const pascalName = TypeName(modelName, modelName);
    const camelName = NamingRules.toCamelCase(modelName);

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
  ...${schemaName}.shape,
  ...${camelName}RelationsFactory.schema.shape,
});`;

    return relationCode;
  }

  /**
   * 生成所有关系
   */
  private generateAllRelations(modelName: string): any[] {
    return this.getModelRelations(modelName);
  }

  /**
   * 获取需要导入的 schema
   * 使用 SchemaName 规范确保正确的 Schema 名称
   */
  private getSchemaImports(modelName: string): string[] {
    const tableName = NamingRules.toLowerCase(modelName);
    // 使用 SchemaName 规范生成 schema 名称
    const schemas = new Set<string>([SchemaName(tableName)]);

    // 添加关系的 schema
    const relations = this.getModelRelations(modelName);
    for (const relation of relations) {
      // 只添加有效的关系 schema，跳过枚举类型
      if (relation.targetTable && !relation.targetTable.includes('//')) {
        // 使用 SchemaName 规范确保一致性
        const targetSchema = SchemaName(relation.targetTable);
        schemas.add(targetSchema);
      }
    }

    return Array.from(schemas);
  }


  /**
   * 生成 CRUD 方法
   */
  private generateCrudMethods(modelName: string): string {
    const tableName = NamingRules.toLowerCase(modelName);
    const pascalName = TypeName(modelName, modelName);
    const camelName = NamingRules.toCamelCase(modelName);

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

    // update - 只有有主键的模型才生成
    if (hasPK) {
      methods.push(this.generateUpdate(modelName));
    }

    // delete - 只有有主键的模型才生成
    if (hasPK) {
      methods.push(this.generateDelete(modelName));
    }

    return `// 3. CRUD 方法\n${methods.join("\n\n")}`;
  }

  /**
   * 生成 index.ts
   */
  private async generateIndex(generatedFiles: string[]): Promise<void> {
    const crudImports: string[] = [];
    const typeImports: string[] = [];
    const crudExports: Record<string, any> = {};

    // 计算相对路径
    const relativePaths = this.calculateRelativePaths();

    // 添加所有模型的类型导入
    for (const model of this.models) {
      const modelName = model.name;
      const tableName = model.dbName || model.name; // 使用真实表名
      const pascalName = TypeName(modelName, modelName);
      const hasPK = this.hasPrimaryKey(model);
      const fileName = NamingRules.toSnakeCase(modelName); // 用于文件路径
      
      if (this.shouldSkipModel(modelName)) {
        // 跳过的模型从 zod 导入基础类型
        typeImports.push(
          `import { ${pascalName} } from "${relativePaths.zod}";`
        );
      } else if (hasPK) {
        // 有主键的模型导入基础类型
        typeImports.push(
          `import { type ${pascalName} } from "./${fileName}";`
        );
      }
    }
    
    // 添加中间表的类型导入
    const intermediateTables = this.getIntermediateTables();
    for (const tableName of intermediateTables) {
      const pascalName = TypeName(tableName, tableName);
      typeImports.push(
        `import { type ${pascalName} } from "${relativePaths.zod}";`
      );
    }

    // 只为实际生成的文件添加 CRUD 导入
    for (const modelName of generatedFiles) {
      const camelName = NamingRules.toCamelCase(modelName);
      const pascalName = TypeName(modelName, modelName);
      const model = this.models.find(m => m.name === modelName);
      const hasPK = model ? this.hasPrimaryKey(model) : true;
      const tableName = model ? (model.dbName || model.name) : modelName; // 使用真实表名
      const fileName = NamingRules.toSnakeCase(modelName); // 用于文件路径

      if (hasPK) {
        // 有主键的模型：标准 CRUD 方法
        crudImports.push(
          `import { insert${pascalName}, update${pascalName}, delete${pascalName}, select${pascalName}ById, selectAll${this.pluralize(pascalName)} } from "./${fileName}";`
        );

        crudExports[tableName] = {
          insert: `insert${pascalName}`,
          update: `update${pascalName}`,
          delete: `delete${pascalName}`,
          select: `select${pascalName}ById`,
          selectAll: `selectAll${this.pluralize(pascalName)}`
        };
      } else {
        // 无主键的模型：只有 insert 和 findAll，以及特殊的查询/删除方法
        const specialMethods = this.getSpecialMethodsForNoPKModel(modelName);
        crudImports.push(
          `import { insert${pascalName}, selectAll${this.pluralize(pascalName)}${specialMethods} } from "./${fileName}";`
        );

        const specialExports = this.getSpecialExportsForNoPKModel(modelName);
        crudExports[tableName] = {
          insert: `insert${pascalName}`,
          selectAll: `selectAll${this.pluralize(pascalName)}`,
          ...specialExports
        };
      }
    }

    // 生成代码
    const indexCode = `import { DB } from "${relativePaths.zod}";
${crudImports.join("\n")}
${typeImports.join("\n")}

// DB[K] → DB[K]WithRelation 类型映射
export type DBWithRelations = {
${this.generateTypeMapping(generatedFiles)}
};

export const repositoryMethods = {
${this.generateCrudExports(crudExports)}
} as const;
`;

    const outputPath = path.join("db", "generated", "repositories", "index.ts");
    writeFileSafely(outputPath, indexCode);
    console.log("✅ 生成 index.ts");
  }


  /**
   * 获取模型关系
   */
  private getModelRelations(modelName: string): any[] {
    const model = this.allModels.find((m: DMMF.Model) => m.name === modelName);
    if (!model) return [];
    
    return model.fields
      .filter((field: DMMF.Field) => field.kind === 'object')
      .map((field: DMMF.Field) => {
        const relationType = this.determineRelationType(field, model);
        const targetTable = NamingRules.toLowerCase(field.type);
        const targetPrimaryKey = this.getPrimaryKeyFieldFromModel(this.allModels.find((m: DMMF.Model) => m.name === field.type) || model);
        
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
   * 判断关系类型
   */
  private determineRelationType(field: DMMF.Field, model: DMMF.Model): string {
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
    const targetModel = this.allModels.find((m: DMMF.Model) => m.name === targetModelName);
    if (!targetModel) {
      return false;
    }

    // 检查目标模型是否有指向当前模型的关系字段
    return targetModel.fields.some((field: DMMF.Field) => 
      field.kind === 'object' && 
      field.type === currentModelName &&
      field.relationFromFields && 
      field.relationFromFields.length > 0
    );
  }

  /**
   * 获取主键字段
   */
  private getPrimaryKeyFieldFromModel(model: DMMF.Model): string {
    const idField = model.fields.find((field: DMMF.Field) => field.isId);
    if (!idField) {
      throw new Error(`Model ${model.name} has no primary key field`);
    }
    return idField.name;
  }

  /**
   * 生成 Schema 代码
   * 使用 SchemaName 规范确保正确的 Schema 名称
   */
  private generateSchemaCode(field: DMMF.Field, model: DMMF.Model, targetTable: string): string {
    const schemaName = SchemaName(targetTable); // 使用 SchemaName 规范
    if (field.isList) {
      return `z.array(${schemaName})`;
    } else {
      return schemaName;
    }
  }

  /**
   * 生成一对一关系代码
   */
  private generateOneToOneCode(field: DMMF.Field, model: DMMF.Model, targetTable: string, targetPrimaryKey: string): string {
    const isParentRelation = this.isBusinessParentRelation(field.name);
    
    // 检查是否是自关系
    const isSelfRelation = targetTable.toLowerCase() === model.name.toLowerCase();
    
    // 只检查自引用关系
    const shouldSkipImport = isSelfRelation;
    
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
        const subRelationCode = ''; // 强制使用一层关系，不包含子关系查询
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
        const subRelationCode = ''; // 强制使用一层关系，不包含子关系查询
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
  private generateOneToManyCode(field: DMMF.Field, model: DMMF.Model, targetTable: string, targetPrimaryKey: string): string {
    const isParentRelation = this.isBusinessParentRelation(field.name);
    
    // 检查是否是自关系
    const isSelfRelation = targetTable.toLowerCase() === model.name.toLowerCase();
    
    // 只检查自引用关系
    const shouldSkipImport = isSelfRelation;
    
    // 获取当前模型的主键
    const currentModelPrimaryKey = this.getPrimaryKeyFieldFromModel(model);
    
    if (isParentRelation) {
      // 父关系：外键在目标表中，指向当前模型
      // 从目标模型中查找指向当前模型的关系字段
      const targetModel = this.models.find(m => m.name.toLowerCase() === targetTable.toLowerCase());
      if (!targetModel) {
        throw new Error(`Target model ${targetTable} not found`);
      }
      
      const reverseField = targetModel.fields.find((f: any) => 
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
      
      const reverseField = targetModel.fields.find((f: any) => 
        f.kind === 'object' && 
        f.type === model.name &&
        f.relationFromFields && 
        f.relationFromFields.length > 0
      );
      
      if (!reverseField || !reverseField.relationFromFields || reverseField.relationFromFields.length === 0) {
        throw new Error(`Cannot find reverse relation field from ${targetTable} to ${model.name}`);
      }
      
      const reverseForeignKey = reverseField.relationFromFields[0];
      const subRelationCode = ''; // 强制使用一层关系，不包含子关系查询
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
  private generateManyToManyCode(field: DMMF.Field, model: DMMF.Model, targetTable: string, targetPrimaryKey: string): string {
    const relationName = field.relationName;
    const intermediateTable = `_${relationName}`;
    
    // 检查是否是自关系
    const isSelfRelation = targetTable.toLowerCase() === model.name.toLowerCase();
    
    // 只检查自引用关系
    const shouldSkipImport = isSelfRelation;
    
    // 获取当前模型的主键
    const currentModelPrimaryKey = this.getPrimaryKeyFieldFromModel(model);
    
    const subRelationCode = ''; // 强制使用一层关系，不包含子关系查询
    
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
   * 获取关系外键字段
   */
  private getRelationForeignKey(field: DMMF.Field, model: DMMF.Model, targetTable: string): string {
    // 优先从 relationFromFields 获取外键字段
    if (field.relationFromFields && field.relationFromFields.length > 0) {
      return field.relationFromFields[0];
    }
    
    // 对于反向关系，从目标模型中查找对应的关系字段
    const targetModel = this.models.find(m => m.name.toLowerCase() === targetTable.toLowerCase());
    if (targetModel) {
      // 查找目标模型中指向当前模型的关系字段
      const reverseField = targetModel.fields.find((f: any) => 
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
   * 判断是否有主键
   */
  private hasPrimaryKey(model: any): boolean {
    return model.fields.some((field: any) => field.isId);
  }

  /**
   * 判断是否跳过模型
   */
  private shouldSkipModel(modelName: string): boolean {
    // 跳过系统表
    return modelName.startsWith('_') || modelName === 'changes';
  }


  /**
   * 复数化
   */
  private pluralize(str: string): string {
    // 简单的复数化规则
    if (str.endsWith('y')) {
      return str.slice(0, -1) + 'ies';
    } else if (str.endsWith('s') || str.endsWith('sh') || str.endsWith('ch')) {
      return str + 'es';
    } else {
      return str + 's';
    }
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
    const tableName = NamingRules.toLowerCase(modelName);
    const pascalName = TypeName(modelName, modelName);
    
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
      const fieldParams = fieldNames.map((f: any) => `${f}: string`).join(', ');
      const pascalFieldNames = fieldNames.map((f: any) => NamingRules.toPascalCase(f)).join('And');
      
      const whereConditions = fieldNames.map((f: any) => `.where("${f}", "=", ${f})`).join('\n    ');
      
      return `export async function select${pascalName}By${pascalFieldNames}(${fieldParams}, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db.selectFrom("${tableName}")
    ${whereConditions}
    .selectAll("${tableName}")
    .executeTakeFirst();
}`;
    } else if (uniqueFields.length >= 2) {
      // 如果有多个唯一字段，生成基于所有唯一字段的查询方法
      const fieldNames = uniqueFields.map((f: any) => f.name);
      const fieldParams = fieldNames.map((f: any) => `${f.name}: string`).join(', ');
      const pascalFieldNames = fieldNames.map((f: any) => NamingRules.toPascalCase(f.name)).join('And');
      
      const whereConditions = fieldNames.map((f: any) => `.where("${f.name}", "=", ${f.name})`).join('\n    ');
      
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
      return `export async function select${pascalName}By${NamingRules.toPascalCase(firstUniqueField.name)}(${firstUniqueField.name}: string, trx?: Transaction<DB>) {
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
    const tableName = NamingRules.toLowerCase(modelName);
    const pascalName = TypeName(modelName, modelName);
    
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
      const fieldParams = fieldNames.map((f: any) => `${f}: string`).join(', ');
      const pascalFieldNames = fieldNames.map((f: any) => NamingRules.toPascalCase(f)).join('And');
      
      const whereConditions = fieldNames.map((f: any) => `.where("${f}", "=", ${f})`).join('\n    ');
      
      return `export async function delete${pascalName}By${pascalFieldNames}(${fieldParams}, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db.deleteFrom("${tableName}")
    ${whereConditions}
    .returningAll()
    .executeTakeFirst();
}`;
    } else if (uniqueFields.length >= 2) {
      // 如果有多个唯一字段，生成基于所有唯一字段的删除方法
      const fieldNames = uniqueFields.map((f: any) => f.name);
      const fieldParams = fieldNames.map((f: any) => `${f.name}: string`).join(', ');
      const pascalFieldNames = fieldNames.map((f: any) => NamingRules.toPascalCase(f.name)).join('And');
      
      const whereConditions = fieldNames.map((f: any) => `.where("${f.name}", "=", ${f.name})`).join('\n    ');
      
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
      return `export async function delete${pascalName}By${NamingRules.toPascalCase(firstUniqueField.name)}(${firstUniqueField.name}: string, trx?: Transaction<DB>) {
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
    const tableName = NamingRules.toLowerCase(modelName);
    const pascalName = TypeName(modelName, modelName);
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
    const tableName = NamingRules.toLowerCase(modelName);
    const pascalName = TypeName(modelName, modelName);
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
    const tableName = NamingRules.toLowerCase(modelName);
    const pascalName = TypeName(modelName, modelName);

    return `export async function insert${pascalName}(data: ${pascalName}Insert, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db.insertInto("${tableName}").values(data).returningAll().executeTakeFirstOrThrow();
}`;
  }

  /**
   * 生成 update 方法
   */
  private generateUpdate(modelName: string): string {
    const tableName = NamingRules.toLowerCase(modelName);
    const pascalName = TypeName(modelName, modelName);
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
    const tableName = NamingRules.toLowerCase(modelName);
    const pascalName = TypeName(modelName, modelName);
    const primaryKeyField = this.getPrimaryKeyField(modelName);

    return `export async function delete${pascalName}(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db.deleteFrom("${tableName}").where("${primaryKeyField}", "=", id).returningAll().executeTakeFirst();
}`;
  }


  /**
   * 从 DMMF 中获取所有中间表名称
   * 使用真实的表名（dbName 或 name），与 DB 接口保持一致
   */
  private getIntermediateTables(): string[] {
    const intermediateTables: string[] = [];
    
    // 遍历所有模型，找出中间表（以 _ 开头的表名）
    for (const model of this.allModels) {
      if (model.name.startsWith('_')) {
        // 使用真实的表名（dbName 或 name），不进行任何转换
        const tableName = model.dbName || model.name;
        intermediateTables.push(tableName);
      }
    }
    
    return intermediateTables.sort();
  }

  /**
   * 判断是否为真正的多对多关系
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
   * 获取无主键模型的特殊方法导入字符串
   */
  private getSpecialMethodsForNoPKModel(modelName: string): string {
    const pascalName = TypeName(modelName, modelName);
    
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
      const pascalFieldNames = fieldNames.map((f: any) => NamingRules.toPascalCase(f)).join('And');
      return `, delete${pascalName}By${pascalFieldNames}`;
    } else if (uniqueFields.length >= 2) {
      const pascalFieldNames = uniqueFields.map((f: any) => NamingRules.toPascalCase(f.name)).join('And');
      return `, delete${pascalName}By${pascalFieldNames}`;
    } else if (uniqueFields.length === 1) {
      const firstUniqueField = uniqueFields[0];
      return `, delete${pascalName}By${NamingRules.toPascalCase(firstUniqueField.name)}`;
    }
    
    return '';
  }

  /**
   * 获取无主键模型的特殊导出对象
   */
  private getSpecialExportsForNoPKModel(modelName: string): Record<string, string> {
    const pascalName = TypeName(modelName, modelName);
    
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
      const pascalFieldNames = fieldNames.map((f: any) => NamingRules.toPascalCase(f)).join('And');
      return {
        deleteByUniqueFields: `delete${pascalName}By${pascalFieldNames}`
      };
    } else if (uniqueFields.length >= 2) {
      const pascalFieldNames = uniqueFields.map((f: any) => NamingRules.toPascalCase(f.name)).join('And');
      return {
        deleteByUniqueFields: `delete${pascalName}By${pascalFieldNames}`
      };
    } else if (uniqueFields.length === 1) {
      const firstUniqueField = uniqueFields[0];
      return {
        deleteByUniqueField: `delete${pascalName}By${NamingRules.toPascalCase(firstUniqueField.name)}`
      };
    }
    
    return {};
  }

  /**
   * 生成类型映射
   */
  private generateTypeMapping(generatedFiles: string[]): string {
    const lines: string[] = [];
    
    // 为所有模型生成类型映射（包括跳过的模型）
    for (const model of this.models) {
      const modelName = model.name;
      const tableName = model.dbName || model.name; // 使用真实表名，与 DB 接口一致
      const pascalName = TypeName(modelName, modelName);
      const hasPK = this.hasPrimaryKey(model);
      
      if (this.shouldSkipModel(modelName)) {
        // 跳过的模型使用基础类型
        lines.push(`  ${tableName}: ${pascalName};`);
      } else if (hasPK) {
        // 有主键的模型使用基础类型
        lines.push(`  ${tableName}: ${pascalName};`);
      }
    }
    
    // 添加中间表（已经是真实的表名）
    const intermediateTables = this.getIntermediateTables();
    for (const tableName of intermediateTables) {
      const pascalName = TypeName(tableName, tableName);
      lines.push(`  ${tableName}: ${pascalName};`);
    }
    
    return lines.join('\n');
  }

  /**
   * 生成 CRUD 导出对象
   */
  private generateCrudExports(exports: Record<string, any>): string {
    // 读取所有表名（包括跳过的表和中间表）
    const allTables = this.getAllTableNames();

    const lines: string[] = [];
    for (const tableName of allTables) {
      const crudMethods = exports[tableName];
      if (crudMethods) {
        // 确保所有标准字段都存在，不存在的用 null 表示
        const methodLines: string[] = [];
        methodLines.push(`    insert: ${crudMethods.insert || 'null'}`);
        methodLines.push(`    update: ${crudMethods.update || 'null'}`);
        methodLines.push(`    delete: ${crudMethods.delete || 'null'}`);
        methodLines.push(`    select: ${crudMethods.select || 'null'}`);
        methodLines.push(`    selectAll: ${crudMethods.selectAll || 'null'}`);
        
        // 添加特殊方法
        Object.keys(crudMethods).forEach(key => {
          if (!['insert', 'update', 'delete', 'select', 'selectAll'].includes(key)) {
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
    selectAll: null
  }`);
      }
    }

    return lines.join(",\n");
  }

  /**
   * 获取所有DB表名（包括模型表和中间表）
   * 使用与 DB 接口相同的键名（即 dbName 或 name）
   */
  private getAllTableNames(): string[] {
    const tableNames: string[] = [];
    
    // 添加所有模型表名（使用 dbName 或 name，与 DB 接口保持一致）
    for (const model of this.models) {
      const tableName = model.dbName || model.name;
      tableNames.push(tableName);
    }
    
    // 添加中间表名（使用 dbName 或 name，与 DB 接口保持一致）
    const intermediateTables = this.getIntermediateTables();
    tableNames.push(...intermediateTables);
    
    return tableNames;
  }
}