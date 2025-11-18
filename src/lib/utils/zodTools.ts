import { ZodType } from "zod/v4";

// 缓存 Zod 类型解析
const schemaTypeCache = new WeakMap<ZodType, ZodType["type"]>();

export function getZodType(schema?: ZodType) {
  if (!schema) return "undefined";

  if (schemaTypeCache.has(schema)) {
    return schemaTypeCache.get(schema)!;
  }

  // 在 Zod v4 中，直接使用 schema.type 属性
  const type = schema.type;
  
  schemaTypeCache.set(schema, type);
  return type;
}