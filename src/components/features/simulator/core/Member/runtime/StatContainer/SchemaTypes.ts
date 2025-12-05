/**
 * Schema类型定义文件
 *
 * 这个文件定义了与Schema相关的所有类型和工具，包括：
 * 1. 基础Schema类型定义
 * 2. 多语言Schema字典类型
 * 3. StatContainer相关类型
 * 4. Schema工具类型和工具函数
 * 5. Schema扁平化工具类
 *
 * 设计原则：
 * - 类型清晰：每种类型都有明确的用途和约束
 * - 职责分离：编辑器使用Schema，系统使用NestedSchema
 * - 多语言支持：通过字典文件实现，不依赖运行时类型
 * - 向后兼容：保持现有代码的兼容性
 */

// ============================== 基础Schema类型 ==============================

/**
 * 基础Schema类型 - 只包含空节点结构
 *
 * 用途：用于编辑器等只需要结构而不需要具体属性信息的场景
 * 特点：类型安全，不包含任何实际数据
 */
export type Schema = {
  [key: string]: null | Schema;
};

/**
 * Schema属性定义接口
 *
 * 包含属性的显示名称、计算表达式和特殊标记
 */
export interface SchemaAttribute {
  /** 属性的显示名称，用于UI展示 */
  displayName: string;
  /** 属性的计算表达式，支持DSL语法 */
  expression: string;
  /** 标记属性是否不包含基础值（百分比应转换为小数fixed累加） */
  noBaseValue?: boolean;
  /** 标记属性是否只包含基础值 */
  onlyBaseValue?: boolean;
}

/**
 * 嵌套Schema结构类型
 *
 * 支持任意深度的嵌套结构，每个节点可以是SchemaAttribute或NestedSchema
 * 用途：用于StatContainer等需要完整属性信息的场景
 */
export type NestedSchema = {
  [key: string]: SchemaAttribute | NestedSchema;
};

// ============================== 多语言Schema字典类型 ==============================

/**
 * 多语言Schema字典类型
 *
 * 不包含SchemaAttribute，只包含Locale为键的字典属性
 * 用途：用于编辑器显示名称的多语言支持
 */
export type NestedSchemaDic = {
  [key: string]: string | NestedSchemaDic;
};

/**
 * 扁平化的多语言Schema字典
 *
 * 将嵌套结构扁平化为路径到多语言显示名称的映射
 * 格式：{ "path.to.attribute": { "zh-CN": "中文名", "en": "English" } }
 */
export type FlattenedSchemaDic = Record<string, string>;

// ============================== 类型转换工具类型 ==============================

/**
 * 将结构中的null转换为空对象的类型工具
 */
export type ConvertToSchema<T> = {
  [K in keyof T]: T[K] extends null
    ? Record<string, never> // null -> {}
    : T[K] extends object
      ? ConvertToSchema<T[K]> // 递归处理嵌套对象
      : T[K]; // 保持其他类型不变
};

/**
 * 将结构中的null转换为SchemaAttribute的类型工具
 */
export type ConvertToNestedSchema<T> = {
  [K in keyof T]: T[K] extends null
    ? SchemaAttribute // null -> SchemaAttribute
    : T[K] extends object
      ? ConvertToNestedSchema<T[K]> // 递归处理嵌套对象
      : T[K]; // 保持其他类型不变
};

/**
 * 将结构中的null转换为多语言对象的类型工具
 */
export type ConvertToNestedSchemaDic<T> = {
  [K in keyof T]: T[K] extends null
    ? string
    : T[K] extends object
      ? ConvertToNestedSchemaDic<T[K]> // 递归处理嵌套对象
      : T[K]; // 保持其他类型不变
};

// ============================== StatContainer相关类型 ==============================

/**
 * 属性表达式接口
 *
 * 用于StatContainer中存储属性的表达式信息
 */
export interface AttributeExpression {
  /** 属性的显示名称 */
  displayName: string;
  /** 属性的计算表达式 */
  expression: string;
  /** 标记属性是否不包含基础值 */
  noBaseValue?: boolean;
}

/**
 * 扁平化后的Schema结果接口
 *
 * 包含所有属性键、表达式映射和显示名称映射
 */
export interface FlattenedSchema<T extends string> {
  /** 属性键数组 */
  attrKeys: T[];
  /** 属性表达式映射 */
  expressions: Map<T, AttributeExpression>;
  /** 属性显示名称映射 */
  displayNames: Map<T, string>;
}

// ============================== Schema工具类型 ==============================

/**
 * 从Schema生成属性键的联合类型
 *
 * 直接使用DSL路径，不再进行小驼峰转换
 * 支持嵌套属性的点号分隔路径
 */
export type ExtractAttrPaths<T extends NestedSchema, Path extends string = ""> = {
  [K in keyof T]: T[K] extends SchemaAttribute
    ? Path extends ""
      ? K & string
      : `${Path}.${K & string}`
    : T[K] extends NestedSchema
      ? ExtractAttrPaths<T[K], Path extends "" ? K & string : `${Path}.${K & string}`>
      : never;
}[keyof T];

/**
 * 从Schema生成属性键的字符串联合类型
 */
export type SchemaToAttrType<T extends NestedSchema> = ExtractAttrPaths<T>;

/**
 * 从Schema生成完整的属性类型映射
 *
 * 包含所有属性键和对应的number类型
 * 用于类型安全的属性值存储
 */
export type SchemaToAttrRecord<T extends NestedSchema> = Record<SchemaToAttrType<T>, number>;

// ============================== Schema工具函数 ==============================

/**
 * 类型谓词：检查对象是否为SchemaAttribute
 *
 * @param x 要检查的对象
 * @returns 如果对象是SchemaAttribute则返回true，否则返回false
 */
export const isSchemaAttribute = (x: unknown): x is SchemaAttribute => {
  return (
    !!x &&
    typeof x === "object" &&
    "displayName" in x &&
    "expression" in x &&
    typeof (x as any).displayName === "string" &&
    typeof (x as any).expression === "string"
  );
};


// ============================== Schema扁平化工具类 ==============================

/**
 * Schema扁平化工具类
 *
 * 用于StatContainer中将嵌套Schema扁平化为可用的数据结构
 * 支持递归遍历、依赖关系分析和性能优化
 */
export class SchemaFlattener {
  /**
   * 扁平化嵌套的Schema结构
   *
   * 将嵌套的Schema结构转换为扁平的属性列表，包含：
   * - 属性键数组（使用点号分隔的路径）
   * - 表达式映射（属性路径到表达式的映射）
   * - 显示名称映射（属性路径到显示名称的映射）
   *
   * @param schema 嵌套的Schema结构
   * @returns 扁平化的Schema结果
   *
   * @example
   * ```typescript
   * const schema = {
   *   player: {
   *     hp: { displayName: "生命值", expression: "100" },
   *     mp: { displayName: "魔法值", expression: "50" }
   *   }
   * };
   *
   * const result = SchemaFlattener.flatten(schema);
   * // result.attrKeys = ["player.hp", "player.mp"]
   * // result.displayNames.get("player.hp") = "生命值"
   * ```
   */
  static flatten<T extends string>(schema: NestedSchema): FlattenedSchema<T> {
    const attrKeys: T[] = [];
    const expressions = new Map<T, AttributeExpression>();
    const displayNames = new Map<T, string>();

    function traverse(obj: NestedSchema, path: string[] = []): void {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = [...path, key];
        const dslPath = currentPath.join(".");

        if (SchemaFlattener.isSchemaAttribute(value)) {
          // 直接使用DSL路径作为属性键名
          const attrKey = dslPath as T;

          attrKeys.push(attrKey);

          expressions.set(attrKey, {
            displayName: value.displayName,
            expression: value.expression,
            noBaseValue: Boolean(value.noBaseValue),
          });

          displayNames.set(attrKey, value.displayName);

          // console.log(`📋 扁平化属性: ${dslPath} (${value.displayName})`);
        } else {
          traverse(value, currentPath);
        }
      }
    }

    traverse(schema);

    // console.log(`✅ Schema扁平化完成: ${attrKeys.length} 个属性`);

    return {
      attrKeys,
      expressions,
      displayNames,
    };
  }

  /**
   * 检查对象是否为SchemaAttribute
   *
   * 私有方法，用于内部类型检查
   *
   * @param obj 要检查的对象
   * @returns 如果对象是SchemaAttribute则返回true，否则返回false
   */
  private static isSchemaAttribute(obj: any): obj is SchemaAttribute {
    return obj && typeof obj === "object" && typeof obj.displayName === "string" && typeof obj.expression === "string";
  }
}
