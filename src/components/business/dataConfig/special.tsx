import { defaultData } from "@db/defaultData";
import { repositoryMethods } from "@db/generated/repositories";
import { deleteItem, insertItem, updateItem } from "@db/generated/repositories/item";
import { deleteSpecial, insertSpecial, updateSpecial } from "@db/generated/repositories/special";
import { insertStatistic } from "@db/generated/repositories/statistic";
import { ItemSchema, SpecialSchema, type special } from "@db/generated/zod";
import { getDB } from "@db/repositories/database";
import { createId } from "@paralleldrive/cuid2";
import type { z } from "zod/v4";
import { ModifiersRenderer } from "~/components/business/utils/ModifiersRenderer";
import { setStore, store } from "~/store";
import type { TableDataConfig } from "../data-config";
import { getUserContext } from "../utils/context";

const SpecialItemSchema = ItemSchema.extend(SpecialSchema.shape);
type SpecialItem = z.output<typeof SpecialItemSchema>;

const SpecialItemDefaultData: SpecialItem = {
	...defaultData.special,
	...defaultData.item,
};

const getSpecialItem = async (id: string): Promise<SpecialItem> => {
	const db = await getDB();
	const specialRow = await db.selectFrom("special").where("itemId", "=", id).selectAll().executeTakeFirstOrThrow();
	const item = await db.selectFrom("item").where("id", "=", specialRow.itemId).selectAll().executeTakeFirstOrThrow();
	return {
		...specialRow,
		...item,
	};
};

const getAllSpecialItems = async (): Promise<SpecialItem[]> => {
	const db = await getDB();
	return await db
		.selectFrom("special")
		.innerJoin("item", (join) => join.onRef("special.itemId", "=", "item.id"))
		.selectAll()
		.execute();
};

const insertSpecialItem = async (data: SpecialItem): Promise<SpecialItem> => {
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
		const specialRow = await insertSpecial(
			{
				...SpecialSchema.parse(data),
				itemId: item.id,
			},
			trx,
		);
		return {
			...specialRow,
			...item,
		};
	});
};

const updateSpecialItem = async (id: string, data: Partial<SpecialItem>): Promise<SpecialItem> => {
	const db = await getDB();
	return await db.transaction().execute(async (trx) => {
		const specialRow = await updateSpecial(id, SpecialSchema.parse(data), trx);
		const item = await updateItem(id, ItemSchema.parse(data), trx);
		return {
			...specialRow,
			...item,
		};
	});
};

const deleteSpecialItem = async (id: string): Promise<SpecialItem | undefined> => {
	const db = await getDB();
	return await db.transaction().execute(async (trx) => {
		await deleteSpecial(id, trx);
		await deleteItem(id, trx);
		return undefined;
	});
};

export const SPECIAL_DATA_CONFIG: TableDataConfig<SpecialItem, special> = (dictionary) => ({
	inheritsFrom: { table: "item", via: "itemId" },
	relationOverrides: {
		hide: ["player_special", "statistic", "account_create_data", "account_update_data"],
	},
	dictionary: dictionary().db.special,
	dataSchema: SpecialItemSchema,
	primaryKey: "itemId",
	defaultData: SpecialItemDefaultData,
	dataFetcher: {
		get: getSpecialItem,
		getAll: getAllSpecialItems,
		insert: insertSpecialItem,
		update: updateSpecialItem,
		delete: deleteSpecialItem,
		liveQuery: (db) =>
			db
				.selectFrom("special")
				.innerJoin("item", (join) => join.onRef("special.itemId", "=", "item.id"))
				.selectAll("item")
				.select(["special.itemId", "special.baseAbi", "special.modifiers"]),
	},
	fieldGroupMap: {
		基本信息: ["name", "baseAbi", "itemSourceType", "dataSources", "details"],
		其他属性: ["modifiers"],
	},
	table: {
		columnsDef: [
			{ accessorKey: "name", cell: (info) => info.getValue(), size: 200 },
			{ accessorKey: "itemId", cell: (info) => info.getValue(), size: 200 },
			{ accessorKey: "baseAbi", cell: (info) => info.getValue(), size: 100 },
			{
				accessorKey: "modifiers",
				cell: (info) => info.getValue(),
				size: 150,
			},
		],
		hiddenColumnDef: ["itemId"],
		defaultSort: { field: "name", desc: false },
		tdGenerator: {
			modifiers: (props) => <ModifiersRenderer data={props.cell.getValue() as Array<string>} />,
		},
	},
	form: {
		hiddenFields: [],
		fieldGenerator: {},
		onInsert: async (values) => insertSpecialItem(values),
		onUpdate: updateSpecialItem,
	},
	card: {
		hiddenFields: [],
		fieldGenerator: {},
		deleteCallback: deleteSpecialItem,
		openEditor: (data) => setStore("pages", "formGroup", store.pages.formGroup.length, { type: "special", data }),
		editAbleCallback: (data) => repositoryMethods.special.canEdit(data.itemId),
	},
});
