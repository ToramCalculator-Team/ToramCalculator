/**
 * @file namingRules.ts
 * @description 统一的命名规范定义
 * 所有生成器必须使用这些规范来保证命名一致性
 */

/**
 * 基础转换函数
 */

// 将下划线命名转换为 PascalCase
// 例如: "user_post" -> "UserPost", "_user_post" -> "UserPost"
const toPascalCase = (name: string): string => {
  return name
    .split('_')
    .filter(part => part.length > 0)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
};

// 转换为 camelCase
// 例如: "UserPost" -> "userPost"
const toCamelCase = (name: string): string => {
  const pascal = toPascalCase(name);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
};

// 转换为小写
const toLowerCase = (name: string): string => name.toLowerCase();

// 将 PascalCase 转换为 snake_case（用于文件路径）
// 例如: "CharacterSkill" -> "character_skill", "_AvatarToCharacter" -> "_avatar_to_character"
const toSnakeCase = (name: string): string => {
  if (!name) return name;
  
  // 检查是否有前缀下划线
  const hasPrefix = name.startsWith('_');
  const cleanName = hasPrefix ? name.slice(1) : name;
  
  // 转换：在词边界插入下划线，然后全部转小写
  const snakeCase = cleanName
    .replace(/([a-z])([A-Z])/g, '$1_$2')  // userName -> user_Name
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2') // HTTPRequest -> HTTP_Request
    .toLowerCase();
  
  // 如果有前缀，添加回去
  return hasPrefix ? `_${snakeCase}` : snakeCase;
};

/**
 * 规范定义 - 每种用途的命名规则
 */

/**
 * TypeName: 类型名称（用于 TypeScript 类型）
 * - 常规表: "User" -> "User"
 * - 中间表: "_user_post" -> "UserPost"
 */
export const TypeName = (tableName: string, modelName?: string): string => {
  const name = modelName || tableName;
  const isIntermediateTable = name.startsWith('_');
  
  if (isIntermediateTable) {
    return toPascalCase(name);
  } else {
    // 常规表首字母大写
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
};

/**
 * SchemaName: Zod Schema 名称（PascalCase + Schema）
 * - 使用大驼峰 + "Schema"
 * - 例如: "user" -> "UserSchema", "_user_post" -> "UserPostSchema"
 */
export const SchemaName = (name: string): string => {
  return `${toPascalCase(name)}Schema`;
};

/**
 * TableName: 数据库表名（用于 SQL/Kysely）
 * - 直接使用原始表名
 * - 例如: "user" -> "user", "_user_post" -> "_user_post"
 */
export const TableName = (name: string): string => name;

/**
 * TableNameLowerCase: 数据库表名（snake_case，保留前缀下划线）
 * - 将表名转换为 snake_case 格式，用于数据库表名引用
 * - 例如: "User" -> "user", "_ArmorToCrystal" -> "_armor_to_crystal"
 */
export const TableNameLowerCase = (name: string): string => {
  return toSnakeCase(name);
};

/**
 * ModelName: Prisma 模型名
 * - 使用 modelName（如果提供），否则使用 tableName
 * - 例如: "User" -> "User"
 */
export const ModelName = (tableName: string, modelName?: string): string => {
  return modelName || tableName;
};

/**
 * ZodTypeName: Zod 导出的中间类型名称（snake_case）
 * - 用于从 Schema 导出的类型，之后会被转换成 Selectable/Insertable/Updateable
 * - 例如: "user" -> "user", "_user_post" -> "user_post"
 */
export const ZodTypeName = (name: string): string => {
  return toLowerCase(name);
};

/**
 * VariableName: 变量名（camelCase）
 * - 例如: "UserPost" -> "userPost"
 */
export const VariableName = (name: string): string => toCamelCase(toPascalCase(name));

/**
 * FunctionName: 函数名（PascalCase，用于导出函数）
 * - 例如: "user" -> "User", "_user_post" -> "UserPost"
 */
export const FunctionName = (name: string): string => {
  return TypeName(name);
};

/**
 * FileName: 文件名（snake_case，带扩展名）
 * - 例如: "User" -> "user.ts", "CharacterSkill" -> "character_skill.ts", "_ArmorToCrystal" -> "_armor_to_crystal.ts"
 */
export const FileName = (name: string): string => {
  return `${toSnakeCase(name)}.ts`;
};

/**
 * 判断是否为中间表
 */
export const IsIntermediateTable = (tableName: string): boolean => {
  return tableName.startsWith('_');
};

/**
 * 辅助函数
 */
export const NamingRules = {
  toPascalCase,
  toCamelCase,
  toLowerCase,
  toSnakeCase,
};

