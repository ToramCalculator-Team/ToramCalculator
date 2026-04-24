import { defaultData } from "@db/defaultData";
import { repositoryMethods } from "@db/generated/repositories";
import { insertStatistic } from "@db/generated/repositories/statistic";
import { WorldSchema, type world } from "@db/generated/zod";
import { getDB } from "@db/repositories/database";
import { createId } from "@paralleldrive/cuid2";
import { setStore, store } from "~/store";
import type { TableDataConfig } from "../data-config";
import { getUserContext } from "../utils/context";

export const WORLD_DATA_CONFIG: TableDataConfig<world> = (dictionary) => ({
	dictionary: dictionary().db.world,
	dataSchema: WorldSchema,
	primaryKey: "id",
	defaultData: defaultData.world,
	dataFetcher: {
		get: repositoryMethods.world.select,
		getAll: repositoryMethods.world.selectAll,
		insert: repositoryMethods.world.insert,
		update: repositoryMethods.world.update,
		delete: repositoryMethods.world.delete,
		// 试点：用 PGlite live 订阅实现列表自动刷新
		liveQuery: (db) => db.selectFrom("world").selectAll("world"),
	},
	fieldGroupMap: {
		ID: ["id"],
		基本信息: ["name"],
		统计信息: ["statisticId"],
		创建和更新信息: ["createdByAccountId", "updatedByAccountId"],
	},
	table: {
		columnsDef: [{ accessorKey: "name", cell: (info) => info.getValue(), size: 200 }],
		hiddenColumnDef: [],
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
				const world = await repositoryMethods.world.insert({
					...data,
					id: createId(),
					createdByAccountId: account.id,
					updatedByAccountId: account.id,
					statisticId: statistic.id,
				}, trx);
				return world;
			});
		},
		onUpdate: repositoryMethods.world.update,
	},
	card: {
		hiddenFields: ["id", "createdByAccountId", "updatedByAccountId", "statisticId"],
		fieldGenerator: {},
		deleteCallback: repositoryMethods.world.delete,
		openEditor: (data) => setStore("pages", "formGroup", store.pages.formGroup.length, { type: "world", data }),
		editAbleCallback: (data) => repositoryMethods.world.canEdit(data.id),
	},
});
