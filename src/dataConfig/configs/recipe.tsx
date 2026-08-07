import type { recipe } from "@db/generated/zod";
import type { TableDataConfig, TableDataConfigurator } from "../data-config";

export const RECIPE_DATA_CONFIG: TableDataConfigurator<"recipe", recipe> = (_dictionary) =>
	({
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
			references: [],
			referencedBy: [],
	},
	card: {
		hiddenFields: ["id", "createdByAccountId", "updatedByAccountId"],
		references: [],
		referencedBy: [
			{
				relation: "recipe_ingredient.belongTorecipe",
				tableName: "recipe_ingredient",
			},
		],
	},
	}) satisfies TableDataConfig<"recipe", recipe>;
