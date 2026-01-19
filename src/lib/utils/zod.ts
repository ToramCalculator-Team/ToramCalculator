import type { ZodType } from "zod/v4";

// 缓存 Zod 类型解析
const schemaTypeCache = new WeakMap<ZodType, ZodType["type"]>();

export function getZodType(schema?: ZodType) {
  if (!schema) return "undefined";

  const cachedType = schemaTypeCache.get(schema);
  if (cachedType) {
    return cachedType;
  }
  
  const type = schema.type;
  
  schemaTypeCache.set(schema, type);
  return type;
}