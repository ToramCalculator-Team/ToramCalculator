import type { ChildTableOf } from "@db/generated/dmmf-utils";
import type { DB } from "@db/generated/zod";
import { ZodObject, ZodType } from "zod/v4";
import type { Dic } from "~/locales/type";
import type { VirtualTableProps } from "../dataDisplay/virtualTable";
import { DataRendererProps } from "./card/DataRenderer";
import type { DBdataRendererProps } from "./card/DBdataRenderer";
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

type SafeOmit<T, K extends keyof T> = Omit<T, K>

export type TableDataConfig<T extends Record<string, unknown>> = {
	dictionary: Dic<T>;
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
	table: SafeOmit<
		VirtualTableProps<T>,
		| "dataFetcher"
		| "dictionary"
		| "rowHandleClick"
		| "onColumnVisibilityChange"
		| "onRefetch"
		| "globalFilterStr"
	>;
	form: SafeOmit<FormProps<T, ZodObject<{ [K in keyof T]: ZodType }>>, 
		| "value"
		| "dataSchema"
		| "tableName"
		| "primaryKey"
		| "defaultValue"
		| "dictionary"
		| "fieldGroupMap"
	>;
	card: SafeOmit<DataRendererProps<T, ZodObject<{ [K in keyof T]: ZodType }>>, 
		| "data"
		| "tableName"
		| "primaryKey"
		| "dataSchema"
		| "dictionary"
		| "fieldGroupMap"
	>;
};

// 擦除类型后的存储版本
// 函数参数用 any 消除逆变问题，这是唯一需要 any 的地方
export type AnyTableDataConfig = TableDataConfig<any>

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

