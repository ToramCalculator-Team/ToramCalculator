import type { consumable } from "@db/generated/zod";
import type { TableDataConfig, TableDataConfigurator } from "../data-config";

export const CONSUMABLE_DATA_CONFIG: TableDataConfigurator<"consumable", consumable> = (_dictionary) =>
	({
		fieldGroupMap: {
			基本信息: ["name", "type", "itemId"],
			效果信息: ["effects", "effectDuration"],
		},
		table: {
			columnsDef: [
				{ id: "name", accessorFn: (row) => row.name, cell: (info) => info.getValue(), size: 200 },
				{ id: "itemId", accessorFn: (row) => row.itemId, cell: (info) => info.getValue(), size: 200 },
				{ id: "type", accessorFn: (row) => row.type, cell: (info) => info.getValue(), size: 150 },
				{
					id: "effectDuration",
					accessorFn: (row) => row.effectDuration,
					cell: (info) => info.getValue(),
					size: 100,
				},
				{ id: "effects", accessorFn: (row) => row.effects, cell: (info) => info.getValue(), size: 150 },
			],
			hiddenColumnDef: ["itemId"],
			defaultSort: { field: "name", desc: false },
			tdGenerator: {},
		},
		form: {
			hiddenFields: [],
			references: [
				{
					relation: "belongToItem",
					tableName: "item",
				},
			],
			referencedBy: [],
		},
		card: {
			hiddenFields: [],
			references: [
				{
					relation: "belongToItem",
					tableName: "item",
				},
			],
			referencedBy: [],
		},
	}) satisfies TableDataConfig<"consumable", consumable>;
