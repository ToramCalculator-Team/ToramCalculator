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
      console.log("🔧 生成 DMMF 工具文件...");

      const content = this.generateContent();
      writeFileSafely(outputPath, content);

      console.log("✅ DMMF 工具文件生成完成");
    } catch (error) {
      console.error("❌ DMMF 工具文件生成失败:", error);
      throw error;
    }
  }

  /**
   * 构建模型元数据
   */
  private buildMetadata() {
    return this.allModels.map(model => ({
      name: model.name,
      tableName: model.dbName || model.name,
      primaryKeys: model.fields
        .filter(f => f.isId)
        .map(f => f.name),
      fields: model.fields.map(field => ({
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
      }))
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

        const targetModel = this.allModels.find(m => m.name === field.type);
        if (!targetModel) continue;

        const targetField = targetModel.fields.find(
          f => f.kind === "object" && f.relationName === field.relationName
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
        });
      }
    }

    return relations;
  }

  /**
   * 生成文件内容
   */
  private generateContent(): string {
    const metadata = this.buildMetadata();
    const relations = this.buildRelations();
    const metadataJson = JSON.stringify(metadata, null, 2);
    const relationsJson = JSON.stringify(relations, null, 2);

    return `/**
 * @file dmmf-utils.ts
 * @description DMMF 工具和关系查询方法
 * @generated 自动生成，请勿手动修改
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
}

/**
 * 模型元数据（精简，不包含完整 DMMF）
 */
export const MODEL_METADATA: ModelMetadata[] = ${metadataJson};

/**
 * 关系元数据
 */
export const RELATION_METADATA: RelationMetadata[] = ${relationsJson};

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
 * 判断字段是否为外键
 */
export function isForeignKeyField<T extends keyof DB>(tableName: T, fieldName: keyof DB[T]): boolean {
  const model = TABLE_TO_MODEL_MAP.get(tableName as string);
  if (!model) return false;
  
  const field = model.fields.find(f => f.name === fieldName);
  if (!field || field.kind !== "object") return false;
  
  return !field.isList && !!field.relationFromFields && field.relationFromFields.length > 0;
}

/**
 * 获取表的所有外键字段
 */
export function getForeignKeyFields<T extends keyof DB>(tableName: T): (keyof DB[T])[] {
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
 * 获取外键引用的表和字段
 */
export function getForeignKeyReference<T extends keyof DB>(
  tableName: T, 
  fieldName: keyof DB[T]
): { table: keyof DB; field: string } | undefined {
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
    field: referencedField
  };
}

/**
 * 兼容旧 API: getPrimaryKeyFields (别名)
 * @deprecated 请使用 getPrimaryKeys
 */
export const getPrimaryKeyFields = getPrimaryKeys;
`;
  }
}

