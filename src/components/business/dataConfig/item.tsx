import { defaultData } from "@db/defaultData";
import { repositoryReaders, repositoryWriters } from "@db/generated/repositories";
import { ItemSchema, type item } from "@db/generated/zod";
import { getDB } from "@db/repositories/database";
import { createId } from "@paralleldrive/cuid2";
import type { TableDataConfig } from "../data-config";
import { getUserContext } from "../utils/context";

export const ITEM_DATA_CONFIG: TableDataConfig<item> = (dictionary) => ({
	tableName: "item",
	embeds: [{ field: "recipe", table: "recipe", via: "itemId" }],
	dictionary: dictionary().db.item,
	dataSchema: ItemSchema,
	primaryKey: "id",
	defaultData: defaultData.item,
	queries: repositoryReaders.item,
	fieldGroupMap: {
		ID: ["id"],
		基本信息: ["name", "itemType", "itemSourceType"],
		其他属性: ["dataSources", "details"],
		创建和更新信息: ["createdAt", "updatedAt", "createdByAccountId", "updatedByAccountId"],
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
		hiddenColumnDef: ["id", "createdAt", "updatedAt", "createdByAccountId", "updatedByAccountId"],
		defaultSort: { field: "id", desc: false },
		tdGenerator: {},
	},
	form: {
		hiddenFields: ["id", "createdAt", "updatedAt", "createdByAccountId", "updatedByAccountId"],
		onInsert: async (data) => {
			const db = await getDB();
			return db.transaction().execute(async (trx) => {
				const { account } = await getUserContext(trx);
				return repositoryWriters.item.create(
					{
						...data,
						id: createId(),
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
				return repositoryWriters.item.update(id, { ...data, updatedByAccountId: account.id }, trx);
			});
		},
	},
	card: {
		hiddenFields: ["id", "createdByAccountId", "updatedByAccountId"],
		fieldGenerator: {},
		deleteCallback: repositoryWriters.item.delete,
		editAbleCallback: (data) => repositoryWriters.item.canEdit(data.id),
	},
});
