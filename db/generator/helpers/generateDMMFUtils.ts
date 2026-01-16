/**
 * @file generateDMMFUtils.ts
 * @description DMMF 工具生成器
 * 生成增强的 DMMF 信息和关系查询工具方法
 */

import type { DMMF } from "@prisma/generator-helper";
import { writeFileSafely } from "../utils/writeFileSafely";

/**
 * DMMF 工具生成器
 */
export class DMMFUtilsGenerator {
	private dmmf: DMMF.Document;
	private allModels: readonly DMMF.Model[];

	constructor(dmmf: DMMF.Document, allModels: DMMF.Model[]) {
		this.dmmf = dmmf;
		this.allModels = allModels;
	}

	/**
	 * 生成 DMMF 工具文件
	 */
	async generate(outputPath: string): Promise<void> {
		try {
			console.log("生成 DMMF 工具文件...");

			const content = this.generateContent();
			writeFileSafely(outputPath, content);

			console.log("DMMF 工具文件生成完成");
		} catch (error) {
			console.error("DMMF 工具文件生成失败:", error);
			throw error;
		}
	}

	/**
	 * 构建模型元数据
	 */
	private buildMetadata() {
		return this.allModels.map((model) => ({
			name: model.name,
			tableName: model.dbName || model.name,
			primaryKeys: model.fields.filter((f) => f.isId).map((f) => f.name),
			fields: model.fields.map((field) => ({
				name: field.name,
				kind: field.kind,
				type: field.type,
				isList: field.isList || false,
				isRequired: field.isRequired || false,
				isId: field.isId || false,
				isUnique: field.isUnique || false,
				relationName: field.relationName || undefined,
				relationFromFields: field.relationFromFields || undefined,
				relationToFields: field.relationToFields || undefined,
			})),
		}));
	}

	/**
	 * 构建关系元数据
	 */
	private buildRelations() {
		const relations: any[] = [];
		const processed = new Set<string>();

		for (const model of this.allModels) {
			for (const field of model.fields) {
				if (field.kind !== "object") continue;

				const relationKey = `${field.relationName}_${model.name}_${field.type}`;
				if (processed.has(relationKey)) continue;
				processed.add(relationKey);

				const targetModel = this.allModels.find((m) => m.name === field.type);
				if (!targetModel) continue;

				const targetField = targetModel.fields.find(
					(f) => f.kind === "object" && f.relationName === field.relationName,
				);

				const fromTableName = model.dbName || model.name;
				const toTableName = targetModel.dbName || targetModel.name;

				let relationType: string;
				let joinTable: string | undefined;

				if (field.isList && targetField?.isList) {
					relationType = "ManyToMany";
					// 生成中间表名
					const [first, second] = [model.name, targetModel.name].sort();
					joinTable = `_${first}To${second}`;
				} else if (field.isList) {
					relationType = "OneToMany";
				} else if (targetField?.isList) {
					relationType = "ManyToOne";
				} else {
					relationType = "OneToOne";
				}

				relations.push({
					name: field.relationName || `${model.name}_${targetModel.name}`,
					from: fromTableName,
					to: toTableName,
					type: relationType,
					fromField: field.name,
					toField: targetField?.name,
					joinTable,
					fromHasForeignKey: !!(field.relationFromFields && field.relationFromFields.length > 0),
				});
			}
		}

		return relations;
	}

	/**
	 * 判断字段名是否表示父关系（基于前缀规则）
	 */
	private isParentRelation(fieldName: string): boolean {
		const parentPrefixes = ["belongTo", "usedBy", "createdBy", "updatedBy"];
		return parentPrefixes.some((prefix) => fieldName.startsWith(prefix));
	}

	/**
	 * 构建数据层级关系（DB_RELATION）
	 */
	private buildDBRelation() {
		const metadata = this.buildMetadata();
		const modelToTableMap = new Map<string, string>(
			metadata.map((m) => [m.name, m.tableName]),
		);
		const tableToModelMap = new Map<string, typeof metadata[0]>(
			metadata.map((m) => [m.tableName, m]),
		);

		// 注意：同一对表可能存在多条语义不同的关系（如 campA/campB, weapon/subWeapon）。
		// 因此 parents/children 的 value 必须是数组，避免被覆盖。
		const dbRelation: Record<string, { parents: Record<string, any[]>; children: Record<string, any[]> }> = {};

		// 初始化所有表的 parents 和 children
		for (const model of metadata) {
			dbRelation[model.tableName] = {
				parents: {},
				children: {},
			};
		}

		// 遍历所有模型的关系字段
		for (const model of metadata) {
			for (const field of model.fields) {
				if (field.kind !== "object") continue;

				const targetTableName = modelToTableMap.get(field.type);
				if (!targetTableName) continue;

				const targetModel = tableToModelMap.get(targetTableName);
				if (!targetModel) continue;

				// 找到反向字段
				const reverseField = targetModel.fields.find(
					(f) =>
						f.kind === "object" &&
						f.name !== field.name &&
						f.relationName === field.relationName &&
						f.type === model.name,
				);

				// 判断结构方向（基于字段名前缀）
				const isParent = this.isParentRelation(field.name);

				// 构建查询计划
				let queryPlan: any;

				// 判断是否为多对多
				const isManyToMany = field.isList && reverseField?.isList;

				if (isManyToMany) {
					// 多对多关系
					// Prisma 约定：中间表名为 _relationName（你们的 campA/campB、frontRelation/backRelation 也是这种）
					const relationName = field.relationName;
					if (!relationName) continue;
					const joinTable = `_${relationName}`;
					queryPlan = {
						kind: "m2m",
						joinTable,
						selfJoinColumn: "A",
						otherJoinColumn: "B",
					};
				} else {
					// FK 关系
					const hasFkOnSelf = field.relationFromFields && field.relationFromFields.length > 0;
					const hasFkOnOther = reverseField?.relationFromFields && reverseField.relationFromFields.length > 0;

					if (hasFkOnSelf) {
						// FK 在本表
						const fkField = field.relationFromFields?.[0];
						if (!fkField) continue;
						const referencedField = field.relationToFields?.[0] || targetModel.primaryKeys[0] || "id";
						queryPlan = {
							kind: "fk",
							fkOn: "self",
							fkField,
							referencedField,
						};
					} else if (hasFkOnOther) {
						// FK 在对表
						const fkField = reverseField.relationFromFields?.[0];
						if (!fkField) continue;
						const referencedField = reverseField.relationToFields?.[0] || model.primaryKeys[0] || "id";
						queryPlan = {
							kind: "fk",
							fkOn: "other",
							fkField,
							referencedField,
						};
					} else {
						// 理论上不应该出现，但容错处理
						continue;
					}
				}

				// 构建关系条目
				const relationEntry = {
					structure: isParent ? "parent" : "child",
					relationFieldOnSelf: field.name,
					relationName: field.relationName || `${model.name}_${targetModel.name}`,
					query: queryPlan,
				};

				// 根据结构方向放入对应的 parents 或 children（按目标表名分桶，桶内允许多条关系）
				if (isParent) {
					if (!dbRelation[model.tableName].parents[targetTableName]) {
						dbRelation[model.tableName].parents[targetTableName] = [];
					}
					dbRelation[model.tableName].parents[targetTableName].push(relationEntry);
				} else {
					if (!dbRelation[model.tableName].children[targetTableName]) {
						dbRelation[model.tableName].children[targetTableName] = [];
					}
					dbRelation[model.tableName].children[targetTableName].push(relationEntry);
				}
			}
		}

		return dbRelation;
	}

	/**
	 * 生成文件内容
	 */
	private generateContent(): string {
		const metadata = this.buildMetadata();
		const relations = this.buildRelations();
		const dbRelation = this.buildDBRelation();
		const metadataJson = JSON.stringify(metadata, null, 2);
		const relationsJson = JSON.stringify(relations, null, 2);
		const dbRelationJson = JSON.stringify(dbRelation, null, 2);

		return `/**
 * @file dmmf-utils.ts
 * @description DMMF 工具和关系查询方法
 * @generated 自动生成，请勿手动修改
 */

/**
 * ## 命名规范（工程约定）
 *
 * - **动词前缀**
 *   - "isXxx": 返回 boolean
 *   - "getXxx": 返回单值（可能为 undefined）
 *   - "listXxx": 返回数组
 * - **领域缩写**
 *   - "pk": Primary Key
 *   - "fk": Foreign Key
 *   - "m2m": Many-to-Many
 * - **关键区分**
 *   - "Column": 指数据库中的**标量列**（例如 "worldId"）
 *   - "RelationField": 指 Prisma/DMMF 中的**关系对象字段**（kind === "object"，例如 "belongToWorld"）
 *
 * > 重要：不要用含糊的 "Field" 同时表示 Column 和 RelationField。
 */

import type { Kysely } from "kysely";
import type { DB } from "./zod/index";

/**
 * 模型元数据接口
 */
export interface ModelMetadata {
  name: string;
  tableName: string;
  primaryKeys: string[];
  fields: FieldMetadata[];
}

export interface FieldMetadata {
  name: string;
  kind: string;
  type: string;
  isList: boolean;
  isRequired: boolean;
  isId: boolean;
  isUnique: boolean;
  relationName?: string;
  relationFromFields?: readonly string[];
  relationToFields?: readonly string[];
}

/**
 * 关系元数据接口
 */
export interface RelationMetadata {
  name: string;
  from: string;
  to: string;
  type: "ManyToMany" | "ManyToOne" | "OneToOne" | "OneToMany";
  fromField?: string;
  toField?: string;
  joinTable?: string;
  fromHasForeignKey?: boolean;
}

/**
 * 查询计划接口
 */
export type RelationQueryPlan =
  | {
      kind: "fk";
      fkOn: "self" | "other";
      fkField: string;
      referencedField: string;
    }
  | {
      kind: "m2m";
      joinTable: string;
      selfJoinColumn: string;
      otherJoinColumn: string;
    };

/**
 * 关系条目接口
 */
export interface DBRelationEntry {
  structure: "parent" | "child";
  relationFieldOnSelf: string;
  relationName: string;
  query: RelationQueryPlan;
}

/**
 * 数据层级关系类型
 */
export type DBRelation = {
  [Self in keyof DB]: {
    parents: Partial<{ [Parent in keyof DB]: DBRelationEntry[] }>;
    children: Partial<{ [Child in keyof DB]: DBRelationEntry[] }>;
  };
};

/**
 * 获取子表类型（用于类型安全的配置）
 */
export type ChildTableOf<T extends keyof DB> = keyof DBRelation[T]["children"];

/**
 * 获取父表类型（用于类型安全的配置）
 */
export type ParentTableOf<T extends keyof DB> = keyof DBRelation[T]["parents"];

/**
 * 模型元数据（精简，不包含完整 DMMF）
 */
export const MODEL_METADATA: ModelMetadata[] = ${metadataJson};

/**
 * 关系元数据
 */
export const RELATION_METADATA: RelationMetadata[] = ${relationsJson};

/**
 * 数据层级关系（基于字段名前缀规则）
 */
export const DB_RELATION: DBRelation = ${dbRelationJson} as DBRelation;

/**
 * 模型映射表：模型名 -> 表名
 */
const MODEL_TO_TABLE_MAP = new Map<string, string>(
  MODEL_METADATA.map((model) => [model.name, model.tableName])
);

/**
 * 表映射表：表名 -> 模型
 */
const TABLE_TO_MODEL_MAP = new Map<string, ModelMetadata>(
  MODEL_METADATA.map((model) => [model.tableName, model])
);

/**
 * 获取表的主键字段
 * @param tableName 表名
 * @returns 主键字段名数组
 */
export function getPrimaryKeys<T extends keyof DB>(tableName: T): Array<keyof DB[T]> {
  const model = TABLE_TO_MODEL_MAP.get(tableName as string);
  if (!model) {
    console.warn(\`Table \${String(tableName)} not found in DMMF\`);
    return [];
  }

  const primaryKeys = model.fields
    .filter((field) => field.isId)
    .map((field) => field.name);

  return primaryKeys as Array<keyof DB[T]>;
}

/**
 * 获取子关系表名称
 * @param tableName 表名
 * @returns 子关系表名数组
 */
export function getChildRelationNames(tableName: string): string[] {
  const model = TABLE_TO_MODEL_MAP.get(tableName);
  if (!model) {
    console.warn(\`Table \${tableName} not found in metadata\`);
    return [];
  }

  // 查找所有关系字段（kind === 'object' 且 isList === true）
  const childRelations = model.fields
    .filter((field) => field.kind === "object" && field.isList)
    .map((field) => {
      // 获取关系目标表名
      const targetModel = MODEL_METADATA.find((m) => m.name === field.type);
      return targetModel ? targetModel.tableName : field.type;
    })
    .filter((name, index, self) => self.indexOf(name) === index); // 去重

  return childRelations;
}

/**
 * 获取两个表之间的关系类型
 * @param table1 表1名称
 * @param table2 表2名称
 * @param relationName 可选的关系名称
 * @returns 关系类型
 */
export function getRelationType(
  table1: string,
  table2: string,
  relationName?: string
): "ManyToMany" | "ManyToOne" | "OneToOne" | "OneToMany" | null {
  const model1 = TABLE_TO_MODEL_MAP.get(table1);
  const model2 = TABLE_TO_MODEL_MAP.get(table2);

  if (!model1 || !model2) {
    console.warn(\`One or both tables not found: \${table1}, \${table2}\`);
    return null;
  }

  // 查找 model1 中指向 model2 的关系字段
  const field1 = model1.fields.find(
    (f) =>
      f.kind === "object" &&
      f.type === model2.name &&
      (!relationName || f.relationName === relationName)
  );

  // 查找 model2 中指向 model1 的关系字段
  const field2 = model2.fields.find(
    (f) =>
      f.kind === "object" &&
      f.type === model1.name &&
      (!relationName || f.relationName === relationName)
  );

  if (!field1 && !field2) {
    return null;
  }

  // 判断关系类型
  const isList1 = field1?.isList || false;
  const isList2 = field2?.isList || false;
  const hasFromFields1 = field1?.relationFromFields && field1.relationFromFields.length > 0;
  const hasFromFields2 = field2?.relationFromFields && field2.relationFromFields.length > 0;

  if (isList1 && isList2) {
    return "ManyToMany";
  }

  if (isList1 && !isList2) {
    return "OneToMany"; // model1 的视角
  }

  if (!isList1 && isList2) {
    return "ManyToOne"; // model1 的视角
  }

  if (!isList1 && !isList2) {
    return "OneToOne";
  }

  return null;
}

/**
 * 获取多对多关系的中间表名
 * @param table1 表1名称
 * @param table2 表2名称
 * @param relationName 可选的关系名称
 * @returns 中间表名，如果不是多对多关系则返回 null
 */
export function getManyToManyTableName(
  table1: string,
  table2: string,
  relationName?: string
): string | null {
  const relationType = getRelationType(table1, table2, relationName);

  if (relationType !== "ManyToMany") {
    return null;
  }

  const model1 = TABLE_TO_MODEL_MAP.get(table1);
  const model2 = TABLE_TO_MODEL_MAP.get(table2);

  if (!model1 || !model2) {
    return null;
  }

  // 查找关系名称
  const field = model1.fields.find(
    (f) =>
      f.kind === "object" &&
      f.type === model2.name &&
      f.isList &&
      (!relationName || f.relationName === relationName)
  );

  if (!field || !field.relationName) {
    return null;
  }

  // 中间表名格式：_relationName
  return \`_\${field.relationName}\`;
}

/**
 * 获取子关系数据（运行时查询函数）
 * @param db Kysely 数据库实例
 * @param tableName 表名
 * @param primaryKey 主键值
 * @returns 子关系数据对象
 */
export async function getChildRelations<T extends keyof DB>(
  db: Kysely<DB>,
  tableName: T,
  primaryKey: string | number
): Promise<Partial<{ [K in keyof DB]: DB[K][] }>> {
  const childRelationNames = getChildRelationNames(tableName as string);
  const primaryKeys = getPrimaryKeys(tableName);

  if (primaryKeys.length === 0) {
    console.warn(\`No primary key found for table \${String(tableName)}\`);
    return {};
  }

  const primaryKeyField = primaryKeys[0] as string;
  const result: Partial<{ [K in keyof DB]: DB[K][] }> = {};

  // 并行查询所有子关系
  await Promise.all(
    childRelationNames.map(async (childTableName) => {
      try {
        const relationType = getRelationType(tableName as string, childTableName);

        if (relationType === "OneToMany" || relationType === "ManyToMany") {
          let query;

          if (relationType === "ManyToMany") {
            // 多对多：需要通过中间表查询
            const joinTableName = getManyToManyTableName(
              tableName as string,
              childTableName
            );

            if (!joinTableName) {
              console.warn(\`Join table not found for \${String(tableName)} -> \${childTableName}\`);
              return;
            }

            // 动态构建查询
            const childPrimaryKeys = getPrimaryKeys(childTableName as keyof DB);
            if (childPrimaryKeys.length === 0) {
              console.warn(\`No primary key found for child table \${childTableName}\`);
              return;
            }

            const childPrimaryKeyField = childPrimaryKeys[0] as string;

            // 使用 any 类型绕过 kysely 类型检查，因为中间表可能不在 DB 类型中
            query = (db as any)
              .selectFrom(childTableName)
              .innerJoin(
                joinTableName,
                \`\${childTableName}.\${childPrimaryKeyField}\`,
                \`\${joinTableName}.B\`
              )
              .where(\`\${joinTableName}.A\`, "=", primaryKey)
              .selectAll(childTableName);
          } else {
            // 一对多：直接查询外键
            const childModel = TABLE_TO_MODEL_MAP.get(childTableName);
            if (!childModel) {
              return;
            }

            // 查找指向父表的外键字段
            const parentModel = TABLE_TO_MODEL_MAP.get(tableName as string);
            if (!parentModel) {
              return;
            }

            const foreignKeyField = childModel.fields.find(
              (f) =>
                f.kind === "object" &&
                f.type === parentModel.name &&
                f.relationFromFields &&
                f.relationFromFields.length > 0
            );

            if (!foreignKeyField || !foreignKeyField.relationFromFields) {
              return;
            }

            const fkFieldName = foreignKeyField.relationFromFields[0];

            query = (db as any)
              .selectFrom(childTableName)
              .where(fkFieldName, "=", primaryKey)
              .selectAll();
          }

          const data = await query.execute();
          result[childTableName as keyof DB] = data as any;
        }
      } catch (error) {
        console.error(\`Error querying child relation \${childTableName}:\`, error);
      }
    })
  );

  return result;
}

/**
 * 获取模型的所有字段信息
 * @param tableName 表名
 * @returns 字段信息数组
 */
export function getModelFields(tableName: string) {
  const model = TABLE_TO_MODEL_MAP.get(tableName);
  return model?.fields || [];
}

/**
 * 获取所有表名
 * @returns 表名数组
 */
export function getAllTableNames(): string[] {
  return Array.from(TABLE_TO_MODEL_MAP.keys());
}

/**
 * 检查表是否为中间表（关系表）
 * @param tableName 表名
 * @returns 是否为中间表
 */
export function isJoinTable(tableName: string): boolean {
  return tableName.startsWith("_");
}

/**
 * 外键引用信息（统一结构）
 */
export type FkRef = {
  table: keyof DB;
  field: string;
  relationField: string;
};

/**
 * 判断“关系对象字段”是否携带外键（fk 在本表）
 */
export function isFkRelationField<T extends keyof DB>(tableName: T, fieldName: keyof DB[T]): boolean {
  const model = TABLE_TO_MODEL_MAP.get(tableName as string);
  if (!model) return false;
  
  const field = model.fields.find(f => f.name === fieldName);
  if (!field || field.kind !== "object") return false;
  
  return !field.isList && !!field.relationFromFields && field.relationFromFields.length > 0;
}

/**
 * 列出所有“关系对象字段”（fk 在本表）
 */
export function listFkRelationFields<T extends keyof DB>(tableName: T): (keyof DB[T])[] {
  const model = TABLE_TO_MODEL_MAP.get(tableName as string);
  if (!model) return [];
  
  return model.fields
    .filter(field => 
      field.kind === "object" && 
      !field.isList && 
      field.relationFromFields && 
      field.relationFromFields.length > 0
    )
    .map(field => field.name as keyof DB[T]);
}

/**
 * 判断字段是否为主键
 */
export function isPrimaryKeyField<T extends keyof DB>(tableName: T, fieldName: keyof DB[T]): boolean {
  const primaryKeys = getPrimaryKeys(tableName);
  return primaryKeys.includes(fieldName);
}

/**
 * 获取“关系对象字段”的外键引用（fk 在本表）
 */
export function getFkRefByRelationField<T extends keyof DB>(
  tableName: T, 
  fieldName: keyof DB[T]
): FkRef | undefined {
  const model = TABLE_TO_MODEL_MAP.get(tableName as string);
  if (!model) return undefined;
  
  const field = model.fields.find(f => f.name === fieldName);
  if (!field || field.kind !== "object") return undefined;
  
  const targetTableName = MODEL_TO_TABLE_MAP.get(field.type);
  if (!targetTableName) return undefined;
  
  const targetModel = TABLE_TO_MODEL_MAP.get(targetTableName);
  if (!targetModel) return undefined;
  
  // 获取引用的字段（通常是目标表的主键）
  const referencedField = field.relationToFields?.[0] || targetModel.primaryKeys[0] || "id";
  
  return {
    table: targetTableName as keyof DB,
    field: referencedField,
    relationField: String(fieldName),
  };
}

/**
 * 获取“外键标量列”的外键引用（由 relationField.relationFromFields 反推）
 */
export function getFkRefByColumn<T extends keyof DB>(
  tableName: T,
  column: keyof DB[T]
): FkRef | undefined {
  const model = TABLE_TO_MODEL_MAP.get(tableName as string);
  if (!model) return undefined;

  const columnName = String(column);
  const relationField = model.fields.find(
    (f) =>
      f.kind === "object" &&
      !f.isList &&
      Array.isArray(f.relationFromFields) &&
      f.relationFromFields.includes(columnName)
  );
  if (!relationField) return undefined;

  const targetTableName = MODEL_TO_TABLE_MAP.get(relationField.type);
  if (!targetTableName) return undefined;
  const targetModel = TABLE_TO_MODEL_MAP.get(targetTableName);
  if (!targetModel) return undefined;

  const referencedField = relationField.relationToFields?.[0] || targetModel.primaryKeys[0] || "id";
  return {
    table: targetTableName as keyof DB,
    field: referencedField,
    relationField: relationField.name,
  };
}

/**
 * 判断字段是否为外键标量列（如 worldId）
 */
export function isFkColumn<T extends keyof DB>(tableName: T, column: keyof DB[T]): boolean {
  return !!getFkRefByColumn(tableName, column);
}

/**
 * 列出表内所有外键标量列名（去重）
 */
export function listFkColumns<T extends keyof DB>(tableName: T): (keyof DB[T])[] {
  const model = TABLE_TO_MODEL_MAP.get(tableName as string);
  if (!model) return [];

  const set = new Set<string>();
  for (const field of model.fields) {
    if (field.kind !== "object" || field.isList) continue;
    if (!Array.isArray(field.relationFromFields) || field.relationFromFields.length === 0) continue;
    for (const col of field.relationFromFields) set.add(col);
  }
  return Array.from(set) as (keyof DB[T])[];
}

/**
 * @deprecated 请使用 isFkRelationField（旧名语义易误解：它判断的是 relationField，不是 fk column）
 */
export function isForeignKeyField<T extends keyof DB>(tableName: T, fieldName: keyof DB[T]): boolean {
  return isFkRelationField(tableName, fieldName);
}

/**
 * @deprecated 请使用 listFkRelationFields（旧名语义易误解：它返回的是 relationField，不是 fk column）
 */
export function getForeignKeyFields<T extends keyof DB>(tableName: T): (keyof DB[T])[] {
  return listFkRelationFields(tableName);
}

/**
 * @deprecated 请使用 getFkRefByRelationField（旧名语义易误解：入参是 relationField，不是 fk column）
 */
export function getForeignKeyReference<T extends keyof DB>(
  tableName: T,
  fieldName: keyof DB[T]
): { table: keyof DB; field: string } | undefined {
  const ref = getFkRefByRelationField(tableName, fieldName);
  if (!ref) return undefined;
  return { table: ref.table, field: ref.field };
}

/**
 * 获取父关系数据
 * @param db Kysely 数据库实例
 * @param tableName 表名
 * @param primaryKey 主键值
 * @returns 父关系数据对象
 */
export async function getParentDatas<T extends keyof DB>(
  db: Kysely<DB>,
  tableName: T,
  primaryKey: string | number
): Promise<Partial<{ [K in keyof DB]: DB[K][] }>> {
  const primaryKeys = getPrimaryKeys(tableName);
  if (primaryKeys.length === 0) {
    console.warn(\`No primary key found for table \${String(tableName)}\`);
    return {};
  }

  const primaryKeyField = primaryKeys[0] as string;
  const result: Partial<{ [K in keyof DB]: DB[K][] }> = {};

  // 先读取当前行（需要主键和所有 fkOn=self 的外键列）
  const currentRow = await (db as any)
    .selectFrom(tableName)
    .where(primaryKeyField, "=", primaryKey)
    .selectAll()
    .executeTakeFirst();

  if (!currentRow) {
    return result;
  }

  const relations = DB_RELATION[tableName];
  if (!relations) {
    return result;
  }

  // 并行查询所有父关系
  await Promise.all(
    Object.entries(relations.parents).map(async ([parentTableName, relationEntries]) => {
      try {
        if (!relationEntries || relationEntries.length === 0) return;

        const parentPkArr = getPrimaryKeys(parentTableName as keyof DB);
        const parentPk = parentPkArr.length > 0 ? (parentPkArr[0] as string) : undefined;
        const seen = new Set<string>();
        const pushRows = (rows: any[]) => {
          if (!rows || rows.length === 0) return;
          if (!result[parentTableName as keyof DB]) result[parentTableName as keyof DB] = [] as any;
          for (const row of rows) {
            if (!row) continue;
            if (!parentPk) {
              (result[parentTableName as keyof DB] as any).push(row);
              continue;
            }
            const key = String(row[parentPk] ?? "");
            if (!key) continue;
            if (seen.has(key)) continue;
            seen.add(key);
            (result[parentTableName as keyof DB] as any).push(row);
          }
        };

        // 多条关系对同一父表：逐条查询并合并去重
        for (const relationEntry of relationEntries) {
          if (!relationEntry) continue;
          const { query } = relationEntry;

          if (query.kind === "fk") {
            if (query.fkOn === "self") {
              // FK 在本表，用当前行的 fk 值去父表查询
              const fkValue = currentRow[query.fkField];
              if (fkValue == null) continue;

              const row = await (db as any)
                .selectFrom(parentTableName)
                .where(query.referencedField, "=", fkValue)
                .selectAll()
                .executeTakeFirst();
              pushRows(row ? [row] : []);
            } else {
              // FK 在父表：父表 where fkField = primaryKey（可能多条）
              const rows = await (db as any)
                .selectFrom(parentTableName)
                .where(query.fkField, "=", primaryKey)
                .selectAll()
                .execute();
              pushRows(rows);
            }
          } else if (query.kind === "m2m") {
            const parentPrimaryKeys = getPrimaryKeys(parentTableName as keyof DB);
            if (parentPrimaryKeys.length === 0) continue;
            const parentPrimaryKeyField = parentPrimaryKeys[0] as string;
            const isSelfRelation = tableName === parentTableName;

            if (isSelfRelation) {
              const q1 = (db as any)
                .selectFrom(parentTableName)
                .innerJoin(
                  query.joinTable,
                  \`\${parentTableName}.\${parentPrimaryKeyField}\`,
                  \`\${query.joinTable}.\${query.otherJoinColumn}\`
                )
                .where(\`\${query.joinTable}.\${query.selfJoinColumn}\`, "=", primaryKey)
                .selectAll(parentTableName);

              const q2 = (db as any)
                .selectFrom(parentTableName)
                .innerJoin(
                  query.joinTable,
                  \`\${parentTableName}.\${parentPrimaryKeyField}\`,
                  \`\${query.joinTable}.\${query.selfJoinColumn}\`
                )
                .where(\`\${query.joinTable}.\${query.otherJoinColumn}\`, "=", primaryKey)
                .selectAll(parentTableName);

              const [rows1, rows2] = await Promise.all([q1.execute(), q2.execute()]);
              pushRows([...rows1, ...rows2]);
            } else {
              const rows = await (db as any)
                .selectFrom(parentTableName)
                .innerJoin(
                  query.joinTable,
                  \`\${parentTableName}.\${parentPrimaryKeyField}\`,
                  \`\${query.joinTable}.\${query.otherJoinColumn}\`
                )
                .where(\`\${query.joinTable}.\${query.selfJoinColumn}\`, "=", primaryKey)
                .selectAll(parentTableName)
                .execute();
              pushRows(rows);
            }
          }
        }
      } catch (error) {
        console.error(\`Error querying parent relation \${parentTableName}:\`, error);
      }
    })
  );

  return result;
}

/**
 * 获取子关系数据
 * @param db Kysely 数据库实例
 * @param tableName 表名
 * @param primaryKey 主键值
 * @returns 子关系数据对象
 */
export async function getChildrenDatas<T extends keyof DB>(
  db: Kysely<DB>,
  tableName: T,
  primaryKey: string | number
): Promise<Partial<{ [K in keyof DB]: DB[K][] }>> {
  const primaryKeys = getPrimaryKeys(tableName);
  if (primaryKeys.length === 0) {
    console.warn(\`No primary key found for table \${String(tableName)}\`);
    return {};
  }

  const primaryKeyField = primaryKeys[0] as string;
  const result: Partial<{ [K in keyof DB]: DB[K][] }> = {};

  // 先读取当前行（child 查询里也可能需要 fkOn=self 的值，比如 template 这种 child 属性）
  const currentRow = await (db as any)
    .selectFrom(tableName)
    .where(primaryKeyField, "=", primaryKey)
    .selectAll()
    .executeTakeFirst();

  if (!currentRow) {
    return result;
  }

  const relations = DB_RELATION[tableName];
  if (!relations) {
    return result;
  }

  // 并行查询所有子关系
  await Promise.all(
    Object.entries(relations.children).map(async ([childTableName, relationEntries]) => {
      try {
        if (!relationEntries || relationEntries.length === 0) return;

        const childPkArr = getPrimaryKeys(childTableName as keyof DB);
        const childPk = childPkArr.length > 0 ? (childPkArr[0] as string) : undefined;
        const seen = new Set<string>();
        const pushRows = (rows: any[]) => {
          if (!rows || rows.length === 0) return;
          if (!result[childTableName as keyof DB]) result[childTableName as keyof DB] = [] as any;
          for (const row of rows) {
            if (!row) continue;
            if (!childPk) {
              (result[childTableName as keyof DB] as any).push(row);
              continue;
            }
            const key = String(row[childPk] ?? "");
            if (!key) continue;
            if (seen.has(key)) continue;
            seen.add(key);
            (result[childTableName as keyof DB] as any).push(row);
          }
        };

        for (const relationEntry of relationEntries) {
          if (!relationEntry) continue;
          const { query } = relationEntry;

          if (query.kind === "fk") {
            if (query.fkOn === "other") {
              const rows = await (db as any)
                .selectFrom(childTableName)
                .where(query.fkField, "=", primaryKey)
                .selectAll()
                .execute();
              pushRows(rows);
            } else {
              const fkValue = currentRow[query.fkField];
              if (fkValue == null) continue;
              const rows = await (db as any)
                .selectFrom(childTableName)
                .where(query.referencedField, "=", fkValue)
                .selectAll()
                .execute();
              pushRows(rows);
            }
          } else if (query.kind === "m2m") {
            const childPrimaryKeys = getPrimaryKeys(childTableName as keyof DB);
            if (childPrimaryKeys.length === 0) continue;
            const childPrimaryKeyField = childPrimaryKeys[0] as string;
            const isSelfRelation = tableName === childTableName;

            if (isSelfRelation) {
              const q1 = (db as any)
                .selectFrom(childTableName)
                .innerJoin(
                  query.joinTable,
                  \`\${childTableName}.\${childPrimaryKeyField}\`,
                  \`\${query.joinTable}.\${query.otherJoinColumn}\`
                )
                .where(\`\${query.joinTable}.\${query.selfJoinColumn}\`, "=", primaryKey)
                .selectAll(childTableName);

              const q2 = (db as any)
                .selectFrom(childTableName)
                .innerJoin(
                  query.joinTable,
                  \`\${childTableName}.\${childPrimaryKeyField}\`,
                  \`\${query.joinTable}.\${query.selfJoinColumn}\`
                )
                .where(\`\${query.joinTable}.\${query.otherJoinColumn}\`, "=", primaryKey)
                .selectAll(childTableName);

              const [rows1, rows2] = await Promise.all([q1.execute(), q2.execute()]);
              pushRows([...rows1, ...rows2]);
            } else {
              const rows = await (db as any)
                .selectFrom(childTableName)
                .innerJoin(
                  query.joinTable,
                  \`\${childTableName}.\${childPrimaryKeyField}\`,
                  \`\${query.joinTable}.\${query.otherJoinColumn}\`
                )
                .where(\`\${query.joinTable}.\${query.selfJoinColumn}\`, "=", primaryKey)
                .selectAll(childTableName)
                .execute();
              pushRows(rows);
            }
          }
        }
      } catch (error) {
        console.error(\`Error querying child relation \${childTableName}:\`, error);
      }
    })
  );

  return result;
}
`;
	}
}
