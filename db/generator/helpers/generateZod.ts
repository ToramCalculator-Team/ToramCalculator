/**
 * @file generateZod.ts
 * @description Zod Schema 生成器
 * 从 Prisma DMMF 生成 Zod 验证模式和 TypeScript 类型
 */

import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import type { DMMF } from "@prisma/generator-helper";
import { PATHS } from "../config";
import { EnumInjector } from "../enumInjector";
import { NamingRules } from "../utils/namingRules";
import { writeFileSafely } from "../utils/writeFileSafely";

const require = createRequire(import.meta.url);

/**
 * Zod Schema 生成器
 */
export class ZodGenerator {
	private allModels: readonly DMMF.Model[] = []; // 包含中间表的完整模型列表
	private enumInjector: EnumInjector;
	private jsonSchemaByFieldKey: Map<string, string> = new Map(); // key: "<table>.<field>" -> schema export name
	private usedJsonSchemas: Map<string, { tableName: string; fieldName: string; schemaName: string }> = new Map(); // key: "<table>.<field>" -> used schema info

	constructor(_dmmf: DMMF.Document, allModels: DMMF.Model[]) {
		this.allModels = allModels;
		this.enumInjector = new EnumInjector();
		this.enumInjector.processEnums();
		this.loadJsonSchemaMarkersFromTempSchema();
	}

	/**
	 * 生成 Zod schemas
	 */
	async generate(outputPath: string): Promise<void> {
		try {
			console.log("生成 Zod schemas...");

			const enumSchemas = this.generateEnumSchemas();
			const tableSchemas = this.generateTableSchemas();
			const kyselyTypes = this.generateKyselyTypes();
			const dbInterface = this.generateDBInterface();
			const dbSchema = this.generateDBSchema();

			// 验证 Json schema 标记的有效性（jsons.ts 导出是否存在）
			this.validateUsedJsonSchemas();

			const fullContent = this.buildFullContent(enumSchemas, tableSchemas, kyselyTypes, dbInterface, dbSchema);

			writeFileSafely(outputPath, fullContent);

			console.log("Zod schemas 生成完成");
		} catch (error) {
			console.error("Zod schemas 生成失败:", error);
			throw error;
		}
	}

	/**
	 * 生成枚举 schemas
	 */
	private generateEnumSchemas(): string {
		let enumSchemas = "";

		// 从 EnumInjector 中获取枚举信息
		const extractedEnums = this.enumInjector.getExtractedEnums();

		if (extractedEnums.size > 0) {
			for (const [enumName, enumValues] of extractedEnums) {
				const enumSchemaName = NamingRules.SchemaName(enumName); // 使用 SchemaName 规范
				const enumTypeName = NamingRules.ZodTypeName(enumName); // 使用 ZodTypeName 规范（snake_case）
				enumSchemas += `export const ${enumSchemaName} = z.enum([${enumValues.map((v) => `"${v}"`).join(", ")}]);\n`;
				enumSchemas += `export type ${enumTypeName} = z.output<typeof ${enumSchemaName}>;\n\n`;
			}
		}

		return enumSchemas;
	}

	/**
	 * 生成所有表的 schemas（包括常规表和中间表）
	 */
	private generateTableSchemas(): string {
		let regularTableSchemas = "";
		let intermediateTableSchemas = "";

		// 从完整的模型列表中提取所有表信息
		for (const model of this.allModels) {
			const tableName = model.dbName || model.name;
			const isIntermediateTable = NamingRules.IsIntermediateTable(tableName);

			// Schema 名称：PascalCase + Schema
			const schemaName = NamingRules.SchemaName(tableName);
			// 中间类型名称：snake_case（用于之后转换成 Selectable/Insertable/Updateable）
			const typeName = NamingRules.ZodTypeName(tableName);

			const fieldsStr = model.fields
				.filter((field: DMMF.Field) => {
					// 跳过关联字段，只保留标量字段和枚举字段
					return field.kind === "scalar" || field.kind === "enum";
				})
				.map((field: DMMF.Field) => {
					const zodType = this.convertFieldToZod(field, tableName);
					return `  ${field.name}: ${zodType}`;
				})
				.join(",\n");

			const schemaCode = `export const ${schemaName} = z.object({\n${fieldsStr}\n});\n`;
			const typeCode = `export type ${typeName} = z.output<typeof ${schemaName}>;\n\n`;
			const content = schemaCode + typeCode;

			if (isIntermediateTable) {
				intermediateTableSchemas += content;
			} else {
				regularTableSchemas += content;
			}
		}

		return `${regularTableSchemas}\n// ===== 中间表 Schemas =====\n${intermediateTableSchemas}`;
	}

	/**
	 * 将字段转换为 Zod 类型
	 * @param field DMMF 字段
	 * @param tableName 表名（用于构建 Json schema 的 key）
	 */
	private convertFieldToZod(field: DMMF.Field, tableName: string): string {
		let zodType = "";

		// 处理字段类型
		switch (field.type) {
			case "String":
				zodType = "z.string()";
				break;
			case "Int":
				zodType = "z.number().int()";
				break;
			case "Float":
				zodType = "z.number()";
				break;
			case "Boolean":
				zodType = "z.boolean()";
				break;
			case "DateTime":
				zodType = "z.string()";
				break;
			case "Json": {
				const fieldKey = `${tableName}.${field.name}`;

				// 优先从临时 schema 的同行标记解析（支持: `Json /// ZOD SchemaExport`）
				let schemaName = this.jsonSchemaByFieldKey.get(fieldKey) || null;

				// 兼容：如果 DMMF documentation 有值，也支持（例如前置 /// 注释）
				if (!schemaName) {
					schemaName = this.extractZodSchemaFromDocumentation(field.documentation);
				}

				if (!schemaName) {
					zodType = "z.any()";
					break;
				}

				// 记录使用，供后续校验与生成 import
				this.usedJsonSchemas.set(fieldKey, {
					tableName,
					fieldName: field.name,
					schemaName,
				});

				// 直接引用 jsons.ts 中导出的 schema 变量
				zodType = schemaName;
				break;
			}
			case "Bytes":
				zodType = "z.instanceof(Buffer)";
				break;
			default: {
				// 检查是否为枚举类型（从 EnumInjector 中获取枚举信息）
				const extractedEnums = this.enumInjector.getExtractedEnums();
				const isEnum = extractedEnums.has(field.type);
				if (isEnum) {
					// 使用 SchemaName 规范生成枚举 schema 名称
					zodType = NamingRules.SchemaName(field.type);
				} else {
					zodType = "z.string()"; // 默认为字符串
				}
				break;
			}
		}

		// 处理可选性
		if (!field.isRequired) {
			zodType += ".nullable()";
		}

		// 处理数组
		if (field.isList) {
			zodType = `z.array(${zodType})`;
		}

		return zodType;
	}

	/**
	 * 从临时 schema 文件中解析同行标记：
	 * - 支持格式：`field Json /// ZOD SchemaExport`
	 * - 可选扩展：`field Json /// ZOD SchemaExport key=table.field`（显式指定 key）
	 */
	private loadJsonSchemaMarkersFromTempSchema(): void {
		try {
			if (!fs.existsSync(PATHS.tempSchema)) {
				console.warn("⚠️  临时 schema 文件不存在，跳过 Json schema 标记解析");
				return;
			}

			const content = fs.readFileSync(PATHS.tempSchema, "utf-8");
			const lines = content.split("\n");
			let currentModel: string | null = null;

			for (const line of lines) {
				const trimmed = line.trim();

				const modelMatch = trimmed.match(/^model\s+(\w+)\s+\{$/);
				if (modelMatch) {
					currentModel = modelMatch[1];
					continue;
				}

				if (trimmed === "}") {
					currentModel = null;
					continue;
				}

				if (!currentModel) {
					continue;
				}

				// 匹配 `field Json ... /// ZOD SchemaExport ...`
				// 允许 Json, Json?, Json[]
				const match = trimmed.match(
					/^(\w+)\s+Json(?:\[\])?\??.*?\/\/\/\s*ZOD\s+([a-zA-Z_][a-zA-Z0-9_]*)(?:\s+key=([a-zA-Z0-9_]+\.[a-zA-Z0-9_]+))?\s*$/,
				);
				if (!match) {
					continue;
				}

				const [, fieldName, schemaExportName, explicitKey] = match;
				const key = explicitKey || `${currentModel}.${fieldName}`;
				this.jsonSchemaByFieldKey.set(key, schemaExportName);
			}

			if (this.jsonSchemaByFieldKey.size > 0) {
				console.log(`解析到 ${this.jsonSchemaByFieldKey.size} 个 Json schema 标记`);
			}
		} catch (error) {
			console.warn("⚠️  解析 Json schema 标记失败，将跳过 Json schema 解析:", error);
			this.jsonSchemaByFieldKey = new Map();
		}
	}

	/**
	 * 从字段文档注释中提取 ZOD schema 名称（兼容前置 /// 注释的情况）
	 * 支持格式：`/// ZOD SchemaExport`
	 * @param documentation 字段的文档注释
	 * @returns schema 名称，如果未找到则返回 null
	 */
	private extractZodSchemaFromDocumentation(documentation: string | undefined): string | null {
		if (!documentation) {
			return null;
		}

		const match = documentation.match(/\bZOD\s+([a-zA-Z_][a-zA-Z0-9_]*)\b/);
		return match ? match[1] : null;
	}

	/**
	 * 验证 Json schema 标记的有效性
	 * - 检查所有使用到的 schema export 是否存在于 `db/schema/jsons.ts`
	 * - 检查非 Json 字段是否误用了 `ZOD ...` 注释（警告）
	 */
	private validateUsedJsonSchemas(): void {
		const errors: string[] = [];
		const warnings: string[] = [];

		// 加载 jsons.ts，检查导出是否存在
		let jsonsModule: Record<string, unknown> | null = null;
		try {
			const jsonsPath = path.join(PATHS.schemaFolder, "jsons.ts");
			jsonsModule = require(jsonsPath);
		} catch (error) {
			errors.push(`❌ 无法加载 db/schema/jsons.ts：${String(error)}`);
		}

		if (jsonsModule) {
			for (const [fieldKey, info] of this.usedJsonSchemas) {
				if (!(info.schemaName in jsonsModule)) {
					errors.push(
						`❌ Json schema 导出不存在: 字段 "${fieldKey}" 标记了 "${info.schemaName}"，但在 db/schema/jsons.ts 中未找到该导出`,
					);
				}
			}
		}

		// 检查非 Json 字段是否误用 ZOD 注释
		for (const model of this.allModels) {
			const tableName = model.dbName || model.name;
			for (const field of model.fields) {
				if (field.kind === "scalar" && field.type !== "Json") {
					const schemaName = this.extractZodSchemaFromDocumentation(field.documentation);
					if (schemaName) {
						warnings.push(
							`⚠️  非 Json 字段使用了 ZOD 注释: 表 "${tableName}" 的字段 "${field.name}" (类型: ${field.type}) 标记了 "${schemaName}"，但该标记只能用于 Json 字段`,
						);
					}
				}
			}
		}

		// 输出警告
		if (warnings.length > 0) {
			console.warn("\n⚠️  Json schema 标记警告:");
			warnings.forEach((warning) => {
				console.warn(`  ${warning}`);
			});
		}

		// 如果有错误，抛出异常
		if (errors.length > 0) {
			console.error("\n❌ Json schema 标记验证失败:");
			errors.forEach((error) => {
				console.error(`  ${error}`);
			});
			throw new Error(`Json schema 标记验证失败: 发现 ${errors.length} 个错误`);
		}
	}

	/**
	 * 生成 Kysely 工具类型
	 */
	private generateKyselyTypes(): string {
		return `
// Kysely 工具类型
export type Insertable<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;
export type Updateable<T> = Partial<Insertable<T>>;
export type Selectable<T> = T;
export type Whereable<T> = Partial<T>;
`;
	}

	/**
	 * 生成 DB 接口
	 */
	private generateDBInterface(): string {
		let dbInterface = "export interface DB {\n";

		// 添加所有模型（包括中间表）
		// DB 接口中的类型应该是 snake_case（Zod 导出的类型）
		for (const model of this.allModels) {
			const tableName = model.dbName || model.name;
			const typeName = NamingRules.ZodTypeName(tableName);

			dbInterface += `  ${tableName}: ${typeName};\n`;
		}

		dbInterface += "}\n";

		return dbInterface;
	}

	/**
	 * 生成 DBSchema 对象
	 * 包含所有表的 Zod Schema，用于运行时验证
	 */
	private generateDBSchema(): string {
		let dbSchema = "// ===== DB Schema 对象 =====\nexport const DBSchema = {\n";

		for (const model of this.allModels) {
			const tableName = model.dbName || model.name;
			const schemaName = NamingRules.SchemaName(tableName);

			dbSchema += `  ${tableName}: ${schemaName},\n`;
		}

		dbSchema += "} as const;\n";

		return dbSchema;
	}

	/**
	 * 构建完整内容
	 */
	private buildFullContent(
		enumSchemas: string,
		tableSchemas: string,
		kyselyTypes: string,
		dbInterface: string,
		dbSchema: string,
	): string {
		const usedSchemaNames = Array.from(
			new Set(Array.from(this.usedJsonSchemas.values()).map((x) => x.schemaName)),
		).sort((a, b) => a.localeCompare(b));

		// 按你要求：每遇到一个 JsonSchema 标记，就额外 import 一个（这里对 schemaName 去重，避免重复导入同名导出）
		const jsonSchemaImports =
			usedSchemaNames.length > 0
				? `${usedSchemaNames.map((name) => `import { ${name} } from "../../schema/jsons";`).join("\n")}\n`
				: "";

		return `/**
 * @file zod/index.ts
 * @description Zod 验证模式和 TypeScript 类型
 * @generated 自动生成，请勿手动修改
 */

import { z } from "zod/v4";
${jsonSchemaImports}

// ===== 枚举 Schemas =====
${enumSchemas}

// ===== 模型 Schemas =====
${tableSchemas}

// ===== Kysely 工具类型 =====
${kyselyTypes}

// ===== DB 接口 =====
${dbInterface}

${dbSchema}
`;
	}
}
