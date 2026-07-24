/**
 * Form 和 ObjRenderer 共用的 renderer 路径匹配规则。
 * 配置使用稳定的数组项路径 `[]`，运行时路径则包含当前项的数字下标。
 */

/** 将 `items[2].name` 这样的运行时路径转换为配置路径 `items[].name`。 */
export function normalizeRendererPath(path: string): string {
	return path.replace(/\[\d+\]/g, "[]");
}

/**
 * 查找当前路径对应的 renderer。
 * 先匹配完整运行时路径，再匹配去除数组下标后的稳定配置路径。
 */
export function findRenderer<T>(renderers: Partial<Record<string, T>> | undefined, path: string): T | undefined {
	return renderers?.[path] ?? renderers?.[normalizeRendererPath(path)];
}
