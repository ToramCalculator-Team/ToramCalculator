import { defaultData } from "@db/defaultData";
import { repositoryMethods } from "@db/generated/repositories";
import { deleteArmor, insertArmor, updateArmor } from "@db/generated/repositories/armor";
import { deleteItem, insertItem, updateItem } from "@db/generated/repositories/item";
import { insertStatistic } from "@db/generated/repositories/statistic";
import { ArmorSchema, type armor, ItemSchema } from "@db/generated/zod";
import { getDB } from "@db/repositories/database";
import { createId } from "@paralleldrive/cuid2";
import type { z } from "zod/v4";
import { stringArrayCellRenderer } from "~/components/business/utils/stringArrayCellRenderer";
import { setStore, store } from "~/store";
import type { TableDataConfig } from "../data-config";
import { getUserContext } from "../utils/context";

const ArmorItemSchema = ItemSchema.extend(ArmorSchema.shape);
type ArmorItem = z.output<typeof ArmorItemSchema>;

const ArmorItemDefaultData: ArmorItem = {
	...defaultData.armor,
	...defaultData.item,
};

const getArmorItem = async (id: string): Promise<ArmorItem> => {
	const db = await getDB();
	const armorRow = await db.selectFrom("armor").where("itemId", "=", id).selectAll().executeTakeFirstOrThrow();
	const item = await db.selectFrom("item").where("id", "=", armorRow.itemId).selectAll().executeTakeFirstOrThrow();
	return {
		...armorRow,
		...item,
	};
};

const getAllArmorItems = async (): Promise<ArmorItem[]> => {
	const db = await getDB();
	return await db
		.selectFrom("armor")
		.innerJoin("item", (join) => join.onRef("armor.itemId", "=", "item.id"))
		.selectAll()
		.execute();
};

const insertArmorItem = async (data: ArmorItem): Promise<ArmorItem> => {
	const db = await getDB();
	return await db.transaction().execute(async (trx) => {
		const { account } = await getUserContext(trx);
		const statistic = await insertStatistic(
			{
				...defaultData.statistic,
				id: createId(),
			},
			trx,
		);
		const item = await insertItem(
			{
				...ItemSchema.parse(data),
				id: createId(),
				statisticId: statistic.id,
				createdByAccountId: account.id,
				updatedByAccountId: account.id,
			},
			trx,
		);
		const armorRow = await insertArmor(
			{
				...ArmorSchema.parse(data),
				itemId: item.id,
			},
			trx,
		);
		return {
			...armorRow,
			...item,
		};
	});
};

const updateArmorItem = async (id: string, data: Partial<ArmorItem>): Promise<ArmorItem> => {
	const db = await getDB();
	return await db.transaction().execute(async (trx) => {
		const armorRow = await updateArmor(id, ArmorSchema.parse(data), trx);
		const item = await updateItem(id, ItemSchema.parse(data), trx);
		return {
			...armorRow,
			...item,
		};
	});
};

const deleteArmorItem = async (id: string): Promise<ArmorItem | undefined> => {
	const db = await getDB();
	return await db.transaction().execute(async (trx) => {
		await deleteArmor(id, trx);
		await deleteItem(id, trx);
		return undefined;
	});
};

export const ARMOR_DATA_CONFIG: TableDataConfig<ArmorItem, armor> = (dictionary) => ({
	inheritsFrom: { table: "item", via: "itemId" },
	relationOverrides: {
		hide: ["player_armor", "statistic", "account_create_data", "account_update_data"],
	},
	dictionary: dictionary().db.armor,
	dataSchema: ArmorItemSchema,
	primaryKey: "itemId",
	defaultData: ArmorItemDefaultData,
	dataFetcher: {
		get: getArmorItem,
		getAll: getAllArmorItems,
		insert: insertArmorItem,
		update: updateArmorItem,
		delete: deleteArmorItem,
		liveQuery: (db) =>
			db
				.selectFrom("armor")
				.innerJoin("item", (join) => join.onRef("armor.itemId", "=", "item.id"))
				.selectAll("item")
				.select(["armor.itemId", "armor.baseAbi", "armor.modifiers", "armor.colorA", "armor.colorB", "armor.colorC"]),
	},
	fieldGroupMap: {
		基本信息: ["name", "baseAbi", "itemSourceType", "dataSources", "details"],
		其他属性: ["modifiers"],
		颜色信息: ["colorA", "colorB", "colorC"],
	},
	table: {
		columnsDef: [
			{ accessorKey: "name", cell: (info) => info.getValue(), size: 200 },
			{ accessorKey: "itemId", cell: (info) => info.getValue(), size: 200 },
			{ accessorKey: "baseAbi", cell: (info) => info.getValue(), size: 100 },
		],
		hiddenColumnDef: ["itemId"],
		defaultSort: { id: "name", desc: false },
		tdGenerator: {
			modifiers: (props) => stringArrayCellRenderer(props.cell.getValue<string[]>()),
		},
	},
	form: {
		hiddenFields: [],
		fieldGenerator: {},
		onInsert: async (values) => insertArmorItem(values),
		onUpdate: updateArmorItem,
	},
	card: {
		hiddenFields: [],
		fieldGenerator: {},
		deleteCallback: deleteArmorItem,
		openEditor: (data) => setStore("pages", "formGroup", store.pages.formGroup.length, { type: "armor", data }),
		editAbleCallback: (data) => repositoryMethods.armor.canEdit(data.itemId),
	},
});
