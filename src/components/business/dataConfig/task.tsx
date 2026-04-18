import { defaultData } from "@db/defaultData";
import { repositoryMethods } from "@db/generated/repositories";
import { insertStatistic } from "@db/generated/repositories/statistic";
import { TaskSchema, type task } from "@db/generated/zod";
import { getDB } from "@db/repositories/database";
import { createId } from "@paralleldrive/cuid2";
import { setStore, store } from "~/store";
import type { TableDataConfig } from "../data-config";
import { getUserContext } from "../utils/context";

export const TASK_DATA_CONFIG: TableDataConfig<task> = (dictionary) => ({
	dictionary: dictionary().db.task,
	dataSchema: TaskSchema,
	primaryKey: "id",
	defaultData: defaultData.task,
	dataFetcher: {
		get: repositoryMethods.task.select,
		getAll: repositoryMethods.task.selectAll,
		liveQuery: (db) => db.selectFrom("task").selectAll("task"),
		insert: repositoryMethods.task.insert,
		update: repositoryMethods.task.update,
		delete: repositoryMethods.task.delete,
	},
	fieldGroupMap: {
		ID: ["id"],
		基本信息: ["name", "lv", "type", "description"],
		统计信息: ["statisticId"],
		创建和更新信息: ["createdByAccountId", "updatedByAccountId"],
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
		hiddenColumnDef: ["id", "createdByAccountId", "updatedByAccountId", "statisticId", "belongToNpcId"],
		defaultSort: { id: "name", desc: false },
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
				return repositoryMethods.task.insert(
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
				return repositoryMethods.task.update(id, { ...data, updatedByAccountId: account.id }, trx);
			});
		},
	},
	card: {
		hiddenFields: ["id", "createdByAccountId", "updatedByAccountId", "statisticId"],
		fieldGenerator: {},
		deleteCallback: repositoryMethods.task.delete,
		openEditor: (data) => setStore("pages", "formGroup", store.pages.formGroup.length, { type: "task", data }),
		editAbleCallback: (data) => repositoryMethods.task.canEdit(data.id),
	},
});
