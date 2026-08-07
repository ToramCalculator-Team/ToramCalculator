import type { recipe_ingredient } from "@db/generated/zod";
import type { TableDataConfig, TableDataConfigurator } from "../data-config";

export const RECIPE_INGREDIENT_DATA_CONFIG: TableDataConfigurator<"recipe_ingredient", recipe_ingredient> = (
	_dictionary,
) =>
	({
		fieldGroupMap: {
			ID: ["id"],
			基本信息: ["count", "type", "itemId"],
			所属配方: ["recipeId"],
		},
		table: {
			columnsDef: [
				{ id: "count", accessorFn: (row) => row.count, cell: (info) => info.getValue(), size: 100 },
				{ id: "type", accessorFn: (row) => row.type, cell: (info) => info.getValue(), size: 150 },
				{ id: "itemId", accessorFn: (row) => row.itemId, cell: (info) => info.getValue(), size: 200 },
			],
			hiddenColumnDef: [],
			defaultSort: { field: "id", desc: false },
			tdGenerator: {},
		},
		form: {
			hiddenFields: ["id"],
			references: [],
			referencedBy: [],
		},
		card: {
			hiddenFields: ["id"],
			references: [],
			referencedBy: [],
		},
	}) satisfies TableDataConfig<"recipe_ingredient", recipe_ingredient>;
