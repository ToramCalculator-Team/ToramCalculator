/**
 * 属性槽合并工具。
 *
 * 背景：
 * - `AttributeContainer` 在构造时一次性从 `NestedSchema` 扁平化、分配 `Float64Array`，
 *   战斗中不能动态增减属性。因此所有"技能 / 托环 / buff 需要的持久化属性槽"
 *   必须在 `new AttributeContainer(schema)` 之前并入基础 schema。
 * - 本模块提供一个纯函数 `mergeSchema(base, slots)`，把若干槽声明合并进基础 schema。
 *
 * 命名约定（本版冻结）：
 * - `skill.nextCost.*` —— 引擎保留的下一技能消耗修正槽，见 ADR 0007
 * - `skill.<skillId>.<field>` —— 技能自身的跨技能数据，如爆能 `skill.bouneng.castStacks`
 * - `passive.<passiveId>.<field>` —— 被动/托环持久化状态，如紧急回复 `passive.hpEmergency.lastTriggeredFrame`
 * - `buff.<buffId>.<field>` —— buff 实例自带的层数、计时等
 *
 * 基础 schema 可以预留同名前缀下的引擎槽；动态槽必须避开已存在的叶子路径。
 */

import type { NestedSchema, SchemaAttribute } from "./SchemaTypes";
import { isSchemaAttribute } from "./SchemaTypes";

/**
 * 单条属性槽声明。
 */
export interface SlotDeclaration {
	/** 点号分隔的完整路径。例：`skill.bouneng.castStacks` / `passive.hpEmergency.lastTriggeredFrame`。 */
	path: string;
	/** 槽的基础属性定义。`expression` 一般为常量，如 `"0"` 或 `"-Infinity"`。 */
	attribute: SchemaAttribute;
}

/**
 * 允许的顶级前缀，超出此集合的路径将抛错。
 * 保留 base schema 根节点与新增槽之间的边界清晰。
 */
export const ALLOWED_ATTRIBUTE_SLOT_PREFIXES = ["skill", "passive", "buff"] as const;
const ALLOWED_PREFIXES = new Set<string>(ALLOWED_ATTRIBUTE_SLOT_PREFIXES);

export function validateSlotDeclarationPath(path: string): string | null {
	const segments = path.split(".").filter((s) => s.length > 0);
	if (segments.length < 2) {
		return `属性槽路径至少需要两段（前缀 + 字段名），收到：${path}`;
	}
	const prefix = segments[0];
	if (!ALLOWED_PREFIXES.has(prefix)) {
		return `属性槽路径前缀必须是 ${ALLOWED_ATTRIBUTE_SLOT_PREFIXES.join(" / ")} 之一，收到：${path}`;
	}
	return null;
}

/**
 * 将槽声明列表并入基础 schema，返回扩展后的 NestedSchema。
 *
 */
export function mergeSchema<TAttrSchema extends NestedSchema>(
	base: TAttrSchema,
	slots: readonly SlotDeclaration[],
): TAttrSchema {
	if (slots.length === 0) return base;

	let result: NestedSchema = base;

	for (const slot of slots) {
		const segments = slot.path.split(".").filter((s) => s.length > 0);
		const pathError = validateSlotDeclarationPath(slot.path);
		if (pathError) throw new Error(pathError);

		result = insertSlot(result, segments, slot.attribute, slot.path);
	}

	// 运行时 result 包含 base 的所有字段 + 动态槽位，结构上兼容 TAttrSchema
	return result as TAttrSchema;
}

/**
 * 函数式地将单个属性槽插入 schema，返回新的 NestedSchema。
 *
 * @param root 当前层级的 schema
 * @param segments 路径片段数组
 * @param attr 要插入的属性
 * @param fullPath 完整路径（用于错误消息）
 * @returns 插入后的新 NestedSchema
 */
function insertSlot(root: NestedSchema, segments: string[], attr: SchemaAttribute, fullPath: string): NestedSchema {
	if (segments.length === 0) {
		throw new Error(`[insertSlot] 路径为空: ${fullPath}`);
	}

	const [head, ...tail] = segments;

	// 叶子节点：插入属性
	if (tail.length === 0) {
		const existing = root[head];

		// 路径不存在，直接插入
		if (existing === undefined) {
			return { ...root, [head]: { ...attr } };
		}

		// 已有子树，无法覆盖为叶子
		if (!isSchemaAttribute(existing)) {
			throw new Error(`路径 ${fullPath} 已被作为分组节点存在，不能再声明为叶子属性`);
		}

		// 已有叶子：检查是否完全相同
		if (existing.displayName !== attr.displayName || existing.expression !== attr.expression) {
			throw new Error(
				`属性槽 ${fullPath} 重复声明且定义不一致（旧 expression="${existing.expression}" 新 expression="${attr.expression}"）`,
			);
		}

		// 完全相同，不需要修改
		return root;
	}

	// 中间节点：递归处理
	const existing = root[head];

	// 路径与已有叶子冲突
	if (isSchemaAttribute(existing)) {
		throw new Error(`路径 ${fullPath} 与已有叶子属性冲突：${head} 已是 SchemaAttribute，无法继续下钻`);
	}

	// 递归插入子路径
	const childSchema = typeof existing === "object" && existing !== null ? (existing as NestedSchema) : {};
	const newChild = insertSlot(childSchema, tail, attr, fullPath);

	// 返回新的根对象
	return { ...root, [head]: newChild };
}

/**
 * 便捷构造：生成一个基础数值槽。
 *
 * @param path 槽路径（如 `passive.hpEmergency.lastTriggeredFrame`）
 * @param displayName 展示名，主要用于调试
 * @param initialExpression 初值表达式，默认 `"0"`（首次触发类计时戳可用 `"-Infinity"`）
 */
export function numericSlot(path: string, displayName: string, initialExpression = "0"): SlotDeclaration {
	return {
		path,
		attribute: {
			displayName,
			expression: initialExpression,
		},
	};
}
