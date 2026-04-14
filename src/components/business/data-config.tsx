import type { ChildTableOf } from "@db/generated/dmmf-utils";
import type { DB } from "@db/generated/zod";
import type { VirtualTableProps } from "../dataDisplay/virtualTable";
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
import type { DBFormProps } from "./form/DBFormRenderer";

export type TableDataConfig<T extends keyof DB> = {
	fieldGroupMap: Record<string, Array<keyof DB[T]>>;
	table: Omit<
		VirtualTableProps<DB[T]>,
		| "dataFetcher"
		| "dictionary"
		| "rowHandleClick"
		| "onColumnVisibilityChange"
		| "onRefetch"
		| "globalFilterStr"
		| "primaryKeyField"
	>;
	form: Omit<DBFormProps<T>, "initialValue" | "dataSchema" | "tableName">;
	card: Omit<DBdataRendererProps<T>, "data" | "dictionary" | "dataSchema" | "tableName">;
	childrenRelations?: Array<ChildTableOf<T>>;
};

export type DataConfig = Partial<{
	[T in keyof DB]: TableDataConfig<T>;
}>;

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

