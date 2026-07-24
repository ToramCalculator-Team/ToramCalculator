import { defaultData } from "@db/defaultData";
import { repositoryReaders, repositoryWriters } from "@db/generated/repositories";
import { RecipeIngredientSchema, type recipe_ingredient } from "@db/generated/zod";
import type { TableDataConfig } from "../data-config";

export const RECIPE_INGREDIENT_DATA_CONFIG: TableDataConfig<recipe_ingredient> = (dictionary) => ({
	tableName: "recipe_ingredient",
	dictionary: dictionary().db.recipe_ingredient,
	dataSchema: RecipeIngredientSchema,
	primaryKey: "id",
	defaultData: defaultData.recipe_ingredient,
	queries: repositoryReaders.recipe_ingredient,
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
		onInsert: repositoryWriters.recipe_ingredient.create,
		onUpdate: repositoryWriters.recipe_ingredient.update,
	},
	card: {
		hiddenFields: ["id"],
		fieldGenerator: {},
		deleteCallback: repositoryWriters.recipe_ingredient.delete,
		editAbleCallback: (data) => repositoryWriters.recipe_ingredient.canEdit(data.id),
	},
});
