import { defaultData } from "@db/defaultData";
import { repositoryMethods } from "@db/generated/repositories";
import { insertStatistic } from "@db/generated/repositories/statistic";
import { RecipeSchema, type recipe } from "@db/generated/zod";
import { getDB } from "@db/repositories/database";
import { createId } from "@paralleldrive/cuid2";
import { setStore, store } from "~/store";
import type { TableDataConfig } from "../data-config";
import { getUserContext } from "../utils/context";

export const RECIPE_DATA_CONFIG: TableDataConfig<recipe> = (dictionary) => ({
	dictionary: dictionary().db.recipe,
	dataSchema: RecipeSchema,
	primaryKey: "id",
	defaultData: defaultData.recipe,
	relationOverrides: {
		hide: ["statistic", "account_create_data", "account_update_data"],
	},
	dataFetcher: {
		get: repositoryMethods.recipe.select,
		getAll: repositoryMethods.recipe.selectAll,
		liveQuery: (db) => db.selectFrom("recipe").selectAll("recipe"),
		insert: repositoryMethods.recipe.insert,
		update: repositoryMethods.recipe.update,
		delete: repositoryMethods.recipe.delete,
	},
	fieldGroupMap: {
		ID: ["id"],
		所属道具: ["itemId"],
		所属活动: ["activityId"],
		统计信息: ["statisticId"],
		创建和更新信息: ["createdByAccountId", "updatedByAccountId"],
	},
	table: {
		columnsDef: [],
		hiddenColumnDef: [],
		defaultSort: { field: "id", desc: false },
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
				return repositoryMethods.recipe.insert(
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
				return repositoryMethods.recipe.update(id, { ...data, updatedByAccountId: account.id }, trx);
			});
		},
	},
	card: {
		hiddenFields: ["id", "createdByAccountId", "updatedByAccountId", "statisticId"],
		fieldGenerator: {},
		deleteCallback: repositoryMethods.recipe.delete,
		openEditor: (data) => setStore("pages", "formGroup", store.pages.formGroup.length, { type: "recipe", data }),
		editAbleCallback: (data) => repositoryMethods.recipe.canEdit(data.id),
	},
});
