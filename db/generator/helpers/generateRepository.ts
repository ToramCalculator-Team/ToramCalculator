/**
 * @file generateRepository.ts
 * @description Repository 生成器
 * 从 Prisma DMMF 生成 Repository 文件
 */

import fs from "node:fs";
import path from "node:path";
import type { DMMF } from "@prisma/generator-helper";
import { RELATION_BREAK_POINTS } from "../relationConfig";
import { NamingRules } from "../utils/namingRules";
import { writeFileSafely } from "../utils/writeFileSafely";
import { DMMFHelpers } from "./dmmfHelpers";

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
					documentation: "",
				})),
				uniqueIndexes: model.uniqueIndexes || [],
				uniqueFields: model.uniqueFields || [],
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
		this.removeStaleRepositories(generatedFiles);

		// 统一打印所有检测到的循环（去重后）
		this.printAllCycles();

		console.log(`Repository 生成完成！共生成 ${generatedFiles.length} 个文件`);
	}

	/**
	 * Repository 目录完全由生成器拥有；Prisma 模型被删除后，对应旧文件也必须同步删除。
	 * 否则旧文件仍会参与 TypeScript 检查，并引用已经不存在的表和类型。
	 */
	private removeStaleRepositories(generatedFiles: string[]): void {
		const repositoriesDir = path.join("db", "generated", "repositories");
		const expectedFiles = new Set(["index.ts", ...generatedFiles.map((name) => NamingRules.FileName(name))]);

		for (const fileName of fs.readdirSync(repositoriesDir)) {
			if (!fileName.endsWith(".ts") || expectedFiles.has(fileName)) continue;
			fs.unlinkSync(path.join(repositoriesDir, fileName));
			console.log(`删除陈旧 Repository 文件: ${fileName}`);
		}
	}

	/**
	 * 生成单个 repository 文件
	 */
	private async generateRepository(modelName: string): Promise<void> {
		const code = await this.generateRepositoryCode(modelName);
		// 使用 FileName 规范生成文件名
		const fileName = NamingRules.FileName(modelName);
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
		// 计算相对路径
		const relativePaths = this.calculateRelativePaths();

		// 使用 ZodTypeName 规范（从 zod 导入的 snake_case 类型）
		const typeName = NamingRules.ZodTypeName(modelName);

		const imports: string[] = [
			`import { type Expression, type ExpressionBuilder, type Kysely, type Transaction, type Selectable, type Insertable, type Updateable } from "kysely";`,
			`import { getDB } from "${relativePaths.database}";`,
			`import { type DB, type ${typeName} } from "${relativePaths.zod}";`,
		];

		// 添加 kysely helpers
		imports.push(`import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";`);

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
			subRelationFactory: path
				.relative(outputDir, path.join(repositoriesDir, "subRelationFactory"))
				.replace(/\\/g, "/"),
		};
	}

	/**
	 * 判断是否是父级关系
	 */
	private isParentRelation(fieldName: string): boolean {
		return (
			fieldName.startsWith("belongTo") ||
			fieldName.startsWith("usedBy") ||
			fieldName === "createdBy" ||
			fieldName === "updatedBy"
		);
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
			const sourceModelObj = this.allModels.find((m) => m.name.toLowerCase() === sourceModel.toLowerCase());
			if (!sourceModelObj) continue;

			const relationField = sourceModelObj.fields.find(
				(field) =>
					field.kind === "object" &&
					field.type.toLowerCase() === targetModel.toLowerCase() &&
					!this.isBusinessParentRelation(field.name),
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

		for (const [, cycles] of this.allDetectedCycles.entries()) {
			for (const cycle of cycles) {
				// 使用排序后的节点集合作为唯一键
				const cycleKey = cycle
					.map((n: string) => n.toLowerCase())
					.sort()
					.join("->");
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
			const model = this.allModels.find((m) => m.name.toLowerCase() === currentModel.toLowerCase());
			if (!model) {
				return;
			}

			const actualModelName = model.name;
			const actualModelNameLower = actualModelName.toLowerCase();

			// 检查是否形成循环（当前模型已在路径中）
			if (visitedInCurrentPath.has(actualModelNameLower)) {
				// 找到循环：从路径中找到循环开始的索引
				const cycleStartIndex = path.findIndex((name) => name.toLowerCase() === actualModelNameLower);
				if (cycleStartIndex !== -1) {
					// 构建循环路径：从循环开始到当前路径的末尾
					// 不添加当前节点，因为当前节点就是循环开始的节点
					const cycle = path.slice(cycleStartIndex);
					// 确保循环至少包含2个节点
					if (cycle.length >= 2) {
						// 去重：检查是否已经有相同的循环（顺序可能不同）
						const cycleKey = cycle
							.map((n) => n.toLowerCase())
							.sort()
							.join("->");
						const isDuplicate = cycles.some((c) => {
							const cKey = c
								.map((n) => n.toLowerCase())
								.sort()
								.join("->");
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
				.filter((field) => {
					if (field.kind !== "object") return false;
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
				.map((field) => {
					// 确保返回的模型名称与 allModels 中的名称匹配
					const targetModel = this.allModels.find((m) => m.name.toLowerCase() === field.type.toLowerCase());
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
		const pascalName = NamingRules.TypeName(modelName, modelName);
		const model = this.allModels.find((candidate) => (candidate.dbName || candidate.name) === modelName);
		const managedTimestampFields = model?.fields
			.filter(
				(field) =>
					field.kind === "scalar" && field.type === "DateTime" && ["createdAt", "updatedAt"].includes(field.name),
			)
			.map((field) => `"${field.name}"`);
		const insertType = managedTimestampFields?.length
			? `Omit<Insertable<${tableName}>, ${managedTimestampFields.join(" | ")}>`
			: `Insertable<${tableName}>`;
		const updateType = managedTimestampFields?.length
			? `Omit<Updateable<${tableName}>, ${managedTimestampFields.join(" | ")}>`
			: `Updateable<${tableName}>`;

		return `// 1. 类型定义
export type ${pascalName} = Selectable<${tableName}>;
export type ${pascalName}Insert = ${insertType};
export type ${pascalName}Update = ${updateType};
export type ${pascalName}QueryDB = Kysely<DB> | Transaction<DB>;
export type ${pascalName}RelationQuery = { execute: () => Promise<unknown[]> };
export type ${pascalName}RelationQueryMap = Partial<{ [K in keyof DB]: ${pascalName}RelationQuery[] }>;`;
	}

	/**
	 * 生成关系定义
	 */
	private generateRelations(modelName: string): string {
		const tableName = NamingRules.ZodTypeName(modelName);
		const schemaName = NamingRules.SchemaName(tableName); // 使用 SchemaName 规范
		const pascalName = NamingRules.TypeName(modelName, modelName);
		const camelName = NamingRules.VariableName(modelName);

		const generatedRelations = this.generateAllRelations(modelName);

		// 检测循环引用并发出警告
		// 注意：使用实际的模型名称（从 allModels 中查找），而不是传入的 modelName（可能是 dbName）
		const actualModel = this.allModels.find(
			(m) =>
				m.name.toLowerCase() === modelName.toLowerCase() ||
				(m.dbName && m.dbName.toLowerCase() === modelName.toLowerCase()),
		);
		const actualModelName = actualModel?.name || modelName;
		this.detectAndWarnCycles(actualModelName);

		// 过滤掉父级关系，只保留子级关系用于 SubRelationDefs
		const childRelations = generatedRelations.filter((rel) => !this.isBusinessParentRelation(rel.name));

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
		const schemas = new Set<string>([NamingRules.SchemaName(tableName)]);

		// 添加关系的 schema（仅基础 schema，WithRelations 版本从 repository 导入）
		const relations = this.getModelRelations(modelName);
		for (const relation of relations) {
			// 只添加有效的关系 schema，跳过枚举类型
			if (relation.targetTable && !relation.targetTable.includes("//")) {
				// 使用 SchemaName 规范确保一致性
				const targetSchema = NamingRules.SchemaName(relation.targetTable);
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
		const childRelations = relations.filter((rel) => !this.isBusinessParentRelation(rel.name));

		for (const relation of childRelations) {
			if (this.shouldSkipSubRelation(modelName, relation.name)) {
				continue;
			}
			if (relation.targetTable && !relation.targetTable.includes("//")) {
				const targetTable = relation.targetTable;
				const targetCamelName = NamingRules.VariableName(targetTable);
				const targetPascalName = NamingRules.TypeName(targetTable, targetTable);
				const targetFileName = NamingRules.TableNameLowerCase(targetTable);

				// 检查是否是自引用（避免导入自己）
				if (targetTable.toLowerCase() !== modelName.toLowerCase()) {
					// 同时导入 SubRelations 函数和 WithRelationsSchema
					imports.push(
						`import { ${targetCamelName}SubRelations, ${targetPascalName}WithRelationsSchema } from "./${targetFileName}";`,
					);
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
		const pascalName = NamingRules.TypeName(modelName, modelName);
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
			if (accountIdField === "createdByAccountId") {
				pathComment += "（数据创建者）";
			} else {
				pathComment += "（所属账号）";
			}

			return `${pathComment}
export async function canEdit${pascalName}(id: string, trx?: Transaction<DB>): Promise<boolean> {
  const db = trx || await getDB();
  const data = await db.selectFrom("${tableName}")
    .where("${primaryKeyField}", "=", id)
    .select("${accountIdField}")
    .executeTakeFirst();
  
  if (!data) return false;
  
  const currentAccountId = store.session.account.id;
  const currentAccountType = store.session.account.type;
  
  if (!currentAccountId) return false;
  
  // Admin 可以编辑任何内容
  if (currentAccountType === "Admin") return true;
  
  // 创建者/所有者可以编辑
  return data.${accountIdField} === currentAccountId;
}`;
		}

		// 需要 JOIN 父表的情况
		// 构建 JOIN 链
		let joinChain = "";
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
		if (accountIdField === "createdByAccountId") {
			pathComment += "（数据创建者）";
		} else {
			pathComment += "（所属账号）";
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
  
  const currentAccountId = store.session.account.id;
  const currentAccountType = store.session.account.type;
  
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
		const methods: string[] = [];

		// 检查模型是否有主键
		const model = this.models.find((m) => m.name === modelName);
		const hasPK = model ? this.hasPrimaryKey(model) : true;

		if (hasPK) {
			methods.push(this.generateStandardCrudQueries(modelName));
			methods.push(this.generateRelationQueryMethods(modelName));
		} else {
			methods.push(this.generateNoPrimaryKeyCrudQueries(modelName));
			methods.push(this.generateFindByUniqueConstraint(modelName));
			methods.push(this.generateDeleteByUniqueConstraint(modelName));
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
	 * 设计思路：按关系过滤的列表查询也需要同时支持 live 订阅和旧执行入口，因此生成 query builder 与薄包装两层。
	 * 函数职责：为本表持有外键和隐式多对多关系生成 selectAll...By...Query 及兼容执行函数。
	 */
	private generateSelectAllByForeignKeys(modelName: string): string {
		const model = this.allModels.find((m: DMMF.Model) => m.name === modelName);
		if (!model) return "";

		const tableName = NamingRules.ZodTypeName(modelName);
		const pascalName = NamingRules.TypeName(modelName, modelName);
		const pluralName = this.pluralize(pascalName);
		const currentPrimaryKey = this.getPrimaryKeyFieldFromModel(model);

		const ownForeignKeyRelations = model.fields.filter(
			(field: DMMF.Field) =>
				field.kind === "object" && Array.isArray(field.relationFromFields) && field.relationFromFields.length > 0,
		);
		const manyToManyRelations = model.fields.filter(
			(field: DMMF.Field) =>
				field.kind === "object" && field.isList && this.determineRelationType(field, model) === "MANY_TO_MANY",
		);
		const manyToManyTargetTypeCounts = manyToManyRelations.reduce(
			(acc, rel) => acc.set(rel.type, (acc.get(rel.type) || 0) + 1),
			new Map<string, number>(),
		);

		if (ownForeignKeyRelations.length === 0 && manyToManyRelations.length === 0) return "";

		const methods: string[] = [];

		methods.push(
			...ownForeignKeyRelations.map((rel: DMMF.Field) => {
				const foreignKey = rel.relationFromFields?.[0];
				if (!foreignKey) throw new Error(`Cannot determine foreign key for relation ${rel.name} in model ${modelName}`);
				const methodName = `selectAll${pluralName}By${NamingRules.TypeName(foreignKey)}`;
				return `/**
 * 设计思路：外键过滤列表是关系区和表单联动的复用查询，先暴露 builder 以便调用边界自行决定执行方式。
 * 函数职责：构造按 ${tableName}.${foreignKey} 查询 ${tableName} 列表的 SQL。
 */
export function ${methodName}Query(db: ${pascalName}QueryDB, ${foreignKey}: string) {
  return db.selectFrom("${tableName}").where("${tableName}.${foreignKey}", "=", ${foreignKey}).selectAll("${tableName}");
}

/**
 * 设计思路：兼容旧的按外键查询执行函数，避免迁移期间调用点同时重写。
 * 函数职责：执行 ${methodName}Query 并返回所有行。
 */
export async function ${methodName}(${foreignKey}: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await ${methodName}Query(db, ${foreignKey}).execute();
}`;
			}),
		);

		methods.push(
			...manyToManyRelations.map((rel: DMMF.Field) => {
				const intermediateTable = this.helpers.getManyToManyTableName(rel);
				if (!intermediateTable)
					throw new Error(`Cannot determine intermediate table for many-to-many relation: ${rel.relationName}`);
				const targetModel = this.allModels.find((m: DMMF.Model) => m.name === rel.type);
				if (!targetModel) throw new Error(`Target model ${rel.type} not found`);
				const targetPrimaryKey = this.getPrimaryKeyFieldFromModel(targetModel);
				const { selfJoinColumn, targetJoinColumn } = this.getManyToManyJoinColumns(rel, model);
				const shouldDisambiguate = (manyToManyTargetTypeCounts.get(rel.type) || 0) > 1;
				const targetParamName = shouldDisambiguate
					? `${NamingRules.VariableName(rel.name)}${NamingRules.TypeName(rel.type)}Id`
					: `${NamingRules.VariableName(rel.type)}Id`;
				const methodName = shouldDisambiguate
					? `selectAll${pluralName}By${NamingRules.TypeName(rel.name)}${NamingRules.TypeName(rel.type)}Id`
					: `selectAll${pluralName}By${NamingRules.TypeName(rel.type)}Id`;

				return `/**
 * 设计思路：多对多过滤查询需要保留中间表方向规则，builder 化后可供列表、卡片和 live 订阅复用。
 * 函数职责：构造通过 ${intermediateTable} 按 ${rel.type}.${targetPrimaryKey} 查询 ${tableName} 列表的 SQL。
 */
export function ${methodName}Query(db: ${pascalName}QueryDB, ${targetParamName}: string) {
  return db
    .selectFrom("${intermediateTable}")
    .innerJoin("${tableName}", "${intermediateTable}.${selfJoinColumn}", "${tableName}.${currentPrimaryKey}")
    .where("${intermediateTable}.${targetJoinColumn}", "=", ${targetParamName})
    .selectAll("${tableName}");
}

/**
 * 设计思路：兼容旧的多对多过滤执行函数，把执行动作收敛到薄包装中。
 * 函数职责：执行 ${methodName}Query 并返回所有行。
 */
export async function ${methodName}(${targetParamName}: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await ${methodName}Query(db, ${targetParamName}).execute();
}`;
			}),
		);

		return methods.join("\n\n");
	}

	/**
	 * 设计思路：index 是 repository 的公开契约聚合点，需要同时导出旧执行包装和新的 query builder 集合。
	 * 函数职责：生成 repositories/index.ts，包含 repositoryMethods、repositoryQueries 与类型映射。
	 */
	private async generateIndex(generatedFiles: string[]): Promise<void> {
		const crudImports: string[] = [];
		const typeImports: string[] = [];
		const crudExports: Record<string, any> = {};
		const queryExports: Record<string, any> = {};
		const relativePaths = this.calculateRelativePaths();

		for (const model of this.models) {
			const modelName = model.name;
			const pascalName = NamingRules.TypeName(modelName, modelName);
			const hasPK = this.hasPrimaryKey(model);
			const fileName = NamingRules.TableNameLowerCase(modelName);

			if (this.shouldSkipModel(modelName)) {
				typeImports.push(`import { ${pascalName} } from "${relativePaths.zod}";`);
			} else if (hasPK) {
				typeImports.push(`import { type ${pascalName} } from "./${fileName}";`);
			}
		}

		const intermediateTables = this.getIntermediateTables();
		for (const tableName of intermediateTables) {
			const pascalName = NamingRules.TypeName(tableName, tableName);
			typeImports.push(`import { type ${pascalName} } from "${relativePaths.zod}";`);
		}

		for (const modelName of generatedFiles) {
			const pascalName = NamingRules.TypeName(modelName, modelName);
			const model = this.models.find((m) => m.name === modelName);
			const hasPK = model ? this.hasPrimaryKey(model) : true;
			const tableName = model ? model.dbName || model.name : modelName;
			const fileName = NamingRules.TableNameLowerCase(modelName);
			const pluralName = this.pluralize(pascalName);

			if (hasPK) {
				crudImports.push(
					`import { insert${pascalName}, insert${pascalName}Query, update${pascalName}, update${pascalName}Query, delete${pascalName}, delete${pascalName}Query, select${pascalName}ById, select${pascalName}ByIdQuery, selectAll${pluralName}, selectAll${pluralName}Query, get${pascalName}ParentsByIdQuery, get${pascalName}ChildrenByIdQuery, canEdit${pascalName} } from "./${fileName}";`,
				);
				crudExports[tableName] = {
					insert: `insert${pascalName}`,
					update: `update${pascalName}`,
					delete: `delete${pascalName}`,
					select: `select${pascalName}ById`,
					selectAll: `selectAll${pluralName}`,
					canEdit: `canEdit${pascalName}`,
				};
				queryExports[tableName] = {
					get: `select${pascalName}ByIdQuery`,
					getAll: `selectAll${pluralName}Query`,
					insert: `insert${pascalName}Query`,
					update: `update${pascalName}Query`,
					delete: `delete${pascalName}Query`,
					getParentsById: `get${pascalName}ParentsByIdQuery`,
					getChildrenById: `get${pascalName}ChildrenByIdQuery`,
				};
			} else {
				const specialMethods = this.getSpecialMethodsForNoPKModel(modelName);
				crudImports.push(
					`import { insert${pascalName}, insert${pascalName}Query, selectAll${pluralName}, selectAll${pluralName}Query${specialMethods} } from "./${fileName}";`,
				);
				const specialExports = this.getSpecialExportsForNoPKModel(modelName);
				crudExports[tableName] = {
					insert: `insert${pascalName}`,
					selectAll: `selectAll${pluralName}`,
					...specialExports,
				};
				queryExports[tableName] = {
					get: null,
					getAll: `selectAll${pluralName}Query`,
					insert: `insert${pascalName}Query`,
					update: null,
					delete: null,
					getParentsById: null,
					getChildrenById: null,
				};
			}
		}

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

export const repositoryQueries = {
${this.generateQueryExports(queryExports)}
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
			.filter((field: DMMF.Field) => field.kind === "object")
			.map((field: DMMF.Field) => {
				const relationType = this.determineRelationType(field, model);
				const targetTable = NamingRules.ZodTypeName(field.type);
				const targetPrimaryKey = this.getPrimaryKeyFieldFromModel(
					this.allModels.find((m: DMMF.Model) => m.name === field.type) || model,
				);

				let buildCode = "";
				let schemaCode = "";

				switch (relationType) {
					case "ONE_TO_ONE":
						buildCode = this.generateOneToOneCode(field, model, targetTable, targetPrimaryKey);
						schemaCode = this.generateSchemaCode(field, model, targetTable);
						break;
					case "MANY_TO_ONE":
						buildCode = this.generateOneToOneCode(field, model, targetTable, targetPrimaryKey);
						schemaCode = this.generateSchemaCode(field, model, targetTable);
						break;
					case "ONE_TO_MANY":
						buildCode = this.generateOneToManyCode(field, model, targetTable, targetPrimaryKey);
						schemaCode = this.generateSchemaCode(field, model, targetTable);
						break;
					case "MANY_TO_MANY":
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
					schemaCode: schemaCode,
				};
			});
	}

	/**
	 * 判断关系类型
	 */
	private determineRelationType(field: DMMF.Field, model: DMMF.Model): string {
		const relationType = this.helpers.getRelationType(field, model);

		switch (relationType) {
			case "OneToOne":
				return "ONE_TO_ONE";
			case "OneToMany":
				return "ONE_TO_MANY";
			case "ManyToOne":
				return "MANY_TO_ONE";
			case "ManyToMany":
				return "MANY_TO_MANY";
			default:
				return "ONE_TO_ONE";
		}
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
		const isOptional = this.isRelationOptional(field, model);

		// 对于子关系，使用 WithRelations schema（因为它们包含嵌套的子关系数据）
		// 对于父关系、自引用关系或配置的断点关系，使用基础 schema
		const baseSchemaName = NamingRules.SchemaName(targetTable);
		const schemaName =
			isParentRelation || isSelfRelation || isBreakPoint
				? baseSchemaName
				: `${NamingRules.TypeName(targetTable, targetTable)}WithRelationsSchema`;

		let result = field.isList ? `z.array(${schemaName})` : schemaName;

		// 如果关系可选，使用 nullable() 包装
		if (!field.isList && isOptional) {
			result = `z.nullable(${result})`;
		}

		return result;
	}

	/**
	 * 生成一对一关系代码
	 */
	private generateOneToOneCode(
		field: DMMF.Field,
		model: DMMF.Model,
		targetTable: string,
		targetPrimaryKey: string,
	): string {
		const isParentRelation = this.isBusinessParentRelation(field.name);

		// 检查是否是自关系
		const isSelfRelation = targetTable.toLowerCase() === model.name.toLowerCase();

		// 只检查自引用关系

		// 获取当前模型的主键

		if (isParentRelation) {
			// 父关系：外键在当前模型中，指向目标模型
			const isOptional = this.isRelationOptional(field, model);
			const nullHandler = isOptional ? "" : ".$notNull()";
			return `(eb: ExpressionBuilder<DB, "${NamingRules.ZodTypeName(model.name)}">, id: Expression<string>) =>
        jsonObjectFrom(
          eb
            .selectFrom("${targetTable}")
            .where("${targetTable}.${targetPrimaryKey}", "=", id)
            .selectAll("${targetTable}")
        )${nullHandler}.as("${field.name}")`;
		} else {
			// 子关系：检查是否有 relationFromFields
			if (field.relationFromFields && field.relationFromFields.length > 0) {
				// 外键在当前模型中，指向目标模型
				// 使用 whereRef 引用当前查询上下文中的外键字段，而不是使用 id 参数
				const foreignKey = field.relationFromFields[0];
				const currentTableName = NamingRules.ZodTypeName(model.name);
				const targetCamelName = NamingRules.VariableName(targetTable);
				const isOptional = this.isRelationOptional(field, model);
				const nullHandler = isOptional ? "" : ".$notNull()";
				// 自引用关系或配置的断点关系不生成嵌套子关系调用，避免无限递归
				const shouldSkip = isSelfRelation || this.shouldSkipSubRelation(model.name, field.name);
				const subRelationCode = shouldSkip
					? ""
					: `\n              .select((eb) => ${targetCamelName}SubRelations(eb, eb.ref("${targetTable}.${targetPrimaryKey}")))`;
				return `(eb: ExpressionBuilder<DB, "${currentTableName}">, id: Expression<string>) =>
          jsonObjectFrom(
            eb
              .selectFrom("${targetTable}")
              .whereRef("${targetTable}.${targetPrimaryKey}", "=", "${currentTableName}.${foreignKey}")
              .selectAll("${targetTable}")${subRelationCode}
          )${nullHandler}.as("${field.name}")`;
			} else {
				// 外键在目标表中，指向当前模型
				const targetModel = this.models.find((m) => m.name.toLowerCase() === targetTable.toLowerCase());
				const reverseField = targetModel?.fields.find(
					(f: any) =>
						f.kind === "object" &&
						f.type === model.name &&
						f.relationName === field.relationName &&
						f.relationFromFields &&
						f.relationFromFields.length > 0,
				);
				if (!reverseField || !reverseField.relationFromFields || reverseField.relationFromFields.length === 0) {
					throw new Error(`Cannot find reverse relation field from ${targetTable} to ${model.name}`);
				}
				// 设计说明：一对一子关系的外键常位于目标表，字段名不一定是 <source>Id。
				// 这里按 relationName 定位反向字段，保证 activeOwnerId/passiveOwnerId 这类语义化外键能生成正确查询。
				const reverseForeignKey = reverseField.relationFromFields[0];
				const targetCamelName = NamingRules.VariableName(targetTable);
				const isOptional = this.isRelationOptional(field, model);
				const nullHandler = isOptional ? "" : ".$notNull()";
				// 自引用关系或配置的断点关系不生成嵌套子关系调用，避免无限递归
				const shouldSkip = isSelfRelation || this.shouldSkipSubRelation(model.name, field.name);
				const subRelationCode = shouldSkip
					? ""
					: `\n              .select((eb) => ${targetCamelName}SubRelations(eb, eb.ref("${targetTable}.${targetPrimaryKey}")))`;
				return `(eb: ExpressionBuilder<DB, "${NamingRules.ZodTypeName(model.name)}">, id: Expression<string>) =>
          jsonObjectFrom(
            eb
              .selectFrom("${targetTable}")
              .where("${targetTable}.${reverseForeignKey}", "=", id)
              .selectAll("${targetTable}")${subRelationCode}
          )${nullHandler}.as("${field.name}")`;
			}
		}
	}

	/**
	 * 生成一对多关系代码
	 */
	private generateOneToManyCode(
		field: DMMF.Field,
		model: DMMF.Model,
		targetTable: string,
		targetPrimaryKey: string,
	): string {
		const isParentRelation = this.isBusinessParentRelation(field.name);

		// 检查是否是自关系
		const isSelfRelation = targetTable.toLowerCase() === model.name.toLowerCase();

		// 只检查自引用关系

		// 获取当前模型的主键
		const currentModelPrimaryKey = this.getPrimaryKeyFieldFromModel(model);

		if (isParentRelation) {
			// 父关系：外键在目标表中，指向当前模型
			// 从目标模型中查找指向当前模型的关系字段
			const targetModel = this.models.find((m) => m.name.toLowerCase() === targetTable.toLowerCase());
			if (!targetModel) {
				throw new Error(`Target model ${targetTable} not found`);
			}

			const reverseField = targetModel.fields.find(
				(f: any) =>
					f.kind === "object" &&
					f.type === model.name &&
					f.relationName === field.relationName &&
					f.relationFromFields &&
					f.relationFromFields.length > 0,
			);

			if (!reverseField || !reverseField.relationFromFields || reverseField.relationFromFields.length === 0) {
				throw new Error(`Cannot find reverse relation field from ${targetTable} to ${model.name}`);
			}

			const reverseForeignKey = reverseField.relationFromFields[0];
			const currentTableName = NamingRules.ZodTypeName(model.name);
			return `(eb: ExpressionBuilder<DB, "${currentTableName}">, id: Expression<string>) =>
        jsonArrayFrom(
          eb
            .selectFrom("${targetTable}")
            .whereRef("${targetTable}.${reverseForeignKey}", "=", "${currentTableName}.${currentModelPrimaryKey}")
            .selectAll("${targetTable}")
        ).as("${field.name}")`;
		} else {
			// 子关系：外键在目标表中，指向当前模型
			// 从目标模型中查找指向当前模型的关系字段
			const targetModel = this.models.find((m) => m.name.toLowerCase() === targetTable.toLowerCase());
			if (!targetModel) {
				throw new Error(`Target model ${targetTable} not found`);
			}

			const reverseField = targetModel.fields.find(
				(f: any) =>
					f.kind === "object" &&
					f.type === model.name &&
					f.relationName === field.relationName &&
					f.relationFromFields &&
					f.relationFromFields.length > 0,
			);

			if (!reverseField || !reverseField.relationFromFields || reverseField.relationFromFields.length === 0) {
				throw new Error(`Cannot find reverse relation field from ${targetTable} to ${model.name}`);
			}

			const reverseForeignKey = reverseField.relationFromFields[0];
			const currentTableName = NamingRules.ZodTypeName(model.name);
			const targetCamelName = NamingRules.VariableName(targetTable);
			// 自引用关系或配置的断点关系不生成嵌套子关系调用，避免无限递归
			const shouldSkip = isSelfRelation || this.shouldSkipSubRelation(model.name, field.name);
			const subRelationCode = shouldSkip
				? ""
				: `\n            .select((eb) => ${targetCamelName}SubRelations(eb, eb.ref("${targetTable}.${targetPrimaryKey}")))`;
			return `(eb: ExpressionBuilder<DB, "${currentTableName}">, id: Expression<string>) =>
        jsonArrayFrom(
          eb
            .selectFrom("${targetTable}")
            .whereRef("${targetTable}.${reverseForeignKey}", "=", "${currentTableName}.${currentModelPrimaryKey}")
            .selectAll("${targetTable}")${subRelationCode}
        ).as("${field.name}")`;
		}
	}

	/**
	 * 生成多对多关系代码
	 */
	private generateManyToManyCode(
		field: DMMF.Field,
		model: DMMF.Model,
		targetTable: string,
		targetPrimaryKey: string,
	): string {
		// 使用 helpers 获取中间表名
		const intermediateTable = this.helpers.getManyToManyTableName(field);
		if (!intermediateTable) {
			throw new Error(`Cannot determine intermediate table for many-to-many relation: ${field.relationName}`);
		}

		// 检查是否是自关系
		const isSelfRelation = targetTable.toLowerCase() === model.name.toLowerCase();

		// 只检查自引用关系

		// 获取当前模型的主键
		const currentModelPrimaryKey = this.getPrimaryKeyFieldFromModel(model);
		const { selfJoinColumn, targetJoinColumn } = this.getManyToManyJoinColumns(field, model);

		const currentTableName = NamingRules.ZodTypeName(model.name);
		const targetCamelName = NamingRules.VariableName(targetTable);
		// 自引用关系或配置的断点关系不生成嵌套子关系调用，避免无限递归
		const shouldSkip = isSelfRelation || this.shouldSkipSubRelation(model.name, field.name);
		const subRelationCode = shouldSkip
			? ""
			: `\n          .select((eb) => ${targetCamelName}SubRelations(eb, eb.ref("${targetTable}.${targetPrimaryKey}")))`;

		return `(eb: ExpressionBuilder<DB, "${currentTableName}">, id: Expression<string>) =>
      jsonArrayFrom(
        eb
          .selectFrom("${intermediateTable}")
          .innerJoin("${targetTable}", "${intermediateTable}.${targetJoinColumn}", "${targetTable}.${targetPrimaryKey}")
          .whereRef("${intermediateTable}.${selfJoinColumn}", "=", "${currentTableName}.${currentModelPrimaryKey}")
          .selectAll("${targetTable}")${subRelationCode}
      ).as("${field.name}")`;
	}

	/**
	 * 获取隐式多对多中间表中当前字段对应的 join 列。
	 * 非自关联时，generateImplicitManyToManyModels 会按模型名排序后固定映射为 A/B。
	 * 自关联时，同一 relation 的两个字段类型相同，排序结果依赖原字段顺序；这里复用该顺序来判断方向。
	 */
	private getManyToManyJoinColumns(
		field: DMMF.Field,
		model: DMMF.Model,
	): { selfJoinColumn: "A" | "B"; targetJoinColumn: "A" | "B" } {
		const currentModelName = model.name;
		const targetModelName = field.type;

		if (currentModelName === targetModelName) {
			const selfRelationFields = model.fields.filter(
				(candidate: DMMF.Field) =>
					candidate.kind === "object" && candidate.type === model.name && candidate.relationName === field.relationName,
			);
			const firstField = selfRelationFields[0];

			if (firstField?.name === field.name) {
				return { selfJoinColumn: "A", targetJoinColumn: "B" };
			}

			return { selfJoinColumn: "B", targetJoinColumn: "A" };
		}

		if (currentModelName.localeCompare(targetModelName) <= 0) {
			return { selfJoinColumn: "A", targetJoinColumn: "B" };
		}

		return { selfJoinColumn: "B", targetJoinColumn: "A" };
	}

	/**
	 * 检查关系是否可选（nullable）
	 * 如果外键字段存在且为可选，则关系是可选的
	 */
	private isRelationOptional(field: DMMF.Field, model: DMMF.Model): boolean {
		// 如果关系字段本身标记为可选（isRequired === false），则关系可选
		if (!field.isRequired) {
			return true;
		}

		// 检查外键字段是否可选
		if (field.relationFromFields && field.relationFromFields.length > 0) {
			const foreignKeyFieldName = field.relationFromFields[0];
			const foreignKeyField = model.fields.find((f) => f.name === foreignKeyFieldName);
			if (foreignKeyField && !foreignKeyField.isRequired) {
				return true;
			}
		}

		return false;
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
		const targetModel = this.models.find((m) => m.name.toLowerCase() === targetTable.toLowerCase());
		if (targetModel) {
			// 查找目标模型中指向当前模型的关系字段
			const reverseField = targetModel.fields.find(
				(f: any) =>
					f.kind === "object" && f.type === model.name && f.relationFromFields && f.relationFromFields.length > 0,
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
	private findParentPathToAccountId(
		modelName: string,
		visited: Set<string> = new Set(),
	): { path: Array<{ foreignKey: string; parentTable: string }>; accountIdField: string } | null {
		// 防止循环引用
		if (visited.has(modelName)) {
			return null;
		}
		visited.add(modelName);

		const model = this.models.find((m) => m.name === modelName);
		if (!model) {
			return null;
		}

		// 检查当前表是否有 createdByAccountId 或 belongToAccountId 字段
		const hasCreatedByAccountId = model.fields.some((field: any) => field.name === "createdByAccountId");
		const hasBelongToAccountId = model.fields.some((field: any) => field.name === "belongToAccountId");

		if (hasCreatedByAccountId) {
			// 当前表就有 createdByAccountId，返回空路径和字段名
			return { path: [], accountIdField: "createdByAccountId" };
		}

		if (hasBelongToAccountId) {
			// 当前表就有 belongToAccountId，返回空路径和字段名
			return { path: [], accountIdField: "belongToAccountId" };
		}

		// 查找父关系字段（belongTo/createdBy/updatedBy 开头的关系）
		const parentRelations = model.fields.filter(
			(field: any) => field.kind === "object" && this.isParentRelation(field.name),
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
					accountIdField: result.accountIdField,
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
		return modelName.startsWith("_") || modelName === "changes";
	}

	/**
	 * 复数化
	 */
	private pluralize(str: string): string {
		// 简单的复数化规则
		if (str.endsWith("y")) {
			return `${str.slice(0, -1)}ies`;
		} else if (str.endsWith("s") || str.endsWith("sh") || str.endsWith("ch")) {
			return `${str}es`;
		} else {
			return `${str}s`;
		}
	}

	/**
	 * 设计思路：主键字段是按 id 查询、更新、删除和关联查询的共同锚点，集中读取可以避免各生成函数重复解析 DMMF。
	 * 函数职责：根据模型名找到对应 DMMF 模型，并返回该模型的主键字段名。
	 */
	private getPrimaryKeyField(modelName: string): string {
		const model = this.models.find((m) => m.name === modelName);
		if (!model) {
			throw new Error(`Model ${modelName} not found`);
		}

		return this.getPrimaryKeyFieldFromModel(model);
	}
	/**
	 * 设计思路：无主键表不能提供按 id 的读写能力，但仍应提供列表和插入的 query builder，保持 queries 对象形态稳定。
	 * 函数职责：生成无主键模型的 selectAll/insert query builder 与兼容执行包装。
	 */
	private generateNoPrimaryKeyCrudQueries(modelName: string): string {
		const tableName = NamingRules.ZodTypeName(modelName);
		const pascalName = NamingRules.TypeName(modelName, modelName);
		const pluralName = this.pluralize(pascalName);
		const schemaName = NamingRules.SchemaName(tableName);

		return `/**
 * 设计思路：无主键表仍可作为配置表或关系表读取，builder 化后与普通表列表查询保持同一入口。
 * 函数职责：构造读取 ${tableName} 全量行的 SQL。
 */
export function selectAll${pluralName}Query(db: ${pascalName}QueryDB) {
  return db.selectFrom("${tableName}").selectAll("${tableName}");
}

/**
 * 设计思路：兼容旧无主键表列表读取，把执行动作留在包装层。
 * 函数职责：执行 selectAll${pluralName}Query 并返回所有行。
 */
export async function selectAll${pluralName}(trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await selectAll${pluralName}Query(db).execute();
}

/**
 * 设计思路：基础 Zod schema 已经是表字段的运行时事实源，写入过滤复用 schema shape，避免生成第二份列名清单。
 * 函数职责：保留输入对象中属于 ${schemaName} 的字段，供 insert query builder 使用。
 */
function pick${pascalName}SchemaFields<T>(data: T): T {
  const filtered = Object.fromEntries(Object.entries(data as Record<string, unknown>).filter(([key]) => key in ${schemaName}.shape));
  // 设计说明：Object.fromEntries 会丢失泛型对象形状；字段白名单由 ${schemaName}.shape 提供，这里只恢复调用方传入的写入类型。
  return filtered as T;
}

/**
 * 设计思路：无主键表插入仍按基础 schema 字段白名单过滤，避免配置层承担字段裁剪。
 * 函数职责：构造插入 ${tableName} 并返回写入行的 SQL。
 */
export function insert${pascalName}Query(db: ${pascalName}QueryDB, data: ${pascalName}Insert) {
  return db.insertInto("${tableName}").values(pick${pascalName}SchemaFields(data)).returningAll();
}

/**
 * 设计思路：保留旧无主键表插入执行入口，迁移期间不破坏现有调用点。
 * 函数职责：执行 insert${pascalName}Query 并要求返回写入行。
 */
export async function insert${pascalName}(data: ${pascalName}Insert, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await insert${pascalName}Query(db, data).executeTakeFirstOrThrow();
}`;
	}

	/**
	 * 设计思路：唯一约束方法有三种来源，先归一成字段列表，避免查询和删除生成逻辑分叉。
	 * 函数职责：返回无主键模型可用于唯一定位的字段组与方法名后缀。
	 */
	private getUniqueConstraintDescriptor(modelName: string): { fieldNames: string[]; pascalFieldNames: string } | null {
		const model = this.models.find((m) => m.name === modelName);
		if (!model) return null;

		const uniqueFields = model.fields.filter((field: any) => field.isUnique);
		const uniqueIndexes = model.uniqueIndexes || [];

		if (uniqueIndexes.length > 0) {
			const fieldNames = uniqueIndexes[0].fields;
			return { fieldNames, pascalFieldNames: fieldNames.map((f: any) => NamingRules.TypeName(f)).join("And") };
		}
		if (uniqueFields.length >= 2) {
			const fieldNames = uniqueFields.map((f: any) => f.name);
			return { fieldNames, pascalFieldNames: fieldNames.map((f: any) => NamingRules.TypeName(f)).join("And") };
		}
		if (uniqueFields.length === 1) {
			const fieldNames = [uniqueFields[0].name];
			return { fieldNames, pascalFieldNames: NamingRules.TypeName(uniqueFields[0].name) };
		}

		return null;
	}

	/**
	 * 设计思路：无主键表的唯一约束查询也先生成 builder，保持执行动作只在调用边界发生。
	 * 函数职责：生成基于唯一约束定位单行的 query builder 与兼容执行包装。
	 */
	private generateFindByUniqueConstraint(modelName: string): string {
		const tableName = NamingRules.ZodTypeName(modelName);
		const pascalName = NamingRules.TypeName(modelName, modelName);
		const descriptor = this.getUniqueConstraintDescriptor(modelName);
		if (!descriptor) return "";

		const fieldParams = descriptor.fieldNames.map((f: string) => `${f}: string`).join(", ");
		const fieldArgs = descriptor.fieldNames.join(", ");
		const whereConditions = descriptor.fieldNames.map((f: string) => `.where("${f}", "=", ${f})`).join("\n    ");
		const methodName = `select${pascalName}By${descriptor.pascalFieldNames}`;

		return `/**
 * 设计思路：无主键表的唯一约束查询也先生成 builder，保持执行动作只在调用边界发生。
 * 函数职责：构造按 ${descriptor.fieldNames.join(", ")} 唯一定位 ${tableName} 的 SQL。
 */
export function ${methodName}Query(db: ${pascalName}QueryDB, ${fieldParams}) {
  return db.selectFrom("${tableName}")
    ${whereConditions}
    .selectAll("${tableName}");
}

/**
 * 设计思路：兼容旧唯一约束查询函数，把 SQL 构造委托给 query builder 版本。
 * 函数职责：执行 ${methodName}Query 并返回第一行。
 */
export async function ${methodName}(${fieldParams}, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await ${methodName}Query(db, ${fieldArgs}).executeTakeFirst();
}`;
	}

	/**
	 * 设计思路：无主键表删除只能依赖唯一约束定位，builder 化后仍由上层决定是否执行。
	 * 函数职责：生成基于唯一约束删除单行的 query builder 与兼容执行包装。
	 */
	private generateDeleteByUniqueConstraint(modelName: string): string {
		const tableName = NamingRules.ZodTypeName(modelName);
		const pascalName = NamingRules.TypeName(modelName, modelName);
		const descriptor = this.getUniqueConstraintDescriptor(modelName);
		if (!descriptor) return "";

		const fieldParams = descriptor.fieldNames.map((f: string) => `${f}: string`).join(", ");
		const fieldArgs = descriptor.fieldNames.join(", ");
		const whereConditions = descriptor.fieldNames.map((f: string) => `.where("${f}", "=", ${f})`).join("\n    ");
		const methodName = `delete${pascalName}By${descriptor.pascalFieldNames}`;

		return `/**
 * 设计思路：无主键表删除只能依赖唯一约束定位，builder 化后仍由上层决定是否执行。
 * 函数职责：构造按 ${descriptor.fieldNames.join(", ")} 删除 ${tableName} 并返回删除行的 SQL。
 */
export function ${methodName}Query(db: ${pascalName}QueryDB, ${fieldParams}) {
  return db.deleteFrom("${tableName}")
    ${whereConditions}
    .returningAll();
}

/**
 * 设计思路：兼容旧唯一约束删除函数，实际 SQL 构造集中到 query builder 版本。
 * 函数职责：执行 ${methodName}Query 并返回删除行。
 */
export async function ${methodName}(${fieldParams}, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await ${methodName}Query(db, ${fieldArgs}).executeTakeFirst();
}`;
	}

	/**
	 * 生成标准 CRUD query builder 与兼容执行包装。
	 * 设计思路：生成器负责声明“如何构造 SQL”，旧异步函数只保留执行边界，方便业务层逐步从 repositoryMethods 迁移到 repositoryQueries。
	 */
	private generateStandardCrudQueries(modelName: string): string {
		const tableName = NamingRules.ZodTypeName(modelName);
		const pascalName = NamingRules.TypeName(modelName, modelName);
		const camelName = NamingRules.VariableName(modelName);
		const pluralName = this.pluralize(pascalName);
		const primaryKeyField = this.getPrimaryKeyField(modelName);
		const schemaName = NamingRules.SchemaName(tableName);
		const model = this.allModels.find((candidate) => (candidate.dbName || candidate.name) === modelName);
		const hasCreatedAt = model?.fields.some(
			(field) => field.kind === "scalar" && field.type === "DateTime" && field.name === "createdAt",
		);
		const hasUpdatedAt = model?.fields.some(
			(field) => field.kind === "scalar" && field.type === "DateTime" && field.name === "updatedAt",
		);
		const managedTimestampNames = [hasCreatedAt ? '"createdAt"' : "", hasUpdatedAt ? '"updatedAt"' : ""].filter(
			Boolean,
		);
		const writableFieldCondition = managedTimestampNames.length
			? `key in ${schemaName}.shape && ![${managedTimestampNames.join(", ")}].includes(key)`
			: `key in ${schemaName}.shape`;
		const insertTimestampFields = [hasCreatedAt ? "createdAt: now" : "", hasUpdatedAt ? "updatedAt: now" : ""]
			.filter(Boolean)
			.join(", ");
		const insertValues = insertTimestampFields
			? `{ ...pick${pascalName}SchemaFields(data), ${insertTimestampFields} }`
			: `pick${pascalName}SchemaFields(data)`;
		const updateValues = hasUpdatedAt
			? `{ ...pick${pascalName}SchemaFields(data), updatedAt: new Date().toISOString() }`
			: `pick${pascalName}SchemaFields(data)`;
		const insertNowDeclaration = insertTimestampFields ? "\n  const now = new Date().toISOString();" : "";

		return `/**
 * 设计思路：按主键查询是详情、卡片和编辑入口的统一读取原语；这里只返回 Kysely builder，让调用方决定一次性执行或 live 订阅。
 * 函数职责：构造 ${tableName} 按 ${primaryKeyField} 查询单行的 SQL。
 */
export function select${pascalName}ByIdQuery(db: ${pascalName}QueryDB, id: string) {
  return db.selectFrom("${tableName}").where("${primaryKeyField}", "=", id).selectAll("${tableName}");
}

/**
 * 设计思路：兼容旧 repositoryMethods 调用，把执行动作限制在薄包装里，避免业务迁移被一次性打断。
 * 函数职责：执行 select${pascalName}ByIdQuery 并返回第一行。
 */
export async function select${pascalName}ById(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await select${pascalName}ByIdQuery(db, id).executeTakeFirst();
}

/**
 * 设计思路：WithRelations 是完整详情读取的构造器，保持与基础详情查询同源，方便卡片按需选择轻量或完整投影。
 * 函数职责：构造 ${tableName} 按主键读取并拼入子关系投影的 SQL。
 */
export function select${pascalName}ByIdWithRelationsQuery(db: ${pascalName}QueryDB, id: string) {
  return db
    .selectFrom("${tableName}")
    .where("${primaryKeyField}", "=", id)
    .selectAll("${tableName}")
    .select((eb) => ${camelName}SubRelations(eb, eb.ref("${tableName}.${primaryKeyField}")));
}

/**
 * 设计思路：保留旧完整详情执行入口，同时把 SQL 构造委托给 query builder 版本。
 * 函数职责：执行 select${pascalName}ByIdWithRelationsQuery 并返回第一行。
 */
export async function select${pascalName}ByIdWithRelations(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await select${pascalName}ByIdWithRelationsQuery(db, id).executeTakeFirst();
}

/**
 * 设计思路：列表读取应与 live 订阅共用同一条查询构造路径，不再单独维护 liveQuery 字段。
 * 函数职责：构造读取 ${tableName} 全量行的 SQL。
 */
export function selectAll${pluralName}Query(db: ${pascalName}QueryDB) {
  return db.selectFrom("${tableName}").selectAll("${tableName}");
}

/**
 * 设计思路：兼容旧 getAll 执行语义，执行边界显式停留在包装函数。
 * 函数职责：执行 selectAll${pluralName}Query 并返回所有行。
 */
export async function selectAll${pluralName}(trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await selectAll${pluralName}Query(db).execute();
}

/**
 * 设计思路：基础 Zod schema 已经是表字段的运行时事实源，写入过滤复用 schema shape，避免生成第二份列名清单。
 * 函数职责：保留输入对象中属于 ${schemaName} 的字段，供 insert/update query builder 使用。
 */
function pick${pascalName}SchemaFields<T>(data: T): T {
  const filtered = Object.fromEntries(Object.entries(data as Record<string, unknown>).filter(([key]) => ${writableFieldCondition}));
  // 设计说明：Object.fromEntries 会丢失泛型对象形状；字段白名单由 ${schemaName}.shape 提供，这里只恢复调用方传入的写入类型。
  return filtered as T;
}

/**
 * 设计思路：写入 query builder 只关心本表可写字段过滤，不掺入账号、默认值或跨表事务等业务流程。
 * 函数职责：构造插入 ${tableName} 并返回写入行的 SQL。
 */
export function insert${pascalName}Query(db: ${pascalName}QueryDB, data: ${pascalName}Insert) {
  ${insertNowDeclaration.trimStart()}
  return db.insertInto("${tableName}").values(${insertValues}).returningAll();
}

/**
 * 设计思路：保留旧插入执行入口，业务层迁移完成前仍可在事务中直接调用。
 * 函数职责：执行 insert${pascalName}Query 并要求返回写入行。
 */
export async function insert${pascalName}(data: ${pascalName}Insert, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await insert${pascalName}Query(db, data).executeTakeFirstOrThrow();
}

/**
 * 设计思路：更新 query builder 保持单表职责，只按主键定位并过滤可写列。
 * 函数职责：构造更新 ${tableName} 指定主键行并返回更新行的 SQL。
 */
export function update${pascalName}Query(db: ${pascalName}QueryDB, id: string, data: ${pascalName}Update) {
  return db.updateTable("${tableName}").set(${updateValues}).where("${primaryKeyField}", "=", id).returningAll();
}

/**
 * 设计思路：保留旧更新执行入口，实际 SQL 构造集中到 update${pascalName}Query。
 * 函数职责：执行 update${pascalName}Query 并要求返回更新行。
 */
export async function update${pascalName}(id: string, data: ${pascalName}Update, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await update${pascalName}Query(db, id, data).executeTakeFirstOrThrow();
}

/**
 * 设计思路：删除 query builder 只描述本表删除 SQL，是否允许删除由上层策略控制。
 * 函数职责：构造删除 ${tableName} 指定主键行并返回删除行的 SQL。
 */
export function delete${pascalName}Query(db: ${pascalName}QueryDB, id: string) {
  return db.deleteFrom("${tableName}").where("${primaryKeyField}", "=", id).returningAll();
}

/**
 * 设计思路：保留旧删除执行入口，兼容当前配置里的 deleteCallback。
 * 函数职责：执行 delete${pascalName}Query 并返回删除行。
 */
export async function delete${pascalName}(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await delete${pascalName}Query(db, id).executeTakeFirst();
}`;
	}
	/**
	 * 设计思路：关联区需要静态 query builder 集合而不是运行时解释 DB_RELATION，因此在 repository 生成期把关系计划固化到每张表。
	 * 函数职责：生成 getXXParentsByIdQuery 与 getXXChildrenByIdQuery，按目标表分桶返回 query builder 数组。
	 */
	private generateRelationQueryMethods(modelName: string): string {
		const model = this.allModels.find((m: DMMF.Model) => m.name === modelName);
		if (!model) return "";

		const tableName = NamingRules.ZodTypeName(modelName);
		const pascalName = NamingRules.TypeName(modelName, modelName);
		const primaryKeyField = this.getPrimaryKeyFieldFromModel(model);
		const parentEntries = this.generateRelationQueryEntries(model, "parents");
		const childEntries = this.generateRelationQueryEntries(model, "children");

		return `/**
 * 设计思路：父关系查询按目标表分桶返回 builder，执行层统一合并和去重，避免 campA/campB 等多语义关系互相覆盖。
 * 函数职责：构造 ${tableName} 指定主键行的父关系查询集合。
 */
export function get${pascalName}ParentsByIdQuery(db: ${pascalName}QueryDB, id: string): ${pascalName}RelationQueryMap {
  const relationDb = db;
  const selfTable = "${tableName}";
  const selfPrimaryKey = "${primaryKeyField}";
  return {
${parentEntries}
  };
}

/**
 * 设计思路：子关系查询与父关系保持同样的分桶结构，后续可以直接把每个 builder 接入 live 查询。
 * 函数职责：构造 ${tableName} 指定主键行的子关系查询集合。
 */
export function get${pascalName}ChildrenByIdQuery(db: ${pascalName}QueryDB, id: string): ${pascalName}RelationQueryMap {
  const relationDb = db;
  const selfTable = "${tableName}";
  const selfPrimaryKey = "${primaryKeyField}";
  return {
${childEntries}
  };
}`;
	}

	/**
	 * 设计思路：父子关系的结构方向来自业务命名规则，而查询方向来自 FK/M2M 物理结构，两者需要在生成期合并。
	 * 函数职责：筛选指定方向的关系字段，并生成按目标表分桶的 query builder 代码片段。
	 */
	private generateRelationQueryEntries(model: DMMF.Model, direction: "parents" | "children"): string {
		const entriesByTarget = new Map<string, string[]>();

		for (const field of model.fields) {
			if (field.kind !== "object") continue;
			const isParent = this.isParentRelation(field.name);
			if (direction === "parents" && !isParent) continue;
			if (direction === "children" && isParent) continue;

			const targetModel = this.allModels.find((m: DMMF.Model) => m.name === field.type);
			if (!targetModel || this.shouldSkipModel(targetModel.name)) continue;

			const targetTable = NamingRules.ZodTypeName(targetModel.dbName || targetModel.name);
			const queries = this.generateRelationQueriesForField(model, field, targetModel);
			if (queries.length === 0) continue;

			if (!entriesByTarget.has(targetTable)) entriesByTarget.set(targetTable, []);
			entriesByTarget.get(targetTable)?.push(...queries);
		}

		return Array.from(entriesByTarget.entries())
			.map(
				([targetTable, queries]) =>
					`    ${targetTable}: [\n${queries.map((query) => `      ${query}`).join(",\n")}\n    ]`,
			)
			.join(",\n");
	}

	/**
	 * 设计思路：单个关系字段可能对应 FK 查询、普通 M2M 查询或自关联双向 M2M 查询，统一返回数组可保留所有语义边。
	 * 函数职责：为一个 DMMF 关系字段生成一个或多个 query builder 表达式。
	 */
	private generateRelationQueriesForField(model: DMMF.Model, field: DMMF.Field, targetModel: DMMF.Model): string[] {
		const targetTable = NamingRules.ZodTypeName(targetModel.dbName || targetModel.name);
		const targetPrimaryKey = this.getPrimaryKeyFieldFromModel(targetModel);
		const relationType = this.determineRelationType(field, model);

		if (relationType === "MANY_TO_MANY") {
			const intermediateTable = this.helpers.getManyToManyTableName(field);
			if (!intermediateTable) return [];
			const { selfJoinColumn, targetJoinColumn } = this.getManyToManyJoinColumns(field, model);
			const isSelfRelation = model.name === targetModel.name;
			const firstQuery = `relationDb.selectFrom("${targetTable}").innerJoin("${intermediateTable}", "${targetTable}.${targetPrimaryKey}", "${intermediateTable}.${targetJoinColumn}").where("${intermediateTable}.${selfJoinColumn}", "=", id).selectAll("${targetTable}")`;
			if (!isSelfRelation) return [firstQuery];

			return [
				firstQuery,
				`relationDb.selectFrom("${targetTable}").innerJoin("${intermediateTable}", "${targetTable}.${targetPrimaryKey}", "${intermediateTable}.${selfJoinColumn}").where("${intermediateTable}.${targetJoinColumn}", "=", id).selectAll("${targetTable}")`,
			];
		}

		if (field.relationFromFields && field.relationFromFields.length > 0) {
			const fkField = field.relationFromFields[0];
			const referencedField = field.relationToFields?.[0] || targetPrimaryKey;
			return [
				`relationDb.selectFrom("${targetTable}").where("${targetTable}.${referencedField}", "in", (eb) => eb.selectFrom(selfTable).where(selfPrimaryKey, "=", id).select("${fkField}")).selectAll("${targetTable}")`,
			];
		}

		const reverseField = targetModel.fields.find(
			(f: DMMF.Field) =>
				f.kind === "object" &&
				f.type === model.name &&
				f.relationName === field.relationName &&
				Array.isArray(f.relationFromFields) &&
				f.relationFromFields.length > 0,
		);
		const reverseForeignKey = reverseField?.relationFromFields?.[0];
		if (!reverseForeignKey) return [];

		return [
			`relationDb.selectFrom("${targetTable}").where("${targetTable}.${reverseForeignKey}", "=", id).selectAll("${targetTable}")`,
		];
	}

	/**
	 * 从 DMMF 中获取所有中间表名称
	 * 使用真实的表名（dbName 或 name），与 DB 接口保持一致
	 */
	private getIntermediateTables(): string[] {
		const intermediateTables: string[] = [];

		// 遍历所有模型，找出中间表（以 _ 开头的表名）
		for (const model of this.allModels) {
			if (model.name.startsWith("_")) {
				// 使用真实的表名（dbName 或 name），不进行任何转换
				const tableName = model.dbName || model.name;
				intermediateTables.push(tableName);
			}
		}

		return intermediateTables.sort();
	}

	/**
	 * 获取无主键模型的特殊方法导入字符串
	 */
	private getSpecialMethodsForNoPKModel(modelName: string): string {
		const pascalName = NamingRules.TypeName(modelName, modelName);

		// 查找模型
		const model = this.models.find((m) => m.name === modelName);
		if (!model) return "";

		// 查找唯一约束字段（包括复合唯一约束）
		const uniqueFields = model.fields.filter((field: any) => field.isUnique);
		const uniqueIndexes = model.uniqueIndexes || [];

		// 如果没有唯一字段和唯一索引，返回空
		if (uniqueFields.length === 0 && uniqueIndexes.length === 0) return "";

		// 优先处理复合唯一索引
		if (uniqueIndexes.length > 0) {
			const index = uniqueIndexes[0]; // 取第一个复合唯一索引
			const fieldNames = index.fields; // fields 是字符串数组
			const pascalFieldNames = fieldNames.map((f: any) => NamingRules.TypeName(f)).join("And");
			return `, delete${pascalName}By${pascalFieldNames}`;
		} else if (uniqueFields.length >= 2) {
			const pascalFieldNames = uniqueFields.map((f: any) => NamingRules.TypeName(f.name)).join("And");
			return `, delete${pascalName}By${pascalFieldNames}`;
		} else if (uniqueFields.length === 1) {
			const firstUniqueField = uniqueFields[0];
			return `, delete${pascalName}By${NamingRules.TypeName(firstUniqueField.name)}`;
		}

		return "";
	}

	/**
	 * 获取无主键模型的特殊导出对象
	 */
	private getSpecialExportsForNoPKModel(modelName: string): Record<string, string> {
		const pascalName = NamingRules.TypeName(modelName, modelName);

		// 查找模型
		const model = this.models.find((m) => m.name === modelName);
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
			const pascalFieldNames = fieldNames.map((f: any) => NamingRules.TypeName(f)).join("And");
			return {
				deleteByUniqueFields: `delete${pascalName}By${pascalFieldNames}`,
			};
		} else if (uniqueFields.length >= 2) {
			const pascalFieldNames = uniqueFields.map((f: any) => NamingRules.TypeName(f.name)).join("And");
			return {
				deleteByUniqueFields: `delete${pascalName}By${pascalFieldNames}`,
			};
		} else if (uniqueFields.length === 1) {
			const firstUniqueField = uniqueFields[0];
			return {
				deleteByUniqueField: `delete${pascalName}By${NamingRules.TypeName(firstUniqueField.name)}`,
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
			const pascalName = NamingRules.TypeName(modelName, modelName);
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
			const pascalName = NamingRules.TypeName(tableName, tableName);
			lines.push(`  ${tableName}: ${pascalName};`);
		}

		return lines.join("\n");
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
				methodLines.push(`    insert: ${crudMethods.insert || "null"}`);
				methodLines.push(`    update: ${crudMethods.update || "null"}`);
				methodLines.push(`    delete: ${crudMethods.delete || "null"}`);
				methodLines.push(`    select: ${crudMethods.select || "null"}`);
				methodLines.push(`    selectAll: ${crudMethods.selectAll || "null"}`);
				methodLines.push(`    canEdit: ${crudMethods.canEdit || "null"}`);

				// 添加特殊方法
				Object.keys(crudMethods).forEach((key) => {
					if (!["insert", "update", "delete", "select", "selectAll", "canEdit"].includes(key)) {
						methodLines.push(`    ${key}: ${crudMethods[key]}`);
					}
				});

				lines.push(`  ${tableName}: {
${methodLines.join(",\n")}
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
	 * 设计思路：repositoryQueries 是业务配置的新入口，字段集合固定可以让无能力表显式暴露 null，避免调用层猜测。
	 * 函数职责：按所有 DB 表生成 queries 导出对象文本。
	 */
	private generateQueryExports(exports: Record<string, any>): string {
		const allTables = this.getAllTableNames();
		const lines: string[] = [];

		for (const tableName of allTables) {
			const queries = exports[tableName];
			if (queries) {
				lines.push(`  ${tableName}: {
    get: ${queries.get || "null"},
    getAll: ${queries.getAll || "null"},
    insert: ${queries.insert || "null"},
    update: ${queries.update || "null"},
    delete: ${queries.delete || "null"},
    getParentsById: ${queries.getParentsById || "null"},
    getChildrenById: ${queries.getChildrenById || "null"}
  }`);
			} else {
				lines.push(`  ${tableName}: {
    get: null,
    getAll: null,
    insert: null,
    update: null,
    delete: null,
    getParentsById: null,
    getChildrenById: null
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
