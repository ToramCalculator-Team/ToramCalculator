import { defaultData } from "@db/defaultData";
import { repositoryMethods } from "@db/generated/repositories";
import { deleteItem, insertItem, updateItem } from "@db/generated/repositories/item";
import { insertStatistic } from "@db/generated/repositories/statistic";
import { deleteWeapon, insertWeapon, updateWeapon } from "@db/generated/repositories/weapon";
import { ItemSchema, WeaponSchema, type weapon } from "@db/generated/zod";
import { getDB } from "@db/repositories/database";
import type { ElementType } from "@db/schema/enums";
import { createId } from "@paralleldrive/cuid2";
import type { z } from "zod/v4";
import { stringArrayCellRenderer } from "~/components/business/utils/stringArrayCellRenderer";
import { Icons } from "~/components/icons";
import { getDictionary } from "~/locales/i18n";
import type { Dic } from "~/locales/type";
import { setStore, store } from "~/store";
import type { TableDataConfig } from "../data-config";
import { getUserContext } from "../utils/context";

const dictionary = getDictionary(store.settings.userInterface.language); 

const WeaponItemSchema = ItemSchema.extend(WeaponSchema.shape);
type WeaponItem = z.output<typeof WeaponItemSchema>;

/**
 * 创建新的 Weapon（包含父表 Item）
 * @param params 武器参数
 * @returns 创建的 Item 和 Weapon
 */
export const createWeapon = async (params: WeaponItem): Promise<WeaponItem> => {
	const db = await getDB();
	return await db.transaction().execute(async (trx) => {
		const { account } = await getUserContext(trx);

		// 1. 创建统计记录
		const statistic = await insertStatistic(
			{
				...defaultData.statistic,
				id: createId(),
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
			trx,
		);

		// 2. 创建父表 item
		const item = await insertItem(
			{
				id: createId(),
				itemType: "Weapon", // 从 weapon 推导
				itemSourceType: params.itemSourceType,
				name: params.name,
				dataSources: params.dataSources || "",
				details: params.details || null,
				statisticId: statistic.id,
				createdByAccountId: account.id,
				updatedByAccountId: account.id,
			},
			trx,
		);

		// 3. 创建 weapon
		const weapon = await insertWeapon(
			{
				name: params.name,
				type: params.type,
				elementType: params.elementType,
				baseAbi: params.baseAbi,
				stability: params.stability,
				modifiers: params.modifiers,
				colorA: params.colorA,
				colorB: params.colorB,
				colorC: params.colorC,
				itemId: item.id,
			},
			trx,
		);

		return {
			...item,
			...weapon,
		};
	});
};

/**
 * 更新武器（同时更新 Item 和 Weapon）
 * @param itemId Item ID
 * @param params 更新参数
 * @returns 更新后的 Item 和 Weapon
 */
export const updateWeaponWithItem = async (itemId: string, params: Partial<WeaponItem>): Promise<WeaponItem> => {
	const db = await getDB();
	return await db.transaction().execute(async (trx) => {
		const { account } = await getUserContext(trx);

		// 1. 更新 item
		const item = await db
			.updateTable("item")
			.set({
				name: params.name,
				dataSources: params.dataSources,
				details: params.details,
				updatedByAccountId: account.id,
			})
			.where("id", "=", itemId)
			.returningAll()
			.executeTakeFirstOrThrow();

		// 2. 更新 weapon
		const weaponUpdate: Partial<weapon> = {};
		if (params.name !== undefined) weaponUpdate.name = params.name;
		if (params.type !== undefined) weaponUpdate.type = params.type;
		if (params.elementType !== undefined) weaponUpdate.elementType = params.elementType;
		if (params.baseAbi !== undefined) weaponUpdate.baseAbi = params.baseAbi;
		if (params.stability !== undefined) weaponUpdate.stability = params.stability;
		if (params.modifiers !== undefined) weaponUpdate.modifiers = params.modifiers;
		if (params.colorA !== undefined) weaponUpdate.colorA = params.colorA;
		if (params.colorB !== undefined) weaponUpdate.colorB = params.colorB;
		if (params.colorC !== undefined) weaponUpdate.colorC = params.colorC;

		const weapon = await updateWeapon(itemId, weaponUpdate, trx);

		return {
			...item,
			...weapon,
		};
	});
};

const WeaponItemDictionary: Dic<WeaponItem> = {
	...dictionary.db.weapon,
	fields: {
		...dictionary.db.weapon.fields,
		...dictionary.db.item.fields,
	},
};

const WeaponItemDefaultData: WeaponItem = {
	...defaultData.weapon,
	...defaultData.item,
};

const getWeaponItem = async (id: string): Promise<WeaponItem> => {
	const db = await getDB();
	const weapon = await db.selectFrom("weapon").where("itemId", "=", id).selectAll().executeTakeFirstOrThrow();
	const item = await db.selectFrom("item").where("id", "=", weapon.itemId).selectAll().executeTakeFirstOrThrow();
	return {
		...weapon,
		...item,
	};
};

const getAllWeaponItems = async (): Promise<WeaponItem[]> => {
	const db = await getDB();
	const weaponItems = await db
		.selectFrom("weapon")
		.innerJoin("item", (join) => join.onRef("weapon.itemId", "=", "item.id"))
		.selectAll()
		.execute();
	return weaponItems;
};

const insertWeaponItem = async (data: WeaponItem): Promise<WeaponItem> => {
	const db = await getDB();
	return await db.transaction().execute(async (trx) => {
		const weapon = await insertWeapon(WeaponSchema.parse(data), trx);
		const item = await insertItem(ItemSchema.parse(data), trx);
		return {
			...weapon,
			...item,
		};
	});
};

const updateWeaponItem = async (id: string, data: Partial<WeaponItem>): Promise<WeaponItem> => {
	const db = await getDB();
	return await db.transaction().execute(async (trx) => {
		const weapon = await updateWeapon(id, WeaponSchema.parse(data), trx);
		const item = await updateItem(id, ItemSchema.parse(data), trx);
		return {
			...weapon,
			...item,
		};
	});
};

const deleteWeaponItem = async (id: string): Promise<WeaponItem | undefined> => {
	const db = await getDB();
	return await db.transaction().execute(async (trx) => {
		await deleteWeapon(id, trx);
		await deleteItem(id, trx);
		// 不知道为什么返回值的时候类型错误说id有问题，懒得写了
		return undefined;
	});
};

export const WEAPON_DATA_CONFIG: TableDataConfig<WeaponItem> = {
	dictionary: WeaponItemDictionary,
	dataSchema: WeaponItemSchema,
	primaryKey: "itemId",
	defaultData: WeaponItemDefaultData,
	dataFetcher: {
		get: getWeaponItem,
		getAll: getAllWeaponItems,
		insert: insertWeaponItem,
		update: updateWeaponItem,
		delete: deleteWeaponItem,
	},
	fieldGroupMap: {
		基本信息: ["name", "baseAbi", "stability","itemSourceType","dataSources", "details", "elementType"],
		其他属性: ["modifiers"],
		颜色信息: ["colorA", "colorB", "colorC"],
	},
	table: {
		columnsDef: [
			{ accessorKey: "name", cell: (info) => info.getValue(), size: 200 },
			{ accessorKey: "itemId", cell: (info) => info.getValue(), size: 200 },
			{ accessorKey: "baseAbi", cell: (info) => info.getValue(), size: 100 },
			{
				accessorKey: "stability",
				cell: (info) => info.getValue(),
				size: 100,
			},
			{
				accessorKey: "elementType",
				cell: (info) => info.getValue<ElementType>(),
				size: 150,
			},
			{ accessorKey: "modifiers", cell: (info) => info.getValue(), size: 360 },
			{ accessorKey: "colorA", cell: (info) => info.getValue(), size: 150 },
			{ accessorKey: "colorB", cell: (info) => info.getValue(), size: 150 },
			{ accessorKey: "colorC", cell: (info) => info.getValue(), size: 150 },
		],
		hiddenColumnDef: ["itemId"],
		defaultSort: {
			id: "name",
			desc: false,
		},
		tdGenerator: {
			modifiers: (props) => stringArrayCellRenderer(props.cell.getValue<string[]>()),
			elementType: (props) =>
				({
					Water: <Icons.Game.ElementWater class="h-12 w-12" />,
					Fire: <Icons.Game.ElementFire class="h-12 w-12" />,
					Earth: <Icons.Game.ElementEarth class="h-12 w-12" />,
					Wind: <Icons.Game.ElementWind class="h-12 w-12" />,
					Light: <Icons.Game.ElementLight class="h-12 w-12" />,
					Dark: <Icons.Game.ElementDark class="h-12 w-12" />,
					Normal: <Icons.Game.ElementNoElement class="h-12 w-12" />,
				})[props.cell.getValue<ElementType>()],
		},
	},
	form: {
		hiddenFields: [],
		fieldGenerator: {},
		onInsert: async (values) => createWeapon(values),
		onUpdate: updateWeaponWithItem,
	},
	card: {
		hiddenFields: [],
		fieldGenerator: {},
		deleteCallback: deleteWeaponItem,
		openEditor: (data) => setStore("pages", "formGroup", store.pages.formGroup.length, { type: "weapon", data }),
		editAbleCallback: (data) => repositoryMethods.weapon.canEdit(data.itemId),
	},
};
