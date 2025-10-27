/**
 * @file typeConverter.ts
 * @description 类型转换器
 * 负责将 Prisma 类型转换为 QueryBuilder 和其他系统所需的类型
 * @version 1.0.0
 */

interface Operator {
  name: string;
  value: string;
  label: string;
}

interface TypeConfig {
  valueEditorType: string;
  inputType: string;
  comparator: string;
  operators: readonly Operator[];
}

/**
 * QueryBuilder 通用操作符配置
 * 定义了不同数据类型支持的操作符
 */
export const COMMON_OPERATORS = {
  // 字符串操作符
  string: [
    { name: "equals", value: "equals", label: "Equals" },
    { name: "!=", value: "!=", label: "Not Equals" },
    { name: "contains", value: "contains", label: "Contains" },
    { name: "beginsWith", value: "beginsWith", label: "Begins With" },
    { name: "endsWith", value: "endsWith", label: "Ends With" },
  ],
  
  // 数字操作符
  number: [
    { name: "equals", value: "equals", label: "Equals" },
    { name: "!=", value: "!=", label: "Not Equals" },
    { name: "greater_than", value: "greater_than", label: "Greater Than" },
    { name: "less_than", value: "less_than", label: "Less Than" },
    { name: "between", value: "between", label: "Between" },
  ],
  
  // 日期操作符
  date: [
    { name: "equals", value: "equals", label: "Equals" },
    { name: "!=", value: "!=", label: "Not Equals" },
    { name: "greater_than", value: "greater_than", label: "Greater Than" },
    { name: "less_than", value: "less_than", label: "Less Than" },
    { name: "between", value: "between", label: "Between" },
  ],
  
  // 布尔操作符
  boolean: [
    { name: "equals", value: "equals", label: "Equals" },
    { name: "!=", value: "!=", label: "Not Equals" },
  ],
  
  // 枚举操作符
  enum: [
    { name: "equals", value: "equals", label: "Equals" },
    { name: "!=", value: "!=", label: "Not Equals" },
    { name: "in", value: "in", label: "In" },
    { name: "not_in", value: "not_in", label: "Not In" },
  ],
} as const;

/**
 * 类型转换器
 * 将 Prisma 类型转换为 QueryBuilder 配置
 */
export const TypeConverter = {
  /**
   * 将 Prisma 类型转换为 QueryBuilder 配置
   * @param prismaType - Prisma 类型
   * @param isOptional - 是否为可选字段
   * @returns QueryBuilder 配置对象
   */
  prismaToQueryBuilder: (prismaType: string, isOptional: boolean = false): TypeConfig => {
    const baseType = TypeConverter.extractBaseType(prismaType);
    
    // 枚举类型处理
    if (TypeConverter.isEnumType(prismaType)) {
      return {
        valueEditorType: "select",
        inputType: "text",
        comparator: "enum",
        operators: COMMON_OPERATORS.enum,
      };
    }
    
    // 关系类型处理
    if (TypeConverter.isRelationType(prismaType)) {
      return {
        valueEditorType: "text",
        inputType: "text",
        comparator: "string",
        operators: COMMON_OPERATORS.string,
      };
    }
    
    // 数组类型处理
    if (TypeConverter.isArrayType(prismaType)) {
      return {
        valueEditorType: "text",
        inputType: "text",
        comparator: "string",
        operators: COMMON_OPERATORS.string,
      };
    }
    
    // 基本类型处理
    switch (baseType) {
      case "String":
        return {
          valueEditorType: "text",
          inputType: "text",
          comparator: "string",
          operators: COMMON_OPERATORS.string,
        };
        
      case "Int":
      case "Float":
      case "Decimal":
        return {
          valueEditorType: "text",
          inputType: "number",
          comparator: "number",
          operators: COMMON_OPERATORS.number,
        };
        
      case "Boolean":
        return {
          valueEditorType: "checkbox",
          inputType: "checkbox",
          comparator: "boolean",
          operators: COMMON_OPERATORS.boolean,
        };
        
      case "DateTime":
        return {
          valueEditorType: "text",
          inputType: "text",
          comparator: "date",
          operators: COMMON_OPERATORS.date,
        };
        
      case "Json":
        return {
          valueEditorType: "text",
          inputType: "text",
          comparator: "string",
          operators: COMMON_OPERATORS.string,
        };
        
      default:
        return {
          valueEditorType: "text",
          inputType: "text",
          comparator: "string",
          operators: COMMON_OPERATORS.string,
        };
    }
  },

  /**
   * 提取基础类型
   * 从 Prisma 类型中提取基础类型名称
   * @param prismaType - Prisma 类型
   * @returns 基础类型名称
   */
  extractBaseType: (prismaType: string): string => {
    // 移除可选标记
    let type = prismaType.replace(/\?$/, "");
    
    // 移除数组标记
    type = type.replace(/\[\]$/, "");
    
    // 移除关系标记
    type = type.replace(/\[\]$/, "");
    
    return type;
  },

  /**
   * 检查是否为枚举类型
   * @param prismaType - Prisma 类型
   * @returns 是否为枚举类型
   */
  isEnumType: (prismaType: string): boolean => {
    // 检查是否包含枚举类型标识
    return /^[A-Z][a-zA-Z]*$/.test(prismaType.replace(/\?$/, "").replace(/\[\]$/, ""));
  },

  /**
   * 检查是否为关系类型
   * @param prismaType - Prisma 类型
   * @returns 是否为关系类型
   */
  isRelationType: (prismaType: string): boolean => {
    // 检查是否包含关系类型标识
    return prismaType.includes("[]") && !prismaType.includes("String") && !prismaType.includes("Int");
  },

  /**
   * 检查是否为数组类型
   * @param prismaType - Prisma 类型
   * @returns 是否为数组类型
   */
  isArrayType: (prismaType: string): boolean => {
    return prismaType.endsWith("[]");
  },
};
