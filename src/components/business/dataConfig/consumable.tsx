import { defaultData } from "@db/defaultData";
import { repositoryMethods } from "@db/generated/repositories";
import { deleteConsumable, insertConsumable, updateConsumable } from "@db/generated/repositories/consumable";
import { deleteItem, insertItem, updateItem } from "@db/generated/repositories/item";
import { insertStatistic } from "@db/generated/repositories/statistic";
import { ConsumableSchema, type consumable, ItemSchema } from "@db/generated/zod";
import { getDB } from "@db/repositories/database";
import { createId } from "@paralleldrive/cuid2";
import type { z } from "zod/v4";
import { setStore, store } from "~/store";
import type { TableDataConfig } from "../data-config";
import { getUserContext } from "../utils/context";

const ConsumableItemSchema = ItemSchema.extend(ConsumableSchema.shape);
type ConsumableItem = z.output<typeof ConsumableItemSchema>;

const ConsumableItemDefaultData: ConsumableItem = {
	...defaultData.consumable,
	...defaultData.item,
};

const getConsumableItem = async (id: string): Promise<ConsumableItem> => {
	const db = await getDB();
	const consumableRow = await db
		.selectFrom("consumable")
		.where("itemId", "=", id)
		.selectAll()
		.executeTakeFirstOrThrow();
	const item = await db.selectFrom("item").where("id", "=", consumableRow.itemId).selectAll().executeTakeFirstOrThrow();
	return {
		...consumableRow,
		...item,
	};
};

const getAllConsumableItems = async (): Promise<ConsumableItem[]> => {
	const db = await getDB();
	return await db
		.selectFrom("consumable")
		.innerJoin("item", (join) => join.onRef("consumable.itemId", "=", "item.id"))
		.selectAll()
		.execute();
};

const insertConsumableItem = async (data: ConsumableItem): Promise<ConsumableItem> => {
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
				statisticId: statistic.id,
				createdByAccountId: account.id,
				updatedByAccountId: account.id,
			},
			trx,
		);
		const consumableRow = await insertConsumable(
			{
				...ConsumableSchema.parse(data),
				itemId: item.id,
			},
			trx,
		);
		return {
			...consumableRow,
			...item,
		};
	});
};

const updateConsumableItem = async (id: string, data: Partial<ConsumableItem>): Promise<ConsumableItem> => {
	const db = await getDB();
	return await db.transaction().execute(async (trx) => {
		const consumableRow = await updateConsumable(id, ConsumableSchema.parse(data), trx);
		const item = await updateItem(id, ItemSchema.parse(data), trx);
		return {
			...consumableRow,
			...item,
		};
	});
};

const deleteConsumableItem = async (id: string): Promise<ConsumableItem | undefined> => {
	const db = await getDB();
	return await db.transaction().execute(async (trx) => {
		await deleteConsumable(id, trx);
		await deleteItem(id, trx);
		return undefined;
	});
};

export const CONSUMABLE_DATA_CONFIG: TableDataConfig<ConsumableItem, consumable> = (dictionary) => ({
	inheritsFrom: { table: "item", via: "itemId" },
	relationOverrides: {
		hide: ["statistic", "account_create_data", "account_update_data"],
	},
	dictionary: dictionary().db.consumable,
	dataSchema: ConsumableItemSchema,
	primaryKey: "itemId",
	defaultData: ConsumableItemDefaultData,
	dataFetcher: {
		get: getConsumableItem,
		getAll: getAllConsumableItems,
		insert: insertConsumableItem,
		update: updateConsumableItem,
		delete: deleteConsumableItem,
		liveQuery: (db) =>
			db
				.selectFrom("consumable")
				.innerJoin("item", (join) => join.onRef("consumable.itemId", "=", "item.id"))
				.selectAll("item")
				.select(["consumable.itemId", "consumable.type", "consumable.effectDuration", "consumable.effects"]),
	},
	fieldGroupMap: {
		基本信息: ["name", "type", "itemSourceType", "dataSources", "details"],
		效果信息: ["effects", "effectDuration"],
	},
	table: {
		columnsDef: [
			{ accessorKey: "name", cell: (info) => info.getValue(), size: 200 },
			{ accessorKey: "itemId", cell: (info) => info.getValue(), size: 200 },
			{ accessorKey: "type", cell: (info) => info.getValue(), size: 150 },
			{
				accessorKey: "effectDuration",
				cell: (info) => info.getValue(),
				size: 100,
			},
			{ accessorKey: "effects", cell: (info) => info.getValue(), size: 150 },
		],
		hiddenColumnDef: ["itemId"],
		defaultSort: { id: "name", desc: false },
		tdGenerator: {},
	},
	form: {
		hiddenFields: [],
		fieldGenerator: {},
		onInsert: async (values) => insertConsumableItem(values),
		onUpdate: updateConsumableItem,
	},
	card: {
		hiddenFields: [],
		fieldGenerator: {},
		deleteCallback: deleteConsumableItem,
		openEditor: (data) => setStore("pages", "formGroup", store.pages.formGroup.length, { type: "consumable", data }),
		editAbleCallback: (data) => repositoryMethods.consumable.canEdit(data.itemId),
	},
});
