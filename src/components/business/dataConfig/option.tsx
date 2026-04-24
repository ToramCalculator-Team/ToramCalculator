import { defaultData } from "@db/defaultData";
import { repositoryMethods } from "@db/generated/repositories";
import { deleteItem, insertItem, updateItem } from "@db/generated/repositories/item";
import { deleteOption, insertOption, updateOption } from "@db/generated/repositories/option";
import { insertStatistic } from "@db/generated/repositories/statistic";
import { ItemSchema, OptionSchema, type option } from "@db/generated/zod";
import { getDB } from "@db/repositories/database";
import { createId } from "@paralleldrive/cuid2";
import type { z } from "zod/v4";
import { stringArrayCellRenderer } from "~/components/business/utils/stringArrayCellRenderer";
import { setStore, store } from "~/store";
import type { TableDataConfig } from "../data-config";
import { getUserContext } from "../utils/context";

const OptionItemSchema = ItemSchema.extend(OptionSchema.shape);
type OptionItem = z.output<typeof OptionItemSchema>;

const OptionItemDefaultData: OptionItem = {
	...defaultData.option,
	...defaultData.item,
};

const getOptionItem = async (id: string): Promise<OptionItem> => {
	const db = await getDB();
	const optionRow = await db.selectFrom("option").where("itemId", "=", id).selectAll().executeTakeFirstOrThrow();
	const item = await db.selectFrom("item").where("id", "=", optionRow.itemId).selectAll().executeTakeFirstOrThrow();
	return {
		...optionRow,
		...item,
	};
};

const getAllOptionItems = async (): Promise<OptionItem[]> => {
	const db = await getDB();
	return await db
		.selectFrom("option")
		.innerJoin("item", (join) => join.onRef("option.itemId", "=", "item.id"))
		.selectAll()
		.execute();
};

const insertOptionItem = async (data: OptionItem): Promise<OptionItem> => {
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
		const optionRow = await insertOption(
			{
				...OptionSchema.parse(data),
				itemId: item.id,
			},
			trx,
		);
		return {
			...optionRow,
			...item,
		};
	});
};

const updateOptionItem = async (id: string, data: Partial<OptionItem>): Promise<OptionItem> => {
	const db = await getDB();
	return await db.transaction().execute(async (trx) => {
		const optionRow = await updateOption(id, OptionSchema.parse(data), trx);
		const item = await updateItem(id, ItemSchema.parse(data), trx);
		return {
			...optionRow,
			...item,
		};
	});
};

const deleteOptionItem = async (id: string): Promise<OptionItem | undefined> => {
	const db = await getDB();
	return await db.transaction().execute(async (trx) => {
		await deleteOption(id, trx);
		await deleteItem(id, trx);
		return undefined;
	});
};

export const OPTION_DATA_CONFIG: TableDataConfig<OptionItem, option> = (dictionary) => ({
	inheritsFrom: { table: "item", via: "itemId" },
	relationOverrides: {
		hide: ["player_option", "statistic", "account_create_data", "account_update_data"],
	},
	dictionary: dictionary().db.option,
	dataSchema: OptionItemSchema,
	primaryKey: "itemId",
	defaultData: OptionItemDefaultData,
	dataFetcher: {
		get: getOptionItem,
		getAll: getAllOptionItems,
		insert: insertOptionItem,
		update: updateOptionItem,
		delete: deleteOptionItem,
		liveQuery: (db) =>
			db
				.selectFrom("option")
				.innerJoin("item", (join) => join.onRef("option.itemId", "=", "item.id"))
				.selectAll("item")
				.select([
					"option.itemId",
					"option.baseAbi",
					"option.modifiers",
					"option.colorA",
					"option.colorB",
					"option.colorC",
				]),
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
			{
				accessorKey: "modifiers",
				cell: (info) => info.getValue(),
				size: 150,
			},
			{ accessorKey: "colorA", cell: (info) => info.getValue(), size: 150 },
			{ accessorKey: "colorB", cell: (info) => info.getValue(), size: 150 },
			{ accessorKey: "colorC", cell: (info) => info.getValue(), size: 150 },
		],
		hiddenColumnDef: ["itemId"],
		defaultSort: {
			field: "name",
			desc: false,
		},
		tdGenerator: {
			modifiers: (props) => stringArrayCellRenderer(props.cell.getValue<string[]>()),
		},
	},
	form: {
		hiddenFields: [],
		fieldGenerator: {},
		onInsert: async (values) => insertOptionItem(values),
		onUpdate: updateOptionItem,
	},
	card: {
		hiddenFields: [],
		fieldGenerator: {},
		deleteCallback: deleteOptionItem,
		openEditor: (data) => setStore("pages", "formGroup", store.pages.formGroup.length, { type: "option", data }),
		editAbleCallback: (data) => repositoryMethods.option.canEdit(data.itemId),
	},
});
