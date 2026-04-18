import { defaultData } from "@db/defaultData";
import { repositoryMethods } from "@db/generated/repositories";
import { insertStatistic } from "@db/generated/repositories/statistic";
import { ZoneSchema, type zone } from "@db/generated/zod";
import { getDB } from "@db/repositories/database";
import { createId } from "@paralleldrive/cuid2";
import { setStore, store } from "~/store";
import type { TableDataConfig } from "../data-config";
import { getUserContext } from "../utils/context";

export const ZONE_DATA_CONFIG: TableDataConfig<zone> = (dictionary) => ({
	dictionary: dictionary().db.zone,
	dataSchema: ZoneSchema,
	primaryKey: "id",
	defaultData: defaultData.zone,
	dataFetcher: {
		get: repositoryMethods.zone.select,
		getAll: repositoryMethods.zone.selectAll,
		liveQuery: (db) => db.selectFrom("zone").selectAll("zone"),
		insert: repositoryMethods.zone.insert,
		update: repositoryMethods.zone.update,
		delete: repositoryMethods.zone.delete,
	},
	fieldGroupMap: {
		ID: ["id"],
		基本信息: ["name", "rewardNodes"],
		所属活动: ["activityId"],
		所属地点: ["addressId"],
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
				id: "rewardNodes",
				accessorFn: (row) => row.rewardNodes,
				cell: (info) => info.getValue<number | null>(),
				size: 120,
			},
			{
				id: "activityId",
				accessorFn: (row) => row.activityId,
				cell: (info) => info.getValue<string | null>(),
				size: 160,
			},
			{
				id: "addressId",
				accessorFn: (row) => row.addressId,
				cell: (info) => info.getValue<string>(),
				size: 160,
			},
		],
		hiddenColumnDef: ["id", "activityId", "addressId", "createdByAccountId", "updatedByAccountId", "statisticId"],
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
				return repositoryMethods.zone.insert(
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
				return repositoryMethods.zone.update(id, { ...data, updatedByAccountId: account.id }, trx);
			});
		},
	},
	card: {
		hiddenFields: ["id", "createdByAccountId", "updatedByAccountId", "statisticId"],
		fieldGenerator: {},
		deleteCallback: repositoryMethods.zone.delete,
		openEditor: (data) => setStore("pages", "formGroup", store.pages.formGroup.length, { type: "zone", data }),
		editAbleCallback: (data) => repositoryMethods.zone.canEdit(data.id),
	},
});
