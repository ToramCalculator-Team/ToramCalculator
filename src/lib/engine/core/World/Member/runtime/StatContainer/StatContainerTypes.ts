import { z } from "zod/v4";

// 数据存储接口，用于向外传输
export type DataStorage = {
	displayName: string;
	expression: string;
	baseValue: number;
	baseSources: {
		source: ModifierSource;
		value: number;
	}[];
	actValue: number;
	static: {
		fixed: {
			source: ModifierSource;
			value: number;
		}[];
		percentage: {
			source: ModifierSource;
			value: number;
		}[];
	};
	dynamic: {
		fixed: {
			source: ModifierSource;
			value: number;
		}[];
		percentage: {
			source: ModifierSource;
			value: number;
		}[];
	};
};

export type DataStorages<T extends string> = {
	[key in T]: DataStorage;
};

/**
 * 属性变更监听器。
 *
 * 仅当属性"已被观测过"且 `oldValue !== newValue` 时触发。
 * 用于编排层的 `AttributeThresholdSource` 做阈值跨线检测；数据层自身不含业务语义。
 */
export type AttributeChangeListener = (oldValue: number, newValue: number, path: string) => void;

// 类型谓词函数，用于检查对象是否为DataStorage类型
export function isDataStorageType(obj: unknown): obj is DataStorage {
	return (
		typeof obj === "object" &&
		obj !== null &&
		"displayName" in obj &&
		"baseValue" in obj &&
		"static" in obj &&
		"dynamic" in obj
	);
}

// 计算动态总值
export function dynamicTotalValue(data: DataStorage): number {
	if (!data || typeof data !== "object") return 0;

	let baseValue = 0;
	let total = 0;
	let staticFixed = 0;
	let staticPercentage = 0;
	let dynamicFixed = 0;
	let dynamicPercentage = 0;
	let totalPercentage = staticPercentage + dynamicPercentage;
	let totalFixed = staticFixed + dynamicFixed;

	baseValue = Number(data.baseValue) || 0;

	// 添加静态修正值
	if (data.static.fixed) {
		staticFixed = data.static.fixed.reduce((acc, curr) => acc + curr.value, 0);
	}

	// 添加静态百分比修正
	if (data.static.percentage) {
		staticPercentage = data.static.percentage.reduce((acc, curr) => acc + curr.value, 0);
	}

	// 添加动态修正值
	if (data.dynamic.fixed) {
		dynamicFixed = data.dynamic.fixed.reduce((acc, curr) => acc + curr.value, 0);
	}

	// 添加动态百分比修正
	if (data.dynamic.percentage) {
		dynamicPercentage = data.dynamic.percentage.reduce((acc, curr) => acc + curr.value, 0);
	}

	totalFixed = staticFixed + dynamicFixed;
	totalPercentage = staticPercentage + dynamicPercentage;
	total = baseValue * ((100 + totalPercentage) / 100) + totalFixed;

	// console.table({
	//   displayName: data.displayName,
	//   baseValue,
	//   staticFixed,
	//   staticPercentage,
	//   dynamicFixed,
	//   dynamicPercentage,
	//   totalPercentage,
	//   totalFixed,
	//   total,
	// });

	return Math.floor(total);
}

export const ModifierSourceTypeSchema = z.enum([
	"equipment",
	"skill",
	"buff",
	"debuff",
	"passive",
	"registlet",
	"item",
	"system",
]);

export const ModifierSourceRefKindSchema = z.enum([
	"member",
	"skill",
	"equipment",
	"buff",
	"debuff",
	"passive",
	"registlet",
	"item",
	"status",
	"damageArea",
	"effect",
	"pipeline",
	"system",
]);

export const ModifierSourceRefSchema = z.object({
	kind: ModifierSourceRefKindSchema,
	id: z.string(),
});

export const ModifierSourceSchema = z.object({
	/** 聚合、覆盖和卸载使用的稳定键，不承载因果语义。 */
	key: z.string(),
	name: z.string(),
	/**
	 * 来源类别：
	 * - `equipment`：装备（武器/防具/锻晶等）
	 * - `skill`：技能主动效果
	 * - `buff` / `debuff`：临时增益 / 减益
	 * - `passive`：被动技能（`skill.isPassive === true`）
	 * - `registlet`：雷吉斯托环
	 * - `system`：系统赋予
	 */
	type: ModifierSourceTypeSchema,
	/** 从来源成员到直接运行时载体的稳定 ID 引用链。 */
	chain: z.tuple([z.object({ kind: z.literal("member"), id: z.string() })], ModifierSourceRefSchema),
});

export const ModifierSnapshotEntrySchema = z.object({
	value: z.number(),
	source: ModifierSourceSchema,
});

export const AttributeSnapshotLeafSchema = z.object({
	displayName: z.string(),
	expression: z.string(),
	baseValue: z.number(),
	baseSources: z.array(ModifierSnapshotEntrySchema),
	actValue: z.number(),
	static: z.object({
		fixed: z.array(ModifierSnapshotEntrySchema),
		percentage: z.array(ModifierSnapshotEntrySchema),
	}),
	dynamic: z.object({
		fixed: z.array(ModifierSnapshotEntrySchema),
		percentage: z.array(ModifierSnapshotEntrySchema),
	}),
});

export const AttributeSnapshotSchema = z.record(z.string(), AttributeSnapshotLeafSchema);

export type ModifierSourceRef = z.output<typeof ModifierSourceRefSchema>;
export type ModifierSource = z.output<typeof ModifierSourceSchema>;

/** 无分配遍历单个属性修饰来源时使用的只读访问函数。 */
export type StatModifierVisitor = (source: ModifierSource, value: number) => void;

/** 按稳定属性索引遍历 schema 元数据时使用的只读访问函数。 */
export type StatSchemaVisitor = (index: number, path: string, displayName: string, expression: string) => void;

/**
 * StatContainer 的通用索引读取契约。
 *
 * 调用方先执行 `prepareIndexedRead()` 收敛脏值，再在同一同步调用栈内读取；
 * visitor 收到的 ModifierSource 是容器持有的规范引用，不得保存或修改。
 */
export interface StatIndexedReadSource {
	prepareIndexedRead(): void;
	getAttributeCount(): number;
	visitAttributeSchema(visitor: StatSchemaVisitor): void;
	getBaseValueAt(index: number): number;
	getValueAt(index: number): number;
	getModifierCountAt(index: number, type: ModifierType): number;
	visitModifiersAt(index: number, type: ModifierType, visitor: StatModifierVisitor): void;
}
export type Modifier = z.output<typeof ModifierSnapshotEntrySchema>;
export type AttributeSnapshotLeaf = z.output<typeof AttributeSnapshotLeafSchema>;
export type AttributeSnapshot = z.output<typeof AttributeSnapshotSchema>;

/**
 * 修饰符类型映射到数组索引
 */
export enum ModifierType {
	BASE_VALUE,
	STATIC_FIXED,
	STATIC_PERCENTAGE,
	DYNAMIC_FIXED,
	DYNAMIC_PERCENTAGE,
	MODIFIER_ARRAYS_COUNT = 5,
}

// 运行时 modifier 的数据化入口使用字符串，加载进 StatContainer 前再映射为 ModifierType 数字枚举。
export const StatModifierKindSchema = z.enum([
	"baseValue",
	"staticFixed",
	"staticPercentage",
	"dynamicFixed",
	"dynamicPercentage",
]);
export type StatModifierKind = z.output<typeof StatModifierKindSchema>;

// 被动 DSL 装配 modifier 时先用此 schema 校验外部数据，再映射为 addModifier 的实参。
export const StatModifierParamSchema = z.object({
	// 目标属性路径，例如 "atk.p"、"hp.current"。
	attribute: z.string(),
	// 字符串枚举在加载阶段映射到运行时 ModifierType 数字枚举。
	modifierType: StatModifierKindSchema,
	// 支持常量或装配阶段可求值的表达式。
	value: z.union([z.string(), z.number(), z.boolean()]),
	// sourceId/sourceName 未提供时由安装方按技能来源补全。
	sourceId: z.string().optional(),
	sourceName: z.string().optional(),
	// sourceType 对齐 ModifierSource.type。
	sourceType: z
		.enum(["equipment", "skill", "buff", "debuff", "passive", "registlet", "item", "system"])
		.default("skill"),
});
export type StatModifierParam = z.output<typeof StatModifierParamSchema>;
