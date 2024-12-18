/**
 * 根据指定的属性类型映射来调整类型
 *
 * @template T 原始类型
 * @template K 类型映射 { 属性名: 新类型 }
 * @returns 新的类型，属性类型被修改
 */
export type Modify<T, K extends { [P in keyof T]?: any }> = Omit<T, keyof K> & {
  [P in keyof K]: K[P]; // 将指定属性改为新类型
};
