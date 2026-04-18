import type { DB } from "@db/generated/zod";
import type { Accessor } from "solid-js";
import type { ZodObject, ZodType } from "zod/v4";
import type { Dic, Dictionary } from "~/locales/type";
import type { VirtualTableProps } from "../dataDisplay/virtualTable";
import type { DataRendererProps } from "./card/DataRenderer";
import { ACTIVITY_DATA_CONFIG } from "./dataConfig/activity";
import { ADDRESS_DATA_CONFIG } from "./dataConfig/address";
import { ARMOR_DATA_CONFIG } from "./dataConfig/armor";
import { CHARACTER_DATA_CONFIG } from "./dataConfig/character";
import { CONSUMABLE_DATA_CONFIG } from "./dataConfig/consumable";
import { CRYSTAL_DATA_CONFIG } from "./dataConfig/crystal";
import { DROP_ITEM_DATA_CONFIG } from "./dataConfig/drop_item";
import { ITEM_DATA_CONFIG } from "./dataConfig/item";
import { MATERIAL_DATA_CONFIG } from "./dataConfig/material";
import { MOB_DATA_CONFIG } from "./dataConfig/mob";
import { NPC_DATA_CONFIG } from "./dataConfig/npc";
import { OPTION_DATA_CONFIG } from "./dataConfig/option";
import { PLAYER_ARMOR_DATA_CONFIG } from "./dataConfig/player_armor";
import { PLAYER_OPTION_DATA_CONFIG } from "./dataConfig/player_option";
import { PLAYER_SPECIAL_DATA_CONFIG } from "./dataConfig/player_special";
import { PLAYER_WEAPON_DATA_CONFIG } from "./dataConfig/player_weapon";
import { RECIPE_DATA_CONFIG } from "./dataConfig/recipe";
import { RECIPE_INGREDIENT_DATA_CONFIG } from "./dataConfig/recipe_ingredient";
import { SKILL_DATA_CONFIG } from "./dataConfig/skill";
import { SKILL_VARIANT_DATA_CONFIG } from "./dataConfig/skill_variant";
import { SPECIAL_DATA_CONFIG } from "./dataConfig/special";
import { TASK_DATA_CONFIG } from "./dataConfig/task";
import { WEAPON_DATA_CONFIG } from "./dataConfig/weapon";
import { WORLD_DATA_CONFIG } from "./dataConfig/world";
import { ZONE_DATA_CONFIG } from "./dataConfig/zone";
import type { FormProps } from "./form/FormRenderer";

type SafeOmit<T, K extends keyof T> = Omit<T, K>;

/**
 * 1:1 继承父表（当前表与父表在概念上是同一实体）
 * 渲染器会自动：
 *  - 合并父表的 dictionary / fieldGenerator（child 优先）
 *  - 查询父表的反向关系并合并到当前表的关联内容中
 *  - 排除父表的兄弟子类（如 weapon 的 inheritsFrom=item，则 armor/consumable 等同级子类不会出现在关联内容里）
 */
export type InheritsFromDecl = {
	/** 父表名，如 "item" */
	table: keyof DB;
	/** 当前表指向父表主键的外键列名，如 "itemId" */
	via: string;
	/**
	 * 可选：手动声明需要从父表反向关系中排除的同级子类表。
	 * 未声明时渲染器会自动推导——所有以 (PK==父表FK) 形式 1:1 继承同一父表的表。
	 */
	excludeSiblings?: Array<keyof DB>;
};

/**
 * 1:N 内嵌子表（当前实体的某个字段在逻辑上是子表数组）
 * 渲染器会：
 *  - 表单：渲染为嵌套数组编辑器（用子表自己的 dataConfig 递归渲染每项）
 *  - 卡片：内嵌展示子表列表
 *  - 自动把该字段从普通字段渲染流程中移除，避免被当成通用 array 处理
 *  - 不负责持久化拆解，由 config 的 onInsert / onUpdate 在事务内处理
 */
export type EmbedsDecl = {
	/** 统一 schema 上承载子表数组的字段名，如 "variants" */
	field: string;
	/** 子表名，如 "skill_variant" */
	table: keyof DB;
	/** 子表指向当前表主键的外键列名，如 "belongToskillId" */
	via: string;
	/** 展示模式，默认 "inline" */
	mode?: "inline" | "buttons";
};

/**
 * 对自动推导出的外键关联内容进行覆盖
 */
export type RelationOverridesDecl = {
	/** 黑名单：这些目标表的关联不显示 */
	hide?: Array<keyof DB>;
	/** 白名单：只显示这些目标表的关联（与 hide 互斥，同时声明时 only 优先） */
	only?: Array<keyof DB>;
	/** 按目标表覆盖关联前缀文案 */
	prefix?: Partial<Record<keyof DB, keyof Dictionary["ui"]["relationPrefix"]>>;
};

/**
 * @typeParam T    数据实体完整形状（合并了 inheritsFrom 父表 / embeds 子表后的 runtime 类型）
 * @typeParam TDic 配置站点实际提供的字典形状，默认 = T。
 *                 当声明了 `inheritsFrom` 时，渲染器会在运行时自动合并父表字典，
 *                 此时 TDic 可收窄为"仅子表自己的字段类型"（如 `weapon` 而非 `WeaponItem`），
 *                 避免在配置里手动重复父表的字段字典。
 */
export type TableDataConfig<T extends Record<string, unknown>, TDic extends Record<string, unknown> = T> = (
	dictionary: Accessor<Dictionary>,
) => {
	dictionary: Dic<TDic>;
	dataSchema: ZodObject<{ [K in keyof T]: ZodType }>;
	primaryKey: keyof T;
	defaultData: T;
	dataFetcher: {
		get: (id: string) => Promise<T | undefined>;
		getAll: () => Promise<Array<T>>;
		insert: (data: T) => Promise<T>;
		update: (id: string, data: T) => Promise<T>;
		delete: (id: string) => Promise<T | undefined>;
	};
	fieldGroupMap: Record<string, Array<keyof T>>;
	/** 继承关系声明（见 InheritsFromDecl） */
	inheritsFrom?: InheritsFromDecl;
	/** 内嵌子表声明（见 EmbedsDecl） */
	embeds?: EmbedsDecl[];
	/** 自动关联内容覆盖（见 RelationOverridesDecl） */
	relationOverrides?: RelationOverridesDecl;
	table: SafeOmit<
		VirtualTableProps<T>,
		"dataFetcher" | "dictionary" | "rowHandleClick" | "onColumnVisibilityChange" | "onRefetch" | "globalFilterStr"
	>;
	form: SafeOmit<
		FormProps<T, ZodObject<{ [K in keyof T]: ZodType }>>,
		"value" | "dataSchema" | "tableName" | "primaryKey" | "defaultValue" | "dictionary" | "fieldGroupMap"
	>;
	card: SafeOmit<
		DataRendererProps<T, ZodObject<{ [K in keyof T]: ZodType }>>,
		"data" | "tableName" | "primaryKey" | "dataSchema" | "dictionary" | "fieldGroupMap"
	>;
};

// 擦除类型后的存储版本
// 函数参数用 any 消除逆变问题，这是唯一需要 any 的地方
export type AnyTableDataConfig = TableDataConfig<any, any>;

export type DataConfig = Partial<Record<keyof DB, AnyTableDataConfig>>;

export const DATA_CONFIG: DataConfig = {
	activity: ACTIVITY_DATA_CONFIG,
	address: ADDRESS_DATA_CONFIG,
	armor: ARMOR_DATA_CONFIG,
	character: CHARACTER_DATA_CONFIG,
	consumable: CONSUMABLE_DATA_CONFIG,
	crystal: CRYSTAL_DATA_CONFIG,
	drop_item: DROP_ITEM_DATA_CONFIG,
	item: ITEM_DATA_CONFIG,
	material: MATERIAL_DATA_CONFIG,
	mob: MOB_DATA_CONFIG,
	npc: NPC_DATA_CONFIG,
	option: OPTION_DATA_CONFIG,
	player_weapon: PLAYER_WEAPON_DATA_CONFIG,
	player_armor: PLAYER_ARMOR_DATA_CONFIG,
	player_option: PLAYER_OPTION_DATA_CONFIG,
	player_special: PLAYER_SPECIAL_DATA_CONFIG,
	recipe: RECIPE_DATA_CONFIG,
	recipe_ingredient: RECIPE_INGREDIENT_DATA_CONFIG,
	skill: SKILL_DATA_CONFIG,
	skill_variant: SKILL_VARIANT_DATA_CONFIG,
	special: SPECIAL_DATA_CONFIG,
	task: TASK_DATA_CONFIG,
	weapon: WEAPON_DATA_CONFIG,
	world: WORLD_DATA_CONFIG,
	zone: ZONE_DATA_CONFIG,
};
