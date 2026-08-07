import type { material } from "@db/generated/zod";
import type { TableDataConfig, TableDataConfigurator } from "../data-config";

export const MATERIAL_DATA_CONFIG: TableDataConfigurator<"material", material> = (_dictionary) =>
	({
		fieldGroupMap: {
			基本信息: ["name", "type", "price", "ptValue", "itemId"],
		},
		table: {
			columnsDef: [
				{ id: "name", accessorFn: (row) => row.name, cell: (info) => info.getValue(), size: 200 },
				{ id: "itemId", accessorFn: (row) => row.itemId, cell: (info) => info.getValue(), size: 200 },
				{ id: "type", accessorFn: (row) => row.type, cell: (info) => info.getValue(), size: 150 },
				{ id: "price", accessorFn: (row) => row.price, cell: (info) => info.getValue(), size: 100 },
				{ id: "ptValue", accessorFn: (row) => row.ptValue, cell: (info) => info.getValue(), size: 100 },
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
	}) satisfies TableDataConfig<"material", material>;
