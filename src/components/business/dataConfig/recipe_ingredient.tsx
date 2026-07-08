import { defaultData } from "@db/defaultData";
import { repositoryMethods, repositoryQueries } from "@db/generated/repositories";
import { RecipeIngredientSchema, type recipe_ingredient } from "@db/generated/zod";
import type { TableDataConfig } from "../data-config";

export const RECIPE_INGREDIENT_DATA_CONFIG: TableDataConfig<recipe_ingredient> = (dictionary) => ({
	dictionary: dictionary().db.recipe_ingredient,
	dataSchema: RecipeIngredientSchema,
	primaryKey: "id",
	defaultData: defaultData.recipe_ingredient,
	queries: repositoryQueries.recipe_ingredient,
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
		defaultSort: { field: "id", desc: false },
		tdGenerator: {},
	},
	form: {
		hiddenFields: ["id"],
		onInsert: repositoryMethods.recipe_ingredient.insert,
		onUpdate: repositoryMethods.recipe_ingredient.update,
	},
	card: {
		hiddenFields: ["id"],
		fieldGenerator: {},
		deleteCallback: repositoryMethods.recipe_ingredient.delete,
		editAbleCallback: (data) => repositoryMethods.recipe_ingredient.canEdit(data.id),
	},
});
