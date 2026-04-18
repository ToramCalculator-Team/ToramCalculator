import { defaultData } from "@db/defaultData";
import { repositoryMethods } from "@db/generated/repositories";
import { ItemSchema, type item } from "@db/generated/zod";
import { setStore, store } from "~/store";
import type { TableDataConfig } from "../data-config";

export const ITEM_DATA_CONFIG: TableDataConfig<item> = (dictionary) => ({
	dictionary: dictionary().db.item,
	dataSchema: ItemSchema,
	primaryKey: "id",
	defaultData: defaultData.item,
	dataFetcher: {
		get: repositoryMethods.item.select,
		getAll: repositoryMethods.item.selectAll,
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
		onInsert: repositoryMethods.item.insert,
		onUpdate: repositoryMethods.item.update,
	},
	card: {
		hiddenFields: ["id", "createdByAccountId", "updatedByAccountId", "statisticId"],
		fieldGenerator: {},
		deleteCallback: repositoryMethods.item.delete,
		openEditor: (data) => setStore("pages", "formGroup", store.pages.formGroup.length, { type: "item", data }),
		editAbleCallback: (data) => repositoryMethods.item.canEdit(data.id),
	},
});
