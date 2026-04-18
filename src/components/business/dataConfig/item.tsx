import { defaultData } from "@db/defaultData";
import { repositoryMethods } from "@db/generated/repositories";
import { insertStatistic } from "@db/generated/repositories/statistic";
import { ItemSchema, type item } from "@db/generated/zod";
import { getDB } from "@db/repositories/database";
import { createId } from "@paralleldrive/cuid2";
import { setStore, store } from "~/store";
import type { TableDataConfig } from "../data-config";
import { getUserContext } from "../utils/context";

export const ITEM_DATA_CONFIG: TableDataConfig<item> = (dictionary) => ({
	embeds: [{ field: "recipe", table: "recipe", via: "itemId" }],
	dictionary: dictionary().db.item,
	dataSchema: ItemSchema,
	primaryKey: "id",
	defaultData: defaultData.item,
	dataFetcher: {
		get: repositoryMethods.item.select,
		getAll: repositoryMethods.item.selectAll,
		liveQuery: (db) => db.selectFrom("item").selectAll("item"),
		insert: repositoryMethods.item.insert,
		update: repositoryMethods.item.update,
		delete: repositoryMethods.item.delete,
	},
	fieldGroupMap: {
		ID: ["id"],
		基本信息: ["name", "itemType", "itemSourceType"],
		其他属性: ["dataSources", "details"],
		统计信息: ["statisticId"],
		创建和更新信息: ["createdByAccountId", "updatedByAccountId"],
	},
	table: {
		columnsDef: [
			{ accessorKey: "name", cell: (info) => info.getValue(), size: 200 },
			{ accessorKey: "itemType", cell: (info) => info.getValue(), size: 150 },
			{
				accessorKey: "itemSourceType",
				cell: (info) => info.getValue(),
				size: 150,
			},
			{
				accessorKey: "dataSources",
				cell: (info) => info.getValue(),
				size: 150,
			},
			{ accessorKey: "details", cell: (info) => info.getValue(), size: 150 },
		],
		hiddenColumnDef: ["id", "createdByAccountId", "updatedByAccountId", "statisticId"],
		defaultSort: { id: "id", desc: false },
		tdGenerator: {},
	},
	form: {
		hiddenFields: ["id", "createdByAccountId", "updatedByAccountId", "statisticId"],
		fieldGenerator: {},
		onInsert: async (data) => {
			const db = await getDB();
			return db.transaction().execute(async (trx) => {
				const { account } = await getUserContext(trx);
				const statistic = await insertStatistic(
					{
						...defaultData.statistic,
						id: createId(),
					},
					trx,
				);
				return repositoryMethods.item.insert(
					{
						...data,
						id: createId(),
						statisticId: statistic.id,
						createdByAccountId: account.id,
						updatedByAccountId: account.id,
					},
					trx,
				);
			});
		},
		onUpdate: async (id, data) => {
			const db = await getDB();
			return db.transaction().execute(async (trx) => {
				const { account } = await getUserContext(trx);
				return repositoryMethods.item.update(id, { ...data, updatedByAccountId: account.id }, trx);
			});
		},
	},
	card: {
		hiddenFields: ["id", "createdByAccountId", "updatedByAccountId", "statisticId"],
		fieldGenerator: {},
		deleteCallback: repositoryMethods.item.delete,
		openEditor: (data) => setStore("pages", "formGroup", store.pages.formGroup.length, { type: "item", data }),
		editAbleCallback: (data) => repositoryMethods.item.canEdit(data.id),
	},
});
