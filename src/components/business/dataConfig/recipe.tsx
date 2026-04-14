import { repositoryMethods } from "@db/generated/repositories";
import type { TableDataConfig } from "../data-config";

export const RECIPE_DATA_CONFIG: TableDataConfig<"recipe"> = {
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
	},
};
