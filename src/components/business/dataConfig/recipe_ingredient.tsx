import { repositoryMethods } from "@db/generated/repositories";
import type { TableDataConfig } from "../data-config";

export const RECIPE_INGREDIENT_DATA_CONFIG: TableDataConfig<"recipe_ingredient"> = {
	fieldGroupMap: {
		ID: ["id"],
		基本信息: ["count", "type", "itemId"],
		所属配方: ["recipeId"],
	},
	table: {
		columnsDef: [
			{ accessorKey: "count", cell: (info) => info.getValue(), size: 100 },
			{ accessorKey: "type", cell: (info) => info.getValue(), size: 150 },
			{ accessorKey: "itemId", cell: (info) => info.getValue(), size: 200 },
		],
		hiddenColumnDef: [],
		defaultSort: { id: "id", desc: false },
		tdGenerator: {},
	},
	form: {
		hiddenFields: ["id"],
		fieldGenerator: {},
		onInsert: repositoryMethods.recipe_ingredient.insert,
		onUpdate: repositoryMethods.recipe_ingredient.update,
	},
	card: {
		hiddenFields: ["id"],
		fieldGenerator: {},
	},
};
