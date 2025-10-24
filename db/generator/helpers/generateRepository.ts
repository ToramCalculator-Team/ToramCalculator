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
import path from "path";
import fs from "fs";

/**
 * Repository 生成器
 */
export class RepositoryGenerator {
  private dmmf: DMMF.Document;
  private models: any[] = [];

  constructor(dmmf: DMMF.Document) {
    this.dmmf = dmmf;
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
      // 从 DMMF 中提取模型信息
      this.models = this.dmmf.datamodel.models.map((model: DMMF.Model) => ({
        name: model.name,
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
      
      console.log(`✅ 成功初始化 ${this.models.length} 个模型`);
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
        // 生成单个 repository 文件
        await this.generateRepository(model.name);
        generatedFiles.push(model.name);
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
    const fileName = `${modelName.toLowerCase()}.ts`;
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
    const tableName = modelName.toLowerCase();
    const pascalName = this.toPascalCase(modelName);
    const camelName = this.toCamelCase(modelName);

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
    const pascalName = this.toPascalCase(modelName);

    const imports: string[] = [
      `import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";`,
      `import { getDB } from "../../database";`,
      `import { DB, ${tableName} } from "../zod/index";`,
      `import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";`,
      `import { createId } from "@paralleldrive/cuid2";`,
      `import { z } from "zod";`,
    ];

    return imports.join("\n");
  }

  /**
   * 生成类型定义
   */
  private generateTypes(modelName: string): string {
    const pascalName = this.toPascalCase(modelName);
    const tableName = modelName.toLowerCase();

    return `// ${pascalName} 相关类型
export type ${pascalName}SelectOptions = {
  include?: {
    [K in keyof ${pascalName}Relations]?: boolean;
  };
};

export type ${pascalName}FindOptions = ${pascalName}SelectOptions & {
  where?: ExpressionBuilder<DB, "${tableName}">;
  orderBy?: ExpressionBuilder<DB, "${tableName}">;
  limit?: number;
  offset?: number;
};

export type ${pascalName}WithRelations = ${pascalName} & {
  [K in keyof ${pascalName}Relations]: ${pascalName}Relations[K] extends Array<infer U> ? U[] : ${pascalName}Relations[K];
};

export type ${pascalName}Relations = {
  // 关系字段将在这里定义
};`;
  }

  /**
   * 生成关系定义
   */
  private generateRelations(modelName: string): string {
    const pascalName = this.toPascalCase(modelName);
    const tableName = modelName.toLowerCase();
    
    // 获取模型关系
    const relations = this.getModelRelations(modelName);
    
    if (relations.length === 0) {
      return `// ${pascalName} 关系定义
export const ${pascalName}Relations = {};`;
    }

    let relationsCode = `// ${pascalName} 关系定义
export const ${pascalName}Relations = {`;

    for (const relation of relations) {
      relationsCode += `
  ${relation.name}: (eb: ExpressionBuilder<DB, "${tableName}">) => {
    ${relation.buildCode}
  },`;
    }

    relationsCode += `
};`;

    return relationsCode;
  }

  /**
   * 生成 CRUD 方法
   */
  private generateCrudMethods(modelName: string): string {
    const pascalName = this.toPascalCase(modelName);
    const tableName = modelName.toLowerCase();
    const camelName = this.toCamelCase(modelName);

    return `// ${pascalName} CRUD 方法

/**
 * 插入 ${pascalName}
 */
export async function insert${pascalName}(
  data: Insertable<DB["${tableName}"]>,
  tx?: Transaction<DB>
): Promise<Selectable<DB["${tableName}"]]> {
  const db = tx || getDB();
  
  const insertData = {
    ...data,
    id: data.id || createId(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return await db
    .insertInto("${tableName}")
    .values(insertData)
    .returningAll()
    .executeTakeFirstOrThrow();
}

/**
 * 更新 ${pascalName}
 */
export async function update${pascalName}(
  id: string,
  data: Updateable<DB["${tableName}"]>,
  tx?: Transaction<DB>
): Promise<Selectable<DB["${tableName}"]]> {
  const db = tx || getDB();

  return await db
    .updateTable("${tableName}")
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

/**
 * 删除 ${pascalName}
 */
export async function delete${pascalName}(
  id: string,
  tx?: Transaction<DB>
): Promise<void> {
  const db = tx || getDB();

  await db
    .deleteFrom("${tableName}")
    .where("id", "=", id)
    .execute();
}

/**
 * 根据 ID 查询 ${pascalName}
 */
export async function select${pascalName}ById(
  id: string,
  options?: ${pascalName}SelectOptions,
  tx?: Transaction<DB>
): Promise<${pascalName}WithRelations | undefined> {
  const db = tx || getDB();

  let query = db
    .selectFrom("${tableName}")
    .selectAll();

  // 添加关系查询
  if (options?.include) {
    for (const [relationName, include] of Object.entries(options.include)) {
      if (include) {
        const relation = ${pascalName}Relations[relationName as keyof typeof ${pascalName}Relations];
        if (relation) {
          query = query.select((eb) => [
            relation(eb).as(relationName)
          ]);
        }
      }
    }
  }

  return await query
    .where("id", "=", id)
    .executeTakeFirst() as ${pascalName}WithRelations | undefined;
}

/**
 * 查询所有 ${pascalName}
 */
export async function selectAll${this.pluralize(pascalName)}(
  options?: ${pascalName}FindOptions,
  tx?: Transaction<DB>
): Promise<${pascalName}WithRelations[]> {
  const db = tx || getDB();

  let query = db
    .selectFrom("${tableName}")
    .selectAll();

  // 添加关系查询
  if (options?.include) {
    for (const [relationName, include] of Object.entries(options.include)) {
      if (include) {
        const relation = ${pascalName}Relations[relationName as keyof typeof ${pascalName}Relations];
        if (relation) {
          query = query.select((eb) => [
            relation(eb).as(relationName)
          ]);
        }
      }
    }
  }

  // 添加条件
  if (options?.where) {
    query = query.where(options.where);
  }

  // 添加排序
  if (options?.orderBy) {
    query = query.orderBy(options.orderBy);
  }

  // 添加分页
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.offset(options.offset);
  }

  return await query.execute() as ${pascalName}WithRelations[];
}

/**
 * 查询带关系的 ${pascalName}
 */
export async function select${pascalName}WithRelations(
  id: string,
  tx?: Transaction<DB>
): Promise<${pascalName}WithRelations | undefined> {
  return await select${pascalName}ById(id, { include: {} }, tx);
}`;
  }

  /**
   * 生成 index.ts
   */
  private async generateIndex(generatedFiles: string[]): Promise<void> {
    const crudImports: string[] = [];
    const typeImports: string[] = [];
    const crudExports: Record<string, any> = {};

    // 添加所有模型的类型导入
    for (const model of this.models) {
      const modelName = model.name;
      const pascalName = this.toPascalCase(modelName);
      const hasPK = this.hasPrimaryKey(model);
      
      if (this.shouldSkipModel(modelName)) {
        // 跳过的模型从 zod 导入基础类型
        typeImports.push(
          `import { ${pascalName} } from "../zod/index";`
        );
      } else if (hasPK) {
        // 有主键的模型导入 WithRelations 类型
        typeImports.push(
          `import { ${pascalName}WithRelations } from "./${modelName.toLowerCase()}";`
        );
      }
    }

    // 只为实际生成的文件添加 CRUD 导入
    for (const modelName of generatedFiles) {
      const camelName = this.toCamelCase(modelName);
      const pascalName = this.toPascalCase(modelName);
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
        // 无主键的模型：只有 insert 和 findAll
        crudImports.push(
          `import { insert${pascalName}, selectAll${this.pluralize(pascalName)} } from "./${modelName.toLowerCase()}";`
        );

        crudExports[modelName.toLowerCase()] = {
          insert: `insert${pascalName}`,
          selectAll: `selectAll${this.pluralize(pascalName)}`
        };
      }
    }

    // 生成代码
    const indexCode = `import { DB } from "../zod/index";
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
   * 生成类型映射
   */
  private generateTypeMapping(generatedFiles: string[]): string {
    const lines: string[] = [];
    
    // 为所有模型生成类型映射（包括跳过的模型）
    for (const model of this.models) {
      const modelName = model.name;
      const pascalName = this.toPascalCase(modelName);
      const hasPK = this.hasPrimaryKey(model);
      
      if (this.shouldSkipModel(modelName)) {
        lines.push(`  ${modelName}: ${pascalName};`);
      } else if (hasPK) {
        lines.push(`  ${modelName}: ${pascalName}WithRelations;`);
      } else {
        lines.push(`  ${modelName}: ${pascalName};`);
      }
    }
    
    return lines.join("\n");
  }

  /**
   * 生成 CRUD 导出
   */
  private generateCrudExports(crudExports: Record<string, any>): string {
    const lines: string[] = [];
    
    for (const [modelName, methods] of Object.entries(crudExports)) {
      lines.push(`  ${modelName}: {`);
      for (const [methodName, methodRef] of Object.entries(methods)) {
        lines.push(`    ${methodName}: ${methodRef},`);
      }
      lines.push(`  },`);
    }
    
    return lines.join("\n");
  }

  /**
   * 获取模型关系
   */
  private getModelRelations(modelName: string): any[] {
    const model = this.dmmf.datamodel.models.find((m: DMMF.Model) => m.name === modelName);
    if (!model) return [];
    
    return model.fields
      .filter((field: DMMF.Field) => field.kind === 'object')
      .map((field: DMMF.Field) => {
        const relationType = this.determineRelationType(field, model);
        const targetTable = field.type.toLowerCase();
        
        let buildCode = '';
        
        switch (relationType) {
          case 'ONE_TO_ONE':
            buildCode = this.generateOneToOneCode(field, model, targetTable);
            break;
          case 'ONE_TO_MANY':
            buildCode = this.generateOneToManyCode(field, model, targetTable);
            break;
          case 'MANY_TO_MANY':
            buildCode = this.generateManyToManyCode(field, model, targetTable);
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
          buildCode: buildCode
        };
      });
  }

  /**
   * 判断关系类型
   */
  private determineRelationType(field: DMMF.Field, model: DMMF.Model): string {
    if (field.isList) {
      return 'MANY_TO_MANY';
    } else if (field.relationFromFields && field.relationFromFields.length > 0) {
      return 'ONE_TO_ONE';
    } else {
      return 'ONE_TO_MANY';
    }
  }

  /**
   * 生成一对一关系代码
   */
  private generateOneToOneCode(field: DMMF.Field, model: DMMF.Model, targetTable: string): string {
    const foreignKey = field.relationFromFields?.[0] || 'id';
    return `return jsonObjectFrom(
      eb.selectFrom("${targetTable}")
        .selectAll()
        .where("${foreignKey}", "=", eb.ref("${model.name.toLowerCase()}.${foreignKey}"))
    );`;
  }

  /**
   * 生成一对多关系代码
   */
  private generateOneToManyCode(field: DMMF.Field, model: DMMF.Model, targetTable: string): string {
    const foreignKey = field.relationToFields?.[0] || 'id';
    return `return jsonArrayFrom(
      eb.selectFrom("${targetTable}")
        .selectAll()
        .where("${foreignKey}", "=", eb.ref("${model.name.toLowerCase()}.id"))
    );`;
  }

  /**
   * 生成多对多关系代码
   */
  private generateManyToManyCode(field: DMMF.Field, model: DMMF.Model, targetTable: string): string {
    // 简化实现，实际可能需要更复杂的中间表处理
    return `return jsonArrayFrom(
      eb.selectFrom("${targetTable}")
        .selectAll()
        .where("id", "in", 
          eb.selectFrom("_${model.name.toLowerCase()}${this.toPascalCase(field.type)}")
            .select("${field.type.toLowerCase()}Id")
            .where("${model.name.toLowerCase()}Id", "=", eb.ref("${model.name.toLowerCase()}.id"))
        )
    );`;
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
   * 转换为 PascalCase
   */
  private toPascalCase(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * 转换为 camelCase
   */
  private toCamelCase(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1);
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
}