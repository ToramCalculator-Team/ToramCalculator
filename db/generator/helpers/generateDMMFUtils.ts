/**
 * @file generateDMMFUtils.ts
 * @description DMMF 工具生成器
 * 生成增强的 DMMF 信息和关系查询工具方法
 */

import type { DMMF } from "@prisma/generator-helper";
import { writeFileSafely } from "../utils/writeFileSafely";
import { findReverseRelationField, getBusinessRelationDirection } from "./businessRelation";
import { getDMMFPrimaryKeys } from "./dmmfHelpers";

/**
 * 规范化的物理外键关系事实。
 *
 * Prisma DMMF 会在关系对象字段上同时提供 relationFromFields 和
 * relationToFields。这里保留完整的列对，避免复合外键被错误拆成多条
 * 独立关系；业务层级关系（belongTo/usedBy 等）不参与该事实构建。
 */
type ForeignKeyRelation = {
	sourceTable: string;
	targetTable: string;
	relationName: string;
	relationField: string;
	sourceColumns: string[];
	targetColumns: string[];
	cardinality: "one-to-one" | "many-to-one";
	onDelete: string | null;
};

type ForeignKeyIndexEntry = Pick<
	ForeignKeyRelation,
	"sourceTable" | "targetTable" | "relationName" | "relationField" | "cardinality" | "onDelete"
>;

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
			primaryKeys: getDMMFPrimaryKeys(model),
			displayFields: model.fields
				.filter((field) => field.documentation?.includes("@displayName"))
				.map((field) => field.name),
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
	 * 构建业务数据依赖层级（DB_RELATION）。
	 *
	 * 父子方向由关系两端的字段命名共同决定；onDelete 是独立的数据库
	 * 引用动作，不参与业务依赖分类。
	 */
	private buildDBRelation() {
		// 注意：同一对表可能存在多条语义不同的关系（如 campA/campB, weapon/subWeapon）。
		// 因此 parents/children 的 value 必须是数组，避免被覆盖。
		const dbRelation: Record<string, { parents: Record<string, any[]>; children: Record<string, any[]> }> = {};

		// 初始化所有表的 parents 和 children
		for (const model of this.allModels) {
			const tableName = model.dbName || model.name;
			dbRelation[tableName] = {
				parents: {},
				children: {},
			};
		}

		for (const model of this.allModels) {
			const tableName = model.dbName || model.name;

			for (const field of model.fields) {
				if (field.kind !== "object") continue;

				const targetModel = this.allModels.find((candidate) => candidate.name === field.type);
				if (!targetModel) continue;
				const targetTableName = targetModel.dbName || targetModel.name;

				const reverseField = findReverseRelationField(this.allModels, model, field);
				const direction = getBusinessRelationDirection(this.allModels, model, field);
				if (!direction) continue;

				// 业务方向决定放入 parents/children；外键所在侧只决定如何查询，二者不能互相推导。
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
						const referencedField =
							field.relationToFields?.[0] || targetModel.fields.find((candidate) => candidate.isId)?.name || "id";
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
						const referencedField =
							reverseField.relationToFields?.[0] || model.fields.find((candidate) => candidate.isId)?.name || "id";
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
					structure: direction,
					relationFieldOnSelf: field.name,
					relationName: field.relationName || `${model.name}_${targetModel.name}`,
					query: queryPlan,
				};

				// 根据结构方向放入对应的 parents 或 children（按目标表名分桶，桶内允许多条关系）
				if (direction === "parent") {
					if (!dbRelation[tableName].parents[targetTableName]) {
						dbRelation[tableName].parents[targetTableName] = [];
					}
					dbRelation[tableName].parents[targetTableName].push(relationEntry);
				} else {
					if (!dbRelation[tableName].children[targetTableName]) {
						dbRelation[tableName].children[targetTableName] = [];
					}
					dbRelation[tableName].children[targetTableName].push(relationEntry);
				}
			}
		}

		return dbRelation;
	}

	/**
	 * 构建物理外键关系事实。
	 *
	 * 只有携带 relationFromFields 的关系对象字段才表示当前模型持有
	 * 外键。隐式多对多关系没有这组字段，因此不会被误判为 references；
	 * 复合外键则以完整的列对数组保留。`onDelete` 属于这组物理事实，
	 * 不进入 DB_RELATION，避免把删除生命周期误当成业务依赖方向。
	 */
	private buildForeignKeyRelations(): ForeignKeyRelation[] {
		const modelByName = new Map(this.allModels.map((model) => [model.name, model]));
		const relations: ForeignKeyRelation[] = [];

		for (const model of this.allModels) {
			for (const field of model.fields) {
				if (field.kind !== "object" || field.isList || !field.relationFromFields?.length) {
					continue;
				}

				const targetModel = modelByName.get(field.type);
				if (!targetModel) {
					throw new Error(`外键关系 ${model.name}.${field.name} 指向未知模型 ${field.type}`);
				}

				const sourceColumns = [...field.relationFromFields];
				const targetColumns = [...(field.relationToFields ?? [])];
				if (targetColumns.length !== sourceColumns.length || targetColumns.length === 0) {
					throw new Error(`外键关系 ${model.name}.${field.name} 的 relationFromFields/relationToFields 不匹配`);
				}

				const reverseField = findReverseRelationField(this.allModels, model, field);

				relations.push({
					sourceTable: model.dbName || model.name,
					targetTable: targetModel.dbName || targetModel.name,
					relationName: field.relationName || `${model.name}To${targetModel.name}`,
					relationField: field.name,
					sourceColumns,
					targetColumns,
					cardinality: reverseField?.isList ? "many-to-one" : "one-to-one",
					onDelete: field.relationOnDelete ?? null,
				});
			}
		}

		return relations.sort((a, b) => {
			const source = a.sourceTable.localeCompare(b.sourceTable);
			if (source !== 0) return source;
			return a.relationField.localeCompare(b.relationField);
		});
	}

	/**
	 * 从同一份外键事实构建正向和反向索引。
	 *
	 * 索引值只保留定位和类型推导所需的轻量信息，完整列对统一存放在
	 * FOREIGN_KEY_RELATIONS 中。正向索引按当前表和关系字段定位，反向
	 * 索引按目标表和“来源表.关系字段”定位，避免同一对表的多条外键覆盖。
	 */
	private buildForeignKeyIndexes(relations: ForeignKeyRelation[]) {
		const references: Record<string, Record<string, ForeignKeyIndexEntry>> = {};
		const referencedBy: Record<string, Record<string, ForeignKeyIndexEntry>> = {};

		for (const model of this.allModels) {
			const tableName = model.dbName || model.name;
			references[tableName] = {};
			referencedBy[tableName] = {};
		}

		for (const relation of relations) {
			const indexEntry: ForeignKeyIndexEntry = {
				sourceTable: relation.sourceTable,
				targetTable: relation.targetTable,
				relationName: relation.relationName,
				relationField: relation.relationField,
				cardinality: relation.cardinality,
				onDelete: relation.onDelete,
			};
			references[relation.sourceTable][relation.relationField] = indexEntry;
			referencedBy[relation.targetTable][`${relation.sourceTable}.${relation.relationField}`] = indexEntry;
		}

		return { references, referencedBy };
	}

	/**
	 * 生成文件内容
	 */
	private generateContent(): string {
		const metadata = this.buildMetadata();
		const relations = this.buildRelations();
		const dbRelation = this.buildDBRelation();
		const foreignKeyRelations = this.buildForeignKeyRelations();
		const { references, referencedBy } = this.buildForeignKeyIndexes(foreignKeyRelations);
		const metadataJson = JSON.stringify(metadata, null, 2);
		const relationsJson = JSON.stringify(relations, null, 2);
		const dbRelationJson = JSON.stringify(dbRelation, null, 2);
		const foreignKeyRelationsJson = JSON.stringify(foreignKeyRelations, null, 2);
		const referencesJson = JSON.stringify(references, null, 2);
		const referencedByJson = JSON.stringify(referencedBy, null, 2);
		const primaryKeysJson = JSON.stringify(
			Object.fromEntries(metadata.map((model) => [model.tableName, model.primaryKeys])),
			null,
			2,
		);

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
  /** 用于显示名称的字段列表（来自 Prisma 字段的 \`/// @displayName\` 注释）。
   * 多个字段按声明顺序拼接，以 " / " 分隔。
   * 未标记时为空数组，运行时降级取 name 字段或主键。 */
  displayFields: string[];
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
 * 物理外键关系事实。
 * sourceTable 持有 sourceColumns，并引用 targetTable 的 targetColumns。
 */
export interface ForeignKeyRelationMetadata {
  sourceTable: keyof DB;
  targetTable: keyof DB;
  relationName: string;
  relationField: string;
  sourceColumns: readonly string[];
  targetColumns: readonly string[];
  cardinality: "one-to-one" | "many-to-one";
  onDelete: string | null;
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
export type ChildTableOf<T extends keyof DB> = T extends keyof typeof DB_RELATION
	  ? keyof typeof DB_RELATION_DEFINITION[T]["children"]
	  : never;

/**
 * 获取父表类型（用于类型安全的配置）
 */
export type ParentTableOf<T extends keyof DB> = T extends keyof typeof DB_RELATION
	  ? keyof typeof DB_RELATION_DEFINITION[T]["parents"]
	  : never;

/**
 * 模型元数据（精简，不包含完整 DMMF）
 */
export const MODEL_METADATA: ModelMetadata[] = ${metadataJson};

/**
 * 每张表实际声明的主键字段。
 * 保留字面量元组，使单表和联合表名都能推导出对应的主键，而不是退化为所有表的公共字段。
 */
export const PRIMARY_KEYS = ${primaryKeysJson} as const satisfies {
  [T in keyof DB]: readonly (keyof DB[T])[];
};

/** 指定表的主键字段名。 */
export type PrimaryKeyOf<T extends keyof DB> = (typeof PRIMARY_KEYS)[T][number];

/**
 * 关系元数据
 */
export const RELATION_METADATA: RelationMetadata[] = ${relationsJson};

/**
 * 业务数据依赖层级（由关系两端的命名约定决定，不表达删除所有权）。
 */
const DB_RELATION_DEFINITION = ${dbRelationJson} satisfies DBRelation;

/**
 * 动态表名访问使用完整 DBRelation 接口；精确父子表类型从私有字面量
 * DB_RELATION_DEFINITION 推导。两者分开是为了同时支持运行时的 keyof DB
 * 索引和配置声明时的精确表名补全，避免宽类型把 ChildTableOf/ParentTableOf
 * 退化为 keyof DB。
 */
export const DB_RELATION: DBRelation = DB_RELATION_DEFINITION;

/**
 * 物理外键关系事实（与业务层级 DB_RELATION 分离）。
 */
export const FOREIGN_KEY_RELATIONS: readonly ForeignKeyRelationMetadata[] = ${foreignKeyRelationsJson};

/**
 * 当前表通过外键指向的目标表关系（轻量索引，完整列对见 FOREIGN_KEY_RELATIONS）。
 * 键为当前表，第二级键为当前表上的关系字段。
 */
export const DB_REFERENCES = ${referencesJson} as const;

/**
 * 通过外键指向当前表的来源关系（轻量索引，完整列对见 FOREIGN_KEY_RELATIONS）。
 * 键为目标表，第二级键为“来源表.关系字段”，避免同表多关系覆盖。
 */
export const DB_REFERENCED_BY = ${referencedByJson} as const;

/** 当前表 references 的关系字段名。 */
export type ReferenceRelationOf<T extends keyof DB> = T extends keyof typeof DB_REFERENCES
  ? keyof typeof DB_REFERENCES[T]
  : never;

type ReferenceEntryOf<T extends keyof DB, R extends PropertyKey> = T extends keyof typeof DB_REFERENCES
  ? R extends keyof typeof DB_REFERENCES[T]
    ? typeof DB_REFERENCES[T][R]
    : never
  : never;

/** 当前表指定关系字段对应的真实目标表。 */
export type ReferenceTableOf<
  T extends keyof DB,
  R extends ReferenceRelationOf<T> = ReferenceRelationOf<T>,
> = ReferenceEntryOf<T, R> extends { targetTable: infer U } ? Extract<U, keyof DB> : never;

/** 当前表的关系声明，relation 与 tableName 必须保持对应。 */
export type ReferenceDecl<T extends keyof DB> = {
  [R in ReferenceRelationOf<T>]: {
    relation: R;
    tableName: ReferenceTableOf<T, R>;
  };
}[ReferenceRelationOf<T>];

/** 指向当前表的来源关系键。 */
export type ReferencedByRelationOf<T extends keyof DB> = T extends keyof typeof DB_REFERENCED_BY
  ? keyof typeof DB_REFERENCED_BY[T]
  : never;

type ReferencedByEntryOf<T extends keyof DB, R extends PropertyKey> = T extends keyof typeof DB_REFERENCED_BY
  ? R extends keyof typeof DB_REFERENCED_BY[T]
    ? typeof DB_REFERENCED_BY[T][R]
    : never
  : never;

/** 当前表指定来源关系对应的真实来源表。 */
export type ReferencedByTableOf<
  T extends keyof DB,
  R extends ReferencedByRelationOf<T> = ReferencedByRelationOf<T>,
> = ReferencedByEntryOf<T, R> extends { sourceTable: infer U } ? Extract<U, keyof DB> : never;

/** 指向当前表的来源关系声明，relation 与 tableName 必须保持对应。 */
export type ReferencedByDecl<T extends keyof DB> = {
  [R in ReferencedByRelationOf<T>]: {
    relation: R;
    tableName: ReferencedByTableOf<T, R>;
  };
}[ReferencedByRelationOf<T>];

/** 兼容旧名称：当前表可用的物理外键关系字段名。 */
export type ReferenceRelationFieldOf<T extends keyof DB> = ReferenceRelationOf<T>;

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
 * @returns 该表的主键字段元组
 */
export function getPrimaryKeys<T extends keyof DB>(tableName: T): (typeof PRIMARY_KEYS)[T] {
  return PRIMARY_KEYS[tableName];
}

/**
 * 获取子关系表名称
 * @param tableName 表名
 * @returns 子关系表名数组
 */
export function getChildRelationNames(tableName: string): string[] {
	  if (!(tableName in DB_RELATION)) {
	    console.warn(\`Table \${tableName} not found in DB_RELATION\`);
	    return [];
	  }

	  return Object.keys(DB_RELATION[tableName as keyof typeof DB_RELATION].children);
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
  // 兼容旧调用入口；父子分类和查询实现必须只有 getChildrenDatas 一份事实源。
  return getChildrenDatas(db, tableName, primaryKey);
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
  return primaryKeys.some((primaryKey) => primaryKey === fieldName);
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
