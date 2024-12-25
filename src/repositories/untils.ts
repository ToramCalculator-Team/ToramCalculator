/**
 * 根据指定的属性类型映射来调整类型
 *
 * @template T 原始类型
 * @template R 类型映射 { 属性名: 新类型 }
 * @returns 新的类型，属性类型被修改
 */
export type ModifyKeys<T, R extends { [K in keyof T]?: unknown }> = {
  [P in keyof T]: P extends keyof R ? R[P] : T[P];
};

