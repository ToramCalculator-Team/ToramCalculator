/**
 * 属性槽合并工具。
 *
 * 背景：
 * - `StatContainer` 在构造时一次性从 `NestedSchema` 扁平化、分配 `Float64Array`，
 *   战斗中不能动态增减属性。因此所有"技能 / 托环 / buff 需要的持久化属性槽"
 *   必须在 `new StatContainer(schema)` 之前并入基础 schema。
 * - 本模块提供一个纯函数 `mergeSchema(base, slots)`，把若干槽声明合并进基础 schema。
 *
 * 命名约定（本版冻结）：
 * - `skill.<skillId>.<field>` —— 技能自身的跨技能数据，如爆能 `skill.bouneng.castStacks`
 * - `passive.<passiveId>.<field>` —— 被动/托环持久化状态，如紧急回复 `passive.hpEmergency.lastTriggeredFrame`
 * - `buff.<buffId>.<field>` —— buff 实例自带的层数、计时等
 *
 * 前缀不得与基础 schema 的根节点冲突（当前基础 schema 根节点：lv / str / vit /
 * hp / mp / status / … 均不以 skill/passive/buff 开头，安全）。
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
const ALLOWED_PREFIXES = new Set(["skill", "passive", "buff"]);

/**
 * 将槽声明列表并入基础 schema，返回新的 NestedSchema。
 *
 * - 不修改 base 本身；使用浅克隆逐层下钻。
 * - 同路径重复声明：若 attribute 完全相同（displayName + expression）则允许，否则抛错。
 * - 路径上任一段与已有 SchemaAttribute 冲突（即想把叶子节点再下钻）会抛错。
 */
export function mergeSchema(base: NestedSchema, slots: readonly SlotDeclaration[]): NestedSchema {
	if (slots.length === 0) return base;

	const result: NestedSchema = { ...base };

	for (const slot of slots) {
		const segments = slot.path.split(".").filter((s) => s.length > 0);
		if (segments.length < 2) {
			throw new Error(`属性槽路径至少需要两段（前缀 + 字段名），收到：${slot.path}`);
		}
		const prefix = segments[0];
		if (!ALLOWED_PREFIXES.has(prefix)) {
			throw new Error(
				`属性槽路径前缀必须是 ${[...ALLOWED_PREFIXES].join(" / ")} 之一，收到：${slot.path}`,
			);
		}

		insertSlot(result, segments, slot.attribute, slot.path);
	}

	return result;
}

function insertSlot(root: NestedSchema, segments: string[], attr: SchemaAttribute, fullPath: string): void {
	let cursor: NestedSchema = root;

	// 走到倒数第二段，确保中间节点都是 NestedSchema
	for (let i = 0; i < segments.length - 1; i++) {
		const key = segments[i];
		const existing = cursor[key];

		if (existing === undefined) {
			const next: NestedSchema = {};
			cursor[key] = next;
			cursor = next;
			continue;
		}

		if (isSchemaAttribute(existing)) {
			throw new Error(`路径 ${fullPath} 与已有叶子属性冲突：${segments.slice(0, i + 1).join(".")} 已是 SchemaAttribute`);
		}

		// 为避免污染原始 schema，浅克隆一份
		const cloned: NestedSchema = { ...(existing as NestedSchema) };
		cursor[key] = cloned;
		cursor = cloned;
	}

	const leafKey = segments[segments.length - 1];
	const leafExisting = cursor[leafKey];

	if (leafExisting === undefined) {
		cursor[leafKey] = { ...attr };
		return;
	}

	if (!isSchemaAttribute(leafExisting)) {
		throw new Error(`路径 ${fullPath} 已被作为分组节点存在，不能再声明为叶子属性`);
	}

	// 已有叶子：只有完全等价才允许，否则报冲突
	if (leafExisting.displayName !== attr.displayName || leafExisting.expression !== attr.expression) {
		throw new Error(
			`属性槽 ${fullPath} 重复声明且定义不一致（旧 expression="${leafExisting.expression}" 新 expression="${attr.expression}"）`,
		);
	}
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
			onlyBaseValue: true,
		},
	};
}
