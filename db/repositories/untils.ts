import { Transaction, sql } from "kysely";
import { DB } from "@db/generated/zod/index";

/**
 * 根据指定的属性类型映射来调整类型
 *
 * @param T 原始类型
 * @param R 类型映射 { 属性名: 新类型 }
 * @returns 新的类型，属性类型被修改
 */
export type ModifyKeys<T, R extends { [K in keyof T]?: unknown }> = {
  [P in keyof T]: P extends keyof R ? R[P] : T[P];
};

/**
 * 将对象的值类型转换为字符串
 *
 * @param T 原始类型
 * @returns 转换后的字符串
 */
export type ConvertToAllString<T> = T extends Date | Date[] | Array<object> | number
  ? string
  : T extends Record<string, unknown>
    ? {
        [K in keyof T]: K extends string
          ? string extends K // 检查索引签名
            ? T[K] // 如果是索引签名，保持原有类型
            : ConvertToAllString<T[K]> // 否则递归转换
          : never;
      } & {
        selfName: string;
      }
    : string;


/**
 * 根据对象类型生成各类UI需要的字典类型
 *
 * @param T 原始类型
 * @returns 转换后的类型
 * cardFieldDescription: 卡片字段描述
 * tableFieldDescription: 表格字段描述
 * formFieldDescription: 表单字段描述
 */
export type ConvertToAllDetail<T> = {
  [K in keyof ConvertToAllString<T>]: {
    key: string;
    cardFieldDescription?: string;
    tableFieldDescription: string;
    formFieldDescription: string;
  };
};

// 获取表的主键列
export const getPrimaryKeys = async <T extends keyof DB>(
  trx: Transaction<DB>,
  tableName: T,
): Promise<(keyof DB[T])[]> => {
  try {
    // 1. 先检查是否是视图
    const isView = await trx
      .selectFrom(
        sql<{ is_view: boolean }>`
          (SELECT EXISTS (
            SELECT 1 
            FROM information_schema.views 
            WHERE table_name = ${tableName}
            AND table_schema = 'public'
          ) as is_view)
        `.as("view_check"),
      )
      .select("is_view")
      .executeTakeFirst();

    // 2. 如果是视图，使用 _local 表
    let targetTable = String(tableName);
    if (isView?.is_view) {
      targetTable = `${targetTable}_local`;
    }

    // 3. 获取主键约束
    const constraints = await trx
      .selectFrom(
        sql<{ constraint_name: string }>`
          (SELECT constraint_name
          FROM information_schema.table_constraints
          WHERE table_name = ${targetTable}
            AND table_schema = 'public'
            AND constraint_type = 'PRIMARY KEY')
        `.as("constraints"),
      )
      .select("constraint_name")
      .execute();

    if (constraints.length === 0) {
      return [];
    }

    // 4. 获取主键列
    const rows = await trx
      .selectFrom(
        sql<{ column_name: string }>`
          (SELECT column_name
          FROM information_schema.key_column_usage
          WHERE table_name = ${targetTable}
            AND table_schema = 'public'
            AND constraint_name = ${constraints[0].constraint_name}
          ORDER BY ordinal_position)
        `.as("primary_keys"),
      )
      .select("column_name")
      .execute();

    return rows.map((row) => row.column_name as keyof DB[T]);
  } catch (error) {
    throw error;
  }
};
