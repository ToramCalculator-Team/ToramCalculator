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
import { DMMFHelpers } from "../utils/dmmfHelpers";
import { RELATION_BREAK_POINTS } from "../relationConfig";
import path from "path";
import fs from "fs";

/**
 * Repository 生成器
 */
export class RepositoryGenerator {
  private dmmf: DMMF.Document;
  private models: any[] = [];
  private allModels: readonly DMMF.Model[] = []; // 包含中间表的完整模型列表
  private helpers: DMMFHelpers;
  private allDetectedCycles: Map<string, string[][]> = new Map(); // 收集所有检测到的循环

  constructor(dmmf: DMMF.Document, allModels: DMMF.Model[]) {
    this.dmmf = dmmf;
    this.allModels = allModels;
    this.helpers = new DMMFHelpers(allModels);
  }

  /**
   * 生成 Repository 文件
   */
  async generate(outputPath: string): Promise<void> {
    try {
      console.log("生成 Repository 文件...");
      
      // 初始化模型信息
      await this.initialize();
      
      // 创建 repositories 目录
      const repositoriesDir = path.dirname(outputPath);
      if (!fs.existsSync(repositoriesDir)) {
        fs.mkdirSync(repositoriesDir, { recursive: true });
      }
      
      // 生成所有 repository 文件
      await this.generateAll();
      
      console.log("Repository 文件生成完成");
    } catch (error) {
      console.error("Repository 文件生成失败:", error);
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
      
      console.log(`成功初始化 ${this.models.length} 个模型（包含中间表）`);
    } catch (error) {
      console.error("Repository 生成器初始化失败:", error);
      throw error;
    }
  }

  /**
   * 生成所有 repository 文件
   */
  private async generateAll(): Promise<void> {
    const generatedFiles: string[] = [];
    
    // 清空循环收集器
    this.allDetectedCycles.clear();

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

    // 统一打印所有检测到的循环（去重后）
    this.printAllCycles();

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
    const tableName = NamingRules.ZodTypeName(modelName);
    const pascalName = TypeName(modelName, modelName);
    const camelName = NamingRules.VariableName(modelName);

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
    const tableName = NamingRules.ZodTypeName(modelName);
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

    // 添加子关系函数导入
    const subRelationImports = this.getSubRelationImports(modelName);
    if (subRelationImports.length > 0) {
      for (const importStatement of subRelationImports) {
        imports.push(importStatement);
      }
    }

    // 添加 store（用于 canEdit 方法）
    imports.push(`import { store } from "~/store";`);

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
   * 检测循环引用并收集（不立即打印）
   */
  private detectAndWarnCycles(modelName: string): void {
    try {
      const cycles = this.findCycles(modelName);
      
      if (cycles.length > 0) {
        // 收集循环，稍后统一打印
        this.allDetectedCycles.set(modelName, cycles);
      }
    } catch (error) {
      // 如果检测过程中出错，也输出错误信息
      console.error(`检测 ${modelName} 表的循环引用时出错:`, error);
      throw error;
    }
  }

  /**
   * 检查循环是否已经在配置中有断点
   * 只要循环中任意一条边有断点配置，循环就被解决
   */
  private isCycleResolvedByConfig(cycle: string[]): boolean {
    // 检查循环路径中的每条边，只要有一条边有断点配置，循环就被解决
    for (let i = 0; i < cycle.length; i++) {
      const sourceModel = cycle[i];
      const targetModel = cycle[(i + 1) % cycle.length]; // 循环回到起点
      
      // 找到源模型中指向目标模型的关系字段名
      const sourceModelObj = this.allModels.find(m => m.name.toLowerCase() === sourceModel.toLowerCase());
      if (!sourceModelObj) continue;
      
      const relationField = sourceModelObj.fields.find(field => 
        field.kind === 'object' && 
        field.type.toLowerCase() === targetModel.toLowerCase() &&
        !this.isBusinessParentRelation(field.name)
      );
      
      if (!relationField) continue;
      
      // 检查配置中是否有这个断点
      // 配置格式：RELATION_BREAK_POINTS[sourceModel] 包含 [relationField.name]
      const breakPoints = RELATION_BREAK_POINTS[sourceModel];
      if (breakPoints && breakPoints.includes(relationField.name)) {
        // 这条边有断点配置，循环已被解决
        return true;
      }
    }
    
    // 所有边都没有断点配置，循环未解决
    return false;
  }

  /**
   * 统一打印所有检测到的循环引用（去重后，并与配置对比）
   */
  private printAllCycles(): void {
    if (this.allDetectedCycles.size === 0) {
      return;
    }

    // 收集所有唯一的循环（基于循环的节点集合去重）
    const uniqueCycles = new Map<string, string[]>();
    
    for (const [modelName, cycles] of this.allDetectedCycles.entries()) {
      for (const cycle of cycles) {
        // 使用排序后的节点集合作为唯一键
        const cycleKey = cycle.map((n: string) => n.toLowerCase()).sort().join('->');
        if (!uniqueCycles.has(cycleKey)) {
          uniqueCycles.set(cycleKey, cycle);
        }
      }
    }

    // 分离已解决和未解决的循环
    const resolvedCycles: string[][] = [];
    const unresolvedCycles: string[][] = [];
    
    for (const cycle of uniqueCycles.values()) {
      if (this.isCycleResolvedByConfig(cycle)) {
        resolvedCycles.push(cycle);
      } else {
        unresolvedCycles.push(cycle);
      }
    }

    // 只输出未解决的循环
    if (unresolvedCycles.length > 0) {
      console.log(`⚠️  检测到循环引用（共 ${unresolvedCycles.length} 个未解决的循环）：`);
      let index = 1;
      for (const cycle of unresolvedCycles) {
        console.log(`   循环 ${index}: ${cycle.join(" -> ")} -> ${cycle[0]}`);
        index++;
      }
      console.log(`   建议在 relationConfig.ts 中配置 RELATION_BREAK_POINTS 来避免无限递归`);
    }
    
    // 如果有已解决的循环，也输出信息（可选）
    if (resolvedCycles.length > 0 && unresolvedCycles.length === 0) {
      console.log(`✅ 所有循环引用已在 relationConfig.ts 中配置断点`);
    }
  }

  /**
   * 查找从指定模型开始的循环引用
   * 使用 DFS 检测所有可能的循环路径
   */
  private findCycles(startModelName: string): string[][] {
    const cycles: string[][] = [];
    const path: string[] = [];
    const visitedInCurrentPath = new Set<string>(); // 用于快速检查是否在路径中

    const dfs = (currentModel: string) => {
      // 先找到模型的实际名称（可能大小写不同）
      const model = this.allModels.find(m => m.name.toLowerCase() === currentModel.toLowerCase());
      if (!model) {
        return;
      }

      const actualModelName = model.name;
      const actualModelNameLower = actualModelName.toLowerCase();
      
      // 检查是否形成循环（当前模型已在路径中）
      if (visitedInCurrentPath.has(actualModelNameLower)) {
        // 找到循环：从路径中找到循环开始的索引
        const cycleStartIndex = path.findIndex(name => name.toLowerCase() === actualModelNameLower);
        if (cycleStartIndex !== -1) {
          // 构建循环路径：从循环开始到当前路径的末尾
          // 不添加当前节点，因为当前节点就是循环开始的节点
          const cycle = path.slice(cycleStartIndex);
          // 确保循环至少包含2个节点
          if (cycle.length >= 2) {
            // 去重：检查是否已经有相同的循环（顺序可能不同）
            const cycleKey = cycle.map(n => n.toLowerCase()).sort().join('->');
            const isDuplicate = cycles.some(c => {
              const cKey = c.map(n => n.toLowerCase()).sort().join('->');
              return cKey === cycleKey;
            });
            if (!isDuplicate) {
              cycles.push(cycle);
            }
          }
        }
        return;
      }

      // 将当前模型加入路径
      path.push(actualModelName);
      visitedInCurrentPath.add(actualModelNameLower);

      // 获取所有子关系（非父关系）
      // 注意：这里的"子关系"是指会生成嵌套查询的关系，即非业务父关系的关系
      // 即使外键在当前表中（如 account.user），只要不是业务父关系，也会生成嵌套查询
      const childRelations = model.fields
        .filter(field => {
          if (field.kind !== 'object') return false;
          // 跳过业务父关系（belongTo、usedBy、createdBy、updatedBy）
          if (this.isBusinessParentRelation(field.name)) return false;
          // 跳过自引用关系（已在生成代码时处理，避免无限递归）
          // field.type 就是目标模型的名称，直接比较即可
          if (field.type.toLowerCase() === actualModelNameLower) {
            return false;
          }
          // 其他关系都认为是子关系，会生成嵌套查询
          return true;
        })
        .map(field => {
          // 确保返回的模型名称与 allModels 中的名称匹配
          const targetModel = this.allModels.find(m => m.name.toLowerCase() === field.type.toLowerCase());
          return targetModel?.name || field.type;
        });

      for (const targetType of childRelations) {
        dfs(targetType);
      }

      // 回溯：移除当前模型
      path.pop();
      visitedInCurrentPath.delete(actualModelNameLower);
    };

    dfs(startModelName);
    return cycles;
  }

  /**
   * 检查是否应该跳过子关系查询（根据用户配置）
   */
  private shouldSkipSubRelation(sourceModelName: string, relationName: string): boolean {
    const breakPoints = RELATION_BREAK_POINTS[sourceModelName];
    if (!breakPoints) return false;
    return breakPoints.includes(relationName);
  }

  /**
   * 生成类型定义
   */
  private generateTypes(modelName: string): string {
    const tableName = NamingRules.ZodTypeName(modelName);
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
    const tableName = NamingRules.ZodTypeName(modelName);
    const schemaName = SchemaName(tableName); // 使用 SchemaName 规范
    const pascalName = TypeName(modelName, modelName);
    const camelName = NamingRules.VariableName(modelName);

    const generatedRelations = this.generateAllRelations(modelName);
    
    // 检测循环引用并发出警告
    // 注意：使用实际的模型名称（从 allModels 中查找），而不是传入的 modelName（可能是 dbName）
    const actualModel = this.allModels.find(m => 
      m.name.toLowerCase() === modelName.toLowerCase() || 
      (m.dbName && m.dbName.toLowerCase() === modelName.toLowerCase())
    );
    const actualModelName = actualModel?.name || modelName;
    this.detectAndWarnCycles(actualModelName);
    
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

// 导出子关系函数供其他 repository 使用
export const ${camelName}SubRelations = ${camelName}RelationsFactory.subRelations;

export const ${pascalName}WithRelationsSchema = z.object({
  ...${schemaName}.shape,
  ...${camelName}RelationsFactory.schema.shape,
});

export type ${pascalName}WithRelations = z.output<typeof ${pascalName}WithRelationsSchema>;`;

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
   * 注意：WithRelationsSchema 从 repository 文件导入，不在这里处理
   */
  private getSchemaImports(modelName: string): string[] {
    const tableName = NamingRules.ZodTypeName(modelName);
    // 使用 SchemaName 规范生成 schema 名称
    const schemas = new Set<string>([SchemaName(tableName)]);

    // 添加关系的 schema（仅基础 schema，WithRelations 版本从 repository 导入）
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
   * 获取需要导入的子关系函数和 WithRelations schema
   * 为每个子关系的目标表生成导入语句
   */
  private getSubRelationImports(modelName: string): string[] {
    const imports: string[] = [];
    const relations = this.getModelRelations(modelName);
    
    // 只处理子关系（非父关系）
    const childRelations = relations.filter(rel => !this.isBusinessParentRelation(rel.name));
    
    for (const relation of childRelations) {
      if (relation.targetTable && !relation.targetTable.includes('//')) {
        const targetTable = relation.targetTable;
        const targetCamelName = NamingRules.VariableName(targetTable);
        const targetPascalName = TypeName(targetTable, targetTable);
        const targetFileName = NamingRules.TableNameLowerCase(targetTable);
        
        // 检查是否是自引用（避免导入自己）
        if (targetTable.toLowerCase() !== modelName.toLowerCase()) {
          // 同时导入 SubRelations 函数和 WithRelationsSchema
          imports.push(`import { ${targetCamelName}SubRelations, ${targetPascalName}WithRelationsSchema } from "./${targetFileName}";`);
        }
      }
    }
    
    // 去重
    return Array.from(new Set(imports));
  }


  /**
   * 生成 canEdit 方法
   * 
   * 生成逻辑说明：
   * 1. 递归查找父表路径，直到找到包含 createdByAccountId 或 belongToAccountId 的表
   * 2. 对于没有 accountId 字段的表，返回 false（不可编辑）
   * 3. 对于有 accountId 字段的表，查询对应的 accountId 并与当前用户的 account.id 对比
   * 4. 判断规则：
   *    - Admin 类型的账号可以编辑任何内容
   *    - 普通用户只能编辑自己创建的内容（accountId 匹配）
   *    - 如果 accountId 为 null，返回 false（不可编辑）
   */
  private generateCanEdit(modelName: string): string {
    const pascalName = TypeName(modelName, modelName);
    const tableName = NamingRules.ZodTypeName(modelName);
    const primaryKeyField = this.getPrimaryKeyField(modelName);

    // 查找父表路径和 accountId 字段名
    const result = this.findParentPathToAccountId(modelName);

    // 如果没有父表路径（可能不存在 accountId 字段），生成一个总是返回 false 的方法
    if (result === null) {
      return `// 判断当前用户是否可以编辑此数据
// 注意：此表没有 accountId 字段，返回 false（不可编辑）
export async function canEdit${pascalName}(id: string, trx?: Transaction<DB>): Promise<boolean> {
  return false;
}`;
    }

    const { path, accountIdField } = result;

    // 如果 path 是空数组，表示当前表就有 accountId 字段
    if (path.length === 0) {
      // 生成简单的注释说明查找路径
      let pathComment = `// 查找路径：直接读取 ${tableName}.${accountIdField}`;
      if (accountIdField === 'createdByAccountId') {
        pathComment += '（数据创建者）';
      } else {
        pathComment += '（所属账号）';
      }

      return `${pathComment}
export async function canEdit${pascalName}(id: string, trx?: Transaction<DB>): Promise<boolean> {
  const db = trx || await getDB();
  const data = await db.selectFrom("${tableName}")
    .where("${primaryKeyField}", "=", id)
    .select("${accountIdField}")
    .executeTakeFirst();
  
  if (!data) return false;
  
  const currentAccountId = store.session.account?.id;
  const currentAccountType = store.session.account?.type;
  
  if (!currentAccountId) return false;
  
  // Admin 可以编辑任何内容
  if (currentAccountType === "Admin") return true;
  
  // 创建者/所有者可以编辑
  return data.${accountIdField} === currentAccountId;
}`;
    }

    // 需要 JOIN 父表的情况
    // 构建 JOIN 链
    let joinChain = '';
    let currentTable = tableName;
    let pathDescription = `${tableName}`;

    for (let i = 0; i < path.length; i++) {
      const { foreignKey, parentTable } = path[i];
      const prevTable = currentTable;
      
      // 获取父表的主键
      const parentPK = this.getPrimaryKeyField(parentTable);
      
      if (i === 0) {
        // 第一个 JOIN
        joinChain = `    .innerJoin("${parentTable}", "${prevTable}.${foreignKey}", "${parentTable}.${parentPK}")`;
        pathDescription += ` → ${parentTable}`;
      } else {
        // 后续的 JOIN：使用当前路径的外键字段
        joinChain += `\n    .innerJoin("${parentTable}", "${prevTable}.${foreignKey}", "${parentTable}.${parentPK}")`;
        pathDescription += ` → ${parentTable}`;
      }
      
      currentTable = parentTable;
    }

    // 最后的表名（包含 accountId 字段）
    const finalTable = currentTable;
    pathDescription += `.${accountIdField}`;
    
    // 生成路径注释
    let pathComment = `// 查找路径：${pathDescription}`;
    if (accountIdField === 'createdByAccountId') {
      pathComment += '（数据创建者）';
    } else {
      pathComment += '（所属账号）';
    }

    return `${pathComment}
export async function canEdit${pascalName}(id: string, trx?: Transaction<DB>): Promise<boolean> {
  const db = trx || await getDB();
  const data = await db.selectFrom("${tableName}")
${joinChain}
    .where("${tableName}.${primaryKeyField}", "=", id)
    .select("${finalTable}.${accountIdField}")
    .executeTakeFirst();
  
  if (!data) return false;
  
  const currentAccountId = store.session.account?.id;
  const currentAccountType = store.session.account?.type;
  
  if (!currentAccountId) return false;
  
  // Admin 可以编辑任何内容
  if (currentAccountType === "Admin") return true;
  
  // 创建者/所有者可以编辑
  return data.${accountIdField} === currentAccountId;
}`;
  }

  /**
   * 生成 CRUD 方法
   */
  private generateCrudMethods(modelName: string): string {
    const tableName = NamingRules.ZodTypeName(modelName);
    const pascalName = TypeName(modelName, modelName);
    const camelName = NamingRules.VariableName(modelName);

    const methods: string[] = [];
    
    // 检查模型是否有主键
    const model = this.models.find(m => m.name === modelName);
    const hasPK = model ? this.hasPrimaryKey(model) : true;

    // selectById - 只有有主键的模型才生成
    if (hasPK) {
      methods.push(this.generateSelectById(modelName));
      // selectByIdWithRelations - 查询包含所有关系的完整数据
      methods.push(this.generateSelectByIdWithRelations(modelName));
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

    // canEdit - 只有有主键的模型才生成
    if (hasPK) {
      methods.push(this.generateCanEdit(modelName));
    }

    // 生成按外键查询的复数查询方法（例如：selectAllDrop_itemsByBelongToMobId）
    methods.push(this.generateSelectAllByForeignKeys(modelName));

    return `// 3. CRUD 方法\n${methods.join("\n\n")}`;
  }

  /**
   * 生成按外键过滤的复数查询方法
   * 对当前模型中所有拥有 relationFromFields 的关系（即本表持有外键）生成：
   * export async function selectAll{PluralModel}By{ForeignKeyPascal}(id: string, trx?: Transaction<DB>)
   */
  private generateSelectAllByForeignKeys(modelName: string): string {
    const model = this.allModels.find((m: DMMF.Model) => m.name === modelName);
    if (!model) return '';

    const tableName = NamingRules.ZodTypeName(modelName);
    const pascalName = TypeName(modelName, modelName);
    const pluralName = this.pluralize(pascalName);

    // 找到当前模型上“本表持有外键”的关系字段
    const ownForeignKeyRelations = model.fields.filter((field: DMMF.Field) =>
      field.kind === 'object' && Array.isArray(field.relationFromFields) && field.relationFromFields.length > 0
    );

    if (ownForeignKeyRelations.length === 0) return '';

    const methods: string[] = ownForeignKeyRelations.map((rel: DMMF.Field) => {
      const foreignKey = rel.relationFromFields![0];
      const methodName = `selectAll${pluralName}By${NamingRules.TypeName(foreignKey)}`;
      return `// 按外键查询：${tableName}.${foreignKey} → ${rel.type}.${this.getPrimaryKeyFieldFromModel(this.allModels.find(m => m.name === rel.type)!) }
export async function ${methodName}(${foreignKey}: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("${tableName}")
    .where("${tableName}.${foreignKey}", "=", ${foreignKey})
    .selectAll("${tableName}")
    .execute();
}`;
    });

    return methods.join("\n\n");
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
      const fileName = NamingRules.TableNameLowerCase(modelName); // 用于文件路径
      
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
      const camelName = NamingRules.VariableName(modelName);
      const pascalName = TypeName(modelName, modelName);
      const model = this.models.find(m => m.name === modelName);
      const hasPK = model ? this.hasPrimaryKey(model) : true;
      const tableName = model ? (model.dbName || model.name) : modelName; // 使用真实表名
      const fileName = NamingRules.TableNameLowerCase(modelName); // 用于文件路径

      if (hasPK) {
        // 有主键的模型：标准 CRUD 方法
        crudImports.push(
          `import { insert${pascalName}, update${pascalName}, delete${pascalName}, select${pascalName}ById, selectAll${this.pluralize(pascalName)}, canEdit${pascalName} } from "./${fileName}";`
        );

        crudExports[tableName] = {
          insert: `insert${pascalName}`,
          update: `update${pascalName}`,
          delete: `delete${pascalName}`,
          select: `select${pascalName}ById`,
          selectAll: `selectAll${this.pluralize(pascalName)}`,
          canEdit: `canEdit${pascalName}`
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
    console.log("生成 index.ts");
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
        const targetTable = NamingRules.ZodTypeName(field.type);
        const targetPrimaryKey = this.getPrimaryKeyFieldFromModel(this.allModels.find((m: DMMF.Model) => m.name === field.type) || model);
        
        let buildCode = '';
        let schemaCode = '';
        
        switch (relationType) {
          case 'ONE_TO_ONE':
            buildCode = this.generateOneToOneCode(field, model, targetTable, targetPrimaryKey);
            schemaCode = this.generateSchemaCode(field, model, targetTable);
            break;
          case 'MANY_TO_ONE':
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
    const relationType = this.helpers.getRelationType(field, model);
    
    switch (relationType) {
      case 'OneToOne':
        return 'ONE_TO_ONE';
      case 'OneToMany':
        return 'ONE_TO_MANY';
      case 'ManyToOne':
        return 'MANY_TO_ONE';
      case 'ManyToMany':
        return 'MANY_TO_MANY';
      default:
        return 'ONE_TO_ONE';
    }
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
    const primaryKey = this.helpers.getPrimaryKey(model.name);
    if (!primaryKey) {
      throw new Error(`Model ${model.name} has no primary key field`);
    }
    return primaryKey;
  }

  /**
   * 生成 Schema 代码
   * 使用 SchemaName 规范确保正确的 Schema 名称
   * 对于子关系（非父关系），使用 WithRelations 版本的 schema
   * 对于自引用关系，使用基础 schema 避免无限递归
   */
  private generateSchemaCode(field: DMMF.Field, model: DMMF.Model, targetTable: string): string {
    const isParentRelation = this.isBusinessParentRelation(field.name);
    const isSelfRelation = targetTable.toLowerCase() === model.name.toLowerCase();
    const isBreakPoint = this.shouldSkipSubRelation(model.name, field.name);
    
    // 对于子关系，使用 WithRelations schema（因为它们包含嵌套的子关系数据）
    // 对于父关系、自引用关系或配置的断点关系，使用基础 schema
    const baseSchemaName = SchemaName(targetTable);
    const schemaName = (isParentRelation || isSelfRelation || isBreakPoint) ? baseSchemaName : `${TypeName(targetTable, targetTable)}WithRelationsSchema`;
    
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
      return `(eb: ExpressionBuilder<DB, "${NamingRules.ZodTypeName(model.name)}">, id: Expression<string>) =>
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
        const targetCamelName = NamingRules.VariableName(targetTable);
        // 自引用关系或配置的断点关系不生成嵌套子关系调用，避免无限递归
        const shouldSkip = isSelfRelation || this.shouldSkipSubRelation(model.name, field.name);
        const subRelationCode = shouldSkip ? '' : `\n              .select((eb) => ${targetCamelName}SubRelations(eb, eb.val("${targetTable}.${targetPrimaryKey}")))`;
        return `(eb: ExpressionBuilder<DB, "${NamingRules.ZodTypeName(model.name)}">, id: Expression<string>) =>
          jsonObjectFrom(
            eb
              .selectFrom("${targetTable}")
              .where("${targetTable}.${targetPrimaryKey}", "=", id)
              .selectAll("${targetTable}")${subRelationCode}
          ).$notNull().as("${field.name}")`;
      } else {
        // 外键在目标表中，指向当前模型
        const reverseForeignKey = `${NamingRules.ZodTypeName(model.name)}Id`;
        const targetCamelName = NamingRules.VariableName(targetTable);
        // 自引用关系或配置的断点关系不生成嵌套子关系调用，避免无限递归
        const shouldSkip = isSelfRelation || this.shouldSkipSubRelation(model.name, field.name);
        const subRelationCode = shouldSkip ? '' : `\n              .select((eb) => ${targetCamelName}SubRelations(eb, eb.val("${targetTable}.${targetPrimaryKey}")))`;
        return `(eb: ExpressionBuilder<DB, "${NamingRules.ZodTypeName(model.name)}">, id: Expression<string>) =>
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
      return `(eb: ExpressionBuilder<DB, "${NamingRules.ZodTypeName(model.name)}">, id: Expression<string>) =>
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
      const targetCamelName = NamingRules.VariableName(targetTable);
      // 自引用关系或配置的断点关系不生成嵌套子关系调用，避免无限递归
      const shouldSkip = isSelfRelation || this.shouldSkipSubRelation(model.name, field.name);
      const subRelationCode = shouldSkip ? '' : `\n            .select((eb) => ${targetCamelName}SubRelations(eb, eb.val("${targetTable}.${targetPrimaryKey}")))`;
      return `(eb: ExpressionBuilder<DB, "${NamingRules.ZodTypeName(model.name)}">, id: Expression<string>) =>
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
    // 使用 helpers 获取中间表名
    const intermediateTable = this.helpers.getManyToManyTableName(field);
    if (!intermediateTable) {
      throw new Error(`Cannot determine intermediate table for many-to-many relation: ${field.relationName}`);
    }
    
    // 检查是否是自关系
    const isSelfRelation = targetTable.toLowerCase() === model.name.toLowerCase();
    
    // 只检查自引用关系
    const shouldSkipImport = isSelfRelation;
    
    // 获取当前模型的主键
    const currentModelPrimaryKey = this.getPrimaryKeyFieldFromModel(model);
    
    const targetCamelName = NamingRules.VariableName(targetTable);
    // 自引用关系或配置的断点关系不生成嵌套子关系调用，避免无限递归
    const shouldSkip = isSelfRelation || this.shouldSkipSubRelation(model.name, field.name);
    const subRelationCode = shouldSkip ? '' : `\n          .select((eb) => ${targetCamelName}SubRelations(eb, eb.val("${targetTable}.${targetPrimaryKey}")))`;
    
    return `(eb: ExpressionBuilder<DB, "${NamingRules.ZodTypeName(model.name)}">, id: Expression<string>) =>
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
   * 递归查找父表路径，直到找到包含 createdByAccountId 或 belongToAccountId 的表
   * @param modelName 模型名称
   * @param visited 已访问的表（防止循环）
   * @returns 父表路径和字段名，例如: { path: [{ foreignKey: 'itemId', parentTable: 'item' }], accountIdField: 'createdByAccountId' }
   */
  private findParentPathToAccountId(modelName: string, visited: Set<string> = new Set()): {path: Array<{foreignKey: string, parentTable: string}>, accountIdField: string} | null {
    // 防止循环引用
    if (visited.has(modelName)) {
      return null;
    }
    visited.add(modelName);

    const model = this.models.find(m => m.name === modelName);
    if (!model) {
      return null;
    }

    // 检查当前表是否有 createdByAccountId 或 belongToAccountId 字段
    const hasCreatedByAccountId = model.fields.some((field: any) => field.name === 'createdByAccountId');
    const hasBelongToAccountId = model.fields.some((field: any) => field.name === 'belongToAccountId');
    
    if (hasCreatedByAccountId) {
      // 当前表就有 createdByAccountId，返回空路径和字段名
      return { path: [], accountIdField: 'createdByAccountId' };
    }
    
    if (hasBelongToAccountId) {
      // 当前表就有 belongToAccountId，返回空路径和字段名
      return { path: [], accountIdField: 'belongToAccountId' };
    }

    // 查找父关系字段（belongTo/createdBy/updatedBy 开头的关系）
    const parentRelations = model.fields.filter((field: any) => 
      field.kind === 'object' && 
      this.isParentRelation(field.name)
    );

    for (const field of parentRelations) {
      const foreignKey = field.relationFromFields?.[0];
      if (!foreignKey) {
        continue;
      }

      // 递归查找父表
      const result = this.findParentPathToAccountId(field.type, new Set(visited));
      if (result !== null) {
        // 找到了路径，返回当前层级加上父级路径
        return {
          path: [{ foreignKey, parentTable: field.type }, ...result.path],
          accountIdField: result.accountIdField
        };
      }
    }

    return null; // 没有找到路径
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
    const tableName = NamingRules.ZodTypeName(modelName);
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
      const pascalFieldNames = fieldNames.map((f: any) => NamingRules.TypeName(f)).join('And');
      
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
      const pascalFieldNames = fieldNames.map((f: any) => NamingRules.TypeName(f.name)).join('And');
      
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
      return `export async function select${pascalName}By${NamingRules.TypeName(firstUniqueField.name)}(${firstUniqueField.name}: string, trx?: Transaction<DB>) {
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
    const tableName = NamingRules.ZodTypeName(modelName);
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
      const pascalFieldNames = fieldNames.map((f: any) => NamingRules.TypeName(f)).join('And');
      
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
      const pascalFieldNames = fieldNames.map((f: any) => NamingRules.TypeName(f.name)).join('And');
      
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
      return `export async function delete${pascalName}By${NamingRules.TypeName(firstUniqueField.name)}(${firstUniqueField.name}: string, trx?: Transaction<DB>) {
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
    const tableName = NamingRules.ZodTypeName(modelName);
    const pascalName = TypeName(modelName, modelName);
    const primaryKeyField = this.getPrimaryKeyField(modelName);

    return `export async function select${pascalName}ById(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db.selectFrom("${tableName}").where("${primaryKeyField}", "=", id).selectAll("${tableName}").executeTakeFirst();
}`;
  }

  /**
   * 生成 selectByIdWithRelations 方法
   * 查询包含所有子关系的完整数据
   */
  private generateSelectByIdWithRelations(modelName: string): string {
    const tableName = NamingRules.ZodTypeName(modelName);
    const pascalName = TypeName(modelName, modelName);
    const camelName = NamingRules.VariableName(modelName);
    const primaryKeyField = this.getPrimaryKeyField(modelName);

    return `export async function select${pascalName}ByIdWithRelations(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("${tableName}")
    .where("${primaryKeyField}", "=", id)
    .selectAll("${tableName}")
    .select((eb) => ${camelName}SubRelations(eb, eb.ref("${tableName}.${primaryKeyField}")))
    .executeTakeFirst();
}`;
  }

  /**
   * 生成 selectAll 方法
   */
  private generateSelectAll(modelName: string): string {
    const tableName = NamingRules.ZodTypeName(modelName);
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
    const tableName = NamingRules.ZodTypeName(modelName);
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
    const tableName = NamingRules.ZodTypeName(modelName);
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
    const tableName = NamingRules.ZodTypeName(modelName);
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
      const pascalFieldNames = fieldNames.map((f: any) => NamingRules.TypeName(f)).join('And');
      return `, delete${pascalName}By${pascalFieldNames}`;
    } else if (uniqueFields.length >= 2) {
      const pascalFieldNames = uniqueFields.map((f: any) => NamingRules.TypeName(f.name)).join('And');
      return `, delete${pascalName}By${pascalFieldNames}`;
    } else if (uniqueFields.length === 1) {
      const firstUniqueField = uniqueFields[0];
      return `, delete${pascalName}By${NamingRules.TypeName(firstUniqueField.name)}`;
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
      const pascalFieldNames = fieldNames.map((f: any) => NamingRules.TypeName(f)).join('And');
      return {
        deleteByUniqueFields: `delete${pascalName}By${pascalFieldNames}`
      };
    } else if (uniqueFields.length >= 2) {
      const pascalFieldNames = uniqueFields.map((f: any) => NamingRules.TypeName(f.name)).join('And');
      return {
        deleteByUniqueFields: `delete${pascalName}By${pascalFieldNames}`
      };
    } else if (uniqueFields.length === 1) {
      const firstUniqueField = uniqueFields[0];
      return {
        deleteByUniqueField: `delete${pascalName}By${NamingRules.TypeName(firstUniqueField.name)}`
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
        methodLines.push(`    canEdit: ${crudMethods.canEdit || 'null'}`);
        
        // 添加特殊方法
        Object.keys(crudMethods).forEach(key => {
          if (!['insert', 'update', 'delete', 'select', 'selectAll', 'canEdit'].includes(key)) {
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
    selectAll: null,
    canEdit: null
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