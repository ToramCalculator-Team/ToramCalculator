import { defaultData } from "@db/defaultData";
import { repositoryReaders, repositoryWriters } from "@db/generated/repositories";
import { TaskSchema, type task } from "@db/generated/zod";
import { getDB } from "@db/repositories/database";
import { createId } from "@paralleldrive/cuid2";
import type { TableDataConfig } from "../data-config";
import { getUserContext } from "../utils/context";

export const TASK_DATA_CONFIG: TableDataConfig<task> = (dictionary) => ({
	tableName: "task",
	dictionary: dictionary().db.task,
	dataSchema: TaskSchema,
	primaryKey: "id",
	defaultData: defaultData.task,
	queries: repositoryReaders.task,
	fieldGroupMap: {
		ID: ["id"],
		基本信息: ["name", "lv", "type", "description"],
		创建和更新信息: ["createdAt", "updatedAt", "createdByAccountId", "updatedByAccountId"],
	},
	table: {
		columnsDef: [
			{
				id: "id",
				accessorFn: (row) => row.id,
				cell: (info) => info.getValue(),
				size: 200,
			},
			{
				id: "name",
				accessorFn: (row) => row.name,
				cell: (info) => info.getValue(),
				size: 220,
			},
			{
				id: "lv",
				accessorFn: (row) => row.lv,
				cell: (info) => info.getValue<number | null>(),
				size: 120,
			},
			{
				id: "type",
				accessorFn: (row) => row.type,
				cell: (info) => info.getValue<string | null>(),
				size: 160,
			},
			{
				id: "description",
				accessorFn: (row) => row.description,
				cell: (info) => info.getValue<string | null>(),
				size: 160,
			},
		],
		hiddenColumnDef: ["id", "createdAt", "updatedAt", "createdByAccountId", "updatedByAccountId", "belongToNpcId"],
		defaultSort: { field: "name", desc: false },
		tdGenerator: {},
	},
	form: {
		hiddenFields: ["id", "createdAt", "updatedAt", "createdByAccountId", "updatedByAccountId"],
		onInsert: async (data) => {
			const db = await getDB();
			return db.transaction().execute(async (trx) => {
				const { account } = await getUserContext(trx);
				return repositoryWriters.task.create(
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
				return repositoryWriters.task.update(id, { ...data, updatedByAccountId: account.id }, trx);
			});
		},
	},
	card: {
		hiddenFields: ["id", "createdByAccountId", "updatedByAccountId"],
		fieldGenerator: {},
		deleteCallback: repositoryWriters.task.delete,
		editAbleCallback: (data) => repositoryWriters.task.canEdit(data.id),
	},
});
