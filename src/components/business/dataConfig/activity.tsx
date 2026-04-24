import { defaultData } from "@db/defaultData";
import { repositoryMethods } from "@db/generated/repositories";
import { insertStatistic } from "@db/generated/repositories/statistic";
import { ActivitySchema, type activity } from "@db/generated/zod";
import { getDB } from "@db/repositories/database";
import { createId } from "@paralleldrive/cuid2";
import { setStore, store } from "~/store";
import type { TableDataConfig } from "../data-config";
import { getUserContext } from "../utils/context";

export const ACTIVITY_DATA_CONFIG: TableDataConfig<activity> = (dictionary) => ({
	dictionary: dictionary().db.activity,
	dataSchema: ActivitySchema,
	primaryKey: "id",
	defaultData: defaultData.activity,
	dataFetcher: {
		get: repositoryMethods.activity.select,
		getAll: repositoryMethods.activity.selectAll,
		liveQuery: (db) => db.selectFrom("activity").selectAll("activity"),
		insert: repositoryMethods.activity.insert,
		update: repositoryMethods.activity.update,
		delete: repositoryMethods.activity.delete,
	},
	fieldGroupMap: {
		ID: ["id"],
		基本信息: ["name"],
		统计信息: ["statisticId"],
		创建和更新信息: ["createdByAccountId", "updatedByAccountId"],
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
		hiddenColumnDef: ["id"],
		defaultSort: { field: "name", desc: false },
		tdGenerator: {},
	},
	form: {
		hiddenFields: ["id", "createdByAccountId", "updatedByAccountId", "statisticId"],
		fieldGenerator: {},
		onInsert: async (data) => {
			const db = await getDB();
			return db.transaction().execute(async (trx) => {
				const { account } = await getUserContext(trx);
				const statistic = await insertStatistic({
					...defaultData.statistic,
					id: createId(),
				}, trx);
				const activity = await repositoryMethods.activity.insert({
					...data,
					id: createId(),
					statisticId: statistic.id,
					createdByAccountId: account.id,
					updatedByAccountId: account.id,
				}, trx);
				return activity;
			});
		},
		onUpdate: repositoryMethods.activity.update,
	},
	card: {
		hiddenFields: ["id", "createdByAccountId", "updatedByAccountId", "statisticId"],
		fieldGenerator: {},
		deleteCallback: repositoryMethods.activity.delete,
		openEditor: (data) => setStore("pages", "formGroup", store.pages.formGroup.length, { type: "activity", data }),
		editAbleCallback: (data) => repositoryMethods.activity.canEdit(data.id),
	},
});
