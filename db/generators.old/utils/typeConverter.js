/**
 * @file typeConverter.js
 * @description 类型转换器
 * 负责将 Prisma 类型转换为 QueryBuilder 和其他系统所需的类型
 * @version 1.0.0
 */

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
};

/**
 * 类型转换器
 * 将 Prisma 类型转换为 QueryBuilder 配置
 */
export const TypeConverter = {
  /**
   * 将 Prisma 类型转换为 QueryBuilder 配置
   * @param {string} prismaType - Prisma 类型
   * @param {boolean} isOptional - 是否为可选字段
   * @returns {Object} QueryBuilder 配置对象
   */
  prismaToQueryBuilder: (prismaType, isOptional = false) => {
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
          inputType: "datetime-local",
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
        // 默认作为字符串处理
        return {
          valueEditorType: "text",
          inputType: "text",
          comparator: "string",
          operators: COMMON_OPERATORS.string,
        };
    }
  },
  
  /**
   * 检查是否为枚举类型
   * @param {string} type - 类型字符串
   * @returns {boolean} 是否为枚举类型
   */
  isEnumType: (type) => {
    if (!type) return false;
    return type.includes("Enum") || type.includes("enum");
  },
  
  /**
   * 检查是否为关系类型
   * @param {string} type - 类型字符串
   * @returns {boolean} 是否为关系类型
   */
  isRelationType: (type) => {
    if (!type) return false;
    return type.includes("Relation") || type.includes("relation");
  },
  
  /**
   * 检查是否为数组类型
   * @param {string} type - 类型字符串
   * @returns {boolean} 是否为数组类型
   */
  isArrayType: (type) => {
    if (!type) return false;
    return type.includes("[]") || type.includes("Array");
  },
  
  /**
   * 提取基础类型
   * 移除可选标记、数组标记等，提取核心类型
   * @param {string} type - 类型字符串
   * @returns {string} 基础类型
   */
  extractBaseType: (type) => {
    if (!type) return "String";
    
    // 移除可选标记和数组标记
    let baseType = type.replace(/\?$/, "").replace(/\[\]$/, "");
    
    // 如果是枚举类型，提取基础类型
    if (baseType.includes("Enum")) {
      return "Enum";
    }
    
    // 如果是关系类型，返回 String
    if (baseType.includes("Relation")) {
      return "String";
    }
    
    return baseType;
  },
  
  /**
   * 获取类型信息
   * 返回类型的详细信息，包括是否为可选、数组等
   * @param {string} type - 类型字符串
   * @returns {Object} 类型信息对象
   */
  getTypeInfo: (type) => {
    if (!type) {
      return {
        baseType: "String",
        isOptional: false,
        isArray: false,
        isEnum: false,
        isRelation: false,
      };
    }
    
    return {
      baseType: TypeConverter.extractBaseType(type),
      isOptional: type.includes("?"),
      isArray: TypeConverter.isArrayType(type),
      isEnum: TypeConverter.isEnumType(type),
      isRelation: TypeConverter.isRelationType(type),
    };
  },
}; 