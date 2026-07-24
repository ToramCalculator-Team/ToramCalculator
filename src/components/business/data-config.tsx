/**
 * 数据表的表格、卡片、表单UI配置
 *
 * @design-note 字段级配置分散
 * 当前：hiddenFields（数组）、renderers.fields（Record）、fieldGroupMap（Record）三处分散。
 * 未来可能演进为 fields: Partial<Record<keyof T, { hidden?, render?, ... }>>（逐字段树）以降低认知负荷。
 * 当前保留扁平结构，因为：
 *  1. renderers 支持嵌套路径（如 "skills[0].name"），树形 Record<keyof T> 无法表达
 *  2. 迁移所有调用方和组件的成本较高
 *  3. fieldGroupMap（组→字段列表）天然是组中心结构，与字段树正交
 * 权衡：以扁平为主，FK 级联自动检测尊重 hiddenFields 过滤。
 */

import type { ReferenceDecl, ReferencedByDecl } from "@db/generated/dmmf-utils";
import type { DB } from "@db/generated/zod";
import type { Compilable, Kysely, Transaction } from "kysely";
import type { Accessor } from "solid-js";
import type { JSX } from "solid-js/jsx-runtime";
import type { ZodSchemaFor } from "~/lib/utils/zod";
import type { Dic, Dictionary } from "~/locales/type";
import type { ObjRendererProps } from "../dataDisplay/ObjRenderer";
import type { VirtualTableProps } from "../dataDisplay/virtualTable";
import type { FormProps } from "../form/Form";
import { ACTIVITY_DATA_CONFIG } from "./dataConfig/activity";
import { ADDRESS_DATA_CONFIG } from "./dataConfig/address";
import { ARMOR_DATA_CONFIG } from "./dataConfig/armor";
import { BEHAVIOR_TREE_DATA_CONFIG } from "./dataConfig/behavior_tree";
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

type SafeOmit<T, K extends keyof T> = Omit<T, K>;
type TableReferenceDecl<T extends keyof DB> = ReferenceDecl<T> & { icon?: JSX.Element };
type TableReferencedByDecl<T extends keyof DB> = ReferencedByDecl<T> & { icon?: JSX.Element };

/**
 * 数据接口工具类型
 */

export type QueryDB = Kysely<DB> | Transaction<DB>;

export type RelationQuery = { execute: () => Promise<unknown[]> };

export type RelationQueryMap = Partial<Record<keyof DB, RelationQuery[]>>;

type ExecutableQuery<T> = { execute: () => Promise<Array<T>> };

type ExecutableTakeFirst<T> = { executeTakeFirst: () => Promise<T | undefined> };

export type TableQueries<T extends object, TList extends object = T> = {
	get: ((db: QueryDB, id: string) => Compilable<T> & ExecutableTakeFirst<T>) | null;
	getAll: ((db: QueryDB) => Compilable<TList> & ExecutableQuery<TList>) | null;
	getParentsById: ((db: QueryDB, id: string) => RelationQueryMap) | null;
	getChildrenById: ((db: QueryDB, id: string) => RelationQueryMap) | null;
};

export type TableCommands<T extends object> = {
	insert: (value: T) => Promise<T>;
	update: (pk: string, value: T) => Promise<T>;
	delete: (pk: string) => Promise<T | undefined>;
};

export type TableDataConfig<TTableName extends keyof DB, T extends DB[TTableName]> = {
	// 渲染时的分组配置
	fieldGroupMap: Record<string, Array<keyof T>>;
	// 表格配置
	table: SafeOmit<
		VirtualTableProps<T>,
		"query" | "primaryKey" | "dictionary" | "rowHandleClick" | "onColumnVisibilityChange" | "globalFilterStr"
	>;
	// 表单配置
	form: SafeOmit<
		FormProps<T>,
		"value" | "dataSchema" | "defaultValue" | "dictionary" | "fieldGroupMap" | "onSubmit"
	> & {
		// 需要渲染的外部关系
		references: TableReferenceDecl<TTableName>[];
		referencedBy: TableReferencedByDecl<TTableName>[];
	};
	// 卡片配置
	card: SafeOmit<ObjRendererProps<T>, "query" | "dataSchema" | "dictionary" | "fieldGroupMap"> & {
		// 需要关联编辑的外部关系
		references: TableReferenceDecl<TTableName>[];
		referencedBy: TableReferencedByDecl<TTableName>[];
	};
};

// 配置函数
export type TableDataConfigurator<TTable extends keyof DB, T extends DB[TTable]> = (
	dictionary: Dictionary,
) => TableDataConfig<TTable, T>;

export const DATA_CONFIG: Partial<{
	[K in keyof DB]?: TableDataConfigurator<K, DB[K]>;
}> = {
	// activity: ACTIVITY_DATA_CONFIG,
	// address: ADDRESS_DATA_CONFIG,
	// armor: ARMOR_DATA_CONFIG,
	// behavior_tree: BEHAVIOR_TREE_DATA_CONFIG,
	// character: CHARACTER_DATA_CONFIG,
	// consumable: CONSUMABLE_DATA_CONFIG,
	// crystal: CRYSTAL_DATA_CONFIG,
	// drop_item: DROP_ITEM_DATA_CONFIG,
	// item: ITEM_DATA_CONFIG,
	// material: MATERIAL_DATA_CONFIG,
	// mob: MOB_DATA_CONFIG,
	// npc: NPC_DATA_CONFIG,
	// option: OPTION_DATA_CONFIG,
	// player_weapon: PLAYER_WEAPON_DATA_CONFIG,
	// player_armor: PLAYER_ARMOR_DATA_CONFIG,
	// player_option: PLAYER_OPTION_DATA_CONFIG,
	// player_special: PLAYER_SPECIAL_DATA_CONFIG,
	// recipe: RECIPE_DATA_CONFIG,
	// recipe_ingredient: RECIPE_INGREDIENT_DATA_CONFIG,
	skill: SKILL_DATA_CONFIG,
	// skill_variant: SKILL_VARIANT_DATA_CONFIG,
	// special: SPECIAL_DATA_CONFIG,
	// task: TASK_DATA_CONFIG,
	// weapon: WEAPON_DATA_CONFIG,
	// world: WORLD_DATA_CONFIG,
	// zone: ZONE_DATA_CONFIG,
};
