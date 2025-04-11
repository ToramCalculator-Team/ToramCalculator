import { Selectable, Insertable, Updateable, Kysely, Transaction } from "kysely";
import { DB } from "../../db/kysely/kyesely";

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
 * 生成通用数据类型
 *
 * @param T 原始类型
 * @returns 转换后的类型
 */
export interface DataType<T> {
  [key: string]: any;
  Select: Selectable<T>;
  Insert: Insertable<T>;
  Update: Updateable<T>;
}

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

