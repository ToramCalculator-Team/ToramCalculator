import { defaultData } from "@db/defaultData";
import { repositoryMethods, repositoryQueries } from "@db/generated/repositories";
import { RecipeSchema, type recipe } from "@db/generated/zod";
import { getDB } from "@db/repositories/database";
import { createId } from "@paralleldrive/cuid2";
import type { TableDataConfig } from "../data-config";
import { getUserContext } from "../utils/context";

export const RECIPE_DATA_CONFIG: TableDataConfig<recipe> = (dictionary) => ({
	dictionary: dictionary().db.recipe,
	dataSchema: RecipeSchema,
	primaryKey: "id",
	defaultData: defaultData.recipe,
	queries: repositoryQueries.recipe,
	fieldGroupMap: {
		ID: ["id"],
		所属道具: ["itemId"],
		所属活动: ["activityId"],
		创建和更新信息: ["createdAt", "updatedAt", "createdByAccountId", "updatedByAccountId"],
	},
	table: {
		columnsDef: [],
		hiddenColumnDef: [],
		defaultSort: { field: "id", desc: false },
		tdGenerator: {},
	},
	form: {
		hiddenFields: ["id", "createdAt", "updatedAt", "createdByAccountId", "updatedByAccountId"],
		onInsert: async (data) => {
			const db = await getDB();
			return db.transaction().execute(async (trx) => {
				const { account } = await getUserContext(trx);
				return repositoryMethods.recipe.insert(
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
				return repositoryMethods.recipe.update(id, { ...data, updatedByAccountId: account.id }, trx);
			});
		},
	},
	card: {
		relationOverrides: {
			hide: ["account_create_data", "account_update_data"],
		},
		hiddenFields: ["id", "createdByAccountId", "updatedByAccountId"],
		fieldGenerator: {},
		deleteCallback: repositoryMethods.recipe.delete,
		editAbleCallback: (data) => repositoryMethods.recipe.canEdit(data.id),
	},
});
