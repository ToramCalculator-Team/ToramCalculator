import { defaultData } from "@db/defaultData";
import { repositoryMethods } from "@db/generated/repositories";
import { insertStatistic } from "@db/generated/repositories/statistic";
import { NpcSchema, type npc } from "@db/generated/zod";
import { getDB } from "@db/repositories/database";
import { createId } from "@paralleldrive/cuid2";
import { setStore, store } from "~/store";
import type { TableDataConfig } from "../data-config";
import { getUserContext } from "../utils/context";

export const NPC_DATA_CONFIG: TableDataConfig<npc> = (dictionary) => ({
	dictionary: dictionary().db.npc,
	dataSchema: NpcSchema,
	primaryKey: "id",
	defaultData: defaultData.npc,
	dataFetcher: {
		get: repositoryMethods.npc.select,
		getAll: repositoryMethods.npc.selectAll,
		liveQuery: (db) => db.selectFrom("npc").selectAll("npc"),
		insert: repositoryMethods.npc.insert,
		update: repositoryMethods.npc.update,
		delete: repositoryMethods.npc.delete,
	},
	fieldGroupMap: {
		ID: ["id"],
		基本信息: ["name"],
		所属区域: ["zoneId"],
		统计信息: ["statisticId"],
		创建和更新信息: ["createdByAccountId", "updatedByAccountId"],
	},
	table: {
		columnsDef: [
			{ accessorKey: "id", cell: (info) => info.getValue(), size: 200 },
			{ accessorKey: "name", cell: (info) => info.getValue(), size: 200 },
			{ accessorKey: "zoneId", cell: (info) => info.getValue(), size: 200 },
		],
		hiddenColumnDef: ["id", "createdByAccountId", "updatedByAccountId", "statisticId"],
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
				const statistic = await insertStatistic(
					{
						...defaultData.statistic,
						id: createId(),
					},
					trx,
				);
				return repositoryMethods.npc.insert(
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
				return repositoryMethods.npc.update(id, { ...data, updatedByAccountId: account.id }, trx);
			});
		},
	},
	card: {
		hiddenFields: ["id", "createdByAccountId", "updatedByAccountId", "statisticId"],
		fieldGenerator: {},
		deleteCallback: repositoryMethods.npc.delete,
		openEditor: (data) => setStore("pages", "formGroup", store.pages.formGroup.length, { type: "npc", data }),
		editAbleCallback: (data) => repositoryMethods.npc.canEdit(data.id),
	},
});
