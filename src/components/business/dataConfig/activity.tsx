import { defaultData } from "@db/defaultData";
import { repositoryReaders, repositoryWriters } from "@db/generated/repositories";
import { ActivitySchema, type activity } from "@db/generated/zod";
import { getDB } from "@db/repositories/database";
import { createId } from "@paralleldrive/cuid2";
import type { TableDataConfig } from "../data-config";
import { getUserContext } from "../utils/context";

export const ACTIVITY_DATA_CONFIG: TableDataConfig<activity> = (dictionary) => ({
	tableName: "activity",
	dictionary: dictionary().db.activity,
	dataSchema: ActivitySchema,
	primaryKey: "id",
	defaultData: defaultData.activity,
	queries: repositoryReaders.activity,
	fieldGroupMap: {
		ID: ["id"],
		基本信息: ["name"],
		创建和更新信息: ["createdAt", "updatedAt", "createdByAccountId", "updatedByAccountId"],
	},
	table: {
		columnsDef: [
			{
				accessorKey: "id",
				cell: (info) => info.getValue(),
				size: 200,
			},
			{
				accessorKey: "name",
				cell: (info) => info.getValue(),
				size: 220,
			},
		],
		hiddenColumnDef: ["id", "createdAt", "updatedAt"],
		defaultSort: { field: "name", desc: false },
		tdGenerator: {},
	},
	form: {
		hiddenFields: ["id", "createdAt", "updatedAt", "createdByAccountId", "updatedByAccountId"],
		onInsert: async (data) => {
			const db = await getDB();
			return db.transaction().execute(async (trx) => {
				const { account } = await getUserContext(trx);
				const activity = await repositoryWriters.activity.create(
					{
						...data,
						id: createId(),
						createdByAccountId: account.id,
						updatedByAccountId: account.id,
					},
					trx,
				);
				return activity;
			});
		},
		onUpdate: repositoryWriters.activity.update,
	},
	card: {
		hiddenFields: ["id", "createdByAccountId", "updatedByAccountId"],
		fieldGenerator: {},
		deleteCallback: repositoryWriters.activity.delete,
		editAbleCallback: (data) => repositoryWriters.activity.canEdit(data.id),
	},
});
