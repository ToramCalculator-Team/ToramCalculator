import { defaultData } from "@db/defaultData";
import { repositoryMethods } from "@db/generated/repositories";
import { RecipeSchema, type recipe } from "@db/generated/zod";
import { getDictionary } from "~/locales/i18n";
import { setStore, store } from "~/store";
import type { TableDataConfig } from "../data-config";

const dictionary = getDictionary(store.settings.userInterface.language);

export const RECIPE_DATA_CONFIG: TableDataConfig<recipe> = {
	dictionary: dictionary.db.recipe,
	dataSchema: RecipeSchema,
	primaryKey: "id",
	defaultData: defaultData.recipe,
	dataFetcher: {
		get: repositoryMethods.recipe.select,
		getAll: repositoryMethods.recipe.selectAll,
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
		defaultSort: { id: "id", desc: false },
		tdGenerator: {},
	},
	form: {
		hiddenFields: ["id", "createdByAccountId", "updatedByAccountId", "statisticId"],
		fieldGenerator: {},
		onInsert: repositoryMethods.recipe.insert,
		onUpdate: repositoryMethods.recipe.update,
	},
	card: {
		hiddenFields: ["id", "createdByAccountId", "updatedByAccountId", "statisticId"],
		fieldGenerator: {},
		deleteCallback: repositoryMethods.recipe.delete,
		openEditor: (data) => setStore("pages", "formGroup", store.pages.formGroup.length, { type: "recipe", data }),
		editAbleCallback: (data) => repositoryMethods.recipe.canEdit(data.id),
	},
};
